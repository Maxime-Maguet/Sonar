import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const token = request.cookies?.sonar_session;
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync(token);
      if (typeof payload.sub !== 'string' || typeof payload.ver !== 'number') {
        throw new UnauthorizedException();
      }
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { sessionVersion: true },
      });
      if (!user || user.sessionVersion !== payload.ver) {
        this.authService.clearSessionFromCookie(res);
        throw new UnauthorizedException();
      }
      const now = Math.floor(Date.now() / 1000);
      const remaining = payload.exp - now;
      if (remaining > 0 && remaining < 12 * 60 * 60) {
        await this.authService.issue(payload.sub, res);
      }
      request['user'] = { sub: payload.sub, ver: payload.ver };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
