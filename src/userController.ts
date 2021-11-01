import { v4 as uuid } from 'uuid';
import { Location, User } from './model';
import redisearchClient from './redisearchClient';

async function findUserById(userId: string): Promise<User> {
    const response = await redisearchClient.hgetallAsync(`users:${userId}`);
    if (!response) {
        throw new Error('User Not Found');
    }
    return _userFromResponse(userId, Object.entries(response).flat());
}

async function createUser(user: User): Promise<string> {
    const id = uuid();
    redisearchClient.hsetAsync(
        `users:${id}`,
        _userToRequest(user)
    );
    return id;
}

async function findMatchesForUser(user: User, radiusKm: number): Promise<User[]> {
    return (await _findMatches(user.interests, user.expertises, user.location, radiusKm)).filter(u => u.id !== user.id);
}

function _userToRequest(user: User): string[] {
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

    const response = await redisearchClient.ft_searchAsync(
        'idx:users',
        query
    );

    return _usersFromResponse(response);
}

function _usersFromResponse(response: any[]): User[] {
    let users = [];

    for (let i = 1; i <= 2 * response[ 0 ]; i += 2) {
        const user: User = _userFromResponse(response[ i ].replace('users:', ''), response[ i + 1 ]);

        users.push(user);
    }

    return users;
}

function _userFromResponse(id: string, response: any[]): User {
    let user: User = {
        id: id,
        name: '',
        interests: [],
        expertises: [],
        location: undefined
    };

    let userArray = response;

    for (let j = 0; j < userArray.length; j += 2) {
        let key: string = userArray[ j ];
        let value: string = userArray[ j + 1 ];

        switch (key) {
            case 'location':
                const location: string[] = value.split(',');
                user.location = { longitude: Number(location[ 0 ]), latitude: Number(location[ 1 ]) };
                break;

            case 'expertises':
                user.expertises = value.split(',');
                break;

            case 'interests':
                user.interests = value.split(',');
                break;


            default:
                user[ key ] = value;
                break;
        }
    }

    return user;
}

export default {
    findUserById,
    createUser,
    findMatchesForUser
};
