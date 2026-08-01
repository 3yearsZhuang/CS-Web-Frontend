/**
 * @file 活动报名业务流程 E2E 断言
 *
 * 覆盖核心链路：
 *   - 已登录用户进入活动详情页可见"立即报名"按钮
 *   - 点击报名后状态变为"已报名"
 *   - 取消报名后状态恢复为"立即报名"
 *   - 未登录用户看到"登录后报名"引导
 *
 * 依赖 globalSetup 保存的 storageState（已登录 member 账号）。
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from './global-setup';

test.describe.configure({ mode: 'serial' });

test.describe('活动报名业务流程', () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  test('已登录用户可在活动详情页报名', async ({ page }) => {
    // 1. 先导航到活动列表页，使 page.evaluate 有正确的 origin
    await page.goto('/events');
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    // 2. 通过 API 获取活动列表，找到一个可报名的活动
    const eventsData = await page.evaluate(async () => {
      const res = await fetch('/api/events');
      return res.json();
    });

    const events = eventsData?.events || eventsData?.items || [];
    if (events.length === 0) {
      test.skip(true, '数据库中无活动，跳过报名测试');
      return;
    }

    const targetEvent = events[0];
    expect(targetEvent.id).toBeTruthy();

    // 3. 进入活动详情页
    await page.goto(`/events/${targetEvent.id}`);
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    // 4. 查找报名按钮 — 可能是"立即报名"或"已报名"（如果之前测过）
    const registerButton = page.getByText('立即报名', { exact: false }).first();
    const alreadyRegistered = page.getByText('已报名', { exact: false }).first();

    // 如果已经报名（之前测试残留），先取消再报名，验证完整流程
    if (await alreadyRegistered.isVisible({ timeout: 3000 }).catch(() => false)) {
      const cancelButton = page.getByText('取消报名', { exact: false }).first();
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // 5. 点击报名
    await expect(registerButton).toBeVisible({ timeout: 5000 });
    await registerButton.click();

    // 6. 验证报名成功 — 按钮变为"已报名"
    await expect(page.getByText('已报名', { exact: false }).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('已报名用户可取消报名', async ({ page }) => {
    // 1. 导航到活动列表页
    await page.goto('/events');
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    const eventsData = await page.evaluate(async () => {
      const res = await fetch('/api/events');
      return res.json();
    });
    const events = eventsData?.events || eventsData?.items || [];
    if (events.length === 0) {
      test.skip(true, '数据库中无活动，跳过取消报名测试');
      return;
    }

    const targetEvent = events[0];
    await page.goto(`/events/${targetEvent.id}`);
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    // 2. 确保处于已报名状态（上个测试应已报名）
    const alreadyRegistered = page.getByText('已报名', { exact: false }).first();
    const registerButton = page.getByText('立即报名', { exact: false }).first();

    // 如果未报名，先报名
    if (!(await alreadyRegistered.isVisible({ timeout: 3000 }).catch(() => false))) {
      if (await registerButton.isVisible()) {
        await registerButton.click();
        await expect(alreadyRegistered).toBeVisible({ timeout: 5000 });
      }
    }

    // 3. 点击取消报名
    const cancelButton = page.getByText('取消报名', { exact: false }).first();
    await expect(cancelButton).toBeVisible({ timeout: 3000 });
    await cancelButton.click();

    // 4. 验证恢复为"立即报名"
    await expect(page.getByText('立即报名', { exact: false }).first()).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe('活动报名 — 未登录场景', () => {
  test('未登录用户在活动详情页看到登录引导', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/events');
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    const eventsData = await page.evaluate(async () => {
      const res = await fetch('/api/events');
      return res.json();
    });
    const events = eventsData?.events || eventsData?.items || [];
    if (events.length === 0) {
      await context.close();
      test.skip(true, '数据库中无活动，跳过未登录场景测试');
      return;
    }

    await page.goto(`/events/${events[0].id}`);
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    // 未登录应看到"登录后报名"
    await expect(page.getByText('登录后报名', { exact: false })).toBeVisible({
      timeout: 5000,
    });

    await context.close();
  });
});
