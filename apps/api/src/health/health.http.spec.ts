import { INestApplication, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaClientExceptionFilter } from '../common/filters/prisma-exception.filter.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

const OK_DOCUMENT = {
  status: 'ok',
  process: { postgres: 'up' },
  dependencies: {
    sirene: 'unchecked',
    laBonneBoite: 'unchecked',
  },
};

const DOWN_DOCUMENT = {
  status: 'down',
  process: { postgres: 'down' },
  dependencies: {
    sirene: 'unchecked',
    laBonneBoite: 'unchecked',
  },
};

const DRIVER_SECRET = 'postgres://sonar:secret@db:5432/sonar';

async function healthApp(queryRaw: ReturnType<typeof vi.fn>) {
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: PrismaService, useValue: { $queryRaw: queryRaw } }],
  }).compile();

  const app = moduleRef.createNestApplication();
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));
  await app.init();
  return app;
}

describe('GET /health', () => {
  let app: INestApplication;

  afterEach(async () => {
    vi.restoreAllMocks();
    await app?.close();
  });

  it('returns the ok document when SELECT 1 completes', async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ one: 1 }]);
    app = await healthApp(queryRaw);

    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(OK_DOCUMENT);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(queryRaw).toHaveBeenCalledOnce();
  });

  it('returns the down document when SELECT 1 comes back empty', async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);
    app = await healthApp(queryRaw);
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual(DOWN_DOCUMENT);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(errorLog).toHaveBeenCalled();
    errorLog.mockRestore();
  });

  it('returns the down document when SELECT 1 does not finish within one second', async () => {
    const queryRaw = vi.fn().mockReturnValue(new Promise(() => undefined));
    app = await healthApp(queryRaw);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const started = Date.now();

    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual(DOWN_DOCUMENT);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
    expect(Date.now() - started).toBeLessThan(2_500);
  }, 4_000);

  it('returns the down document when Postgres raises a known Prisma error', async () => {
    const queryRaw = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        `connect ECONNREFUSED ${DRIVER_SECRET}`,
        { code: 'P2025', clientVersion: 'test' },
      ),
    );
    app = await healthApp(queryRaw);
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(503);
    expect(errorLog).toHaveBeenCalled();
    expect(JSON.stringify(errorLog.mock.calls)).toContain('secret');
    errorLog.mockRestore();
    expect(response.body).toEqual(DOWN_DOCUMENT);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toContain('secret');
    expect(JSON.stringify(response.body)).not.toContain('statusCode');
  });
});
