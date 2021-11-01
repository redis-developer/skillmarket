import { promisify } from 'util';
import { addCommand, createClient, RedisClient } from 'redis';

const {
    REDIS_PORT = 6379,
    REDIS_HOST = 'localhost',
} = process.env;

const client: RediSearchClient = createClient({
    port: Number(REDIS_PORT),
    host: REDIS_HOST,
});

type RediSearchClient = RedisClient & {
    ft_create?(args: any): any;
    ft_search?(args: any): any;
    hgetallAsync?(key: string): Promise<any>
    hsetAsync?(key: string, fields: string[]): Promise<any>
    ft_createAsync?(index: string, args: string[]): Promise<any>
    ft_searchAsync?(index: string, query: string): Promise<any>
}

addCommand('ft.create');
addCommand('ft.search');

client.hgetallAsync = promisify(client.hgetall).bind(client);
client.hsetAsync = promisify(client.hset).bind(client);
client.ft_createAsync = promisify(client.ft_create).bind(client);
client.ft_searchAsync = promisify(client.ft_search).bind(client);

export async function createUserIndex() {
    createIndex(
        'idx:users',
        'ON hash PREFIX 1 "users:" SCHEMA interests TAG expertises TAG location GEO'
    );
}

async function createIndex(name: string, args: string): Promise<any> {
    client.ft_createAsync(
        name,
        _splitArgs(args)
    ).catch(() => undefined);
}

function _splitArgs(args: string): string[] {
    return args
        .match(/(?:[^\s"]+|"[^"]*")+/g)
        .map(e => e.replaceAll('"', ''));
}

export default client;
