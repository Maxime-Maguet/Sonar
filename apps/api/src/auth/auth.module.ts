import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PasswordService } from './password.service.js';
import { AuthService } from './auth.service.js';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard.js';
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
  providers: [PasswordService, AuthService, AuthGuard],
  exports: [PasswordService, AuthService, AuthGuard],
})
export class AuthModule {}
