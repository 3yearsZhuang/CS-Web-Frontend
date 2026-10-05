// @vitest-environment jsdom

/**
 * @file AgentWeeklyWidget 测试：ready 渲染分节与计划达成 / failed 降级 / 错误重试。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const tStable = (key: string) => key;

vi.mock('next-intl', () => ({
  useTranslations: () => tStable,
  useLocale: () => 'zh-CN',
}));

const apiRequestMock = vi.fn();

vi.mock('@/shared/hooks/use-api-request', () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...(args as [])),
}));

import AgentWeeklyWidget from './agent-weekly-widget';

const READY = {
  id: 1,
  weekStart: '2026-09-28',
  content: {
    focusMinutes: 90,
    newWrongAnswers: 4,
    tasksApproved: 2,
    communityPosts: 5,
    planCompletion: { completed: 6, total: 10 },
    nextWeekHints: ['本周新增 4 条错题，建议优先安排复习'],
  },
  status: 'ready',
};

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('AgentWeeklyWidget', () => {
  it('ready：渲染六节聚合与下周建议', async () => {
    apiRequestMock.mockResolvedValue({ ok: true, data: { review: READY } });
    render(<AgentWeeklyWidget />);
    await screen.findByText('90');
    expect(screen.getByTestId('weekly-plan').textContent).toContain('6/10');
    expect(screen.getByText(/本周新增 4 条错题/)).toBeTruthy();
  });

  it('failed：静默降级提示', async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      data: { review: { ...READY, status: 'failed', content: { focusMinutes: null } } },
    });
    render(<AgentWeeklyWidget />);
    await screen.findByText('agentWeeklyDegraded');
  });

  it('加载失败：错误 + 重试成功后恢复', async () => {
    apiRequestMock
      .mockResolvedValueOnce({ ok: false, error: 'agentWeeklyLoadFailed' })
      .mockResolvedValueOnce({ ok: true, data: { review: READY } });
    render(<AgentWeeklyWidget />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByText('agentInboxRetry'));
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(screen.getByText('90')).toBeTruthy();
  });
});
