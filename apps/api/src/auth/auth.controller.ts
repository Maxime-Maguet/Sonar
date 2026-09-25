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
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import type { Response, Request } from 'express';

type AuthBody = { email?: unknown; password?: unknown };
type SessionRequest = Request & { user?: { sub: string; ver: number } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body() body: AuthBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(body?.email, body?.password, res);
  }

  @Post('login')
  @HttpCode(200)
  login(
    @Body() body: AuthBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(body?.email, body?.password, res);
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
