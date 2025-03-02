import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  Logger.log(
    `Server running on http://localhost:${process.env.PORT ?? 3000}`,
    'Bootstrap',
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
