import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(data: CreateUserDto) {
    return this.prisma.users.create({
      data,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
      },
    });
  }

  async getUsers() {
    return this.prisma.users.findMany();
  }

  async getUserByEmail(email: string) {
    return this.prisma.users.findFirstOrThrow({ where: { email } });
  }

  async getById(id: string) {
    const user = await this.prisma.users.findFirstOrThrow({ where: { id } }); // await this.prisma.user.findOne({ id });
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }
}
