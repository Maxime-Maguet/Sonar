import { Module } from '@nestjs/common';
import { SireneController } from './sirene.controller.js';
import { SireneService } from './sirene.service.js';

@Module({
  providers: [SireneService],
  exports: [SireneService],
  controllers: [SireneController],
})
export class SireneModule {}
