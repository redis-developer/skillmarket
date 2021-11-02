import { RedisServiceType } from './redis.service';
import { UserController } from './user.controller';
import { User } from './user.model';
import { UserService } from './user.service';


const uuid = require('uuid')
jest.mock('uuid');
jest.spyOn(uuid, 'v4').mockReturnValue('TestId');

describe('UserController', () => {
  let userController: UserController;
  const redisService: RedisServiceType = {
    hsetAsync: () => {
      return new Promise(() => {});
    },
  };
  const userService: UserService = new UserService(redisService);

  const testUser: User = {
    name: 'Charles',
    expertises: ['spanish', ' bowling'],
    interests: ['piano', ' dancing'],
    location: {
      latitude: 51.5007169,
      longitude: -0.124772,
    },
  };
  
  beforeEach(async () => {
    userController = new UserController(userService);
  });

  describe('create', () => {
    it('should return ID', async () => {
      expect(await userController.create(testUser)).toBe('TestId');
    });
    it('should return ID', async () => {
      expect(await userController.create({
        name: undefined,
        expertises: [undefined],
        interests: [undefined],
        location: undefined,
      })).toBe('TestId');
    });
  });
});

