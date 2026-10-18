import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './global-setup.ts',
  use: { baseURL: 'http://127.0.0.1:4200', trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  webServer: [
    { command: 'node -r ts-node/register/transpile-only -e "require(\'./apps/web-e2e/api-test-server.ts\')"', url: 'http://127.0.0.1:3000/api/v1/health', reuseExistingServer: !process.env.CI, timeout: 120_000 },
    { command: 'npx nx run web:serve-e2e --host=127.0.0.1 --port=4200', url: 'http://127.0.0.1:4200/login', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  ],
});
