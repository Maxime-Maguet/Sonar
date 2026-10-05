import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Param,
  PipeTransform,
  Post,
  UseGuards,
} from '@nestjs/common';
import { seconds, SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guards/auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { SireneService } from './sirene.service.js';

@Injectable()
export class SiretPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !/^[0-9]{14}$/.test(value)) {
      throw new BadRequestException('SIRET invalide : 14 chiffres attendus');
    }
    return value;
  }
}

@Controller('sirene')
export class SireneController {
  constructor(private readonly sirene: SireneService) {}

  @Post('sync')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard, AuthGuard, AdminGuard)
  @SkipThrottle({ login: true })
  @Throttle({ sireneSync: { limit: 2, ttl: seconds(60) } })
  syncDiscovery() {
    return this.sirene.syncDiscovery();
  }

  @Get(':siret')
  @UseGuards(AuthGuard)
  getCompany(@Param('siret', SiretPipe) siret: string) {
    return this.sirene.getEtablissementBySiret(siret);
  }

  @Post(':siret/create')
  @UseGuards(ThrottlerGuard, AuthGuard, AdminGuard)
  @SkipThrottle({ login: true })
  @Throttle({ sireneSync: { limit: 2, ttl: seconds(60) } })
  createCompany(@Param('siret', SiretPipe) siret: string) {
    return this.sirene.createEtablissement(siret);
  }
}
