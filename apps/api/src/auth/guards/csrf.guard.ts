import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseWebOrigins } from '../../config/web-origins.js';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedMethods = ['GET', 'OPTIONS', 'HEAD'];
  private readonly allowedOrigins: string[];

  constructor(configService: ConfigService) {
    this.allowedOrigins = parseWebOrigins(
      configService.getOrThrow<string>('WEB_ORIGIN'),
    );
  }

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
