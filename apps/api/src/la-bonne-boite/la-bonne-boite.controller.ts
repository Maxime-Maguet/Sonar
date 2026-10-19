import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ThrottlerGuard,
  seconds,
  SkipThrottle,
  Throttle,
} from '@nestjs/throttler';
import { LaBonneBoiteService } from './la-bonne-boite.service.js';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto.js';

@Controller('leads')
export class LaBonneBoiteController {
  constructor(private readonly laBonneBoite: LaBonneBoiteService) {}

  @Get()
  @UseGuards(ThrottlerGuard, AuthGuard)
  @SkipThrottle({ login: true, sireneSync: true })
  @Throttle({ laBonneBoite: { limit: 10, ttl: seconds(60) } })
  getLeads(@Query() query: ListLeadsQueryDto) {
    // query pour récupérer les paramètres de la requête
    return this.laBonneBoite.list(query); // list pour récupérer les leads
  }
}
