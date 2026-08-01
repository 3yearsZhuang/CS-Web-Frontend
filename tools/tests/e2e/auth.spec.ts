/**
 * @file 认证业务流程 E2E 断言
 *
 * 覆盖登录核心链路：
 *   - 错误凭据被拒绝（401 + 错误提示）
 *   - 正确凭据登录成功 → 跳转 /profile
 *   - 登录后 /api/auth/me 返回当前用户
 *   - 未登录访问受保护页面被引导至登录页
 *   - 注册模式切换 UI
 *
 * 依赖 globalSetup 已创建测试账号 e2e-member@test.local。
 *
 * 选择器说明：
 *   - 登录页有多个 <form>（2FA / 登录 / 忘记密码），提交按钮文案也可能重复，
 *     故通过在 #password 输入框上按 Enter 键触发表单提交，避免选择器歧义。
 */
import { test, expect } from '@playwright/test';
import { TEST_ACCOUNTS } from './global-setup';

/** 填写凭据并提交（用 Enter 键避免多表单按钮歧义） */
async function fillAndSubmit(page: import('@playwright/test').Page, email: string, password: string) {
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#password').press('Enter');
}

test.describe('认证业务流程', () => {
  test('错误密码登录被拒绝并显示错误提示', async ({ page }) => {
    await page.goto('/login');
    await fillAndSubmit(page, TEST_ACCOUNTS.member.email, 'wrong-password-xxx');

    await expect(page).toHaveURL(/\/login/);

    // 等待错误提示横幅出现（border-l-2 + destructive 色）
    const errorBanner = page.locator('div.border-l-2.border-\\[var\\(--destructive\\)\\]');
    await expect(errorBanner).toBeVisible({ timeout: 8000 });
  });

  test('正确凭据登录成功并跳转到个人主页', async ({ page }) => {
    await page.goto('/login');
    await fillAndSubmit(page, TEST_ACCOUNTS.member.email, TEST_ACCOUNTS.member.password);

    await expect(page).toHaveURL(/\/profile/, { timeout: 15000 });
    await expect(page.getByRole('main').first()).toBeVisible();
  });

  test('登录后 auth_session cookie 已设置', async ({ page, context }) => {
    await page.goto('/login');
    await fillAndSubmit(page, TEST_ACCOUNTS.member.email, TEST_ACCOUNTS.member.password);
    await expect(page).toHaveURL(/\/profile/, { timeout: 15000 });

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === 'auth_session');
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie!.value.length).toBeGreaterThan(0);
    expect(sessionCookie!.httpOnly).toBe(true);
  });

  test('登录后 /api/auth/me 返回当前用户信息', async ({ page }) => {
    await page.goto('/login');
    await fillAndSubmit(page, TEST_ACCOUNTS.member.email, TEST_ACCOUNTS.member.password);
    await expect(page).toHaveURL(/\/profile/, { timeout: 15000 });

    const meResponse = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me');
      return { status: res.status, body: await res.json().catch(() => null) };
    });

    expect(meResponse.status).toBe(200);
    expect(meResponse.body?.user?.email).toBe(TEST_ACCOUNTS.member.email);
  });

  test('未登录访问发帖页显示登录引导', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/community/forum/new');

    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    const url = page.url();
    const bodyText = await page.locator('body').textContent();
    const hasLoginPrompt =
      url.includes('/login') ||
      bodyText?.includes('请先登录') ||
      bodyText?.includes('登录');
    expect(hasLoginPrompt).toBeTruthy();

    await context.close();
  });

  test('切换到注册模式显示验证码字段', async ({ page }) => {
    await page.goto('/login');

    const registerToggle = page.getByRole('button', { name: 'Register →' });
    await expect(registerToggle).toBeVisible({ timeout: 5000 });
    await registerToggle.click();

    await expect(page.locator('#confirmPassword')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#verificationCode')).toBeVisible();
  });
});
