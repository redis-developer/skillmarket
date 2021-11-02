import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './user.model';
import { NotFoundInterceptor } from './app.interceptors';

@Controller('/users')
@UseInterceptors(NotFoundInterceptor)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() user: User): Promise<string> {
    return await this.userService.create(user);
  }

  @Get(':userId')
  @HttpCode(HttpStatus.OK)
  async getById(@Param() params: { userId: string }): Promise<User> {
    return await this.userService.findById(params.userId);
  }

  @Get(':userId/matches')
  @HttpCode(HttpStatus.OK)
  async getMatchesById(
    @Param() params: { userId: string },
    @Query() radiusKm: number,
  ): Promise<User[]> {
    radiusKm = radiusKm || 50;
    const user: User = await this.userService.findById(params.userId);
    return !user
      ? undefined
      : await this.userService.findMatchesById(user, radiusKm);
  }
}
