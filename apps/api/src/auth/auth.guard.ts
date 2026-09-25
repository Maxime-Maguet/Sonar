import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

/**
 * Guard NestJS (pare-feu) qui vérifie la présence, la validité et la version
 * du cookie de session JWT avant de donner accès à une route protégée.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Méthode obligatoire de l'interface CanActivate.
   * Retourne `true` si la requête est autorisée, lève une `UnauthorizedException` (HTTP 401) sinon.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Extraction des objets HTTP Request et Response depuis le contexte NestJS
    const request = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    // 2. Récupération du JWT stocké dans le cookie 'sonar_session'
    // (Nécessite qu'un parser de cookie comme 'cookie-parser' ou '@fastify/cookie' soit activé dans main.ts)
    const token = request.cookies?.sonar_session;

    // Si aucun cookie n'est présent, l'accès est immédiatement refusé
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      // 3. Vérification cryptographique et expiration du jeton JWT
      const payload = await this.jwtService.verifyAsync(token);

      // 4. Validation de la structure du payload (s'assure que les champs attendus existent)
      if (typeof payload.sub !== 'string' || typeof payload.ver !== 'number') {
        throw new UnauthorizedException();
      }

      // 5. Vérification en BDD pour contrôler la révocation de session
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { sessionVersion: true },
      });

      // Si l'utilisateur n'existe plus ou si la version de sa session en BDD ne correspond
      // plus à celle inscrite dans le JWT (ex: déconnexion globale), on purge le cookie et on refuse
      if (!user || user.sessionVersion !== payload.ver) {
        this.authService.clearSessionFromCookie(res);
        throw new UnauthorizedException();
      }

      // 6. Système de "Sliding Session" (renouvellement automatique du cookie)
      const now = Math.floor(Date.now() / 1000); // Temps actuel en secondes
      const remaining = payload.exp - now; // Temps restant avant l'expiration du JWT (en sec)

      // Si le jeton expire dans moins de 12 heures, on en réémet un nouveau automatiquement
      if (remaining > 0 && remaining < 12 * 60 * 60) {
        await this.authService.issue(payload.sub, res);
      }

      // 7. On attache les informations de l'utilisateur à la requête HTTP
      // pour que les contrôleurs puissent y accéder (ex: @Req() req -> req.user)
      request['user'] = { sub: payload.sub, ver: payload.ver };
    } catch (error) {
      // Si une UnauthorizedException a déjà été levée intentionnellement, on la propage
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Pour toute autre erreur (JWT expiré, signature corrompue, etc.), on renvoie une 401 générique
      throw new UnauthorizedException();
    }

    return true; // Accès autorisé
  }
}
