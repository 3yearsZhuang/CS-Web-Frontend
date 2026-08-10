/**
 * @file 测试 setup — 引入 jest-dom 断言扩展（组件测试 / .tsx 走 jsdom）
 */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// 全局 mock next-intl：hook 测试不依赖真实翻译文案，统一提供
// useTranslations 的 passthrough 实现（返回 key 本身），避免每个测试
// 文件重复 vi.mock('next-intl', ...)。测试文件内的局部 vi.mock 优先级
// 仍高于此处全局 mock，已有局部 mock 的文件行为不变。
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
