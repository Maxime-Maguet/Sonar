import { INestApplication, ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from '../auth/auth.controller.js';
import { AuthService } from '../auth/auth.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { CompaniesController } from './companies.controller.js';
import { CompaniesService } from './companies.service.js';

const PAGE = {
  hits: 0,
  page: 1,
  pageSize: 20,
  items: [],
  facets: { cities: [], activities: [] },
  syncedAt: null,
};

const list = vi.fn();

async function buildApp(): Promise<INestApplication> {
  {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'login', ttl: seconds(60), limit: 5 },
          { name: 'sireneSync', ttl: seconds(60), limit: 2 },
          { name: 'laBonneBoite', ttl: seconds(60), limit: 10 },
          { name: 'companies', ttl: seconds(60), limit: 60 },
        ]),
      ],
      controllers: [CompaniesController, AuthController],
      providers: [
        { provide: CompaniesService, useValue: { list } },
        {
          provide: AuthService,
          useValue: { login: vi.fn().mockResolvedValue({}) },
        },
      ],
    })
      // Any AuthGuard would answer 403: proves /companies does not use it.
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => false })
      .compile();

    const app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    return app;
  }
}

describe('GET /companies', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    list.mockReset().mockResolvedValue(PAGE);
  });

  it('registers only the throttler guard (no AuthGuard)', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CompaniesController.prototype.list),
    ).toEqual([ThrottlerGuard]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, CompaniesController),
    ).toBeUndefined();
  });

  it('answers 200 without cookie and passes defaults to the service', async () => {
    const res = await request(app.getHttpServer()).get('/companies');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(PAGE);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20 }),
    );
  });

  it('passes validated filters to the service', async () => {
    await request(app.getHttpServer()).get('/companies').query({
      page: '2',
      pageSize: '50',
      city: ' Lyon ',
      activityCode: '62.01Z',
    });
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 50,
        city: 'Lyon',
        activityCode: '62.01Z',
      }),
    );
  });

  it.each([
    'page=abc',
    'page=0',
    'page=1.5',
    'page=1e1',
    'page=10001',
    'pageSize=51',
    'pageSize=0',
    'activityCode=abc',
    'activityCode=62.01z',
    'city=%20%20',
    'foo=bar',
  ])('rejects %s with 400 and never calls the service', async (qs) => {
    const res = await request(app.getHttpServer()).get(`/companies?${qs}`);
    expect(res.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('GET /companies throttle', () => {
  let app: INestApplication;

  beforeAll(async () => {
    list.mockResolvedValue(PAGE);
    app = await buildApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('has its own throttler: 61st request gets 429 and other routes do not count', async () => {
    const server = app.getHttpServer();
    for (let i = 1; i <= 5; i += 1) {
      const r = await request(server)
        .post('/auth/login')
        .send({ email: 'ada@example.com', password: 'secret' });
      expect(r.status, `login ${i}`).toBe(200);
    }
    for (let i = 1; i <= 60; i += 1) {
      const r = await request(server).get('/companies');
      expect(r.status, `companies ${i}`).toBe(200);
    }
    const blocked = await request(server).get('/companies');
    expect(blocked.status).toBe(429);
  });
});
