import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { User } from 'src/user.model';
import { doesNotMatch } from 'assert';

const EXISTING_ID = 'TestId'
const uuid = require('uuid')
jest.mock('uuid');
jest.spyOn(uuid, 'v4').mockReturnValue(EXISTING_ID);

describe('AppController (e2e)', () => {
  const testUser: User = {
    name: 'Charles',
    expertises: [ 'spanish', 'bowling' ],
    interests: [ 'piano', 'dancing' ],
    location: {
      latitude: 51.5007169,
      longitude: -0.124772,
    },
  };

  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({transform: true}));
    await app.init();
  });

  it('should return 404 when GET /users/nonexistent-id', () => {
    return request(app.getHttpServer())
      .get('/users/nonexistent-id')
      .expect(404)
      .expect('{"statusCode":404,"message":"Not Found"}');
  });

  it('should return 400 when POST /users with empty body', () => {
    return request(app.getHttpServer())
      .post('/users')
      .expect(400);
  });

  it('should return 201 and userId when POST /users, and 200 when GET /users/:userId', (done) => {
    request(app.getHttpServer())
      .post('/users')
      .send(testUser)
      .expect(201)
      .expect(EXISTING_ID)
      .end(() => {
        request(app.getHttpServer())
          .get(`/users/${EXISTING_ID}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toStrictEqual({id: EXISTING_ID, ...testUser});
          })
          .end(() => done());
      });
  });
});
