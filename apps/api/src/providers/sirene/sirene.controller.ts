import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { seconds, SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { AdminGuard } from '../../auth/guards/admin.guard.js';
import { SireneService } from './sirene.service.js';
import { SiretPipe } from './siret.pipe.js';

@Controller('sirene')
export class SireneController {
  constructor(private readonly sireneService: SireneService) {}

  @Post('sync')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard, AuthGuard, AdminGuard)
  @SkipThrottle({ login: true })
  @Throttle({ sireneSync: { limit: 2, ttl: seconds(60) } })
  async syncDiscovery() {
    return this.sireneService.syncDiscovery();
  }

  @Get(':siret')
  async getCompany(@Param('siret', SiretPipe) siret: string) {
    return this.sireneService.getEtablissementBySiret(siret);
  }

  @Post(':siret/create')
  @UseGuards(ThrottlerGuard, AuthGuard, AdminGuard)
  @SkipThrottle({ login: true })
  @Throttle({ sireneSync: { limit: 2, ttl: seconds(60) } })
  async createCompany(@Param('siret', SiretPipe) siret: string) {
    return this.sireneService.createEtablissement(siret);
  }
}
