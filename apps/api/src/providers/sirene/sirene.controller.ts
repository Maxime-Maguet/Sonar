import { Controller, Get, Param, Post } from '@nestjs/common';
import { SireneService } from './sirene.service.js';

@Controller('sirene')
export class SireneController {
  constructor(private readonly sireneService: SireneService) {}

  @Get(':siret')
  async getCompany(@Param('siret') siret: string) {
    return this.sireneService.getEtablissementBySiret(siret);
  }

  @Post(':siret/create')
  async createCompany(@Param('siret') siret: string) {
    return this.sireneService.createEtablissement(siret);
  }
}
