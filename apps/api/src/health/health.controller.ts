import { Controller, Get, Logger, Res } from '@nestjs/common';
import type { HealthReport } from '@sonar/api-contract';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

const PING_TIMEOUT_MS = 1_000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error('timeout'));
    }, ms);

    promise.then(
      (value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(
    @Res({ passthrough: true }) response: Response,
  ): Promise<HealthReport> {
    response.setHeader('Cache-Control', 'no-store');
    const postgres = await this.pingPostgres();
    const up = postgres === 'up';
    response.status(up ? 200 : 503);
    return {
      status: up ? 'ok' : 'down',
      process: { postgres },
      dependencies: {
        sirene: 'unchecked',
        laBonneBoite: 'unchecked',
      },
    };
  }

  private async pingPostgres(): Promise<'up' | 'down'> {
    try {
      const rows: unknown = await withTimeout(
        this.prisma.$queryRaw`SELECT 1`,
        PING_TIMEOUT_MS,
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return 'up';
      }
      this.logger.error('Ping Postgres vide');
      return 'down';
    } catch (error: unknown) {
      this.logger.error(
        'Ping Postgres échoué',
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      );
      return 'down';
    }
  }
}
