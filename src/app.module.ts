import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users/users.service';
import { UsersController } from './users/users.controller';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    UsersModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 600000,
          limit: 10,
        },
      ],
    }),
  ],
  controllers: [AppController, UsersController],
  providers: [
    AppService,
    UsersService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // Apply Throttling Globally
  ],
})
export class AppModule {}
