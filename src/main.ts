import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    cors: true,
  });
  Logger.log(
    `Server running on http://localhost:${process.env.PORT ?? 3000}`,
    'Bootstrap',
  );
  Logger.log([process.env.FRONTEND_URL], ' [process.env.FRONTEND_URL]');
  app.enableCors({
    origin: 'http://localhost:3000', // ✅ Explicitly allow frontend origin
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // ✅ Allow cookies & authentication
  });
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Auth API')
    .setDescription('API documentation for authentication with cookies')
    .setVersion('1.0')
    .addCookieAuth('jwt') // 👈 Add support for cookie-based JWT authentication
    .build();

  app.setGlobalPrefix('api/v1');
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      withCredentials: true,
    },
  });

  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
