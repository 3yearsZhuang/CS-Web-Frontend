/**
 * @file task-shared 纯函数测试：任务难度标签映射（含空值回退）与选项生成。
 */
import { describe, expect, it } from 'vitest';
import { difficultyLabel, DIFFICULTY_KEYS, difficultyOptions, type TFn } from './task-shared';

const t: TFn = (key) => `i18n:${key}`;

describe('difficultyLabel', () => {
  it('已注册难度映射到 i18n key', () => {
    expect(difficultyLabel(t, '黑铁')).toBe('i18n:diffBlackIron');
    expect(difficultyLabel(t, '黄金')).toBe('i18n:diffGold');
  });

  it('空值返回空串', () => {
    expect(difficultyLabel(t, null)).toBe('');
  });
});

describe('difficultyOptions', () => {
  it('与 DIFFICULTY_KEYS 一一对应生成选项', () => {
    const opts = difficultyOptions(t);
    expect(opts.map((o) => o.value)).toEqual([...DIFFICULTY_KEYS]);
    expect(opts[0].label).toBe('i18n:diffBlackIron');
  });
});
