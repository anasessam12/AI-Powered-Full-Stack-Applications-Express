import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`Customer support API listening on port ${port}`);
}

bootstrap();
