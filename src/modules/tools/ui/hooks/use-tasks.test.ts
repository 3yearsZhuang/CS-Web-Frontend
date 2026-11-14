// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Hooks under test use translations for user-facing fallback messages; keep unit tests independent of NextIntlClientProvider.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
import { useTasks } from './use-tasks';

/**
 * useTasks 单测：任务数据已切到统一后端原生 /api/tasks。
 */

const mockUser = { id: 'u1', role: 'member' };

const mockTasks = [
  {
    id: 1, title: '任务A', description: 'd', difficulty: '黑铁', tags: [],
    rewardTotal: '10', deadline: null, status: 'published',
    publisherId: 1, publisherName: null, createdAt: '2024-01-01', updatedAt: '2024-01-01',
  },
];

/** 构造最小 fetch Response 桩（apiRequest 优先调用 text()） */
function res(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/** 安装按 URL 分发的 fetch mock；overrides 可按 URL 覆盖响应 */
function installFetch(overrides: Record<string, () => Response> = {}) {
  const fetchMock = vi.fn().mockImplementation(async (url: string) => {
    if (overrides[url]) return overrides[url]();
    if (url === '/api/auth/me') return res({ user: mockUser });
    if (url === '/api/rbac/me/permissions') return res({ permissions: [] });
    if (url.startsWith('/api/tasks?')) return res({ items: mockTasks });
    if (url === '/api/tasks/me/claims?limit=50') return res({ items: [] });
    if (url.startsWith('/api/admin/tasks?')) return res({ items: [] });
    if (url === '/api/tasks') return res({ id: 2 }, 201);
    if (url.startsWith('/api/tasks/') && url.endsWith('/review-requests')) return res({ id: 2 });
    if (url.startsWith('/api/tasks/')) return res({ id: 3 }, 201);
    return res({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('useTasks', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('挂载时拉取用户与任务列表并填充', async () => {
    const fetchMock = installFetch();

    const { result } = renderHook(() => useTasks());

    expect(result.current.tasksLoading).toBe(true);
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/me', expect.anything());
    expect(fetchMock).toHaveBeenCalledWith('/api/tasks?status=published&limit=50', expect.anything());
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].reward).toBe(10);
    expect(result.current.user?.id).toBe('u1');
    expect(result.current.filteredTasks).toHaveLength(1);
  });

  it('难度筛选：设置 difficultyFilter 后 filteredTasks 仅含该难度', async () => {
    installFetch();

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    act(() => {
      result.current.setDifficultyFilter('黑铁');
    });
    expect(result.current.filteredTasks).toHaveLength(1);

    act(() => {
      result.current.setDifficultyFilter('黄金');
    });
    expect(result.current.filteredTasks).toHaveLength(0);
  });

  it('handleClaim 成功：调用原生接取接口并重新拉取列表', async () => {
    const fetchMock = installFetch();

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    await act(async () => {
      await result.current.handleClaim('1');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks/1/claims',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.claimingId).toBeNull();
  });

  it('handleClaim 失败：alert 且 claimingId 归零', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    installFetch({
      '/api/tasks/1/claims': () => res({ error: '已被接取' }, 409),
    });

    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.tasksLoading).toBe(false));

    await act(async () => {
      await result.current.handleClaim('1');
    });

    expect(alertSpy).toHaveBeenCalledWith('已被接取');
    expect(result.current.claimingId).toBeNull();
  });

  it('handleCreate 成功：创建草稿并申请上架', async () => {
    const fetchMock = installFetch();

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
      '/api/tasks',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tasks/2/review-requests',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.showCreateForm).toBe(false);
    expect(result.current.newTask.title).toBe('');
  });
});
