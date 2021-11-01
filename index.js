import { promisify } from 'util';
import { v4 as uuid } from 'uuid';
import redis from 'redis';
import redisearch from 'redis-redisearch';
redisearch(redis);

const {
    REDIS_PORT = 6379,
    REDIS_HOST = 'localhost',
} = process.env;

const client = redis.createClient({
    port: Number(REDIS_PORT),
    host: REDIS_HOST,
});

const getAsync = promisify(client.get).bind(client);
const hsetAsync = promisify(client.hset).bind(client);
const ft_createAsync = promisify(client.ft_create).bind(client);
const ft_searchAsync = promisify(client.ft_search).bind(client);

async function createIndex(name, args) {
    ft_createAsync(
        name,
        splitArgs(args)
    ).catch(() => undefined);
}

function splitArgs(args) {
    return args
        .match(/(?:[^\s"]+|"[^"]*")+/g)
        .map(e => e.replaceAll('"', ''));
}

async function createUser(user) {
    const id = uuid();
    hsetAsync(
        `users:${id}`,
        userToRequest(user)
    );
    return id;
}

function userToRequest(user) {
    const { id, location, interests, expertises, ...fields } = user;
    let result = Object.entries(fields).flat();
    result.push('interests', interests.join(', '));
    result.push('expertises', expertises.join(', '));
    result.push('location', `${location.longitude},${location.latitude}`);
    return result;
}

async function findMatchesForUser(user, radiusKm) {
    return findMatches(user.interests, user.expertises, user.location, radiusKm);
}

async function findMatches(expertises, interests, location, radiusKm) {
    let query = `@interests:{${interests.join('|')}}`
    query += ` @expertises:{${expertises.join('|')}}`
    query += ` @location:[${location.longitude} ${location.latitude} ${radiusKm} km]`;

    const response = await ft_searchAsync(
        'idx:users',
        query
    );

    return usersFromResponse(response);
}

function usersFromResponse(response) {
    let users = [];

    for (let i = 1; i <= 2 * response[ 0 ]; i += 2) {
        let user = {
            id: response[ i ].replace('users:', ''),
        };

        let userArray = response[ i + 1 ];

        for (let j = 0; j < userArray.length; j += 2) {
            let key = userArray[ j ];
            let value = userArray[ j + 1 ];
            user[ key ] = value;
        }

        const location = user.location.split(',');
        user.location = { longitude: Number(location[ 0 ]), latitude: Number(location[ 1 ]) };
        user.expertises = user.expertises.split(',');
        user.interests = user.interests.split(',');

        users.push(user);
    }

    return users;
}

(async () => {
    await createIndex(
        'idx:users',
        'ON hash PREFIX 1 "users:" SCHEMA interests TAG expertises TAG location GEO'
    );

    // Create users
    const alice = {
        name: 'Alice',
        expertises: [ 'piano', 'dancing' ],
        interests: [ 'spanish', 'bowling' ],
        location: { longitude: 2.2948552, latitude: 48.8736537 }
    };
    await createUser({
        name: 'Bob',
        expertises: [ 'french', 'spanish' ],
        interests: [ 'piano' ],
        location: { longitude: 2.2945412, latitude: 48.8583206 }
    });
    await createUser({
        name: 'Charles',
        expertises: [ 'spanish', 'bowling' ],
        interests: [ 'piano', 'dancing' ],
        location: { longitude: -0.124772, latitude: 51.5007169 }
    });

    const users = await findMatchesForUser(
        alice,
        500
    );

    console.log(users);
})();


