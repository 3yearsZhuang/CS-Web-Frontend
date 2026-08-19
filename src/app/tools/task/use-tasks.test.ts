// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Hooks under test use translations for user-facing fallback messages; keep unit tests independent of NextIntlClientProvider.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
import { useTasks } from './use-tasks';

/**
 * useTasks 单测（GENERAL 3.8「tests 覆盖拆分后组件」、2.4「拆分即补测」）
 * mock fetch，聚焦挂载加载、认领、分类筛选与创建。
 */

const mockUser = { id: 'u1', role: 'member' };

const mockTasks = [
  {
    id: 't1', title: '任务A', description: 'd', contentMarkdown: null,
    category: 'general', tags: [], points: 10, maxClaimants: 1, claimCount: 0,
    status: 'published', createdBy: 'u0', publishedAt: '2024-01-01', closedAt: null,
    createdAt: '2024-01-01', updatedAt: '2024-01-01',
  },
];

describe('useTasks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('挂载时拉取用户与任务列表并填充', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ user: mockUser }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ tasks: mockTasks }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTasks());

    expect(result.current.tasksLoading).toBe(true);
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.anything());
    expect(fetchMock).toHaveBeenCalledWith('/api/tools/task?status=published&pageSize=50', expect.anything());
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.user?.id).toBe('u1');
    expect(result.current.filteredTasks).toHaveLength(1);
  });

  it('分类筛选：设置 categoryFilter 后 filteredTasks 仅含该分类', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: mockUser }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tasks: mockTasks }) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    act(() => {
      result.current.setCategoryFilter('general');
    });
    expect(result.current.filteredTasks).toHaveLength(1);

    act(() => {
      result.current.setCategoryFilter('event');
    });
    expect(result.current.filteredTasks).toHaveLength(0);
  });

  it('handleClaim 成功：自增 claimCount', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: mockUser }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tasks: mockTasks }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    await act(async () => {
      await result.current.handleClaim('t1');
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/tools/task/t1/claim', expect.objectContaining({ method: 'POST' }));
    expect(result.current.tasks[0].claimCount).toBe(1);
    expect(result.current.claimingId).toBeNull();
  });

  it('handleClaim 失败：alert 且不修改 claimCount', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: mockUser }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tasks: mockTasks }) })
      .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: '已满' }) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    await act(async () => {
      await result.current.handleClaim('t1');
    });

    expect(alertSpy).toHaveBeenCalledWith('已满');
    expect(result.current.tasks[0].claimCount).toBe(0);
  });

  it('handleCreate 成功：关闭表单并重置 newTask', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ user: mockUser }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ tasks: mockTasks }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    act(() => {
      result.current.setShowCreateForm(true);
      result.current.setNewTask((f) => ({ ...f, title: '新任务', description: 'desc' }));
    });

    await act(async () => {
      await result.current.handleCreate(new Event('submit') as unknown as React.FormEvent);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/tools/task',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.showCreateForm).toBe(false);
    expect(result.current.newTask.title).toBe('');
  });
});
