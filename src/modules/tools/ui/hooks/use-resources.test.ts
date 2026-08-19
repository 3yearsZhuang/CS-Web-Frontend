// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Hooks under test use translations for user-facing fallback messages; keep unit tests independent of NextIntlClientProvider.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
import { useResources } from './use-resources';

/**
 * useResources 单测（GENERAL 3.8「tests 覆盖拆分后组件」、2.4「拆分即补测」）
 * mock next/navigation / use-auth / fetch，聚焦加载、过滤、提交。
 */

const mockAuth = { isLoggedIn: true, user: { id: 'u1', role: 'member' } };
vi.mock('@/shared/hooks/use-auth', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const mockResources = {
  resources: [{ id: 'r1', title: 'T', url: 'https://x', description: null, resource_type: 'article', tech_tags: '["react"]', status: 'published', submitted_by: 'u1', author_display_name: 'A', author_avatar_url: null, author_tech_tags: null, view_count: 3, like_count: 0, created_at: '2024-01-01T00:00:00Z' }],
  total: 1,
  page: 1,
  totalPages: 1,
  techTagCounts: { react: 1 },
};

describe('useResources', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('挂载时拉取资源列表并填充', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResources,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useResources());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data?.resources).toHaveLength(1);
    expect(result.current.techTagTabs.length).toBeGreaterThan(1);
  });

  it('setType 切换类型并重置页码', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResources,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useResources());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(3);
      result.current.setType('video');
    });

    expect(result.current.activeType).toBe('video');
    expect(result.current.page).toBe(1);
  });

  it('handleSubmit 成功：进入成功态并刷新列表', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockResources })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockResources });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useResources());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setForm((f) => ({ ...f, title: '新资源', url: 'https://new' }));
    });

    await act(async () => {
      await result.current.handleSubmit(new Event('submit') as unknown as React.FormEvent);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tools/resource',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.submitSuccess).toBe(true);
  });

  it('handleSubmit 失败：保留错误提示', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => mockResources })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'bad' }) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useResources());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setForm((f) => ({ ...f, title: '新资源', url: 'https://new' }));
    });

    await act(async () => {
      await result.current.handleSubmit(new Event('submit') as unknown as React.FormEvent);
    });

    expect(result.current.submitError).toBe('bad');
    expect(result.current.submitSuccess).toBe(false);
  });
});
