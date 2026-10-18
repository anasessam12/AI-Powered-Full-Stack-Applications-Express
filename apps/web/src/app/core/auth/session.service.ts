import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { AuthSessionContract, LoginRequestContract } from '@customer-support/api-contract';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly session = signal<AuthSessionContract | null>(null);
  private readonly http = inject(HttpClient);
  current(): AuthSessionContract | null { return this.session(); }
  restore(): Observable<AuthSessionContract | null> {
    return this.http.get<AuthSessionContract>('/api/v1/auth/session', { withCredentials: true }).pipe(
      tap((value) => this.session.set(value)),
      catchError(() => { this.session.set(null); return of(null); }),
    );
  }
  login(credentials: LoginRequestContract): Observable<AuthSessionContract> {
    return this.http.post<AuthSessionContract>('/api/v1/auth/login', credentials, { withCredentials: true }).pipe(tap((value) => this.session.set(value)));
  }
  logout(): Observable<void> {
    return this.http.post<void>('/api/v1/auth/logout', null, { withCredentials: true, headers: this.csrfHeaders() }).pipe(tap(() => this.session.set(null)), map(() => undefined), catchError((error) => { this.session.set(null); throw error; }));
  }
  csrfHeaders(): HttpHeaders {
    const token = this.session()?.csrfToken;
    return token ? new HttpHeaders({ 'X-CSRF-Token': token }) : new HttpHeaders();
  }
  clear(): void { this.session.set(null); }
}


