import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '../auth.types';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawToken = this.readCookie(request.headers.cookie, this.authService.sessionCookieName);
    if (!rawToken) throw new UnauthorizedException('Authentication required.');

    const resolved = await this.authService.resolveSession(rawToken);
    if (!resolved) throw new UnauthorizedException('Authentication required.');
    request.authSession = { ...resolved, rawToken };
    return true;
  }

  private readCookie(cookieHeader: string | undefined, name: string): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(';')) {
      const [key, ...valueParts] = part.trim().split('=');
      if (key === name) {
        const value = valueParts.join('=');
        return value.length > 0 ? value : null;
      }
    }
    return null;
  }
}
