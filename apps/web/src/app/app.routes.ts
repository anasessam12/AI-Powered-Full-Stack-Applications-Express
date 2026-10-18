import { Routes } from '@angular/router';
import { LoginPageComponent } from './auth/login/login-page.component';
import { requireAdmin, redirectSignedIn, requireSession } from './core/auth/auth.guards';
import { AdminShellComponent } from './admin/admin-shell.component';
import { UsersPageComponent } from './admin/users/users-page.component';
import { DocumentsPageComponent } from './admin/documents/documents-page.component';
import { ChatPageComponent } from './chat/chat-page.component';
export const appRoutes: Routes = [
  { path: 'login', component: LoginPageComponent, canActivate: [redirectSignedIn] },
  { path: 'admin', component: AdminShellComponent, canActivate: [requireAdmin], children: [
    { path: '', pathMatch: 'full', redirectTo: 'documents' },
    { path: 'documents', component: DocumentsPageComponent },
    { path: 'users', component: UsersPageComponent },
  ] },
  { path: 'chat', canActivate: [requireSession], component: ChatPageComponent },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
