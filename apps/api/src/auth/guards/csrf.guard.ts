import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { WebOrigins } from '../../config/web-origins.js';
import { WEB_ORIGINS } from '../../config/web-origins.module.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedMethods: readonly string[] = ['GET', 'OPTIONS', 'HEAD'];

  constructor(
    @Inject(WEB_ORIGINS) private readonly allowedOrigins: WebOrigins,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (this.allowedMethods.includes(request.method)) {
      return true;
    }

    const requestOrigin: unknown = request.headers.origin;
    if (
      typeof requestOrigin !== 'string' ||
      !this.allowedOrigins.includes(requestOrigin)
    ) {
      throw new ForbiddenException();
    }
    return true;
  }
}
