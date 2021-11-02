import { v4 as uuid } from 'uuid';
import { Location, User } from './user.model';
import { RedisServiceType } from './redis.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  constructor(private readonly redisService: RedisServiceType) {}

  public async findById(userId: string): Promise<User> {
    const response = await this.redisService.hgetallAsync(`users:${userId}`);
    return !response
      ? undefined
      : this._userFromFlatEntriesArray(userId, Object.entries(response).flat());
  }

  public async create(user: User): Promise<string> {
    const id = uuid();
    this.redisService.hsetAsync(
      `users:${id}`,
      this._userToSetRequestString(user),
    );
    return id;
  }

  public async findMatchesById(user: User, radiusKm: number): Promise<User[]> {
    const allMatches: User[] = await this._findMatches(
      user.interests,
      user.expertises,
      user.location,
      radiusKm,
    );
    return allMatches.filter((u) => u.id !== user.id);
  }

  private _userToSetRequestString(user: User): string[] {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, location, interests, expertises, ...fields } = user;
    const result = Object.entries(fields).flat();
    result.push('interests', interests.join(', '));
    result.push('expertises', expertises.join(', '));
    result.push('location', `${location.longitude},${location.latitude}`);
    return result;
  }

  private async _findMatches(
    expertises: string[],
    interests: string[],
    location: Location,
    radiusKm: number,
  ): Promise<User[]> {
    let query = `@interests:{${interests.join('|')}}`;
    query += ` @expertises:{${expertises.join('|')}}`;
    query += ` @location:[${location.longitude} ${location.latitude} ${radiusKm} km]`;

    const response = await this.redisService.ft_searchAsync('idx:users', query);

    return this._usersFromSearchResponseArray(response);
  }

  private _usersFromSearchResponseArray(response: any[]): User[] {
    const users = [];

    // The search response is an array where the first element indicates the number of results, and then
    // the array contains all matches in order, one element is they key and the next is the object, e.g.:
    // [2, key1, object1, key2, object2]
    for (let i = 1; i <= 2 * response[0]; i += 2) {
      const user: User = this._userFromFlatEntriesArray(
        response[i].replace('users:', ''),
        response[i + 1],
      );
      users.push(user);
    }

    return users;
  }

  private _userFromFlatEntriesArray(id: string, flatEntriesArray: any[]): User {
    const user: any = {};

    // The flat entries array contains all keys and values as elements in an array, e.g.:
    // [key1, value1, key2, value2]
    for (let j = 0; j < flatEntriesArray.length; j += 2) {
      const key: string = flatEntriesArray[j];
      const value: string = flatEntriesArray[j + 1];
      user[key] = value;
    }

    const location: string[] = user.location.split(',');
    user.location = {
      longitude: Number(location[0]),
      latitude: Number(location[1]),
    };
    user.expertises = user.expertises.split(',');
    user.interests = user.interests.split(',');

    return { id, ...user };
  }
}
