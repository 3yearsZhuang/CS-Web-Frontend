// @vitest-environment jsdom

/**
 * @file AgentBriefingWidget 测试：ready 渲染分节 / failed 降级提示 / 错误重试。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const tStable = (key: string) => key;

vi.mock('next-intl', () => ({
  useTranslations: () => tStable,
  useLocale: () => 'zh-CN',
}));

const apiRequestMock = vi.fn();

vi.mock('@/shared/hooks/use-api-request', () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...(args as [])),
}));

import AgentBriefingWidget from './agent-briefing-widget';

const READY = {
  id: 1,
  briefDate: '2026-10-05',
  content: { reviews: 3, focusMinutes: 25, tasks: 1, community: 2, inboxPending: 1 },
  status: 'ready',
};

beforeEach(() => {
  apiRequestMock.mockReset();
});

describe('AgentBriefingWidget', () => {
  it('ready：渲染五节计数', async () => {
    apiRequestMock.mockResolvedValue({ ok: true, data: { briefing: READY } });
    render(<AgentBriefingWidget />);
    await screen.findByText('3');
    expect(screen.getByTestId('briefing-agentBriefingFocus').textContent).toContain('25');
    expect(screen.getByText('agentBriefingReviews')).toBeTruthy();
  });

  it('failed：静默降级提示（验收：生成失败不影响工作台）', async () => {
    apiRequestMock.mockResolvedValue({
      ok: true,
      data: { briefing: { ...READY, status: 'failed', content: { reviews: null } } },
    });
    render(<AgentBriefingWidget />);
    await screen.findByText('agentBriefingDegraded');
  });

  it('加载失败：错误 + 重试', async () => {
    apiRequestMock.mockResolvedValue({ ok: false, error: 'agentBriefingLoadFailed' });
    render(<AgentBriefingWidget />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByText('agentInboxRetry'));
    expect(apiRequestMock).toHaveBeenCalledTimes(2);
  });
});
