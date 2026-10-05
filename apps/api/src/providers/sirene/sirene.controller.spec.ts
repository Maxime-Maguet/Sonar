import { INestApplication } from '@nestjs/common';
import { GUARDS_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
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

  it('protects create with AuthGuard then AdminGuard', () => {
    expect(
      Reflect.getMetadata(
        GUARDS_METADATA,
        SireneController.prototype.createCompany,
      ),
    ).toEqual([AuthGuard, AdminGuard]);
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
      controllers: [SireneController],
      providers: [
        {
          provide: SireneService,
          useValue: {
            getEtablissementBySiret,
            createEtablissement: vi.fn(),
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
});
