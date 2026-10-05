import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { Response, Request } from 'express';

type SessionRequest = Request & { user?: { sub: string; ver: number } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(dto.email, dto.password, res);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto.email, dto.password, res);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.sonar_session, res);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() request: SessionRequest) {
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return this.authService.me(request.user.sub);
  }
}
