import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminWorkspaceApi } from '../../core/admin/admin-workspace.api';
import { DocumentsPageComponent } from './documents-page.component';
describe('DocumentsPageComponent', () => {
  let api: { listDocuments: ReturnType<typeof vi.fn>; retryDocument: ReturnType<typeof vi.fn>; deleteDocument: ReturnType<typeof vi.fn>; uploadDocument: ReturnType<typeof vi.fn> };
  beforeEach(async () => {
    api = { listDocuments: vi.fn().mockReturnValue(of([])), retryDocument: vi.fn().mockReturnValue(of({})), deleteDocument: vi.fn().mockReturnValue(of(undefined)), uploadDocument: vi.fn() };
    await TestBed.configureTestingModule({ imports: [DocumentsPageComponent], providers: [{ provide: AdminWorkspaceApi, useValue: api }] }).compileComponents();
  });
  it('guides an empty library without fabricated document rows', () => {
    const fixture = TestBed.createComponent(DocumentsPageComponent); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Your library is ready for its first guide.');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).toHaveLength(0);
  });
  it('renders API-backed status, recovery and visible processing errors', () => {
    api.listDocuments.mockReturnValue(of([
      { id: 'a', displayName: 'Returns.pdf', mimeType: 'application/pdf', byteSize: 2048, status: 'INDEXED', errorCode: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'b', displayName: 'Broken.txt', mimeType: 'text/plain', byteSize: 512, status: 'FAILED', errorCode: 'EXTRACTION_FAILED', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: 'c', displayName: 'New.md', mimeType: 'text/markdown', byteSize: 300, status: 'PROCESSING', errorCode: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    ]));
    const fixture = TestBed.createComponent(DocumentsPageComponent); fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Indexed'); expect(root.textContent).toContain('Needs attention'); expect(root.textContent).toContain('Processing'); expect(root.textContent).toContain('extraction failed');
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('Retry'))?.click();
    expect(api.retryDocument).toHaveBeenCalledWith('b');
  });
  it('shows a useful load error when the API is unavailable', () => {
    api.listDocuments.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(DocumentsPageComponent); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('The library could not be loaded. Refresh to try again.');
  });
});


