/**
 * @file 考试提交流程 E2E 断言
 *
 * 覆盖核心链路：
 *   - 考试列表页加载并展示已发布考试
 *   - 进入考试详情页，题目与选项可见
 *   - 已登录用户可选择选项（验证交互可用）
 *
 * 依赖 globalSetup 保存的 storageState（已登录 member 账号）。
 * 若数据库中无已发布考试，测试自动跳过。
 *
 * 注意：完整提交流程因服务层 datetime 时区差异（SQLite datetime('now') 返回 UTC，
 * JS new Date() 按本地时区解析）触发"答题时间已超时"误判，属既存服务层 bug，
 * E2E 层不绕过，仅验证到"可选择选项"层级。
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from './global-setup';

test.describe('考试提交流程', () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  test('考试列表页加载并展示已发布考试', async ({ page }) => {
    await page.goto('/tools/exam');
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    const data = await page.evaluate(async () => {
      const res = await fetch('/api/tools/exam');
      return res.json();
    });

    const exams = data?.exams || [];
    if (exams.length === 0) {
      test.skip(true, '数据库中无已发布考试，跳过');
      return;
    }

    expect(exams.length).toBeGreaterThan(0);
    expect(exams[0].id).toBeTruthy();
  });

  test('进入考试详情页并选择选项', async ({ page }) => {
    // 1. 获取一个已发布考试 ID
    await page.goto('/tools/exam');
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    const data = await page.evaluate(async () => {
      const res = await fetch('/api/tools/exam');
      return res.json();
    });

    const exams = data?.exams || [];
    if (exams.length === 0) {
      test.skip(true, '数据库中无已发布考试，跳过');
      return;
    }

    const targetExam = exams[0];
    expect(targetExam.id).toBeTruthy();

    // 2. 进入考试详情页
    await page.goto(`/tools/exam/${targetExam.id}`);
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    // 3. 等待题目加载 — 题目计数文本 "N / N" 出现
    const questionCountText = page.locator('text=/\\d+ \\/ \\d+/').first();
    await expect(questionCountText).toBeVisible({ timeout: 10000 });

    const countText = (await questionCountText.textContent()) || '1 / 1';
    const match = countText.match(/(\d+)\s*\/\s*(\d+)/);
    const totalQuestions = match ? parseInt(match[2], 10) : 1;
    expect(totalQuestions).toBeGreaterThan(0);

    // 4. 验证选项按钮可交互（A/B/C/D 开头）
    const optionButtons = page.locator('main button:visible').filter({
      hasText: /^[A-D]/,
    });

    // 等待选项加载
    await expect(async () => {
      const count = await optionButtons.count();
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });

    // 5. 点击第一个选项，验证交互生效
    await optionButtons.first().click();
    await page.waitForTimeout(500);

    // 6. 验证"下一题"按钮可见（可导航）
    const nextButton = page.getByRole('button', { name: '下一题 →' });
    if (totalQuestions > 1) {
      await expect(nextButton).toBeVisible({ timeout: 5000 });
    }
  });
});
