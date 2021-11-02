import { promisify } from 'util';
import { addCommand, createClient, RedisClient, ReplyError } from 'redis';
import { Injectable, Logger } from '@nestjs/common';

const { REDIS_PORT = 6379, REDIS_HOST = 'localhost' } = process.env;

addCommand('ft.create');
addCommand('ft.search');

type RediSearchClient = RedisClient & {
  ft_create?(args: any): any;
  ft_search?(args: any): any;
};

export type RedisServiceType = {
  hgetallAsync?(key: string): Promise<any>;
  hsetAsync?(key: string, fields: string[]): Promise<any>;
  ft_searchAsync?(index: string, query: string): Promise<any>;
  ft_createAsync?(index: string, args: string[]): Promise<any>;
};

@Injectable()
export class RedisService implements RedisServiceType {
  private readonly redisClient: RediSearchClient;
  private readonly logger = new Logger(RedisService.name);

  public hgetallAsync?(key: string): Promise<any>;
  public hsetAsync?(key: string, fields: string[]): Promise<any>;
  public ft_searchAsync?(index: string, query: string): Promise<any>;

  public ft_createAsync?(index: string, args: string[]): Promise<any>;

  constructor() {
    this.redisClient = createClient({
      port: Number(REDIS_PORT),
      host: REDIS_HOST,
    });

    this.hgetallAsync = promisify(this.redisClient.hgetall).bind(
      this.redisClient,
    );
    this.hsetAsync = promisify(this.redisClient.hset).bind(this.redisClient);
    this.ft_createAsync = promisify(this.redisClient.ft_create).bind(
      this.redisClient,
    );
    this.ft_searchAsync = promisify(this.redisClient.ft_search).bind(
      this.redisClient,
    );

    this.createUserIndex().catch((e: ReplyError) => {
      if (e.message !== 'Index already exists') {
        this.logger.error(e);
      }
    });
  }

  async createUserIndex() {
    return this.ft_createAsync('idx:users', [
      'ON',
      'hash',
      'PREFIX',
      '1',
      'users:',
      'SCHEMA',
      'interests',
      'TAG',
      'expertises',
      'TAG',
      'location',
      'GEO',
    ]);
  }
}
