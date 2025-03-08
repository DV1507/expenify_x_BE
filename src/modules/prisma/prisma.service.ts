import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    Logger.log('Connecting to the database...', 'PrismaService');
    await this.$connect();
    Logger.log('Connected to the database...', 'PrismaService');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    Logger.log('Disconnected to the database...', 'PrismaService');
  }
}
