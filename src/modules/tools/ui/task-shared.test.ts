/**
 * @file task-shared 纯函数测试：任务分类标签映射（含未知 key 回退）与选项生成。
 */
import { describe, expect, it } from 'vitest';
import { categoryLabel, CATEGORY_KEYS, categoryOptions, type TFn } from './task-shared';

const t: TFn = (key) => `i18n:${key}`;

describe('categoryLabel', () => {
  it('已注册分类映射到 i18n key', () => {
    expect(categoryLabel(t, 'general')).toBe('i18n:catGeneral');
    expect(categoryLabel(t, 'documentation')).toBe('i18n:catDocumentation');
    expect(categoryLabel(t, 'mentoring')).toBe('i18n:catMentoring');
  });

  it('未知 key 原样回退', () => {
    expect(categoryLabel(t, 'bogus')).toBe('bogus');
  });
});

describe('categoryOptions', () => {
  it('与 CATEGORY_KEYS 一一对应生成选项', () => {
    const opts = categoryOptions(t);
    expect(opts.map((o) => o.value)).toEqual([...CATEGORY_KEYS]);
    expect(opts[0].label).toBe('i18n:catGeneral');
  });
});
