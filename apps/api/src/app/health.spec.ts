import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';

describe('GET /api/v1/health', () => {
  let app: INestApplication;
  const query = jest.fn();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService, { provide: DataSource, useValue: { query } }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => query.mockResolvedValue([{ '?column?': 1 }]));

  it('returns readiness when PostgreSQL responds', async () => {
    const response = await fetch(`${await app.getUrl()}/api/v1/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', database: 'up' });
  });

  it('returns a safe unavailable response without connection details when PostgreSQL is down', async () => {
    query.mockRejectedValueOnce(new Error('private database connection detail'));
    const response = await fetch(`${await app.getUrl()}/api/v1/health`);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'error', database: 'down' });
  });
});
