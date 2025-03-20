import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.users.findMany({ omit: { password: true } });
  }

  async getUserByEmail(email: string) {
    return this.prisma.users.findFirst({ where: { email } });
  }

  async getById(id: string) {
    const user = await this.prisma.users.findFirstOrThrow({ where: { id } }); // await this.prisma.user.findOne({ id });
    if (!user.verified) {
      throw new HttpException(
        'Please verify your email address',
        HttpStatus.NOT_FOUND,
      );
    }
    if (user) {
      return user;
    }
    throw new HttpException(
      'User with this id does not exist',
      HttpStatus.NOT_FOUND,
    );
  }

  async verifyEmail(email: string) {
    return await this.prisma.users.update({
      where: { email },
      data: { verified: true },
      omit: {
        password: true,
      },
    });
  }

  async updatePassword(email: string, hashedPassword: string) {
    return this.prisma.users.update({
      where: { email },
      data: { password: hashedPassword },
    });
  }
}
