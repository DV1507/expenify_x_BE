import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}
  @Post('create')
  async createUser(
    @Body()
    createUserDto: CreateUserDto,
  ) {
    return this.usersService.createUser(createUserDto);
  }
  @Get()
  async getUsers() {
    return this.usersService.getUsers();
  }
}
