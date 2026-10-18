import { TestBed } from '@angular/core/testing';
import { App } from './app';
describe('App', () => {
  it('renders the route outlet for the authenticated product surfaces', async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
    const fixture = TestBed.createComponent(App); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).not.toBeNull();
  });
});
