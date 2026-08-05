// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCommunityFeed } from './use-community-feed';

/**
 * useCommunityFeed 单测（GENERAL 3.8「tests 覆盖拆分后组件」、2.4「拆分即补测」）
 * mock next-intl / next/navigation / fetch，聚焦 auth、feed 加载、搜索、标签过滤。
 */

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockRouter = { replace: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => ({ get: () => null }),
}));

// 隔离 Hero 折叠副作用（依赖 window.scrollY / requestAnimationFrame，jsdom 下会引发更新风暴）
vi.mock('@/shared/hooks/use-collapsing-hero', () => ({
  useCollapsingHero: () => ({
    collapsed: false,
    capsuleVisible: true,
    onRevealComplete: vi.fn(),
    onTitleClick: vi.fn(),
  }),
}));

const mockFeed = {
  items: [{ kind: 'topic', data: { id: 't1', title: 'T' } }],
  total: 1,
  totalPages: 1,
};

describe('useCommunityFeed', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('挂载：auth=未登录时，all tab 仍加载 feed', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (typeof input === 'string' && input.includes('/api/auth/me')) {
        return Promise.resolve({ status: 401, ok: false, json: async () => null });
      }
      if (typeof input === 'string' && input.includes('/api/community/feed?')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockFeed });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCommunityFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.communityTabs.length).toBe(3); // 非管理员无 admin tab
  });

  it('搜索：设置 searchQuery 触发 feed 重新加载', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (typeof input === 'string' && input.includes('/api/auth/me')) {
        return Promise.resolve({ status: 401, ok: false, json: async () => null });
      }
      if (typeof input === 'string' && input.includes('/api/community/feed?')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockFeed });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCommunityFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSearchQuery('react');
    });
    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => typeof c[0] === 'string' && c[0].includes('search=react'))).toBe(true),
    );
    expect(result.current.hasSearch).toBe(true);
  });

  it('标签点击：切换 selectedTag 并重置页码', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (typeof input === 'string' && input.includes('/api/auth/me')) {
        return Promise.resolve({ status: 401, ok: false, json: async () => null });
      }
      if (typeof input === 'string' && input.includes('/api/community/feed?')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockFeed });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useCommunityFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setPage(3);
      result.current.handleTagClick('nextjs');
    });

    expect(result.current.selectedTag).toBe('nextjs');
    expect(result.current.page).toBe(1);
  });
});
