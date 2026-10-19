import { expect, test, Page } from '@playwright/test';

const admin = { username: 'support.e2e.admin', password: 'E2e-admin-password-91!' };
const agent = { username: 'support.e2e.agent', password: 'E2e-agent-password-121!' };
const seededDocuments = [
  'account-security.md',
  'returns-policy.txt',
  'exchange-policy.md',
  'billing-policy.pdf',
];

async function signIn(page: Page, account: typeof admin): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Username').fill(account.username);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/admin\/documents|\/chat/);
}

async function askForSource(page: Page, question: string, answer: string, source: string): Promise<void> {
  await page.getByLabel(/ask a question/i).fill(question);
  await page.getByRole('button', { name: /send question/i }).click();
  const assistantMessage = page.getByRole('article').filter({ hasText: answer });
  await expect(assistantMessage).toBeVisible();
  await expect(assistantMessage.getByRole('link', { name: source })).toBeVisible();
}

test('Admin and Agent see seeded data, cited answers, persisted history, and role restrictions', async ({ page }) => {
  await signIn(page, admin);
  await page.goto('/admin/users');

  const usersResponse = await page.request.get('/api/v1/users');
  expect(usersResponse.status()).toBe(200);
  const users = await usersResponse.json();
  expect(users.map((user: { username: string }) => user.username)).toEqual(expect.arrayContaining([admin.username, agent.username]));
  await expect(page.getByRole('row').filter({ hasText: agent.username })).toContainText('Agent');
  await expect(page.getByText('Active').first()).toBeVisible();

  await page.goto('/admin/documents');
  const documentsResponse = await page.request.get('/api/v1/documents');
  expect(documentsResponse.status()).toBe(200);
  const documents = await documentsResponse.json();
  expect(documents.map((document: { displayName: string }) => document.displayName)).toEqual(expect.arrayContaining(seededDocuments));
  for (const displayName of seededDocuments) {
    const row = page.getByRole('row').filter({ hasText: displayName });
    await expect(row).toContainText('Indexed');
  }

  await page.getByRole('button', { name: 'Sign out' }).click();
  await signIn(page, agent);
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
  expect((await page.request.get('/api/v1/users')).status()).toBe(403);

  await askForSource(page, 'What is the return window for unused items?', 'Unused items may be returned within 30 days of delivery.', 'returns-policy.txt');
  await askForSource(page, 'How long can exchanges be requested within 14 days?', 'Exchanges may be requested within 14 days of delivery.', 'exchange-policy.md');
  const billingMessage = page.getByRole('article').filter({ hasText: 'Credit card refunds have a 2% processing fee.' });
  await page.getByLabel(/ask a question/i).fill('What fee applies to credit card refunds?');
  await page.getByRole('button', { name: /send question/i }).click();
  await expect(billingMessage).toContainText('Page 1');
  await expect(billingMessage.getByRole('link', { name: 'billing-policy.pdf' })).toBeVisible();
  await askForSource(page, 'What should happen if a development credential is exposed?', 'Change the password immediately if a development credential is exposed.', 'account-security.md');

  await page.getByLabel(/ask a question/i).fill('What is the warranty period for headphones?');
  await page.getByRole('button', { name: /send question/i }).click();
  const abstention = page.getByRole('article').filter({ hasText: 'The available documents do not contain enough information to answer that question.' });
  await expect(abstention).toBeVisible();
  await expect(abstention.getByRole('link')).toHaveCount(0);

  await page.reload();
  const savedConversation = page.getByRole('button', { name: /What is the return window for unused items\?/ });
  await expect(savedConversation).toBeVisible();
  await savedConversation.click();
  await expect(page.getByText('Unused items may be returned within 30 days of delivery.')).toBeVisible();
  await expect(page.getByText('Credit card refunds have a 2% processing fee.')).toBeVisible();

  await page.getByLabel(/ask a question/i).fill('What should happen if a development credential is exposed? __provider_failure__');
  await page.getByRole('button', { name: /send question/i }).click();
  await expect(page.getByText(/failed|could not complete|interrupted/i)).toBeVisible({ timeout: 10_000 });
  await page.goto('/admin/users');
  await expect(page).toHaveURL(/\/chat/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('Admin can upload and index a supported text document', async ({ page }) => {
  await signIn(page, admin);
  await page.goto('/admin/documents');
  await page.locator('#document-file').setInputFiles({
    name: 'new-member-checklist.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('New agents must complete privacy training before opening customer records.'),
  });
  await expect(page.getByRole('button', { name: 'Upload document' })).toBeEnabled();
  await page.getByRole('button', { name: 'Upload document' }).click();
  const row = page.getByRole('row').filter({ hasText: 'new-member-checklist.txt' });
  await expect(row).toContainText('Indexed', { timeout: 15_000 });
  await expect(page.getByRole('status')).toContainText('Upload received');
});

test('unsupported upload reports a validation error without starting an upload', async ({ page }) => {
  await signIn(page, admin);
  await page.goto('/admin/documents');
  await page.locator('#document-file').setInputFiles({
    name: 'malware.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('not a supported document'),
  });
  await expect(page.getByRole('alert')).toHaveText('Choose a PDF, TXT, or Markdown file.');
  await expect(page.getByRole('button', { name: 'Upload document' })).toBeDisabled();
});

test('login displays a useful error and restores the button after invalid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill(admin.username);
  await page.getByLabel('Password').fill('incorrect-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('alert')).toHaveText('Check your username and password, then try again.');
  await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
});
