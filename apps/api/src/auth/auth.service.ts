import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpAdapterHost } from '@nestjs/core';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly adapterHost: HttpAdapterHost,
    private readonly prisma: PrismaService,
  ) {}
  // 1. Fabrique le ticket — pas de res
  async signSession(userId: string, sessionVersion: number): Promise<string> {
    const payload = { sub: userId, ver: sessionVersion };
    return await this.jwtService.signAsync(payload);
  }

  // 2. Range le ticket dans le cookie

  attachSessionToCookie(res: Response, token: string): void {
    this.adapterHost.httpAdapter.setCookie(res, 'sonar_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });
  }
  // 3. Nettoie le cookie
  clearSessionFromCookie(res: Response): void {
    this.adapterHost.httpAdapter.clearCookie(res, 'sonar_session', {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }

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

  async bumpSessionVersion(userId: string, res?: Response) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
    if (res) {
      this.clearSessionFromCookie(res);
    }
    return;
  }
}
