import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client.js';
import { AdminGuard } from './admin.guard.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function context(user?: { sub?: string }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

function guardWith(findUnique: ReturnType<typeof vi.fn>) {
  return new AdminGuard({ user: { findUnique } } as never);
}

describe('AdminGuard', () => {
  it('returns 401 when AuthGuard did not attach a user', async () => {
    const findUnique = vi.fn();
    const guard = guardWith(findUnique);

    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 when the session subject is missing', async () => {
    const findUnique = vi.fn();
    const guard = guardWith(findUnique);

    await expect(
      guard.canActivate(context({ sub: '' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns 403 when the user no longer exists', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const guard = guardWith(findUnique);

    await expect(
      guard.canActivate(context({ sub: USER_ID })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: USER_ID },
      select: { role: true },
    });
  });

  it('returns 403 for a non-admin session', async () => {
    const findUnique = vi.fn().mockResolvedValue({ role: UserRole.USER });
    const guard = guardWith(findUnique);

    await expect(
      guard.canActivate(context({ sub: USER_ID })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an admin', async () => {
    const findUnique = vi.fn().mockResolvedValue({ role: UserRole.ADMIN });
    const guard = guardWith(findUnique);

    await expect(guard.canActivate(context({ sub: USER_ID }))).resolves.toBe(
      true,
    );
  });
});
