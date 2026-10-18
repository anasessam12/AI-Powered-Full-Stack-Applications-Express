import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

describe('GET /api/v1/health', () => {
  let app: Awaited<ReturnType<typeof NestFactory.create>>;

  beforeAll(async () => {
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a healthy status without exposing configuration', async () => {
    const response = await fetch(`${await app.getUrl()}/api/v1/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });
});
