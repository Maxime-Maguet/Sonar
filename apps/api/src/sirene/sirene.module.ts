import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SireneController } from './sirene.controller.js';
import { InseeClient } from './helpers/insee.js';
import { SireneService } from './sirene.service.js';

@Module({
  imports: [AuthModule],
  providers: [InseeClient, SireneService],
  exports: [SireneService],
  controllers: [SireneController],
})
export class SireneModule {}
