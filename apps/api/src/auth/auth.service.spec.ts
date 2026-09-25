import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';

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
      create?: ReturnType<typeof vi.fn>;
      update?: ReturnType<typeof vi.fn>;
    };
  },
  host = cookieHost(),
  jwt = jwtService(),
  passwordService: PasswordService = new PasswordService(),
) {
  return {
    service: new AuthService(
      jwt,
      host as never,
      prisma as never,
      passwordService,
    ),
    jwt,
    host,
    passwordService,
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

describe('register', () => {
  const HASH = 'hashed-password';

  function registerService(
    create: ReturnType<typeof vi.fn>,
    setCookie = vi.fn(),
    hash = vi.fn().mockResolvedValue(HASH),
  ) {
    const findUnique = vi.fn().mockResolvedValue({ sessionVersion: 0 });
    const { service } = authService(
      { user: { findUnique, create } },
      cookieHost(setCookie),
      jwtService(),
      { hash, verify: vi.fn() } as never,
    );
    return { service, setCookie, hash, create };
  }

  it('normalizes the email, hashes the password, sets the cookie, and returns id and email only', async () => {
    const create = vi.fn().mockResolvedValue({
      id: USER_ID,
      email: 'ada@example.com',
    });
    const { service, setCookie } = registerService(create);

    const result = await service.register(
      ' Ada@Example.com ',
      'correct horse',
      {} as never,
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        email: 'ada@example.com',
        passwordHash: HASH,
        lastLoginAt: expect.any(Date),
      },
    });
    expect(setCookie).toHaveBeenCalledOnce();
    const token = setCookie.mock.calls[0][2] as string;
    expect(result).toEqual({ id: USER_ID, email: 'ada@example.com' });
    expect(JSON.stringify(result)).not.toContain(token);
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('sessionVersion');
    expect(result).not.toHaveProperty('token');
  });

  it('propagates a Prisma unique error and does not set a cookie', async () => {
    const prismaError = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
    });
    const create = vi.fn().mockRejectedValue(prismaError);
    const { service, setCookie } = registerService(create);

    await expect(
      service.register('ada@example.com', 'correct horse', {} as never),
    ).rejects.toBe(prismaError);
    expect(setCookie).not.toHaveBeenCalled();
  });

  it('rejects an empty password without creating a user', async () => {
    const create = vi.fn();
    const { service } = registerService(create);

    await expect(
      service.register('ada@example.com', '', {} as never),
    ).rejects.toThrow(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a password longer than 72 bytes without creating a user', async () => {
    const create = vi.fn();
    const setCookie = vi.fn();
    const { service } = authService(
      { user: { findUnique: vi.fn(), create } },
      cookieHost(setCookie),
    );

    await expect(
      service.register('ada@example.com', 'a'.repeat(73), {} as never),
    ).rejects.toThrow(BadRequestException);
    expect(create).not.toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
  });

  it.each(['', '   ', 12, null, undefined, { email: 'ada@example.com' }])(
    'rejects email %j without creating a user',
    async (email) => {
      const create = vi.fn();
      const { service } = registerService(create);

      await expect(
        service.register(email, 'correct horse', {} as never),
      ).rejects.toThrow(BadRequestException);
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('rejects a non-string password without hashing', async () => {
    const create = vi.fn();
    const hash = vi.fn();
    const { service } = registerService(create, vi.fn(), hash);

    await expect(
      service.register('ada@example.com', 12, {} as never),
    ).rejects.toThrow(BadRequestException);
    expect(hash).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('login', () => {
  const HASH = 'hashed-password';
  const DUMMY_HASH = 'dummy-hash';

  function loginService(options: {
    findUnique: ReturnType<typeof vi.fn>;
    update?: ReturnType<typeof vi.fn>;
    setCookie?: ReturnType<typeof vi.fn>;
    hash?: ReturnType<typeof vi.fn>;
    verify?: ReturnType<typeof vi.fn>;
  }) {
    const setCookie = options.setCookie ?? vi.fn();
    const update = options.update ?? vi.fn();
    const hash = options.hash ?? vi.fn().mockResolvedValue(DUMMY_HASH);
    const verify = options.verify ?? vi.fn().mockResolvedValue(true);
    const { service } = authService(
      { user: { findUnique: options.findUnique, update } },
      cookieHost(setCookie),
      jwtService(),
      { hash, verify } as never,
    );
    return { service, setCookie, update, hash, verify };
  }

  function userLookup(user: {
    id: string;
    email: string;
    passwordHash: string;
  } | null) {
    return vi.fn(async (args: { where: { email?: string; id?: string } }) => {
      if (args.where.email !== undefined) {
        return user;
      }
      if (args.where.id === USER_ID) {
        return { sessionVersion: 0 };
      }
      return null;
    });
  }

  async function expectGeneric401(promise: Promise<unknown>) {
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect((error as UnauthorizedException).message).toBe('Unauthorized');
  }

  it('updates lastLoginAt, sets the cookie, and returns id and email only', async () => {
    const findUnique = userLookup({
      id: USER_ID,
      email: 'ada@example.com',
      passwordHash: HASH,
    });
    const { service, setCookie, update } = loginService({ findUnique });

    const result = await service.login(
      'ada@example.com',
      'correct horse',
      {} as never,
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(setCookie).toHaveBeenCalledOnce();
    const token = setCookie.mock.calls[0][2] as string;
    expect(result).toEqual({ id: USER_ID, email: 'ada@example.com' });
    expect(JSON.stringify(result)).not.toContain(token);
  });

  it('rejects a wrong password without a cookie or lastLoginAt update', async () => {
    const findUnique = userLookup({
      id: USER_ID,
      email: 'ada@example.com',
      passwordHash: HASH,
    });
    const { service, setCookie, update, verify } = loginService({
      findUnique,
      verify: vi.fn().mockResolvedValue(false),
    });

    await expectGeneric401(
      service.login('ada@example.com', 'wrong', {} as never),
    );
    expect(verify).toHaveBeenCalledWith('wrong', HASH);
    expect(setCookie).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects an unknown email with the same 401 and still verifies', async () => {
    const findUnique = userLookup(null);
    const { service, setCookie, update, verify, hash } = loginService({
      findUnique,
      verify: vi.fn().mockResolvedValue(false),
    });

    await expectGeneric401(
      service.login('unknown@example.com', 'correct horse', {} as never),
    );
    expect(hash).toHaveBeenCalledWith('sonar-login-dummy');
    expect(verify).toHaveBeenCalledWith('correct horse', DUMMY_HASH);
    expect(setCookie).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('finds the stored lowercase email from a mixed-case login', async () => {
    const findUnique = userLookup({
      id: USER_ID,
      email: 'ada@example.com',
      passwordHash: HASH,
    });
    const { service } = loginService({ findUnique });

    await service.login(' Ada@Example.com ', 'correct horse', {} as never);

    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'ada@example.com' },
      select: { id: true, email: true, passwordHash: true },
    });
  });

  it('rejects a blank password without looking up the user', async () => {
    const findUnique = vi.fn();
    const { service } = loginService({ findUnique });

    await expectGeneric401(service.login('ada@example.com', '   ', {} as never));
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects a non-string email without looking up the user', async () => {
    const findUnique = vi.fn();
    const { service } = loginService({ findUnique });

    await expect(
      service.login(12, 'correct horse', {} as never),
    ).rejects.toThrow(BadRequestException);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  const res = {};

  function logoutService(
    findUnique = vi.fn(),
    update = vi.fn(),
    clearCookie = vi.fn(),
    jwt = jwtService(),
  ) {
    const { service } = authService(
      { user: { findUnique, update } },
      cookieHost(vi.fn(), clearCookie),
      jwt,
    );
    return { service, jwt, findUnique, update, clearCookie };
  }

  it('bumps sessionVersion and clears the cookie when the ticket is current', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync({ sub: USER_ID, ver: 0 });
    const { service, update, clearCookie } = logoutService(
      vi.fn().mockResolvedValue({ sessionVersion: 0 }),
      vi.fn().mockResolvedValue({}),
      vi.fn(),
      jwt,
    );

    await expect(service.logout(token, res as never)).resolves.toBeUndefined();
    expect(update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { sessionVersion: { increment: 1 } },
    });
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it('clears the cookie without updating when the token is missing', async () => {
    const { service, update, clearCookie, findUnique } = logoutService();

    await expect(
      service.logout(undefined, res as never),
    ).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it('clears the cookie without updating when the token is empty', async () => {
    const { service, update, clearCookie, findUnique } = logoutService();

    await expect(service.logout('', res as never)).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it('clears the cookie without updating when the JWT is expired', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync(
      { sub: USER_ID, ver: 0 },
      { expiresIn: -1 },
    );
    const { service, update, clearCookie, findUnique } = logoutService(
      vi.fn(),
      vi.fn(),
      vi.fn(),
      jwt,
    );

    await expect(service.logout(token, res as never)).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it('clears the cookie without updating when the signature is wrong', async () => {
    const otherJwt = new JwtService({
      secret: 'other-secret',
      signOptions: { expiresIn: '1d' },
    });
    const token = await otherJwt.signAsync({ sub: USER_ID, ver: 0 });
    const { service, update, clearCookie, findUnique } = logoutService();

    await expect(service.logout(token, res as never)).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it('clears the cookie without bumping when ver is already stale', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync({ sub: USER_ID, ver: 0 });
    const findUnique = vi.fn().mockResolvedValue({ sessionVersion: 1 });
    const { service, update, clearCookie } = logoutService(
      findUnique,
      vi.fn(),
      vi.fn(),
      jwt,
    );

    await expect(service.logout(token, res as never)).resolves.toBeUndefined();
    expect(findUnique).toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it('clears the cookie without bumping when the user is gone', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync({ sub: USER_ID, ver: 0 });
    const { service, update, clearCookie } = logoutService(
      vi.fn().mockResolvedValue(null),
      vi.fn(),
      vi.fn(),
      jwt,
    );

    await expect(service.logout(token, res as never)).resolves.toBeUndefined();
    expect(update).not.toHaveBeenCalled();
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it('clears the cookie without bumping when ver is missing from the payload', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync({ sub: USER_ID });
    const { service, update, clearCookie, findUnique } = logoutService(
      vi.fn(),
      vi.fn(),
      vi.fn(),
      jwt,
    );

    await expect(service.logout(token, res as never)).resolves.toBeUndefined();
    expect(findUnique).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(clearCookie).toHaveBeenCalledOnce();
  });

  it('does not clear the cookie when the session bump fails', async () => {
    const jwt = jwtService();
    const token = await jwt.signAsync({ sub: USER_ID, ver: 0 });
    const dbError = new Error('db down');
    const { service, clearCookie } = logoutService(
      vi.fn().mockResolvedValue({ sessionVersion: 0 }),
      vi.fn().mockRejectedValue(dbError),
      vi.fn(),
      jwt,
    );

    await expect(service.logout(token, res as never)).rejects.toBe(dbError);
    expect(clearCookie).not.toHaveBeenCalled();
  });
});
