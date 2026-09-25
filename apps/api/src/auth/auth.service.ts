import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpAdapterHost } from '@nestjs/core';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Service centralisant toute la logique métier liée à l'authentification :
 * génération des jetons JWT, gestion des cookies de session et invalidation de session.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly adapterHost: HttpAdapterHost,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 1. Génère un jeton JWT contenant l'identifiant de l'utilisateur
   * et la version actuelle de sa session.
   *
   * @param userId - L'ID unique de l'utilisateur
   * @param sessionVersion - Le numéro de version de la session (sert à la révocation)
   * @returns Le jeton JWT sous forme de chaîne de caractères (string)
   */
  async signSession(userId: string, sessionVersion: number): Promise<string> {
    const payload = { sub: userId, ver: sessionVersion };
    return await this.jwtService.signAsync(payload);
  }

  /**
   * 2. Injection du JWT dans un cookie HTTP sécurisé de la réponse.
   *
   * @param res - L'objet de réponse HTTP d'Express/Fastify
   * @param token - Le jeton JWT généré à stocker
   */
  attachSessionToCookie(res: Response, token: string): void {
    this.adapterHost.httpAdapter.setCookie(res, 'sonar_session', token, {
      httpOnly: true, // Empêche l'accès au cookie via du JavaScript côté client (protection anti-XSS)
      secure: process.env.NODE_ENV === 'production', // Envoie le cookie uniquement en HTTPS en production
      sameSite: 'lax', // Protège contre les attaques CSRF tout en maintenant le cookie lors de redirections
      maxAge: 60 * 60 * 24, // Durée de vie du cookie : 24 heures (Nest 12.1 : maxAge en secondes)
      path: '/', // Le cookie est accessible sur toutes les routes de l'application
    });
  }

  /**
   * 3. Suppression du cookie de session (utilisé lors de la déconnexion).
   *
   * @param res - L'objet de réponse HTTP d'Express/Fastify
   */
  clearSessionFromCookie(res: Response): void {
    this.adapterHost.httpAdapter.clearCookie(res, 'sonar_session', {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  /**
   * 4. Méthode haut niveau : Récupère la version de session de l'utilisateur en BDD,
   * génère un nouveau JWT et l'attache directement au cookie de la réponse HTTP.
   *
   * @param userId - L'ID de l'utilisateur
   * @param res - L'objet de réponse HTTP dans lequel injecter le cookie
   */
  async issue(userId: string, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        sessionVersion: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const token = await this.signSession(userId, user.sessionVersion);
    this.attachSessionToCookie(res, token);
  }

  /**
   * 5. Invalide toutes les sessions existantes d'un utilisateur en BDD
   * (ex: changement de mot de passe, déconnexion globale) et supprime optionnellement son cookie local.
   *
   * @param userId - L'ID de l'utilisateur concerné
   * @param res - (Optionnel) La réponse HTTP pour supprimer le cookie courant
   */
  async bumpSessionVersion(userId: string, res?: Response) {
    // Incrémente le numéro de version de session en BDD
    // Rend invalides tous les anciens jetons JWT en circulation
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });

    // Si la réponse HTTP est transmise, nettoie également le cookie du client courant
    if (res) {
      this.clearSessionFromCookie(res);
    }
    return;
  }
}
