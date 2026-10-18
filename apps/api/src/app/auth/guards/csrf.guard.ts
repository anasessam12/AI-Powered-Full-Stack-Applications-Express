import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthenticatedRequest } from '../auth.types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    const authenticated = request.authSession;
    const token = request.headers['x-csrf-token'];
    if (
      !authenticated ||
      typeof token !== 'string' ||
      !this.authService.verifyCsrfToken(
        authenticated.rawToken,
        authenticated.session.csrfTokenHash,
        token,
      )
    ) {
      throw new ForbiddenException('A valid CSRF token is required.');
    }
    return true;
  }
}
