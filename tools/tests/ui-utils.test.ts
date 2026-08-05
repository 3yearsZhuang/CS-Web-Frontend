import { describe, it, expect } from 'vitest';
import { describeAction, formatAdminName } from '@/modules/admin/ui/logs-utils';
import { eventStatusLabel, splitTags, blankEventForm } from '@/modules/admin/ui/events-panel-utils';
import { formatDate, TASK_CATEGORY_LABELS } from '@/modules/tools/ui/tool-types';
import { roleBadgeLabel } from '@/modules/admin/ui/roles-types';
import { roleLabel, resetStatusLabel } from '@/modules/admin/ui/users-panel-utils';
import { getError } from '@/modules/community/ui/forum-admin-utils';
import { LOGO_PALETTE, LOGO_PALETTE_MINI } from '@/shared/constants/logo-colors';
import { BREAKPOINTS, BREAKPOINT_QUERIES } from '@/shared/constants/breakpoints';

/**
 * 拆分后纯逻辑工具函数测试（GENERAL 2.4「拆分即补测」、3.8「tests 覆盖工具」）
 * node 环境即可运行，无需 DOM。
 */

describe('logs-utils (admin-logs-panel 拆分)', () => {
  const base = {
    id: 'log-1',
    adminId: 'adm-1',
    adminEmail: 'a@fztbu.cn',
    targetUserId: 'u-1',
    targetEmail: 'u@fztbu.cn',
    action: 'update_user' as const,
    details: JSON.stringify({ role: { to: 'admin' } }),
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('describeAction 渲染操作者与目标', () => {
    expect(describeAction(base as never)).toContain('a@fztbu.cn');
    expect(describeAction(base as never)).toContain('u@fztbu.cn');
  });

  it('describeAction 解析 details 变更', () => {
    expect(describeAction(base as never)).toContain('角色 → admin');
  });

  it('formatAdminName 优先返回邮箱', () => {
    expect(formatAdminName(base as never)).toBe('a@fztbu.cn');
  });

  it('formatAdminName 邮箱缺失时返回 ID 片段', () => {
    const noEmail = { ...base, adminEmail: null, adminDisplayName: null };
    expect(formatAdminName(noEmail as never)).toContain('adm-1');
  });
});

describe('events-panel-utils (admin-events-panel 拆分)', () => {
  it('eventStatusLabel 映射状态文案', () => {
    expect(eventStatusLabel('upcoming' as never)).toBe('即将开始');
    expect(eventStatusLabel('ongoing' as never)).toBe('进行中');
    expect(eventStatusLabel('ended' as never)).toBe('已结束');
    expect(eventStatusLabel('other' as never)).toBe('—');
  });

  it('splitTags 去重并过滤空白', () => {
    expect(splitTags(' a , b , a ,')).toEqual(['a', 'b']);
    expect(splitTags('')).toEqual([]);
  });

  it('blankEventForm 返回空表单', () => {
    const f = blankEventForm();
    expect(f.title).toBe('');
    expect(f.isPinned).toBe(false);
    expect(f.capacity).toBe(0);
  });
});

describe('tool-types (admin-tools-panel 拆分)', () => {
  it('TASK_CATEGORY_LABELS 覆盖通用分类', () => {
    expect(TASK_CATEGORY_LABELS.general).toBe('通用');
    expect(TASK_CATEGORY_LABELS.event).toBe('活动协助');
  });

  it('formatDate 格式化 ISO 时间', () => {
    expect(formatDate('2026-01-01')).toBe('2026-01-01 00:00');
    expect(formatDate('invalid')).toBe('—');
  });
});

describe('roles-types / users-panel-utils (拆分)', () => {
  it('roleBadgeLabel 区分角色', () => {
    expect(roleBadgeLabel({ key: 'root' } as never)).toBe('ROOT');
    expect(roleBadgeLabel({ key: 'custom', isProtected: false, isSystem: false } as never)).toBe('CUSTOM');
  });

  it('roleLabel 映射中文角色', () => {
    expect(roleLabel('root')).toBe('超级管理员');
    expect(roleLabel('admin')).toBe('管理员');
    expect(roleLabel('user')).toBe('普通用户');
  });

  it('resetStatusLabel 映射状态', () => {
    expect(resetStatusLabel('pending')).toBe('待处理');
    expect(resetStatusLabel('approved')).toBe('已批准');
    expect(resetStatusLabel('rejected')).toBe('已拒绝');
  });
});

describe('forum-admin-utils (forum-admin-panel 拆分)', () => {
  it('getError 提取 error 字段', () => {
    expect(getError({ error: '失败' }, 'fallback')).toBe('失败');
    expect(getError(null, 'fallback')).toBe('fallback');
    expect(getError('x', 'fallback')).toBe('fallback');
  });
});

describe('shared/constants (T0 基线)', () => {
  it('logo 调色板与 globals 令牌对齐', () => {
    expect(LOGO_PALETTE).toContain('#4070e0');
    expect(LOGO_PALETTE_MINI.length).toBeLessThan(LOGO_PALETTE.length);
  });

  it('breakpoints 断点集中定义', () => {
    expect(BREAKPOINTS.tablet).toBe(640);
    expect(BREAKPOINTS.desktop).toBe(768);
    expect(BREAKPOINT_QUERIES.mobile).toBe('(max-width: 639px)');
  });
});
