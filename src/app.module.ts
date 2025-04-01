import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './modules/users/users.service';
import { UsersController } from './modules/users/users.controller';
import { PrismaModule } from './modules/prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/auth.module';
import { MailService } from './modules/mail/mail.service';
import { JwtAuthGuard } from './common/enums/guards/jwt-auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from './modules/redis/redis.module';
import { RedisService } from './modules/redis/redis.service';
import { ScriptsModule } from './modules/scripts/scripts.module';
import { CategoryModule } from './modules/category/category.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    UsersModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 600000,
          limit: 20,
        },
      ],
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'mySecretKey',
      signOptions: { expiresIn: '1h' },
    }),
    AuthModule,
    RedisModule,
    ScriptsModule,
    CategoryModule,
  ],
  controllers: [AppController, UsersController],
  providers: [
    AppService,
    UsersService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // Apply Throttling Globally
    MailService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 👈 This makes JwtAuthGuard a global guard
    },
    RedisService,
  ],
})
export class AppModule {}
