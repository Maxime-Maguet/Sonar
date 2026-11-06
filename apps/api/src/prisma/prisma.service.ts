import {
  Logger,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { resolveDatabaseUrl } from '../config/database-url.js';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  constructor() {
    const connectionString = resolveDatabaseUrl(process.env);
    const isDev = process.env.NODE_ENV === 'development';
    // Délai maximum de connexion : sans lui, une base injoignable bloque le
    // démarrage sans erreur (le pilote pg attend indéfiniment par défaut).
    const adapter = new PrismaPg({
      connectionString,
      connectionTimeoutMillis: 10_000,
    });
    super({
      adapter,
      log: isDev ? ['info', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma connected to PostgreSQL');
    } catch (error) {
      this.logger.error('❌ Prisma connection error:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('🔌 Prisma disconnected from PostgreSQL');
    } catch (error) {
      this.logger.error('❌ Prisma disconnection error:', error);
      throw error;
    }
  }
}
