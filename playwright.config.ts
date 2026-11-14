import { defineConfig, devices } from '@playwright/test';

/**
 * 跨站 E2E：官网（F, :2333）与旧端（LF, :3000）共用同一 FastAPI（:9000）。
 * 三个服务均允许复用已启动实例；CI 可用 E2E_*_BASE 覆盖地址。
 */
const F_BASE = process.env.E2E_F_BASE ?? 'http://127.0.0.1:2333';
const LF_BASE = process.env.E2E_LF_BASE ?? 'http://127.0.0.1:3000';
const BACKEND_BASE = process.env.E2E_BACKEND_BASE ?? 'http://127.0.0.1:9000';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    locale: 'zh-CN',
  },
  webServer: [
    {
      command: '.venv\\Scripts\\python.exe run.py --env 1 --port 9000',
      cwd: '../CS-Web-Backend',
      url: `${BACKEND_BASE}/health`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'pnpm dev',
      cwd: '.',
      url: F_BASE,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      cwd: '../FGS_CS_F',
      url: LF_BASE,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
