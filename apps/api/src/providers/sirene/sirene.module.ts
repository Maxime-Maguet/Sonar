import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { SireneController } from './sirene.controller.js';
import { SireneService } from './sirene.service.js';

@Module({
  imports: [AuthModule],
  providers: [SireneService],
  exports: [SireneService],
  controllers: [SireneController],
})
export class SireneModule {}
