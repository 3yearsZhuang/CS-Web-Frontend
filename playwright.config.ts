import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tools/tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  globalSetup: './tools/tests/e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:2333',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:2333',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
