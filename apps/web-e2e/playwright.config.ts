import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './global-setup.cjs',
  use: { baseURL: 'http://127.0.0.1:4200', trace: 'retain-on-failure', ...devices['Desktop Chrome'] },
  webServer: [
    { command: 'node -r ts-node/register/transpile-only -e "require(\'./apps/web-e2e/api-test-server.ts\')"', cwd: process.cwd(), env: { TS_NODE_PROJECT: resolve(process.cwd(), 'apps/api/tsconfig.app.json') }, url: 'http://127.0.0.1:3000/api/v1/health', reuseExistingServer: false, timeout: 120_000 },
    { command: 'npx nx run web:serve-e2e --host=127.0.0.1 --port=4200', cwd: process.cwd(), url: 'http://127.0.0.1:4200/login', reuseExistingServer: false, timeout: 120_000 },
  ],
});
