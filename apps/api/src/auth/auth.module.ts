import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PasswordService } from './password.service.js';
import { AuthService } from './auth.service.js';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { AuthController } from './auth.controller.js';
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    PasswordService,
    AuthService,
    AuthGuard,
    CsrfGuard,
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
  controllers: [AuthController],
  exports: [PasswordService, AuthService, AuthGuard, CsrfGuard],
})
export class AuthModule {}
