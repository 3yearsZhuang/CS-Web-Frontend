// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCompose } from './use-compose';

/**
 * useCompose 单测（GENERAL 3.8「tests 覆盖拆分后组件」、2.4「拆分即补测」）
 * mock next/navigation / fetch，聚焦鉴权、校验、发布成功。
 */

const mockRouter = { push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => ({ get: () => null }),
}));

describe('useCompose', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRouter.push.mockClear();
  });

  it('已登录且有版块：自动选中第一个版块', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ user: { id: 'u1', role: 'user' } }) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ items: [{ id: 'c1', name: '综合', slug: 'general', description: 'd' }] }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCompose());

    await waitFor(() => expect(result.current.loadingCats).toBe(false));

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.categoryId).toBe('c1');
  });

  it('标题过短：校验拦截，不发起请求', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ user: { id: 'u1', role: 'user' } }) });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ items: [{ id: 'c1', name: '综合', slug: 'general', description: 'd' }] }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCompose());
    await waitFor(() => expect(result.current.loadingCats).toBe(false));

    act(() => {
      result.current.setTitle('ab');
      result.current.setContent('this is long enough content');
    });

    let ok = false;
    await act(async () => {
      ok = result.current.validate();
    });
    expect(ok).toBe(false);
    expect(result.current.fieldErrors.title).toBeDefined();
    // 校验失败时不应调用发布接口（仅 loadInitial 的两次 fetch）
    const postCalls = fetchMock.mock.calls.filter((c) => c[0].includes('/api/community/topics'));
    expect(postCalls.length).toBe(0);
  });

  it('提交成功：跳转内容详情页', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ user: { id: 'u1', role: 'user' } }) });
      }
      if (input.includes('/api/community/categories')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [{ id: 'c1', name: '综合', slug: 'general', description: 'd' }] }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, topic: { id: 't1', categoryId: 'c1' } }) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCompose());
    await waitFor(() => expect(result.current.loadingCats).toBe(false));

    act(() => {
      result.current.setTitle('这是一个有效的标题');
      result.current.setContent('this is long enough content');
    });

    await act(async () => {
      await result.current.handleSubmit(new Event('submit') as unknown as React.FormEvent);
    });

    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/community/t1'));
  });

  it('提交失败：保留错误提示', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ user: { id: 'u1', role: 'user' } }) });
      }
      if (input.includes('/api/community/categories')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ items: [{ id: 'c1', name: '综合', slug: 'general', description: 'd' }] }),
        });
      }
      return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: '发布失败' }) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCompose());
    await waitFor(() => expect(result.current.loadingCats).toBe(false));

    act(() => {
      result.current.setTitle('这是一个有效的标题');
      result.current.setContent('this is long enough content');
    });

    await act(async () => {
      await result.current.handleSubmit(new Event('submit') as unknown as React.FormEvent);
    });

    expect(result.current.formError).toBe('发布失败');
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
