import { INestApplication, RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthService } from '../../auth/auth.service.js';
import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SireneController } from './sirene.controller.js';
import { SireneService } from './sirene.service.js';
import { SiretPipe } from './siret.pipe.js';

const INVALID_SIRET_MESSAGE = 'SIRET invalide : 14 chiffres attendus';

type RouteArgMeta = {
  index: number;
  data?: unknown;
  pipes: unknown[];
};

function siretParamPipes(method: 'getCompany' | 'createCompany'): unknown[] {
  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    SireneController,
    method,
  ) as Record<string, RouteArgMeta> | undefined;

  expect(args).toBeDefined();
  const siretArg = Object.values(args ?? {}).find((arg) => arg.data === 'siret');
  expect(siretArg).toBeDefined();
  return siretArg?.pipes ?? [];
}

describe('SireneController', () => {
  // test unitaire pour la méthode getCompany
  it('passes the siret param to getEtablissementBySiret', async () => {
    const fiche = { siren: '123456789', siret: '12345678900012' };
    const getEtablissementBySiret = vi.fn().mockResolvedValue(fiche);
    const controller = new SireneController({
      getEtablissementBySiret,
    } as never);
    const result = await controller.getCompany('12345678900012');
    expect(getEtablissementBySiret).toHaveBeenCalledWith('12345678900012');
    expect(result).toBe(fiche);
  });
  // test unitaire pour la méthode createCompany
  it('declares POST sync before the parametric GET', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, SireneController.prototype.syncDiscovery),
    ).toBe('sync');
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        SireneController.prototype.syncDiscovery,
      ),
    ).toBe(RequestMethod.POST);
  });

  it('passes through to syncDiscovery', async () => {
    const payload = { scanned: 0, upserted: 0, skipped: 0, skippedOutOfScope: 0 };
    const syncDiscovery = vi.fn().mockResolvedValue(payload);
    const controller = new SireneController({
      syncDiscovery,
    } as never);
    await expect(controller.syncDiscovery()).resolves.toBe(payload);
    expect(syncDiscovery).toHaveBeenCalledOnce();
  });

  it('passes the siret param to createEtablissement', async () => {
    const saved = { id: 'company-1' };
    const createEtablissement = vi.fn().mockResolvedValue(saved);
    const controller = new SireneController({
      createEtablissement,
    } as never);
    const result = await controller.createCompany('12345678900012');
    expect(createEtablissement).toHaveBeenCalledWith('12345678900012');
    expect(result).toBe(saved);
  });

  it('leaves GET public', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SireneController.prototype.getCompany),
    ).toBeUndefined();
  });

  it('protects create with ThrottlerGuard then AuthGuard then AdminGuard', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        SireneController.prototype.createCompany,
      ),
    ).toEqual([ThrottlerGuard, AuthGuard, AdminGuard]);
  });

  it('protects sync with ThrottlerGuard then AuthGuard then AdminGuard', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        SireneController.prototype.syncDiscovery,
      ),
    ).toEqual([ThrottlerGuard, AuthGuard, AdminGuard]);
  });

  it('applies SiretPipe to the GET siret param', () => {
    expect(siretParamPipes('getCompany')).toContain(SiretPipe);
  });

  it('applies SiretPipe to the POST siret param', () => {
    expect(siretParamPipes('createCompany')).toContain(SiretPipe);
  });
});

describe('GET /sirene/:siret (SiretPipe HTTP)', () => {
  let app: INestApplication;
  const getEtablissementBySiret = vi.fn();

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
            getEtablissementBySiret,
            createEtablissement: vi.fn(),
            syncDiscovery: vi.fn(),
          },
        },
        // Real AuthGuard/AdminGuard stay on POST; stubs only satisfy constructor DI.
        { provide: JwtService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    getEtablissementBySiret.mockReset();
  });

  it('returns 400 with the pipe message and does not call SireneService', async () => {
    const response = await request(app.getHttpServer()).get(
      '/sirene/1234567890001A',
    );

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(INVALID_SIRET_MESSAGE);
    expect(getEtablissementBySiret).not.toHaveBeenCalled();
  });

  it('reaches the mocked service for a valid SIRET', async () => {
    const fiche = { siren: '123456789', siret: '12345678900012' };
    getEtablissementBySiret.mockResolvedValue(fiche);

    const response = await request(app.getHttpServer()).get(
      '/sirene/12345678900012',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(fiche);
    expect(getEtablissementBySiret).toHaveBeenCalledWith('12345678900012');
  });

  it('is not throttled by sireneSync after three GETs', async () => {
    getEtablissementBySiret.mockResolvedValue({
      siren: '123456789',
      siret: '12345678900012',
    });
    const server = app.getHttpServer();

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await request(server).get('/sirene/12345678900012');
      expect(response.status, `attempt ${attempt}`).toBe(200);
    }
    expect(getEtablissementBySiret).toHaveBeenCalledTimes(3);
  });
});
