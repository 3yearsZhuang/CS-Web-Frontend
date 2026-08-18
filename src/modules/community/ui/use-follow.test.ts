// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFollow } from './use-follow';

// 安全包裹 router mock（vi.mock 工厂需引用 hoisted 变量）
const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

type FetchResolver = (
  url: string,
  opts?: RequestInit,
) => { ok: boolean; status: number; json: () => Promise<unknown> };

function installFetch(resolver: FetchResolver) {
  return vi.fn(async (url: string, opts?: RequestInit) => {
    // apiRequest 走 res.text() + JSON.parse；mock 需补齐 text()（真实 fetch 同时具备 json/text）
    const base = resolver(url, opts);
    return {
      ...base,
      text: async () => JSON.stringify(await base.json()),
    };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  routerPush.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useFollow 首屏拉取关注态', () => {
  it('未传 initialFollowing 且非本人 → GET 拉取并设 following/loaded', async () => {
    const fetchMock = installFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({ following: true }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useFollow({ targetUserId: 'u2', currentUserId: 'u1' }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.following).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/community/users/u2/follow',
      expect.objectContaining({ method: 'GET', cache: 'no-store' }),
    );
  });

  it('GET 失败 → loaded=true 但 following 保持初始 false（不闪烁）', async () => {
    const fetchMock = installFetch(() => {
      throw new Error('network');
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useFollow({ targetUserId: 'u2', currentUserId: 'u1' }),
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.following).toBe(false);
  });

  it('已传 initialFollowing → 不发 GET（避免首屏闪烁）', async () => {
    const fetchMock = installFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({ following: false }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    renderHook(() =>
      useFollow({ targetUserId: 'u2', currentUserId: 'u1', initialFollowing: true }),
    );

    // 短暂等待，确认 effect 未触发 GET（initialFollowing 已定义 → 早返回）
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('useFollow toggle（POST 关注/取关）', () => {
  it('已登录点击 → POST 关注，成功后更新 following 并清 pending', async () => {
    const fetchMock = installFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({ following: true }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useFollow({ targetUserId: 'u2', currentUserId: 'u1', initialFollowing: false }),
    );

    await act(async () => {
      await result.current.toggle();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/community/users/u2/follow',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.following).toBe(true);
    expect(result.current.pending).toBe(false);
  });

  it('POST 失败 → 回滚到原状态（乐观更新失败兜底）', async () => {
    const fetchMock = installFetch(() => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useFollow({ targetUserId: 'u2', currentUserId: 'u1', initialFollowing: false }),
    );

    await act(async () => {
      await result.current.toggle();
    });

    expect(result.current.following).toBe(false); // 回滚
    expect(result.current.pending).toBe(false);
  });

  it('未登录点击 → 跳转 /login，不发 POST 请求（挂载时的 GET 拉取态仍可能发生）', async () => {
    const fetchMock = installFetch(() => ({
      ok: true,
      status: 200,
      json: async () => ({ following: false }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useFollow({ targetUserId: 'u2' })); // 无 currentUserId

    // 挂载时若未传 initialFollowing 仍会发 GET 拉取态（与原组件行为一致）
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      await result.current.toggle();
    });

    expect(routerPush).toHaveBeenCalledWith('/login');
    const posted = fetchMock.mock.calls.some(
      ([, opts]) => (opts as RequestInit | undefined)?.method === 'POST',
    );
    expect(posted).toBe(false);
  });
});
