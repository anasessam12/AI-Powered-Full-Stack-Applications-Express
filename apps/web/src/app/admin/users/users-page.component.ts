import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CreateUserRequestContract, UserContract, UserRoleContract } from '@customer-support/api-contract';
import { AdminWorkspaceApi } from '../../core/admin/admin-workspace.api';
import { AuthSessionService } from '../../core/auth/session.service';
@Component({ standalone: true, imports: [CommonModule, FormsModule], template: `<header class="page-head"><p class="eyebrow">ACCESS CONTROL</p><h1>Users</h1><p class="lede">Create team accounts and manage their access to the workspace.</p></header><section class="create-panel"><div><p class="section-index">NEW TEAM MEMBER</p><h2>Create an account</h2><p>Share the username and temporary password with the teammate securely.</p></div><form (ngSubmit)="create()"><label>Username<input name="username" [(ngModel)]="username" required minlength="3" autocomplete="off"/></label><label>Temporary password<input name="password" [(ngModel)]="password" required minlength="12" autocomplete="new-password"/></label><label>Role<select name="role" [(ngModel)]="role"><option value="AGENT">Agent · support workspace</option><option value="ADMIN">Admin · manage users and documents</option></select></label><button class="primary" [disabled]="saving">{{saving ? 'Creating…' : 'Create account'}}</button></form>@if(message){<p class="notice" role="status">{{message}}</p>}@if(error){<p class="error" role="alert">{{error}}</p>}</section><section class="user-list"><div class="list-head"><div><p class="section-index">WORKSPACE ACCESS</p><h2>Team accounts <span>{{users.length}}</span></h2></div><button class="text-button" (click)="load()">Refresh</button></div>@if(loading){<p role="status">Loading team accounts…</p>}@else if(!users.length){<p>No accounts found.</p>}@else{<div class="table-wrap"><table><thead><tr><th>ACCOUNT</th><th>ROLE</th><th>STATUS</th><th>ACCESS</th></tr></thead><tbody>@for(user of users; track user.id){<tr><td><strong>{{user.username}}</strong><small>Added {{user.createdAt | date:'mediumDate'}}</small></td><td>{{user.role === 'ADMIN' ? 'Admin' : 'Agent'}}</td><td><span class="state" [class.inactive]="!user.isActive">{{user.isActive ? 'Active' : 'Inactive'}}</span></td><td><select [value]="user.role" [disabled]="saving || user.id === currentUserId" [attr.aria-label]="'Role for ' + user.username" (change)="setRole(user,$event)"><option value="AGENT">Agent</option><option value="ADMIN">Admin</option></select> <button class="text-button" [disabled]="saving || user.id === currentUserId" (click)="toggle(user)">{{user.isActive ? 'Deactivate' : 'Reactivate'}}</button></td></tr>}</tbody></table></div>}<p class="footnote">Your own account cannot be deactivated here. Only Admins can manage workspace access.</p></section>`, styles: [`:host{display:block;color:#173b3f}.page-head{margin-bottom:1.8rem}.eyebrow,.section-index{margin:0 0 .6rem;color:#5a7867;font-size:.65rem;font-weight:800;letter-spacing:.15em}.page-head h1{margin:0;font-family:Georgia,serif;font-size:2.8rem;font-weight:500;letter-spacing:-.04em}.lede{margin:.5rem 0;color:#536c63}.create-panel{display:grid;grid-template-columns:minmax(210px,.8fr) minmax(0,1.4fr);gap:2rem;padding:1.4rem 1.5rem;background:#e8e7d9;border-radius:8px}.create-panel h2,.user-list h2{margin:.2rem 0;font-family:Georgia,serif;font-size:1.45rem;font-weight:500}.create-panel>div>p:last-child,.footnote{color:#536c63;font-size:.77rem;line-height:1.55}.create-panel form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.create-panel label{display:flex;flex-direction:column;gap:.4rem;font-size:.75rem;font-weight:700}.create-panel input,.create-panel select,.user-list select{min-height:2.6rem;padding:0 .65rem;border:1px solid #a9b6a7;border-radius:4px;background:#f8f6ee;color:#173b3f;font:inherit}.create-panel label:nth-child(3){grid-column:1}.primary{align-self:end;min-height:2.6rem;border:0;border-radius:4px;background:#173b3f;color:white;font:inherit;font-weight:700;cursor:pointer}.primary:disabled{opacity:.55}.notice,.error{grid-column:1/-1;margin:0;font-size:.8rem}.notice{color:#315643}.error{color:#963e2b}.user-list{margin-top:2.4rem}.list-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:.8rem}.user-list h2 span{margin-left:.3rem;color:#b65c45;font:700 .8rem ui-sans-serif,system-ui}.text-button{margin:.2rem;padding:.3rem;border:0;background:none;color:#245457;font:inherit;font-size:.75rem;font-weight:700;text-decoration:underline;text-underline-offset:3px;cursor:pointer}.text-button:disabled{opacity:.45;cursor:not-allowed}.table-wrap{overflow:auto;border-top:1px solid #c9cabb}table{width:100%;border-collapse:collapse;text-align:left;font-size:.78rem}th{padding:.8rem .6rem;color:#5a7867;font-size:.6rem;letter-spacing:.12em}td{padding:.85rem .6rem;border-top:1px solid #d9d8c9}td strong,td small{display:block}td small{margin-top:.25rem;color:#536c63;font-size:.68rem}.state{color:#315643;font-weight:700}.state.inactive{color:#963e2b}.user-list select{min-height:2rem;padding:0 .4rem}.footnote{margin-top:1rem}@media(max-width:900px){.create-panel{grid-template-columns:1fr}.create-panel form{grid-template-columns:1fr 1fr}}@media(max-width:580px){.page-head h1{font-size:2.2rem}.create-panel{padding:1rem}.create-panel form{grid-template-columns:1fr}.create-panel label:nth-child(3){grid-column:auto}.primary{min-height:2.8rem}.user-list table{min-width:640px}}`]
})
export class UsersPageComponent implements OnInit {
  users: UserContract[] = []; username = ''; password = ''; role: UserRoleContract = 'AGENT'; loading = false; saving = false; message = ''; error = '';
  private readonly api = inject(AdminWorkspaceApi);
  private readonly auth = inject(AuthSessionService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  get currentUserId(): string { return this.auth.current()?.user.id ?? ''; }
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true;
    this.api.listUsers().pipe(finalize(() => { this.loading = false; this.changeDetector.markForCheck(); })).subscribe({
      next: (users) => { this.users = users; this.changeDetector.markForCheck(); },
      error: () => { this.error = 'Team accounts could not be loaded. Refresh to try again.'; this.changeDetector.markForCheck(); },
    });
  }
  create(): void {
    if (!this.username.trim() || this.password.length < 12 || this.saving) { this.error = 'Enter a username and a password of at least 12 characters.'; return; }
    this.saving = true; this.error = ''; this.message = '';
    const input: CreateUserRequestContract = { username: this.username.trim(), password: this.password, role: this.role };
    this.api.createUser(input).subscribe({
      next: (user) => { this.message = `Account for ${user.username} created.`; this.username = ''; this.password = ''; this.load(); this.changeDetector.markForCheck(); },
      error: (err) => { this.error = err.status === 409 ? 'That username is already in use.' : 'The account could not be created. Check the details and try again.'; this.changeDetector.markForCheck(); },
      complete: () => { this.saving = false; this.changeDetector.markForCheck(); },
    });
  }
  setRole(user: UserContract, event: Event): void { const role = (event.target as HTMLSelectElement).value as UserRoleContract; if (role === user.role) return; this.change(user, { role }, `Access for ${user.username} updated.`); }
  toggle(user: UserContract): void { this.change(user, { isActive: !user.isActive }, `${user.username} ${user.isActive ? 'deactivated' : 'reactivated'}.`); }
  private change(user: UserContract, input: {role?: UserRoleContract;isActive?:boolean}, message: string): void {
    this.saving = true; this.error = '';
    this.api.updateUser(user.id, input).pipe(finalize(() => { this.saving = false; this.changeDetector.markForCheck(); })).subscribe({
      next: (updated) => { this.users = this.users.map((item) => item.id === updated.id ? updated : item); this.message = message; this.changeDetector.markForCheck(); },
      error: () => { this.error = 'The account could not be updated. Refresh and try again.'; this.changeDetector.markForCheck(); },
    });
  }
}




