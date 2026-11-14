import { test, expect } from '@playwright/test';

/**
 * 跨站契约 E2E：官网（F）与旧端（LF）必须消费同一 FastAPI 契约。
 *
 * 覆盖：
 * 1. 公开公告列表：两端均 200 且条目数一致（同一后端数据源，无 mock）；
 * 2. 未登录任务接口：两端均 401（BFF Cookie 身份边界一致）；
 * 3. 两端登录页均可渲染（前端构建与路由可用）。
 */
const F_BASE = process.env.E2E_F_BASE ?? 'http://127.0.0.1:2333';
const LF_BASE = process.env.E2E_LF_BASE ?? 'http://127.0.0.1:3000';

test.describe('F ⇄ LF 同一契约', () => {
  test('公开公告列表在两端都来自统一后端', async ({ request }) => {
    const [fRes, lfRes] = await Promise.all([
      request.get(`${F_BASE}/api/announcements`),
      request.get(`${LF_BASE}/api/announcements`),
    ]);
    expect(fRes.status()).toBe(200);
    expect(lfRes.status()).toBe(200);

    const fList: unknown = await fRes.json();
    const lfList: unknown = await lfRes.json();
    expect(Array.isArray(fList)).toBe(true);
    expect(Array.isArray(lfList)).toBe(true);
    expect((fList as unknown[]).length).toBe((lfList as unknown[]).length);
  });

  test('未登录访问任务接口在两端都被拒绝', async ({ request }) => {
    const [fRes, lfRes] = await Promise.all([
      request.get(`${F_BASE}/api/tasks`),
      request.get(`${LF_BASE}/api/tasks`),
    ]);
    expect(fRes.status()).toBe(401);
    expect(lfRes.status()).toBe(401);
  });

  test('两端登录页可渲染', async ({ page }) => {
    // 官网登录页 /login；旧端登录页 /auth
    for (const url of [`${F_BASE}/login`, `${LF_BASE}/auth`]) {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
      expect(res?.status() ?? 0).toBeLessThan(400);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
