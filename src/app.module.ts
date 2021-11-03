import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { RedisService } from './redis.service';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService, {provide: 'RedisServiceType', useClass: RedisService}],
})
export class AppModule {}
