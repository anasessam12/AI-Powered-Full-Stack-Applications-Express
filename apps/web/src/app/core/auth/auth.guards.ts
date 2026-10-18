import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthSessionService } from './session.service';
export const requireSession: CanActivateFn = () => {
  const auth = inject(AuthSessionService); const router = inject(Router);
  return auth.restore().pipe(map((session) => session ? true : router.parseUrl('/login')));
};
export const requireAdmin: CanActivateFn = () => {
  const auth = inject(AuthSessionService); const router = inject(Router);
  return auth.restore().pipe(map((session) => session?.user.role === 'ADMIN' ? true : router.parseUrl(session ? '/chat' : '/login')));
};
export const redirectSignedIn: CanActivateFn = () => {
  const auth = inject(AuthSessionService); const router = inject(Router);
  return auth.restore().pipe(map((session) => session ? router.parseUrl(session.user.role === 'ADMIN' ? '/admin/documents' : '/chat') : true));
};
