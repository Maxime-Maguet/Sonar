import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from '../../auth/guards/auth.guard.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SireneModule } from './sirene.module.js';

describe('SireneModule', () => {
  it('compiles AuthGuard in SireneModule with JwtService from AuthModule', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({ JWT_SECRET: 'test-secret-for-module-compile' }),
          ],
        }),
        ThrottlerModule.forRoot([
          { name: 'login', ttl: seconds(60), limit: 5 },
          { name: 'sireneSync', ttl: seconds(60), limit: 2 },
        ]),
        PrismaModule,
        SireneModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    expect(moduleRef.get(AuthGuard)).toBeInstanceOf(AuthGuard);
    await moduleRef.close();
  });
});
