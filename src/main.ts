import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  Logger.log(
    `Server running on http://localhost:${process.env.PORT ?? 3000}`,
    'Bootstrap',
  );
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
