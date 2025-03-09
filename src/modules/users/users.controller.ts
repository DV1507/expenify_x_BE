import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import JwtAuthenticationGuard from '../auth/guards/jwt-authentication.guard';
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
  @UseGuards(JwtAuthenticationGuard)
  @Get()
  async getUsers() {
    return this.usersService.getUsers();
  }
}
