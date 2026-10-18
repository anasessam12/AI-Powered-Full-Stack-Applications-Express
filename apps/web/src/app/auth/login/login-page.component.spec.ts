import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { throwError } from 'rxjs';
import { AuthSessionService } from '../../core/auth/session.service';
import { LoginPageComponent } from './login-page.component';
describe('LoginPageComponent', () => {
  let login: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    login = vi.fn();
    await TestBed.configureTestingModule({ imports: [LoginPageComponent], providers: [provideRouter([]), { provide: AuthSessionService, useValue: { login, current: () => null } }] }).compileComponents();
  });
  it('labels username and password and blocks empty submissions with field guidance', () => {
    const fixture = TestBed.createComponent(LoginPageComponent); fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement;
    const username = root.querySelector<HTMLInputElement>('#username'); const password = root.querySelector<HTMLInputElement>('#password'); const submit = root.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(root.querySelector('label[for="username"]')?.textContent).toMatch(/username/i); expect(root.querySelector('label[for="password"]')?.textContent).toMatch(/password/i);
    submit?.click(); fixture.detectChanges();
    expect(username?.getAttribute('aria-invalid')).toBe('true'); expect(password?.getAttribute('aria-invalid')).toBe('true'); expect(root.querySelector('#username-error')?.textContent).toMatch(/required/i); expect(login).not.toHaveBeenCalled();
  });
  it('shows one generic credential error instead of exposing API details', async () => {
    login.mockReturnValue(throwError(() => ({ status: 401, error: { message: 'account disabled for admin-42' } })));
    const fixture = TestBed.createComponent(LoginPageComponent); fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement;
    const username = root.querySelector<HTMLInputElement>('#username'); const password = root.querySelector<HTMLInputElement>('#password'); const submit = root.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!username || !password || !submit) throw new Error('The login form is incomplete.');
    username.value = 'agent'; username.dispatchEvent(new Event('input')); password.value = 'wrong-password'; password.dispatchEvent(new Event('input')); fixture.detectChanges(); submit.click(); await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toMatch(/check your username and password/i); expect(root.textContent).not.toContain('account disabled'); expect(root.textContent).not.toContain('admin-42');
  });
  it('explains when the login service cannot be reached', async () => {
    login.mockReturnValue(throwError(() => ({ status: 0 })));
    const fixture = TestBed.createComponent(LoginPageComponent); fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement;
    const username = root.querySelector<HTMLInputElement>('#username'); const password = root.querySelector<HTMLInputElement>('#password'); const submit = root.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!username || !password || !submit) throw new Error('The login form is incomplete.');
    username.value = 'agent'; username.dispatchEvent(new Event('input')); password.value = 'long-enough-secret'; password.dispatchEvent(new Event('input')); fixture.detectChanges(); submit.click(); await fixture.whenStable(); fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toMatch(/could not reach/i);
  });
  it('trims username while keeping credentials out of browser storage', async () => {
    login.mockReturnValue(throwError(() => ({ status: 401 })));
    const fixture = TestBed.createComponent(LoginPageComponent); fixture.detectChanges(); const root = fixture.nativeElement as HTMLElement;
    const username = root.querySelector<HTMLInputElement>('#username'); const password = root.querySelector<HTMLInputElement>('#password'); const submit = root.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (!username || !password || !submit) throw new Error('The login form is incomplete.');
    username.value = '  Agent  '; username.dispatchEvent(new Event('input')); password.value = 'long-enough-secret'; password.dispatchEvent(new Event('input')); fixture.detectChanges(); submit.click(); await fixture.whenStable();
    expect(login).toHaveBeenCalledWith({ username: 'Agent', password: 'long-enough-secret' }); expect(localStorage.getItem('support_session')).toBeNull(); expect(localStorage.getItem('csrfToken')).toBeNull();
  });
});
