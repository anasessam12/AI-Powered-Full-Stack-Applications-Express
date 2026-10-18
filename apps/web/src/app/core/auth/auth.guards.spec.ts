import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { AuthSessionService } from './session.service';
import { requireAdmin } from './auth.guards';
describe('requireAdmin', () => {
  it('allows an API-restored Admin session', async () => {
    await TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthSessionService, useValue: { restore: () => of({ user: { role: 'ADMIN' } }) } }] });
    const result = TestBed.runInInjectionContext(() => requireAdmin({} as never, {} as never));
    await expect(firstValueFrom(result as Observable<boolean | UrlTree>)).resolves.toBe(true);
  });
  it('sends an Agent to chat without granting Admin navigation', async () => {
    await TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthSessionService, useValue: { restore: () => of({ user: { role: 'AGENT' } }) } }] });
    const result = TestBed.runInInjectionContext(() => requireAdmin({} as never, {} as never));
    const redirect = await firstValueFrom(result as Observable<boolean | UrlTree>);
    expect(TestBed.inject(Router).serializeUrl(redirect as UrlTree)).toBe('/chat');
  });
});

