import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { applyCors } from './../src/config/cors.options.js';
import { resolveWebOrigins } from './../src/config/web-origins.js';

@Controller()
class PingController {
  @Get('ping')
  ping(): string {
    return 'pong';
  }
}

@Module({ controllers: [PingController] })
class PingModule {}

describe('CORS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PingModule],
    }).compile();
    app = moduleRef.createNestApplication();
    applyCors(app, resolveWebOrigins('http://a.com,http://b.com', 'test'), 'test');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reflects an allowed origin with credentials', async () => {
    const res = await request(app.getHttpServer())
      .get('/ping')
      .set('Origin', 'http://b.com')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://b.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not allow an unknown origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/ping')
      .set('Origin', 'http://evil.com')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets no allow-origin header without an Origin header', async () => {
    const res = await request(app.getHttpServer()).get('/ping').expect(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers the preflight for an allowed origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/ping')
      .set('Origin', 'http://a.com')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://a.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
  });

  it('does not allow the preflight of an unknown origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/ping')
      .set('Origin', 'http://evil.com')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('CORS with a single origin (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PingModule],
    }).compile();
    app = moduleRef.createNestApplication();
    applyCors(app, resolveWebOrigins('http://a.com', 'test'), 'test');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows the single configured origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/ping')
      .set('Origin', 'http://a.com')
      .expect(200);
    expect(res.headers['access-control-allow-origin']).toBe('http://a.com');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('never reflects another origin (string mode returns the fixed origin)', async () => {
    const res = await request(app.getHttpServer())
      .get('/ping')
      .set('Origin', 'http://b.com')
      .expect(200);
    // La lib `cors` renvoie l'origine fixe : le navigateur bloque (valeur != Origin).
    expect(res.headers['access-control-allow-origin']).toBe('http://a.com');
    expect(res.headers['access-control-allow-origin']).not.toBe('http://b.com');
  });
});

describe('CORS production guard (e2e)', () => {
  it('resolveWebOrigins throws on localhost in production', () => {
    expect(() =>
      resolveWebOrigins('http://localhost:3000', 'production'),
    ).toThrow(/WEB_ORIGIN/);
  });

  it('applyCors throws on localhost in production, even with a raw list', () => {
    const app = { enableCors: vi.fn() };
    expect(() =>
      applyCors(app, ['http://localhost:3000'], 'production'),
    ).toThrow(/WEB_ORIGIN/);
    expect(app.enableCors).not.toHaveBeenCalled();
  });
});
