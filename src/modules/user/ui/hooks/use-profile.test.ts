// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProfile } from './use-profile';

/**
 * useProfile 单测（GENERAL 3.8「tests 覆盖拆分后组件」、2.4「拆分即补测」）
 * mock next-intl 与 fetch，聚焦加载、资料保存、头像预设分支。
 */

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockUser = {
  id: 'u1',
  email: 'a@b.com',
  displayName: 'Test',
  bio: '',
  githubUrl: null,
  websiteUrl: null,
  techTags: [],
  avatarUrl: 'x',
  avatarType: 'preset',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('useProfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('挂载时拉取 profile 并填充 user / activities', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: mockUser,
        activities: [{ id: 'a1', activityTitle: 'T', activityDate: '2024-02-01', role: null, createdAt: '2024-02-01' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProfile());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith('/api/profile');
    expect(result.current.user?.id).toBe('u1');
    expect(result.current.activities).toHaveLength(1);
    expect(result.current.form.displayName).toBe('Test');
  });

  it('资料保存成功：更新 user 并提示成功', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ user: mockUser, activities: [] }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ user: { ...mockUser, displayName: 'New' } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setForm((f) => ({ ...f, displayName: 'New' }));
    });

    await act(async () => {
      await result.current.handleProfileSubmit(
        new Event('submit') as unknown as React.FormEvent,
      );
    });

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(result.current.user?.displayName).toBe('New');
    expect(result.current.profileMessage?.type).toBe('success');
  });

  it('资料保存失败：保留错误提示且不更新 user', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ user: mockUser, activities: [] }),
      })
      .mockResolvedValueOnce({
        ok: false, status: 400,
        json: async () => ({ error: 'bad' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleProfileSubmit(
        new Event('submit') as unknown as React.FormEvent,
      );
    });

    expect(result.current.profileMessage?.type).toBe('error');
    expect(result.current.user?.displayName).toBe('Test');
  });

  it('displayName 超长客户端校验拦截，不发起请求', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ user: mockUser, activities: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setForm((f) => ({ ...f, displayName: 'x'.repeat(100) }));
    });

    await act(async () => {
      await result.current.handleProfileSubmit(
        new Event('submit') as unknown as React.FormEvent,
      );
    });

    // 仅初始加载的 GET，无 PUT
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.profileMessage?.type).toBe('error');
  });
});
