import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedMethods = ['GET', 'OPTIONS', 'HEAD'];
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (this.allowedMethods.includes(request.method)) {
      return true;
    }

    const webOrigin = this.configService.getOrThrow('WEB_ORIGIN');
    const requestOrigin = request.headers.origin;
    if (requestOrigin !== webOrigin) {
      throw new ForbiddenException();
    }
    return true;
  }
}
