// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExam } from './use-exam';

/**
 * useExam 单测（GENERAL 3.8「tests 覆盖拆分后组件」、2.4「拆分即补测」）
 * mock next/navigation / fetch，聚焦加载、选项选择、提交判分。
 */

const mockRouter = { push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

const mockExam = {
  exam: {
    id: 'e1',
    title: '测试考试',
    description: null,
    status: 'published',
    startTime: null,
    endTime: null,
    durationMinutes: 60,
    techTags: [],
    createdBy: 'u0',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  questions: [
    {
      id: 'q1',
      examId: 'e1',
      type: 'single_choice',
      title: 'Q1',
      contentMarkdown: null,
      score: 10,
      sortOrder: 1,
      createdAt: '2024-01-01',
      options: [
        { id: 'o1', questionId: 'q1', label: 'A', content: 'a', isCorrect: true, sortOrder: 1 },
        { id: 'o2', questionId: 'q1', label: 'B', content: 'b', isCorrect: false, sortOrder: 2 },
      ],
    },
  ],
};

describe('useExam', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRouter.push.mockClear();
  });

  it('挂载：加载考试与题目', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/me')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => null });
      }
      if (input.includes('/my-results')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ attempts: [] }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => mockExam });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useExam('e1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.exam?.title).toBe('测试考试');
    expect(result.current.questions).toHaveLength(1);
    expect(result.current.isLoggedIn).toBe(false);
  });

  it('未登录提交：跳转登录页', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/me')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => null });
      }
      if (input.includes('/my-results')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ attempts: [] }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => mockExam });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useExam('e1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/login?redirect=/tools/exam/e1');
  });

  it('选择选项：更新 answers', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/me')) {
        return Promise.resolve({ ok: false, status: 401, json: async () => null });
      }
      if (input.includes('/my-results')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ attempts: [] }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => mockExam });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useExam('e1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.selectOption('q1', 'A');
    });

    expect(result.current.answers.q1).toBe('A');
  });

  it('已登录提交成功：进入已提交态并得结果', async () => {
    const fetchMock = vi.fn((input: string) => {
      if (input.includes('/api/auth/me')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ user: { id: 'u1' } }) });
      }
      if (input.includes('/my-results')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ attempts: [] }) });
      }
      if (input === '/api/tools/exam/e1') {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockExam });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ results: [{ questionId: 'q1', isCorrect: true, score: 10 }] }),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useExam('e1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isLoggedIn).toBe(true);

    act(() => {
      result.current.selectOption('q1', 'A');
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    await waitFor(() => expect(result.current.submitted).toBe(true));
    expect(result.current.results.q1?.isCorrect).toBe(true);
    expect(result.current.totalScore).toBe(10);
  });
});
