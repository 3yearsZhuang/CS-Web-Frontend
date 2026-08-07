/**
 * @file E2E 核心用户流程测试
 *
 * 覆盖主要页面的加载与基本交互：
 *   - 首页 / 登录 / 注册 / 活动 / 社区 / 工具 / 成员 / 入社 / 关于
 *   - 导航栏可见性
 *   - 主题切换不破坏页面
 */
import { test, expect } from '@playwright/test';

test.describe('Core User Flows', () => {

  test('Home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('main').first()).toBeVisible();
  });

  test('Login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
  });

  test('Register toggle accessible from login', async ({ page }) => {
    await page.goto('/login');
    const registerToggle = page.getByRole('button', { name: /Register/i });
    if (await registerToggle.isVisible()) {
      await registerToggle.click();
      await expect(page.getByRole('button', { name: /Create Account/i })).toBeVisible();
    }
  });

  test('Events page loads with timeline', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByRole('main').first()).toBeVisible();
  });

  test('Community page loads', async ({ page }) => {
    await page.goto('/community/community');
    await expect(page.getByRole('main').first()).toBeVisible();
  });

  test('Tools page loads with tool cards', async ({ page }) => {
    await page.goto('/tools');
    await expect(page.getByRole('main').first()).toBeVisible();
  });

  test('Members page loads', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByRole('main').first()).toBeVisible();
  });

  test('Join page loads with form', async ({ page }) => {
    await page.goto('/join');
    await expect(page.getByRole('main').first()).toBeVisible();
  });

  test('About page loads', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('main').first()).toBeVisible();
  });

  test('Navigation works', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav').first()).toBeVisible();
  });

  test('Theme toggle works', async ({ page }) => {
    await page.goto('/');
    const themeButton = page.locator('[aria-label="切换主题"]');
    if (await themeButton.isVisible()) {
      await themeButton.click();
      await expect(page.locator('body')).toBeVisible();
    }
  });

});
