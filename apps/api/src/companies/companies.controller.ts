import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  seconds,
  SkipThrottle,
  Throttle,
  ThrottlerGuard,
} from '@nestjs/throttler';
import type { CompaniesPage } from '@sonar/api-contract';
import { CompaniesService } from './companies.service.js';
import { ListCompaniesQueryDto } from './dto/list-companies-query.dto.js';

// Route publique : pas d'AuthGuard, pas de cookie de session.
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @UseGuards(ThrottlerGuard)
  @SkipThrottle({ login: true, sireneSync: true, laBonneBoite: true })
  @Throttle({ companies: { limit: 60, ttl: seconds(60) } })
  list(@Query() query: ListCompaniesQueryDto): Promise<CompaniesPage> {
    return this.companies.list(query);
  }
}
