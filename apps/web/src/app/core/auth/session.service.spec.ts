import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthSessionContract } from '@customer-support/api-contract';
import { AuthSessionService } from './session.service';

const session: AuthSessionContract = {
  user: { id: 'user-1', username: 'admin', normalizedUsername: 'admin', role: 'ADMIN' },
  csrfToken: 'csrf-secret',
};

describe('AuthSessionService', () => {
  let http: HttpTestingController;
  let service: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AuthSessionService);
  });

  afterEach(() => http.verify());

  it('restores an http-only cookie session from the API and keeps it in memory', async () => {
    const restored = firstValueFrom(service.restore());
    const request = http.expectOne('/api/v1/auth/session');
    expect(request.request.withCredentials).toBe(true);
    request.flush(session);

    await expect(restored).resolves.toEqual(session);
    expect(service.current()).toEqual(session);
  });

  it('clears local session state after an expired-cookie response', async () => {
    const restored = firstValueFrom(service.restore());
    http.expectOne('/api/v1/auth/session').flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(restored).resolves.toBeNull();
    expect(service.current()).toBeNull();
  });

  it('posts username and password without persisting credentials and stores only the returned session', async () => {
    const loggedIn = firstValueFrom(service.login({ username: 'Admin', password: 'long-secret' }));
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body).toEqual({ username: 'Admin', password: 'long-secret' });
    request.flush(session);

    await expect(loggedIn).resolves.toEqual(session);
    expect(service.current()).toEqual(session);
    expect(localStorage.getItem('support_session')).toBeNull();
    expect(localStorage.getItem('csrfToken')).toBeNull();
  });

  it('sends the current CSRF token and cookie when logging out, then clears memory', async () => {
    service.login({ username: 'admin', password: 'long-secret' }).subscribe();
    http.expectOne('/api/v1/auth/login').flush(session);
    const loggedOut = firstValueFrom(service.logout());
    const request = http.expectOne('/api/v1/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('csrf-secret');
    request.flush(null, { status: 204, statusText: 'No Content' });

    await expect(loggedOut).resolves.toBeUndefined();
    expect(service.current()).toBeNull();
  });
});


