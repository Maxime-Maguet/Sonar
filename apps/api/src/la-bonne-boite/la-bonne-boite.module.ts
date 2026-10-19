import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LaBonneBoiteController } from './la-bonne-boite.controller.js';
import { LaBonneBoiteService } from './la-bonne-boite.service.js';
import { FranceTravailClient } from './helpers/france-travail.client.js';

@Module({
  imports: [AuthModule],
  providers: [LaBonneBoiteService, FranceTravailClient],
  exports: [LaBonneBoiteService],
  controllers: [LaBonneBoiteController], // controllers pour les routes
})
export class LaBonneBoiteModule {}
