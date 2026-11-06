import { Controller, Get, INestApplication, UseGuards } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  seconds,
  SkipThrottle,
  Throttle,
  ThrottlerGuard,
  ThrottlerModule,
} from './index.js';
import { normalizeIp } from './throttler.ip.js';
import { SWEEP_INTERVAL_MS, ThrottlerStorage } from './throttler.storage.js';

describe('seconds', () => {
  it('convertit en millisecondes', () => {
    expect(seconds(60)).toBe(60_000);
  });
});

describe('ThrottlerStorage', () => {
  let storage: ThrottlerStorage;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    storage = new ThrottlerStorage();
  });

  afterEach(() => {
    storage.onApplicationShutdown();
    vi.useRealTimers();
  });

  it('bloque après la limite puis libère à la fin de la fenêtre', () => {
    for (let i = 1; i <= 2; i += 1) {
      expect(storage.increment('k', seconds(60), 2).isBlocked).toBe(false);
    }
    const blocked = storage.increment('k', seconds(60), 2);
    expect(blocked.isBlocked).toBe(true);
    expect(blocked.timeToBlockExpire).toBe(60);

    vi.advanceTimersByTime(seconds(30));
    const stillBlocked = storage.increment('k', seconds(60), 2);
    expect(stillBlocked.isBlocked).toBe(true);
    expect(stillBlocked.timeToBlockExpire).toBe(30);

    vi.advanceTimersByTime(seconds(30));
    const released = storage.increment('k', seconds(60), 2);
    expect(released.isBlocked).toBe(false);
    expect(released.totalHits).toBe(1);
  });

  it('les requêtes sortent de la fenêtre glissante', () => {
    storage.increment('k', seconds(60), 2);
    vi.advanceTimersByTime(seconds(61));
    expect(storage.increment('k', seconds(60), 2).totalHits).toBe(1);
  });

  it('compte séparément chaque clé', () => {
    storage.increment('a', seconds(60), 1);
    expect(storage.increment('a', seconds(60), 1).isBlocked).toBe(true);
    expect(storage.increment('b', seconds(60), 1).isBlocked).toBe(false);
  });

  it('purge les enregistrements expirés (pas de fuite mémoire)', () => {
    storage.increment('a', seconds(60), 5);
    storage.increment('b', seconds(60), 5);
    expect(storage.size).toBe(2);

    vi.advanceTimersByTime(seconds(60) + SWEEP_INTERVAL_MS);
    expect(storage.size).toBe(0);
  });

  it('ne purge pas une clé encore bloquée', () => {
    storage.increment('a', seconds(60), 1);
    storage.increment('a', seconds(60), 1); // bloque jusqu'à +60 s
    vi.advanceTimersByTime(seconds(30));
    storage.evictIdleRecords();
    expect(storage.size).toBe(1);
  });
});

describe('normalizeIp', () => {
  it('garde IPv4, ramène IPv4 mappée, regroupe IPv6 par /64', () => {
    expect(normalizeIp('203.0.113.7')).toBe('203.0.113.7');
    expect(normalizeIp('::ffff:203.0.113.7')).toBe('203.0.113.7');
    expect(normalizeIp('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).toBe(
      '2001:db8:1:2::/64',
    );
    expect(normalizeIp('2001:db8:1:2:1:2:3:4')).toBe(
      normalizeIp('2001:db8:1:2:ffff:0:0:1'),
    );
    expect(normalizeIp('::1')).toBe('::1');
  });
});

@Controller('demo')
@UseGuards(ThrottlerGuard)
@Throttle({ alpha: { limit: 2, ttl: seconds(60) } })
@SkipThrottle({ beta: true })
class DemoController {
  @Get('alpha')
  alpha() {
    return { ok: true };
  }

  @Get('other')
  other() {
    return { ok: true };
  }

  // Surcharge de route : limite 1 pour alpha ; beta réactivé.
  @Get('override')
  @Throttle({ alpha: { limit: 1, ttl: seconds(60) } })
  @SkipThrottle({ beta: false })
  override() {
    return { ok: true };
  }
}

describe('ThrottlerGuard (HTTP)', () => {
  let app: NestExpressApplication & INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'alpha', ttl: seconds(60), limit: 100 },
          { name: 'beta', ttl: seconds(60), limit: 1 },
        ]),
      ],
      controllers: [DemoController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set('trust proxy', true);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const get = (path: string, ip = '203.0.113.1') =>
    request(app.getHttpServer()).get(path).set('X-Forwarded-For', ip);

  it('répond 429 au-delà de la limite de @Throttle, avec Retry-After', async () => {
    expect((await get('/demo/alpha')).status).toBe(200);
    expect((await get('/demo/alpha')).status).toBe(200);
    const blocked = await get('/demo/alpha');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({
      statusCode: 429,
      message: 'ThrottlerException: Too Many Requests',
    });
    expect(blocked.headers['retry-after-alpha']).toBe('60');
  });

  it('expose les en-têtes X-RateLimit nommés', async () => {
    const response = await get('/demo/alpha');
    expect(response.headers['x-ratelimit-limit-alpha']).toBe('2');
    expect(response.headers['x-ratelimit-remaining-alpha']).toBe('1');
    expect(response.headers['x-ratelimit-reset-alpha']).toBe('60');
    expect(response.headers['x-ratelimit-limit-beta']).toBeUndefined();
  });

  it('compte séparément par IP', async () => {
    await get('/demo/alpha', '203.0.113.1');
    await get('/demo/alpha', '203.0.113.1');
    expect((await get('/demo/alpha', '203.0.113.1')).status).toBe(429);
    expect((await get('/demo/alpha', '203.0.113.2')).status).toBe(200);
  });

  it('compte séparément par route', async () => {
    await get('/demo/alpha');
    await get('/demo/alpha');
    expect((await get('/demo/alpha')).status).toBe(429);
    expect((await get('/demo/other')).status).toBe(200);
  });

  it('SkipThrottle de classe ignore le limiteur beta', async () => {
    // beta (limite 1) est ignoré : deux requêtes passent (limite alpha = 2).
    for (let i = 0; i < 2; i += 1) {
      expect((await get('/demo/other')).status).toBe(200);
    }
  });

  it('une surcharge de route remplace la classe (limite et skip)', async () => {
    expect((await get('/demo/override')).status).toBe(200);
    // alpha limite 1 (route) ET beta réactivé (limite 1) : 2e requête bloquée.
    const blocked = await get('/demo/override');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after-alpha']).toBe('60');
  });

  it('compte séparément par nom de limiteur', async () => {
    // beta est actif sur override uniquement : bloque sans toucher alpha ailleurs.
    await get('/demo/override');
    expect((await get('/demo/override')).status).toBe(429);
    expect((await get('/demo/alpha')).status).toBe(200);
  });
});

describe('ThrottlerGuard (expiration de fenêtre)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { name: 'alpha', ttl: seconds(60), limit: 100 },
          { name: 'beta', ttl: seconds(60), limit: 1 },
        ]),
      ],
      controllers: [DemoController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.useRealTimers();
  });

  it('libère la route après la fenêtre', async () => {
    const server = app.getHttpServer();
    await request(server).get('/demo/alpha');
    await request(server).get('/demo/alpha');
    expect((await request(server).get('/demo/alpha')).status).toBe(429);

    vi.setSystemTime(new Date('2026-01-01T00:01:01Z'));
    expect((await request(server).get('/demo/alpha')).status).toBe(200);
  });
});
