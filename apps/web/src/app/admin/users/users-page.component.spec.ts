import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminWorkspaceApi } from '../../core/admin/admin-workspace.api';
import { AuthSessionService } from '../../core/auth/session.service';
import { UsersPageComponent } from './users-page.component';
describe('UsersPageComponent', () => {
  let api: { listUsers: ReturnType<typeof vi.fn>; createUser: ReturnType<typeof vi.fn>; updateUser: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    api = { listUsers: vi.fn().mockReturnValue(of([{ id: 'admin-1', username: 'admin', normalizedUsername: 'admin', role: 'ADMIN', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }, { id: 'agent-1', username: 'agent', normalizedUsername: 'agent', role: 'AGENT', isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' }])) , createUser: vi.fn(), updateUser: vi.fn() };
    await TestBed.configureTestingModule({ imports: [UsersPageComponent], providers: [{ provide: AdminWorkspaceApi, useValue: api }, { provide: AuthSessionService, useValue: { current: () => ({ user: { id: 'admin-1' } }) } }] }).compileComponents();
  });
  it('shows access states and protects the signed-in Admin from self edits', () => {
    const fixture = TestBed.createComponent(UsersPageComponent); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Admin'); expect(root.textContent).toContain('Agent');
    const selfRole = root.querySelector<HTMLSelectElement>('select[aria-label="Role for admin"]');
    const selfDeactivate = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Deactivate'));
    expect(selfRole?.disabled).toBe(true); expect(selfDeactivate?.disabled).toBe(true);
  });
});
