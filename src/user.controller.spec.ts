import { RedisServiceType } from './redis.service';
import { UserController } from './user.controller';
import { User } from './user.model';
import { UserService } from './user.service';

const EXISTING_ID = 'TestId';
const ANOTHER_ID = 'AnotherId';
const NONEXISTING_ID = 'NonexistingId';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const uuid = require('uuid');
jest.mock('uuid');
jest.spyOn(uuid, 'v4').mockReturnValue(EXISTING_ID);

describe('UserController', () => {
  const testUser: User = {
    name: 'Charles',
    expertises: ['spanish', ' bowling'],
    interests: ['piano', ' dancing'],
    location: {
      latitude: 51.5007169,
      longitude: -0.124772,
    },
  };

  const testUserInRedisFormat = {
    name: testUser.name,
    expertises: testUser.expertises.join(','),
    interests: testUser.interests.join(','),
    location: `${testUser.location.longitude},${testUser.location.latitude}`,
  };

  let userController: UserController;

  const redisService: RedisServiceType = {
    hsetAsync: (_key: string, _fields: string[]): Promise<any> => {
      return new Promise((resolve, _reject) => resolve(undefined));
    },
    hgetallAsync: (key: string) => {
      return new Promise((resolve, _reject) => {
        if (key === `users:${EXISTING_ID}`) {
          resolve({ id: EXISTING_ID, ...testUserInRedisFormat });
        } else {
          resolve(undefined);
        }
      });
    },
    ft_searchAsync: (index: string, _query: string): Promise<any> => {
      return new Promise((resolve, _reject) => {
        if (index === 'idx:users') {
          const userResult = Object.entries(testUserInRedisFormat).flat();
          resolve([2, EXISTING_ID, userResult, ANOTHER_ID, userResult]);
        } else {
          resolve(undefined);
        }
      });
    },
  };

  const userService: UserService = new UserService(redisService);

  beforeEach(async () => {
    userController = new UserController(userService);
  });

  describe('create', () => {
    it('should return ID', async () => {
      expect(await userController.create(testUser)).toBe(EXISTING_ID);
    });
  });

  describe('getById', () => {
    it('should return user if exists', async () => {
      expect(
        await userController.getById({ userId: EXISTING_ID }),
      ).toStrictEqual({ id: EXISTING_ID, ...testUser });
    });

    it('should return undefined if user does not exist', async () => {
      expect(await userController.getById({ userId: NONEXISTING_ID })).toBe(
        undefined,
      );
    });
  });

  describe('getMatchesById', () => {
    it('should return users if exist', async () => {
      expect(
        await userController.getMatchesById({ userId: EXISTING_ID }, undefined),
      ).toStrictEqual([{ id: ANOTHER_ID, ...testUser }]);
    });

    it('should return undefined if user does not exist', async () => {
      expect(
        await userController.getMatchesById(
          { userId: NONEXISTING_ID },
          undefined,
        ),
      ).toBe(undefined);
    });
  });
});
