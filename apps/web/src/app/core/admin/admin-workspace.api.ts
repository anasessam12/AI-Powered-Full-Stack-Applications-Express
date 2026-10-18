import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateUserRequestContract, UpdateUserRequestContract, UserContract } from '@customer-support/api-contract';
import { AuthSessionService } from '../auth/session.service';
export interface DocumentRecord { id: string; displayName: string; mimeType: string; byteSize: number; status: 'INDEXED' | 'PROCESSING' | 'FAILED'; errorCode: string | null; createdAt: string; updatedAt: string; }
@Injectable({ providedIn: 'root' })
export class AdminWorkspaceApi {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthSessionService);
  listUsers(): Observable<UserContract[]> { return this.http.get<UserContract[]>('/api/v1/users', { withCredentials: true }); }
  createUser(input: CreateUserRequestContract): Observable<UserContract> { return this.http.post<UserContract>('/api/v1/users', input, { withCredentials: true, headers: this.session.csrfHeaders() }); }
  updateUser(id: string, input: UpdateUserRequestContract): Observable<UserContract> { return this.http.patch<UserContract>(`/api/v1/users/${encodeURIComponent(id)}`, input, { withCredentials: true, headers: this.session.csrfHeaders() }); }
  listDocuments(): Observable<DocumentRecord[]> { return this.http.get<DocumentRecord[]>('/api/v1/documents', { withCredentials: true }); }
  uploadDocument(file: File): Observable<HttpEvent<DocumentRecord>> {
    const body = new FormData(); body.append('file', file);
    return this.http.request(new HttpRequest('POST', '/api/v1/documents', body, { withCredentials: true, headers: this.session.csrfHeaders(), reportProgress: true }));
  }
  retryDocument(id: string): Observable<DocumentRecord> { return this.http.post<DocumentRecord>(`/api/v1/documents/${encodeURIComponent(id)}/retry`, null, { withCredentials: true, headers: this.session.csrfHeaders() }); }
  deleteDocument(id: string): Observable<void> { return this.http.delete<void>(`/api/v1/documents/${encodeURIComponent(id)}`, { withCredentials: true, headers: this.session.csrfHeaders() }); }
}

