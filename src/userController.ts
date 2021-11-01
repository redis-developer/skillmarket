import { v4 as uuid } from 'uuid';
import { Location, User } from './model';
import redisearchClient from './redisearchClient';

async function findUserById(userId: string): Promise<User> {
    const response = await redisearchClient.hgetallAsync(`users:${userId}`);
    if (!response) {
        throw new Error('User Not Found');
    }
    return _userFromFlatEntriesArray(userId, Object.entries(response).flat());
}

async function createUser(user: User): Promise<string> {
    const id = uuid();
    redisearchClient.hsetAsync(`users:${id}`, _userToSetRequestString(user));
    return id;
}

async function findMatchesForUser(user: User, radiusKm: number): Promise<User[]> {
    const allMatches: User[] = await _findMatches(user.interests, user.expertises, user.location, radiusKm);
    return allMatches.filter(u => u.id !== user.id);
}

function _userToSetRequestString(user: User): string[] {
    const { id, location, interests, expertises, ...fields } = user;
    let result = Object.entries(fields).flat();
    result.push('interests', interests.join(', '));
    result.push('expertises', expertises.join(', '));
    result.push('location', `${location.longitude},${location.latitude}`);
    return result;
}

async function _findMatches(expertises: string[], interests: string[], location: Location, radiusKm: number): Promise<User[]> {
    let query = `@interests:{${interests.join('|')}}`
    query += ` @expertises:{${expertises.join('|')}}`
    query += ` @location:[${location.longitude} ${location.latitude} ${radiusKm} km]`;

    const response = await redisearchClient.ft_searchAsync('idx:users', query);

    return _usersFromSearchResponseArray(response);
}

function _usersFromSearchResponseArray(response: any[]): User[] {
    let users = [];

    // The search response is an array where the first element indicates the number of results, and then
    // the array contains all matches in order, one element is they key and the next is the object, e.g.:
    // [2, key1, object1, key2, object2]
    for (let i = 1; i <= 2 * response[ 0 ]; i += 2) {
        const user: User = _userFromFlatEntriesArray(response[ i ].replace('users:', ''), response[ i + 1 ]);
        users.push(user);
    }

    return users;
}

function _userFromFlatEntriesArray(id: string, flatEntriesArray: any[]): User {
    let user: any = {};

    // The flat entries array contains all keys and values as elements in an array, e.g.:
    // [key1, value1, key2, value2]
    for (let j = 0; j < flatEntriesArray.length; j += 2) {
        let key: string = flatEntriesArray[ j ];
        let value: string = flatEntriesArray[ j + 1 ];
        user[ key ] = value;
    }

    const location: string[] = user.location.split(',');
    user.location = { longitude: Number(location[ 0 ]), latitude: Number(location[ 1 ]) };
    user.expertises = user.expertises.split(',');
    user.interests = user.interests.split(',');

    return {id, ...user};
}

export default {
    findUserById,
    createUser,
    findMatchesForUser
};
