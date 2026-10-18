import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthSessionService } from '../auth/session.service';
import { AdminWorkspaceApi } from './admin-workspace.api';

describe('AdminWorkspaceApi', () => {
  let http: HttpTestingController;
  let api: AdminWorkspaceApi;
  let session: AuthSessionService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(AdminWorkspaceApi);
    session = TestBed.inject(AuthSessionService);
    session.login({ username: 'admin', password: 'long-secret' }).subscribe();
    http.expectOne('/api/v1/auth/login').flush({
      user: { id: 'admin-1', username: 'admin', normalizedUsername: 'admin', role: 'ADMIN' },
      csrfToken: 'csrf-admin',
    });
  });

  afterEach(() => http.verify());

  it('loads safe user records with cookie credentials', () => {
    api.listUsers().subscribe((users) => expect(users[0].role).toBe('AGENT'));
    const request = http.expectOne('/api/v1/users');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    request.flush([{ id: 'agent-1', username: 'agent', normalizedUsername: 'agent', role: 'AGENT', isActive: true, createdAt: '', updatedAt: '' }]);
  });

  it('sends CSRF and cookie credentials when creating a user', () => {
    api.createUser({ username: 'agent', password: 'password-long-enough', role: 'AGENT' }).subscribe();
    const request = http.expectOne('/api/v1/users');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('csrf-admin');
  });

  it('sends CSRF and cookie credentials when changing a user role', () => {
    api.updateUser('agent-1', { role: 'ADMIN' }).subscribe();
    const request = http.expectOne('/api/v1/users/agent-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('csrf-admin');
  });

  it('lists documents with the cookie and sends CSRF for retry and delete', () => {
    api.listDocuments().subscribe();
    const list = http.expectOne('/api/v1/documents');
    expect(list.request.withCredentials).toBe(true);
    list.flush([]);

    api.retryDocument('doc-1').subscribe();
    const retry = http.expectOne('/api/v1/documents/doc-1/retry');
    expect(retry.request.headers.get('X-CSRF-Token')).toBe('csrf-admin');
    expect(retry.request.withCredentials).toBe(true);
    retry.flush({});

    api.deleteDocument('doc-1').subscribe();
    const remove = http.expectOne('/api/v1/documents/doc-1');
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.headers.get('X-CSRF-Token')).toBe('csrf-admin');
    expect(remove.request.withCredentials).toBe(true);
    remove.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('uploads a file as multipart and exposes transport progress events', () => {
    const file = new File(['example'], 'guide.txt', { type: 'text/plain' });
    api.uploadDocument(file).subscribe();
    const request = http.expectOne('/api/v1/documents');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('X-CSRF-Token')).toBe('csrf-admin');
    expect(request.request.body instanceof FormData).toBe(true);
    expect(request.request.reportProgress).toBe(true);
  });
});

