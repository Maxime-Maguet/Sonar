import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpAdapterHost } from '@nestjs/core';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { PasswordService } from './password.service.js';

/**
 * Service centralisant toute la logique métier liée à l'authentification :
 * génération des jetons JWT, gestion des cookies de session et invalidation de session.
 */
@Injectable()
export class AuthService {
  private dummyPasswordHash?: Promise<string>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly adapterHost: HttpAdapterHost,
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async register(email: unknown, password: unknown, res: Response) {
    if (typeof email !== 'string' || email.trim().length === 0) {
      throw new BadRequestException('Email is required');
    }
    if (typeof password !== 'string' || password.trim().length === 0) {
      throw new BadRequestException('Password is required');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await this.passwordService.hash(password);
    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hashedPassword,
        lastLoginAt: new Date(),
      },
    });
    await this.issue(user.id, res);
    return { id: user.id, email: normalizedEmail };
  }

  async login(email: unknown, password: unknown, res: Response) {
    if (typeof email !== 'string' || email.trim().length === 0) {
      throw new BadRequestException('Email is required');
    }
    if (typeof password !== 'string') {
      throw new BadRequestException('Password is required');
    }
    if (password.trim() === '') {
      throw new UnauthorizedException();
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });
    // Email inconnu : on compare quand même à un hash bcrypt (lent),
    // sinon la 401 arrive trop vite et révèle que le compte n'existe pas.
    const hash = user?.passwordHash ?? (await this.comparisonDummyHash());
    const isPasswordValid = await this.passwordService.verify(password, hash);
    if (!user || !isPasswordValid) {
      throw new UnauthorizedException();
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.issue(user.id, res);
    return { id: user.id, email: user.email };
  }

  /** Hash bcrypt jetable, calculé une fois : sert uniquement à égaliser le temps d'un login sur email inconnu. */
  private comparisonDummyHash(): Promise<string> {
    this.dummyPasswordHash ??= this.passwordService.hash('sonar-login-dummy');
    return this.dummyPasswordHash;
  }

  async logout(token: string | undefined, res: Response): Promise<void> {
    if (typeof token !== 'string' || token === '') {
      this.clearSessionFromCookie(res);
      return;
    }

    let payload: { sub: string; ver: number } | undefined;
    try {
      const verifiedPayload = await this.jwtService.verifyAsync(token);
      if (
        typeof verifiedPayload.sub === 'string' &&
        typeof verifiedPayload.ver === 'number'
      ) {
        payload = { sub: verifiedPayload.sub, ver: verifiedPayload.ver };
      }
    } catch {
      this.clearSessionFromCookie(res);
      return;
    }

    if (!payload) {
      this.clearSessionFromCookie(res);
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { sessionVersion: true },
    });
    if (user?.sessionVersion === payload.ver) {
      await this.bumpSessionVersion(payload.sub);
    }
    this.clearSessionFromCookie(res);
    return;
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }

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
      ...this.sessionCookieFlags(),
      maxAge: 60 * 60 * 24, // Nest 12.1 : maxAge en secondes (24 h)
    });
  }

  /**
   * 3. Suppression du cookie de session (utilisé lors de la déconnexion).
   *
   * @param res - L'objet de réponse HTTP d'Express/Fastify
   */
  clearSessionFromCookie(res: Response): void {
    this.adapterHost.httpAdapter.clearCookie(
      res,
      'sonar_session',
      this.sessionCookieFlags(),
    );
  }

  private sessionCookieFlags() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
    };
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
