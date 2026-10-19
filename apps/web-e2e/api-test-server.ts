import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../api/src/app/app.module';
import { LLM_PROVIDER } from '../api/src/llm/llm-provider';
import { AcceptanceLlmProvider } from './acceptance-llm-provider';
import { resolveDatabaseTarget } from '../api/src/database/database-target';

async function bootstrap(): Promise<void> {
  const target = resolveDatabaseTarget('test', process.env);
  process.env.DATABASE_URL = target.connectionUrl;
  process.env.DOCUMENT_STORAGE_ROOT = 'var/e2e-documents';
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(LLM_PROVIDER).useClass(AcceptanceLlmProvider).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors({ origin: 'http://127.0.0.1:4200', credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'] });
  await app.listen(3000, '0.0.0.0');
}

bootstrap();
