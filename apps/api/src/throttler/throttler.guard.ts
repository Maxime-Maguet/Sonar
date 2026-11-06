import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  THROTTLER_LIMIT,
  THROTTLER_OPTIONS,
  THROTTLER_SKIP,
  THROTTLER_STORAGE,
  THROTTLER_TTL,
} from './throttler.constants.js';
import { ThrottlerException } from './throttler.exception.js';
import type { ThrottlerOptions } from './throttler.interfaces.js';
import { normalizeIp } from './throttler.ip.js';
import { ThrottlerStorage } from './throttler.storage.js';

const HEADER_PREFIX = 'X-RateLimit';

/**
 * Garde de limitation de débit. Pour chaque limiteur nommé non ignoré
 * (`@SkipThrottle`), compte les requêtes par route et par IP (`req.ip`,
 * donc dépendante de TRUST_PROXY_HOPS) ; répond 429 au-delà de `limit`.
 * Les valeurs de `@Throttle` (route puis classe) remplacent celles du module.
 */
@Injectable()
export class ThrottlerGuard implements CanActivate {
  constructor(
    @Inject(THROTTLER_OPTIONS) private readonly throttlers: ThrottlerOptions[],
    @Inject(THROTTLER_STORAGE) private readonly storage: ThrottlerStorage,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const classRef = context.getClass();
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const tracker = normalizeIp(req.ip) ?? '';

    for (const throttler of this.throttlers) {
      const { name } = throttler;
      const skip = this.reflector.getAllAndOverride<boolean | undefined>(
        THROTTLER_SKIP + name,
        [handler, classRef],
      );
      if (skip) continue;

      const limit =
        this.reflector.getAllAndOverride<number | undefined>(
          THROTTLER_LIMIT + name,
          [handler, classRef],
        ) ?? throttler.limit;
      const ttl =
        this.reflector.getAllAndOverride<number | undefined>(
          THROTTLER_TTL + name,
          [handler, classRef],
        ) ?? throttler.ttl;

      // Un compteur par classe, route, limiteur et IP.
      const key = createHash('sha256')
        .update(`${classRef.name}-${handler.name}-${name}-${tracker}`)
        .digest('hex');
      const result = this.storage.increment(key, ttl, limit);

      if (result.isBlocked) {
        res.header(`Retry-After-${name}`, String(result.timeToBlockExpire));
        throw new ThrottlerException();
      }
      res.header(`${HEADER_PREFIX}-Limit-${name}`, String(limit));
      res.header(
        `${HEADER_PREFIX}-Remaining-${name}`,
        String(Math.max(0, limit - result.totalHits)),
      );
      res.header(`${HEADER_PREFIX}-Reset-${name}`, String(result.timeToExpire));
    }
    return true;
  }
}
