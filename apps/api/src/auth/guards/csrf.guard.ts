// tous les commentaires sont en français.
import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { WebOrigins } from '../../config/web-origins.js';
import { WEB_ORIGINS } from '../../config/web-origins.module.js';
// cette classe est un garde d'authentification qui protège contre les attaques CSRF.
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedMethods: readonly string[] = [
    'GET',
    'OPTIONS',
    'HEAD',
  ];

  // ce constructeur est utilisé pour injecter les origines autorisées dans le guard.
  constructor(
    @Inject(WEB_ORIGINS) private readonly allowedOrigins: WebOrigins,
  ) {}

  // cette méthode est utilisée pour vérifier si la requête est autorisée.
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // si la méthode de la requête est autorisée, on retourne true.
    if (this.allowedMethods.includes(request.method)) {
      return true;
    }

    // si la méthode de la requête n'est pas autorisée, on vérifie si l'origine de la requête est autorisée.
    const requestOrigin: unknown = request.headers.origin;
    if (
      typeof requestOrigin !== 'string' ||
      !this.allowedOrigins.includes(requestOrigin)
    ) {
      // si l'origine de la requête n'est pas autorisée, on lance une exception Forbidden.
      throw new ForbiddenException();
    }

    // si l'origine de la requête est autorisée, on retourne true.
    return true;
  }
}
