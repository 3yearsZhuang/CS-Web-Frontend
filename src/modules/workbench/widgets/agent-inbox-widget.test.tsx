// @vitest-environment jsdom

/**
 * @file AgentInboxWidget 测试：pending 列表渲染 / 空态 / 动作点击移除。
 * apiRequest 按URL+方法分发打桩；next-intl 本地覆写为稳定引用
 * （全局 mock 每次 render 产生新函数，会使依赖 t 的 useCallback 失效重拉）。
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

import AgentInboxWidget from './agent-inbox-widget';

const ITEM_A = {
  id: 7,
  userId: 1,
  type: 'review_due',
  source: 'scheduler',
  title: '三个知识点到期复习',
  reason: '7 天未复习',
  confidence: 0.8,
  estimatedMinutes: 20,
  payload: null,
  status: 'pending',
  snoozedUntil: null,
  expiresAt: null,
  resolvedAt: null,
  createdAt: '2026-10-05T00:00:00Z',
  updatedAt: '2026-10-05T00:00:00Z',
};
const ITEM_B = { ...ITEM_A, id: 8, type: 'resource_recommend', title: '动态规划讲义', reason: '匹配薄弱知识点' };

/** 按 URL+方法路由打桩：列表 GET / 动作 PATCH 各自独立应答，不受重拉次数影响 */
const routes = new Map<string, () => unknown>();

function routeOf(path: string, method: string): () => unknown {
  const key = `${method} ${path.split('?')[0]}`;
  return routes.get(key) ?? (() => ({ ok: true, data: { items: [ITEM_A, ITEM_B] } }));
}

beforeEach(() => {
  routes.clear();
  routes.set('GET /api/agent-inbox', () => ({ ok: true, data: { items: [ITEM_A, ITEM_B] } }));
  apiRequestMock.mockImplementation((path: string, init?: { method?: string }) =>
    Promise.resolve(routeOf(path, init?.method ?? 'GET')()),
  );
});

describe('AgentInboxWidget', () => {
  it('渲染 pending 列表（类型徽标 / 标题 / 理由 / 预计耗时）', async () => {
    render(<AgentInboxWidget />);
    await screen.findByText('三个知识点到期复习');
    expect(screen.getByText('inboxTypeReviewDue')).toBeTruthy();
    expect(screen.getByText('7 天未复习')).toBeTruthy();
    expect(screen.getByText('动态规划讲义')).toBeTruthy();
  });

  it('点击接受后本地移除该项', async () => {
    routes.set('PATCH /api/agent-inbox/7/status', () => ({
      ok: true,
      data: { item: { ...ITEM_A, status: 'accepted' } },
    }));
    render(<AgentInboxWidget />);
    await screen.findByText('三个知识点到期复习');

    const row = screen.getByTestId('inbox-item-7');
    const accept = row.querySelector('button') as HTMLButtonElement;
    fireEvent.click(accept);

    await waitFor(() => expect(screen.queryByTestId('inbox-item-7')).toBeNull());
    expect(screen.getByTestId('inbox-item-8')).toBeTruthy();
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/agent-inbox/7/status',
      { method: 'PATCH', body: { action: 'accept' } },
    );
  });

  it('空态展示占位', async () => {
    routes.set('GET /api/agent-inbox', () => ({ ok: true, data: { items: [] } }));
    render(<AgentInboxWidget />);
    await screen.findByText('agentInboxEmpty');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('加载失败展示错误与重试入口', async () => {
    routes.set('GET /api/agent-inbox', () => ({ ok: false, error: 'agentInboxLoadFailed' }));
    render(<AgentInboxWidget />);
    await screen.findByRole('alert');
    expect(screen.getByText('agentInboxLoadFailed')).toBeTruthy();
  });
});
