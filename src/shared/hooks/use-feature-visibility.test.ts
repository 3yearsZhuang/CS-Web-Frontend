// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeatureVisibility, useComponentVisible, useModuleVisible, deriveUserClass } from './use-feature-visibility';

/**
 * use-feature-visibility 单测（2026-08-13 补全 shared/hooks 测试盲区）
 * 隔离 SWR 与 useAuth，聚焦：
 *  - deriveUserClass 三态推导
 *  - 配置缺失 / 未知组件时 fail-open（一律可见）
 *  - guest/member/admin 三态按规则正确判定
 */

// 隔离 SWR：提供可控的 feature-visibility 数据
const swrState = { data: undefined as unknown, isLoading: false, error: undefined as unknown, mutate: vi.fn() };
vi.mock('swr', () => ({
  default: (key: string) => {
    if (key === '/api/feature-visibility') {
      return { data: swrState.data, isLoading: swrState.isLoading, error: swrState.error, mutate: swrState.mutate };
    }
    return { data: undefined, isLoading: false, error: undefined, mutate: vi.fn() };
  },
  __esModule: true,
}));

// 隔离 useAuth，避免连带拉取 /api/auth/me
const authState = { user: undefined as { role?: string } | null, isLoggedIn: false };
vi.mock('@/shared/hooks/use-auth', () => ({
  useAuth: () => ({ user: authState.user, isLoggedIn: authState.isLoggedIn }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  swrState.data = undefined;
  swrState.isLoading = false;
  swrState.error = undefined;
  authState.user = null;
  authState.isLoggedIn = false;
});

describe('deriveUserClass', () => {
  it('未登录 → guest', () => {
    expect(deriveUserClass(false)).toBe('guest');
  });
  it('已登录无角色 → member', () => {
    expect(deriveUserClass(true)).toBe('member');
  });
  it('已登录 role=admin → admin', () => {
    expect(deriveUserClass(true, 'admin')).toBe('admin');
  });
  it('已登录 role=root → admin', () => {
    expect(deriveUserClass(true, 'root')).toBe('admin');
  });
  it('已登录 role=member → member', () => {
    expect(deriveUserClass(true, 'member')).toBe('member');
  });
});

describe('useComponentVisible', () => {
  it('未知组件 key：fail-open 一律可见', () => {
    const { result } = renderHook(() => useComponentVisible('__unknown_component__'));
    expect(result.current).toBe(true);
  });

  it('配置未加载：回退默认规则（fail-open）', async () => {
    swrState.data = undefined;
    const { result } = renderHook(() => useComponentVisible('avatar'));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('配置加载后：guest 态按规则判定', async () => {
    swrState.data = {
      modules: [{ moduleKey: 'admin-panel', guest: false, member: false, admin: true }],
    };
    authState.isLoggedIn = false;
    const { result } = renderHook(() => useComponentVisible('admin-panel'));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('配置加载后：admin 态按规则判定', async () => {
    swrState.data = {
      modules: [{ moduleKey: 'admin-panel', guest: false, member: false, admin: true }],
    };
    authState.isLoggedIn = true;
    authState.user = { role: 'admin' };
    const { result } = renderHook(() => useComponentVisible('admin-panel'));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('配置加载后：member 态按规则判定', async () => {
    swrState.data = {
      modules: [{ moduleKey: 'admin-panel', guest: false, member: false, admin: true }],
    };
    authState.isLoggedIn = true;
    authState.user = { role: 'member' };
    const { result } = renderHook(() => useComponentVisible('admin-panel'));
    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe('useFeatureVisibility', () => {
  it('加载中 isLoading 透传', () => {
    swrState.isLoading = true;
    const { result } = renderHook(() => useFeatureVisibility());
    expect(result.current.isLoading).toBe(true);
  });

  it('将 modules 归并为 rules map', async () => {
    swrState.data = {
      modules: [
        { moduleKey: 'a', guest: true, member: true, admin: true },
        { moduleKey: 'b', guest: false, member: true, admin: true },
      ],
    };
    const { result } = renderHook(() => useFeatureVisibility());
    await waitFor(() => expect(result.current.rules).toEqual({
      a: { guest: true, member: true, admin: true },
      b: { guest: false, member: true, admin: true },
    }));
  });
});

describe('useModuleVisible（兼容别名）', () => {
  it('与 useComponentVisible 行为一致', () => {
    const { result } = renderHook(() => useModuleVisible('__unknown__'));
    expect(result.current).toBe(true);
  });
});
