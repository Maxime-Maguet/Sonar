import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

const SECRET = 'test-jwt-secret';
const USER_ID = '11111111-1111-4111-8111-111111111111';

function jwtService() {
  return new JwtService({
    secret: SECRET,
    signOptions: { expiresIn: '1d' },
  });
}

function cookieHost(setCookie = vi.fn(), clearCookie = vi.fn()) {
  return {
    httpAdapter: { setCookie, clearCookie },
  };
}

function authService(
  prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update?: ReturnType<typeof vi.fn>;
    };
  },
  host = cookieHost(),
  jwt = jwtService(),
) {
  return {
    service: new AuthService(jwt, host as never, prisma as never),
    jwt,
    host,
  };
}

describe('signSession', () => {
  it('signs a token with sub and ver, verifiable with the same secret', async () => {
    const { service, jwt } = authService({ user: { findUnique: vi.fn() } });

    const token = await service.signSession(USER_ID, 3);
    const payload = await jwt.verifyAsync(token);

    expect(payload.sub).toBe(USER_ID);
    expect(payload.ver).toBe(3);
  });
});

describe('attachSessionToCookie', () => {
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('sets sonar_session with httpOnly, path /, sameSite lax, and not secure outside production', () => {
    process.env.NODE_ENV = 'test';
    const setCookie = vi.fn();
    const { service } = authService(
      { user: { findUnique: vi.fn() } },
      cookieHost(setCookie),
    );
    const res = {};

    service.attachSessionToCookie(res as never, 'signed-token');

    expect(setCookie).toHaveBeenCalledWith(
      res,
      'sonar_session',
      'signed-token',
      {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      },
    );
  });

  it('sets secure only when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    const setCookie = vi.fn();
    const { service } = authService(
      { user: { findUnique: vi.fn() } },
      cookieHost(setCookie),
    );

    service.attachSessionToCookie({} as never, 'signed-token');

    expect(setCookie.mock.calls[0][3].secure).toBe(true);
  });
});

