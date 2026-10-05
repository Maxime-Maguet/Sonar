import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { SireneService } from './sirene.service.js';
import { SiretPipe } from './siret.pipe.js';

@Controller('sirene')
export class SireneController {
  constructor(private readonly sireneService: SireneService) {}

  @Get(':siret')
  async getCompany(@Param('siret', SiretPipe) siret: string) {
    return this.sireneService.getEtablissementBySiret(siret);
  }

  @Post(':siret/create')
  @UseGuards(AuthGuard, AdminGuard)
  async createCompany(@Param('siret', SiretPipe) siret: string) {
    return this.sireneService.createEtablissement(siret);
  }
}
