import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthSessionService } from '../../core/auth/session.service';
@Component({ selector: 'app-login-page', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterModule], template: `
<section class="login-layout"><div class="login-story"><a class="wordmark" routerLink="/login"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span> FIELDNOTE <small>SUPPORT KNOWLEDGE</small></a><div class="story-copy"><p class="eyebrow">A calmer way to find the answer</p><h1>Good support<br>starts with<br><em>good evidence.</em></h1><p>Sign in to search your team's approved knowledge and keep every answer connected to its source.</p></div><div class="story-footer">PRIVATE WORKSPACE <span>•</span> SOURCE-LED ANSWERS</div></div><div class="login-panel"><div class="panel-inner"><p class="eyebrow">TEAM WORKSPACE</p><h2>Welcome back</h2><p class="panel-lede">Use the account your administrator created for you.</p><form [formGroup]="form" (ngSubmit)="submit()" novalidate>
<label for="username">Username</label><input id="username" formControlName="username" autocomplete="username" [attr.aria-invalid]="form.controls.username.invalid && submitted" [attr.aria-describedby]="form.controls.username.invalid && submitted ? 'username-error' : null" />@if(form.controls.username.invalid && submitted){<small id="username-error" class="field-error">Username is required.</small>}
<label for="password">Password</label><input id="password" type="password" formControlName="password" autocomplete="current-password" [attr.aria-invalid]="form.controls.password.invalid && submitted" [attr.aria-describedby]="form.controls.password.invalid && submitted ? 'password-error' : null" />@if(form.controls.password.invalid && submitted){<small id="password-error" class="field-error">Password is required.</small>}
@if(error){<p class="form-error" role="alert">{{error}}</p>}<button class="primary-button" type="submit" [disabled]="busy">{{busy ? 'Signing you in…' : 'Sign in'}} <span aria-hidden="true">→</span></button></form><p class="secure-note"><span aria-hidden="true">◈</span> Your account is managed by your organization.</p></div></div></section>`, styleUrl: './login-page.component.scss' })
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly form = this.fb.group({ username: ['', Validators.required], password: ['', Validators.required] });
  submitted = false; busy = false; error = '';

  submit(): void {
    this.submitted = true; this.error = '';
    if (this.form.invalid || this.busy) { this.form.markAllAsTouched(); return; }
    const username = this.form.controls.username.value?.trim() ?? ''; const password = this.form.controls.password.value ?? '';
    this.busy = true;
    this.auth.login({ username, password }).pipe(finalize(() => { this.busy = false; this.changeDetector.markForCheck(); })).subscribe({
      next: (session) => void this.router.navigateByUrl(session.user.role === 'ADMIN' ? '/admin/documents' : '/chat'),
      error: (error) => { this.error = error.status === 401 ? 'Check your username and password, then try again.' : 'We could not reach the workspace. Check your connection and try again.'; this.changeDetector.markForCheck(); },
    });
  }
}







