import { UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const USER = { id: USER_ID, email: 'ada@example.com' };
const res = {};

function controllerWith(
  authService: {
    register?: ReturnType<typeof vi.fn>;
    login?: ReturnType<typeof vi.fn>;
    logout?: ReturnType<typeof vi.fn>;
    me?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const register = authService.register ?? vi.fn().mockResolvedValue(USER);
  const login = authService.login ?? vi.fn().mockResolvedValue(USER);
  const logout = authService.logout ?? vi.fn().mockResolvedValue(undefined);
  const me = authService.me ?? vi.fn().mockResolvedValue(USER);
  return {
    controller: new AuthController({
      register,
      login,
      logout,
      me,
    } as never),
    register,
    login,
    logout,
    me,
  };
}

describe('AuthController', () => {
  it('uses HTTP 200 on login (Nest POST defaults to 201)', () => {
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, AuthController.prototype.login),
    ).toBe(200);
  });

  it('uses HTTP 204 on logout and does not attach AuthGuard', () => {
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, AuthController.prototype.logout),
    ).toBe(204);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.logout),
    ).toBeUndefined();
  });

  it('protects me with AuthGuard', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.me),
    ).toContain(AuthGuard);
  });

  it('does not attach AuthGuard to register or login', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.register),
    ).toBeUndefined();
    expect(
      Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.login),
    ).toBeUndefined();
  });

  it('returns the register service value without adding fields', async () => {
    const { controller, register } = controllerWith();

    await expect(
      controller.register({ email: 'ada@example.com', password: 'x' }, res as never),
    ).resolves.toEqual(USER);
    expect(register).toHaveBeenCalledWith('ada@example.com', 'x', res);
  });

  it('returns the login service value without adding fields', async () => {
    const { controller, login } = controllerWith();

    await expect(
      controller.login({ email: 'ada@example.com', password: 'x' }, res as never),
    ).resolves.toEqual(USER);
    expect(login).toHaveBeenCalledWith('ada@example.com', 'x', res);
  });

  it('forwards a missing body as undefined email and password', async () => {
    const { controller, register } = controllerWith();

    await controller.register(undefined as never, res as never);

    expect(register).toHaveBeenCalledWith(undefined, undefined, res);
  });

  it('forwards the session cookie to logout', async () => {
    const { controller, logout } = controllerWith();

    await controller.logout(
      { cookies: { sonar_session: 'jwt-value' } } as never,
      res as never,
    );

    expect(logout).toHaveBeenCalledWith('jwt-value', res);
  });

  it('reads sub from the request user set by AuthGuard', async () => {
    const { controller, me } = controllerWith();

    await expect(
      controller.me({ user: { sub: USER_ID, ver: 0 } } as never),
    ).resolves.toEqual(USER);
    expect(me).toHaveBeenCalledWith(USER_ID);
  });

  it('rejects me when the guard did not set request.user', () => {
    const { controller, me } = controllerWith();

    expect(() => controller.me({} as never)).toThrow(UnauthorizedException);
    expect(me).not.toHaveBeenCalled();
  });
});
