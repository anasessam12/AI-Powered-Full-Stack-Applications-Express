import { expect, test, Page } from '@playwright/test';

const admin = { username: 'support.e2e.admin', password: 'E2e-admin-password-91!' };
const agent = { username: 'support.e2e.agent', password: 'E2e-agent-password-121!' };

async function signIn(page: Page, account: typeof admin): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

test('Admin provisions an Agent and knowledge; Agent gets grounded, persisted answers and restricted access', async ({ page }) => {
  await signIn(page, admin);
  await page.goto('/admin/users');
  await page.getByLabel('Username', { exact: true }).fill(agent.username);
  await page.getByLabel('Temporary password').fill(agent.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status')).toContainText('created');

  await page.goto('/admin/documents');
  await page.locator('#document-file').setInputFiles({ name: 'return-policy.txt', mimeType: 'text/plain', buffer: Buffer.from('Returns are accepted within thirty days of purchase.') });
  await page.getByRole('button', { name: 'Upload document' }).click();
  await expect(page.getByText('return-policy.txt')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Indexed', { exact: true })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Sign out' }).click();
  await signIn(page, agent);
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
  expect((await page.request.get('/api/v1/users')).status()).toBe(403);
  await page.getByLabel(/ask a question/i).fill('What is our return window?');
  await page.getByRole('button', { name: /send question/i }).click();
  await expect(page.getByText('The return window is thirty days.')).toBeVisible();
  await expect(page.getByText('return-policy.txt')).toBeVisible();
  await page.reload();
  await expect(page.getByText('The return window is thirty days.')).toBeVisible();

  await page.getByLabel(/ask a question/i).fill('__provider_failure__');
  await page.getByRole('button', { name: /send question/i }).click();
  await expect(page.getByText(/failed|could not complete|interrupted/i)).toBeVisible({ timeout: 10_000 });
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/chat/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('unsupported upload reports a validation error', async ({ page }) => {
  await signIn(page, admin);
  await page.goto('/admin/documents');
  await page.locator('#document-file').setInputFiles({ name: 'malware.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('not a supported document') });
  await page.getByRole('button', { name: 'Upload document' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
});
