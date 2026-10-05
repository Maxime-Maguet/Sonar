import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SireneModule } from './providers/sirene/sirene.module.js';
import { validate } from './config/env.validation.js';
import { seconds, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'login', ttl: seconds(60), limit: 5 }]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
      validate,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SireneModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
