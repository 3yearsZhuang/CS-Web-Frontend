// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from './use-notifications';

/**
 * useNotifications 单测（GENERAL 3.8「tests 覆盖拆分后组件」、2.4「拆分即补测」）
 * mock next/navigation / fetch，聚焦加载、筛选、标记已读、全部已读。
 */

const mockRouter = { push: vi.fn(), replace: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => ({ get: () => null }),
}));

const mockResp = {
  notifications: [
    { id: 'n1', title: '系统通知', content: 'c', type: 'system', isRead: false, createdAt: '2024-01-01', senderId: null },
    { id: 'n2', title: '活动', content: 'c', type: 'activity', isRead: true, createdAt: '2024-01-02', senderId: null },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
  totalPages: 1,
  unreadCount: 1,
};

describe('useNotifications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
  });

  it('挂载：加载通知列表与未读数', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/notifications?')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockResp });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
  });

  it('401：跳转登录页', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/notifications?')) {
        return Promise.resolve({ status: 401, ok: false, json: async () => null });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('标记单条已读：乐观更新 + 未读数减一', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/notifications?')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockResp });
      }
      if (input.includes('/read')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleMarkRead('n1');
    });

    expect(result.current.notifications[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('标记全部已读：清零未读', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/notifications?')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockResp });
      }
      if (input.includes('/read-all')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleMarkAllRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every((n) => n.isRead)).toBe(true);
  });
});
