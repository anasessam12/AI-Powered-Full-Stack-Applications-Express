import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthSessionContract } from '@customer-support/api-contract';
import { AuthenticatedRequest } from './auth.types';
import { AuthService } from './auth.service';
import { CsrfGuard } from './guards/csrf.guard';
import { SessionGuard } from './guards/session.guard';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly config: ConfigService) {}

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionContract> {
    const result = await this.authService.login(body.username, body.password, request.ip ?? 'unknown');
    response.cookie(this.authService.sessionCookieName, result.sessionToken, this.cookieOptions(result.expiresAt));
    return {
      user: this.authService.toSafeUser(result.user),
      csrfToken: result.csrfToken,
    };
  }

  @Get('session')
  @UseGuards(SessionGuard)
  session(@Req() request: AuthenticatedRequest) {
    const authenticated = request.authSession;
    if (!authenticated) throw new UnauthorizedException();
    return {
      user: this.authService.toSafeUser(authenticated.user),
      csrfToken: this.authService.csrfTokenFor(authenticated.rawToken),
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard, CsrfGuard)
  async logout(@Req() request: AuthenticatedRequest, @Res({ passthrough: true }) response: Response): Promise<void> {
    const authenticated = request.authSession;
    if (!authenticated) throw new UnauthorizedException();
    await this.authService.revokeSession(authenticated.session);
    response.cookie(this.authService.sessionCookieName, '', {
      ...this.cookieOptions(new Date(0)),
      maxAge: 0,
    });
  }

  private cookieOptions(expires: Date) {
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/api/v1',
      expires,
      maxAge: Math.max(0, expires.getTime() - Date.now()),
    };
  }
}
