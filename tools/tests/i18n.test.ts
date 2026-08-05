import { describe, it, expect } from 'vitest';
import { t, setLanguage, getLanguage, getMessages } from '@/i18n';

/**
 * i18n 骨架测试（GENERAL 3.2 key 定义 + 语言包）
 * node 环境即可运行。
 */

describe('i18n', () => {
  it('默认语言为 zh-CN', () => {
    expect(getLanguage()).toBe('zh-CN');
  });

  it('t() 按 key 取中文文案', () => {
    expect(t('common.loading')).toBe('加载中');
    expect(t('nav.community')).toBe('社区');
    expect(t('admin.users')).toBe('用户管理');
  });

  it('setLanguage 切换为英文', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(t('common.loading')).toBe('Loading');
    expect(t('nav.community')).toBe('Community');
  });

  it('getMessages 返回当前语言包', () => {
    expect(getMessages().events.upcoming).toBe('Upcoming');
  });

  it('t() 对未知 key 回退为 key 本身', () => {
    // 类型上不允许未知 key，运行时兜底验证
    const fallback = (t as (k: string) => string)('common.nonexistent');
    expect(fallback).toBe('common.nonexistent');
  });

  it('恢复中文，避免影响其它测试', () => {
    setLanguage('zh-CN');
    expect(t('common.save')).toBe('保存');
  });
});