describe('clearSessionFromCookie', () => {
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('clears sonar_session with the same path, sameSite, and secure flags', () => {
    process.env.NODE_ENV = 'production';
    const clearCookie = vi.fn();
    const { service } = authService(
      { user: { findUnique: vi.fn() } },
      cookieHost(vi.fn(), clearCookie),
    );
    const res = {};

    service.clearSessionFromCookie(res as never);

    expect(clearCookie).toHaveBeenCalledWith(res, 'sonar_session', {
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });
});

describe('issue', () => {
  it('throws UnauthorizedException when the user does not exist', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const setCookie = vi.fn();
    const { service } = authService(
      { user: { findUnique } },
      cookieHost(setCookie),
    );

    await expect(service.issue(USER_ID, {} as never)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(setCookie).not.toHaveBeenCalled();
  });
});

describe('AuthGuard', () => {
  function guardFor(
    sessionVersion: number | null,
    token: string | undefined,
    authorization?: string,
  ) {
    const request: {
      cookies?: { sonar_session?: string };
      headers: { authorization?: string };
      user?: unknown;
    } = {
      cookies: token === undefined ? {} : { sonar_session: token },
      headers: authorization ? { authorization } : {},
    };
    const res = {};
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => res,
      }),
    };
    const findUnique = vi
      .fn()
      .mockResolvedValue(sessionVersion === null ? null : { sessionVersion });
    const clearCookie = vi.fn();
    const setCookie = vi.fn();
    const jwt = jwtService();
    const { service } = authService(
      { user: { findUnique } },
      cookieHost(setCookie, clearCookie),
      jwt,
    );
    const guard = new AuthGuard(
      jwt,
      { user: { findUnique } } as never,
      service,
    );

    return { guard, context, request, res, clearCookie, setCookie, jwt };
  }

  it('sets request.user when the cookie is valid and ver matches', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync({ sub: USER_ID, ver: 2 });
    const { guard, context, request, setCookie } = guardFor(2, token);

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(request.user).toEqual({ sub: USER_ID, ver: 2 });
    expect(setCookie).not.toHaveBeenCalled();
  });

  it('rejects a request with no cookie', async () => {
    const { guard, context } = guardFor(0, undefined);

    await expect(guard.canActivate(context as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an expired cookie', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync(
      { sub: USER_ID, ver: 0 },
      { expiresIn: -1 },
    );
    const { guard, context } = guardFor(0, token);

    await expect(guard.canActivate(context as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a Bearer token when the session cookie is absent', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync({ sub: USER_ID, ver: 0 });
    const { guard, context } = guardFor(0, undefined, `Bearer ${token}`);

    await expect(guard.canActivate(context as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects and clears the cookie when ver does not match sessionVersion', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync({ sub: USER_ID, ver: 1 });
    const { guard, context, clearCookie, res } = guardFor(2, token);

    await expect(guard.canActivate(context as never)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(clearCookie).toHaveBeenCalledWith(
      res,
      'sonar_session',
      expect.objectContaining({ path: '/', sameSite: 'lax' }),
    );
  });
});

describe('bumpSessionVersion', () => {
  it('makes a previously issued JWT fail the guard', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync({ sub: USER_ID, ver: 1 });
    let sessionVersion = 1;
    const findUnique = vi.fn(async () => ({ sessionVersion }));
    const update = vi.fn(async () => {
      sessionVersion += 1;
      return { sessionVersion };
    });
    const clearCookie = vi.fn();
    const { service } = authService(
      { user: { findUnique, update } },
      cookieHost(vi.fn(), clearCookie),
      jwt,
    );
    const res = {};

    await service.bumpSessionVersion(USER_ID, res as never);

    expect(update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { sessionVersion: { increment: 1 } },
    });
    expect(clearCookie).toHaveBeenCalledWith(res, 'sonar_session', {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    const request = { cookies: { sonar_session: token }, headers: {} };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => res,
      }),
    };
    const guard = new AuthGuard(
      jwt,
      { user: { findUnique } } as never,
      service,
    );

    await expect(guard.canActivate(context as never)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('sliding reissue', () => {
  it('rewrites the cookie when the JWT has lived more than 12 hours', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync(
      { sub: USER_ID, ver: 4 },
      { expiresIn: 11 * 60 * 60 },
    );
    const findUnique = vi.fn().mockResolvedValue({ sessionVersion: 4 });
    const setCookie = vi.fn();
    const { service } = authService(
      { user: { findUnique } },
      cookieHost(setCookie),
      jwt,
    );
    const request = { cookies: { sonar_session: token }, headers: {} };
    const res = {};
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => res,
      }),
    };
    const guard = new AuthGuard(
      jwt,
      { user: { findUnique } } as never,
      service,
    );

    await expect(guard.canActivate(context as never)).resolves.toBe(true);

    expect(setCookie).toHaveBeenCalledOnce();
    const rewritten = setCookie.mock.calls[0][2] as string;
    expect(rewritten).not.toBe(token);
    const payload = await jwt.verifyAsync(rewritten);
    expect(payload.sub).toBe(USER_ID);
    expect(payload.ver).toBe(4);
  });

  it('does not rewrite the cookie when the JWT is still young', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync({ sub: USER_ID, ver: 4 });
    const { guard, context, setCookie } = (() => {
      const findUnique = vi.fn().mockResolvedValue({ sessionVersion: 4 });
      const setCookie = vi.fn();
      const { service } = authService(
        { user: { findUnique } },
        cookieHost(setCookie),
        jwt,
      );
      const request = { cookies: { sonar_session: token }, headers: {} };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => ({}),
        }),
      };
      return {
        guard: new AuthGuard(jwt, { user: { findUnique } } as never, service),
        context,
        setCookie,
      };
    })();

    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect(setCookie).not.toHaveBeenCalled();
  });
});
