/**
 * @file 论坛发帖业务流程 E2E 断言
 *
 * 覆盖核心链路：
 *   - 已登录用户进入发帖页，表单可见
 *   - 填写版块/标题/正文后提交，成功跳转到主题详情页
 *   - 标题过短时前端校验拦截提交
 *   - 主题详情页展示刚发布的标题
 *
 * 依赖 globalSetup 保存的 storageState（已登录 member 账号）。
 * 测试间使用唯一标题避免冲突。
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from './global-setup';

test.describe('论坛发帖业务流程', () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  test('发帖成功并跳转到主题详情页', async ({ page }) => {
    // 1. 进入发帖页
    await page.goto('/community/forum/new');
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    // 2. 等待版块下拉加载
    const categorySelect = page.locator('#category-select');
    await expect(categorySelect).toBeVisible({ timeout: 10000 });

    // 等待选项加载（初始可能有占位空值）
    await expect(async () => {
      const optionCount = await categorySelect.locator('option').count();
      expect(optionCount).toBeGreaterThan(1);
    }).toPass({ timeout: 15000 });

    // 选择第一个非空版块（通过 value 索引 1，跳过占位空值）
    const options = await categorySelect.locator('option').all();
    let selected = false;
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val.trim() !== '') {
        await categorySelect.selectOption(val);
        selected = true;
        break;
      }
    }

    if (!selected) {
      test.skip(true, '无可用版块，跳过发帖测试');
      return;
    }

    // 3. 填写标题（4-120 字符）
    const uniqueTitle = `E2E 测试主题 ${Date.now()}`;
    await page.locator('#title-input').fill(uniqueTitle);

    // 4. 填写正文（MarkdownEditor 内部是 textarea，min 10 字符）
    const editorTextarea = page.locator('textarea').last();
    await editorTextarea.fill('这是 E2E 自动化测试发布的主题正文内容，用于验证发帖流程。');

    // 5. 提交
    const submitButton = page.getByRole('button', { name: /发布主题/ });
    await submitButton.click();

    // 6. 验证跳转到主题详情页（URL 含 /community/forum/）
    await expect(page).toHaveURL(/\/community\/forum\//, { timeout: 15000 });
    await expect(page.getByRole('main').first()).toBeVisible();

    // 7. 验证主题详情页显示刚发布的标题
    await expect(page.locator('main').last()).toContainText(uniqueTitle, { timeout: 5000 });
  });

  test('标题过短时前端校验拦截提交', async ({ page }) => {
    await page.goto('/community/forum/new');
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    const categorySelect = page.locator('#category-select');
    await expect(categorySelect).toBeVisible({ timeout: 10000 });
    await expect(async () => {
      const optionCount = await categorySelect.locator('option').count();
      expect(optionCount).toBeGreaterThan(1);
    }).toPass({ timeout: 15000 });

    const options = await categorySelect.locator('option').all();
    let selected = false;
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val.trim() !== '') {
        await categorySelect.selectOption(val);
        selected = true;
        break;
      }
    }

    if (!selected) {
      test.skip(true, '无可用版块，跳过');
      return;
    }

    // 标题仅 2 字符（下限 4）
    await page.locator('#title-input').fill('ab');
    await page.locator('textarea').last().fill('足够长的正文内容用于通过正文校验。');

    const submitButton = page.getByRole('button', { name: /发布主题/ });
    await submitButton.click();

    // 应停留在发帖页
    await expect(page).toHaveURL(/\/community\/forum\/new/, { timeout: 5000 });
  });

  test('未填写正文时无法提交', async ({ page }) => {
    await page.goto('/community/forum/new');
    await expect(page.getByRole('main').first()).toBeVisible({ timeout: 10000 });

    const categorySelect = page.locator('#category-select');
    await expect(categorySelect).toBeVisible({ timeout: 10000 });
    await expect(async () => {
      const optionCount = await categorySelect.locator('option').count();
      expect(optionCount).toBeGreaterThan(1);
    }).toPass({ timeout: 15000 });

    const options = await categorySelect.locator('option').all();
    let selected = false;
    for (const opt of options) {
      const val = await opt.getAttribute('value');
      if (val && val.trim() !== '') {
        await categorySelect.selectOption(val);
        selected = true;
        break;
      }
    }

    if (!selected) {
      test.skip(true, '无可用版块，跳过');
      return;
    }

    await page.locator('#title-input').fill('有效的测试标题');
    // 正文留空

    const submitButton = page.getByRole('button', { name: /发布主题/ });
    await submitButton.click();

    // 应停留在发帖页
    await expect(page).toHaveURL(/\/community\/forum\/new/, { timeout: 5000 });
  });
});
