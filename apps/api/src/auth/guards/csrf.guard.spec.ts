import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard.js';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;

  function buildContext(method: string, origin?: string) {
    const mockRequest = { method, headers: { origin } };
    return {
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CsrfGuard,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'http://localhost:3000' },
        },
      ],
    }).compile();

    guard = module.get(CsrfGuard);
  });

  it('laisse passer un GET sans Origin', () => {
    const context = buildContext('GET', undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('laisse passer un POST avec la bonne Origin', () => {
    const context = buildContext('POST', 'http://localhost:3000');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejette un POST sans Origin', () => {
    const context = buildContext('POST', undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejette un POST avec une Origin étrangère', () => {
    const context = buildContext('POST', 'https://evil.example');
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  describe('plusieurs origines', () => {
    async function guardFor(list: string) {
      const module = await Test.createTestingModule({
        providers: [
          CsrfGuard,
          {
            provide: ConfigService,
            useValue: { getOrThrow: () => list },
          },
        ],
      }).compile();
      return module.get(CsrfGuard);
    }
    const list = 'http://localhost:3000, http://192.168.1.20:3000';

    it('laisse passer chaque origine de la liste', async () => {
      const g = await guardFor(list);
      expect(g.canActivate(buildContext('POST', 'http://localhost:3000'))).toBe(
        true,
      );
      expect(
        g.canActivate(buildContext('POST', 'http://192.168.1.20:3000')),
      ).toBe(true);
    });

    it('parse WEB_ORIGIN une seule fois (constructeur)', async () => {
      const getOrThrow = vi.fn(() => list);
      const module = await Test.createTestingModule({
        providers: [CsrfGuard, { provide: ConfigService, useValue: { getOrThrow } }],
      }).compile();
      const g = module.get(CsrfGuard);
      g.canActivate(buildContext('POST', 'http://localhost:3000'));
      g.canActivate(buildContext('POST', 'http://localhost:3000'));
      expect(getOrThrow).toHaveBeenCalledTimes(1);
    });

    it('rejette une origine inconnue et une Origin absente', async () => {
      const g = await guardFor(list);
      expect(() =>
        g.canActivate(buildContext('POST', 'http://192.168.1.21:3000')),
      ).toThrow(ForbiddenException);
      expect(() => g.canActivate(buildContext('POST'))).toThrow(
        ForbiddenException,
      );
    });
  });

  it('laisse passer HEAD et OPTIONS sans Origin', () => {
    expect(guard.canActivate(buildContext('HEAD'))).toBe(true);
    expect(guard.canActivate(buildContext('OPTIONS'))).toBe(true);
  });

  it('rejette un POST depuis un autre port localhost', () => {
    const context = buildContext('POST', 'http://localhost:9999');
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it.each(['PUT', 'PATCH', 'DELETE'] as const)(
    'applique la même règle à %s',
    (method) => {
      expect(guard.canActivate(buildContext(method, 'http://localhost:3000'))).toBe(
        true,
      );
      expect(() => guard.canActivate(buildContext(method))).toThrow(
        ForbiddenException,
      );
      expect(() =>
        guard.canActivate(buildContext(method, 'http://localhost:9999')),
      ).toThrow(ForbiddenException);
    },
  );
});
