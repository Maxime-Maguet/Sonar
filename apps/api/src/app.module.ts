import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SireneModule } from './sirene/sirene.module.js';
import { validate } from './config/env.validation.js';
import { seconds, ThrottlerModule } from './throttler/index.js';
import { LaBonneBoiteModule } from './la-bonne-boite/la-bonne-boite.module.js';
import { CompaniesModule } from './companies/companies.module.js';

@Module({
  imports: [
    // imports pour les modules
    ThrottlerModule.forRoot([
      // ThrottlerModule pour limiter le nombre de requêtes par minute
      { name: 'login', ttl: seconds(60), limit: 5 }, // login pour limiter le nombre de requêtes par minute
      { name: 'sireneSync', ttl: seconds(60), limit: 2 }, // sireneSync pour limiter le nombre de requêtes par minute
      { name: 'laBonneBoite', ttl: seconds(60), limit: 10 }, // laBonneBoite pour limiter le nombre de requêtes par minute
      { name: 'companies', ttl: seconds(60), limit: 60 }, // annuaire public
    ]),
    ConfigModule.forRoot({
      // ConfigModule pour charger les variables d'environnement
      isGlobal: true, // isGlobal pour charger les variables d'environnement globalement
      envFilePath: ['.env', '../../.env'],
      validate, // validate pour valider les variables d'environnement
    }), // ConfigModule pour charger les variables d'environnement
    PrismaModule, // PrismaModule pour la base de données
    HealthModule, // HealthModule pour la santé de l'application
    AuthModule, // AuthModule pour l'authentification
    SireneModule, // SireneModule pour la synchronisation des entreprises
    CompaniesModule, // CompaniesModule pour l'annuaire public
    LaBonneBoiteModule, // LaBonneBoiteModule pour la synchronisation des leads
  ],
  controllers: [AppController], // controllers pour les routes
  providers: [AppService], // providers pour les services
})
export class AppModule {}
