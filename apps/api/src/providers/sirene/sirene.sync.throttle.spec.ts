import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { SireneController } from './sirene.controller.js';
import { SireneService } from './sirene.service.js';

const SYNC_RESULT = {
  scanned: 0,
  upserted: 0,
  skipped: 0,
  skippedOutOfScope: 0,
};

describe('POST /sirene/sync throttle', () => {
  let app: INestApplication;
  const syncDiscovery = vi.fn().mockResolvedValue(SYNC_RESULT);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'login', ttl: seconds(60), limit: 5 },
          { name: 'sireneSync', ttl: seconds(60), limit: 2 },
        ]),
      ],
      controllers: [SireneController],
      providers: [
        {
          provide: SireneService,
          useValue: {
            syncDiscovery,
            getEtablissementBySiret: vi.fn(),
            createEtablissement: vi.fn(),
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 429 on the 3rd sync from the same IP', async () => {
    const server = app.getHttpServer();

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await request(server).post('/sirene/sync');
      expect(response.status, `attempt ${attempt}`).toBe(200);
    }

    const blocked = await request(server).post('/sirene/sync');
    expect(blocked.status).toBe(429);
    expect(syncDiscovery).toHaveBeenCalledTimes(2);
  });
});

describe('POST /sirene/:siret/create throttle', () => {
  let app: INestApplication;
  const createEtablissement = vi.fn().mockResolvedValue({ id: 'company-1' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'login', ttl: seconds(60), limit: 5 },
          { name: 'sireneSync', ttl: seconds(60), limit: 2 },
        ]),
      ],
      controllers: [SireneController],
      providers: [
        {
          provide: SireneService,
          useValue: {
            syncDiscovery: vi.fn(),
            getEtablissementBySiret: vi.fn(),
            createEtablissement,
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns 429 on the 3rd create from the same IP', async () => {
    const server = app.getHttpServer();

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await request(server).post(
        '/sirene/12345678900012/create',
      );
      expect(response.status, `attempt ${attempt}`).toBe(201);
    }

    const blocked = await request(server).post('/sirene/12345678900012/create');
    expect(blocked.status).toBe(429);
    expect(createEtablissement).toHaveBeenCalledTimes(2);
  });
});
