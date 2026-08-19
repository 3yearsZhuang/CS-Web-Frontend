// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './use-auth';

/**
 * use-auth 单测（2026-08-13 补全 shared/hooks 测试盲区）
 * 受控 SWR mock（useSyncExternalStore）以可靠驱动 data / isLoading / mutate 重渲染，聚焦：
 *  - 登录态判定（user / sessionMarker 乐观首帧 / 加载中）
 *  - data.user 为 null → 视为已登出并清本地标记
 *  - logout 调用后端、清本地标记、并立即（mutate null）置未登录态
 *
 * 说明：本项目 React19 + Vitest v4 + jsdom 下 vi.stubGlobal('fetch') 无法被 SWR fetcher 捕获，
 * 故直接受控 mock useSWR 的返回值，避免依赖真实 fetch。
 */

// jsdom 在 Vitest v4 文件级环境切换下未实现 localStorage，提供内存版 stub
function installLocalStorageStub() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(window, 'localStorage', { value: ls, configurable: true, writable: true });
}

const SESSION_KEY = 'fztbu_session';

// 受控 SWR 状态：测试通过 setMe() 驱动，mutate 也会写回这里
let meData: { user: unknown } | null = null;
let meLoading = true;
const meSubs = new Set<() => void>();
function emitMe() {
  meSubs.forEach((cb) => cb());
}
function setMe(data: { user: unknown } | null, loading = false) {
  meData = data;
  meLoading = loading;
  emitMe();
}

vi.mock('swr', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (key: string) => {
      if (key === '/api/auth/me') {
        const data = React.useSyncExternalStore(
          (cb: () => void) => {
            meSubs.add(cb);
            return () => meSubs.delete(cb);
          },
          () => meData,
        );
        const mutate = (d?: unknown) => {
          if (d !== undefined) setMe(d as { user: unknown } | null, false);
        };
        return { data, isLoading: meLoading, error: undefined, mutate };
      }
      return { data: undefined, isLoading: false, error: undefined, mutate: () => {} };
    },
  };
});

const LOGGED_IN_USER = {
  id: 'u1',
  email: 'a@b.c',
  displayName: null,
  role: 'member',
  avatarUrl: null,
  avatarType: null,
};

beforeEach(() => {
  installLocalStorageStub();
  vi.restoreAllMocks();
  // 默认回到「加载中、无数据」初始态，模拟硬加载首帧
  setMe(null, true);
});

describe('useAuth 登录态判定', () => {
  it('加载中且有本地会话标记 → 乐观视为已登录（消除登出闪烁）', () => {
    window.localStorage.setItem(SESSION_KEY, '1');
    setMe(null, true);
    const { result } = renderHook(() => useAuth());
    // 乐观首帧：依赖 sessionMarker，不等数据到达
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.loading).toBe(true);
  });

  it('加载中且无本地会话标记 → 视为未登录', () => {
    setMe(null, true);
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(false);
  });

  it('data.user 存在 → 已登录且写入会话标记', async () => {
    setMe({ user: { ...LOGGED_IN_USER, role: 'member' } }, false);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.role).toBe('member');
    expect(window.localStorage.getItem(SESSION_KEY)).toBe('1');
  });

  it('data.user 为 null → 已登出且清除会话标记', async () => {
    window.localStorage.setItem(SESSION_KEY, '1');
    setMe({ user: null }, false);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isLoggedIn).toBe(false);
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('useAuth.logout', () => {
  it('调用 /api/auth/logout 并清除本地标记、置未登录', async () => {
    window.localStorage.setItem(SESSION_KEY, '1');
    setMe({ user: { ...LOGGED_IN_USER, role: 'member' } }, false);

    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoggedIn).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    const calledLogout = fetchMock.mock.calls.some(
      ([url, opts]) => url === '/api/auth/logout' && (opts as RequestInit | undefined)?.method === 'POST',
    );
    expect(calledLogout).toBe(true);
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    // logout 通过 mutate({ user: null }) 立即置未登录
    await waitFor(() => expect(result.current.isLoggedIn).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it('登出后端失败时仍按本地清除为准', async () => {
    setMe({ user: { ...LOGGED_IN_USER, role: 'member' } }, false);

    const fetchMock = vi.fn(async () => {
      throw new Error('network');
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoggedIn).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    await waitFor(() => expect(result.current.isLoggedIn).toBe(false));
  });
});
