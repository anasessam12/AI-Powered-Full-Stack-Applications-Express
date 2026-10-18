import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../api/src/app/app.module';
import { LLM_PROVIDER } from '../api/src/llm/llm-provider';
import { AcceptanceLlmProvider } from './global-setup';

async function bootstrap(): Promise<void> {
  if (!process.env.TEST_DATABASE_URL || !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith('_test')) throw new Error('E2E API only accepts TEST_DATABASE_URL ending in _test.');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(LLM_PROVIDER).useClass(AcceptanceLlmProvider).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: 'http://127.0.0.1:4200', credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'] });
  await app.listen(3000, '0.0.0.0');
}

bootstrap();
