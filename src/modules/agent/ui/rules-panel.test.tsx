// @vitest-environment jsdom

/**
 * @file AgentRulesPanel 测试：列表渲染 / 启停切换 / 新建流程 / 删除。
 * apiRequest 按 URL+方法分发打桩；next-intl 本地稳定覆写。
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

import AgentRulesPanel from './rules-panel';

const RULE = {
  id: 3,
  userId: 1,
  name: '复习提醒',
  triggerType: 'review_due',
  condition: null,
  actionType: 'inbox_suggestion',
  actionPayload: null,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  cooldownMinutes: 240,
  maxPerHour: 3,
  enabled: false,
  lastFiredAt: null,
  createdAt: '2026-10-05T00:00:00Z',
  updatedAt: '2026-10-05T00:00:00Z',
};

const routes = new Map<string, () => unknown>();

function routeOf(path: string, method: string): () => unknown {
  const key = `${method} ${path.split('?')[0]}`;
  return routes.get(key) ?? (() => ({ ok: true, data: { items: [RULE] } }));
}

beforeEach(() => {
  routes.clear();
  routes.set('GET /api/agent-rules', () => ({ ok: true, data: { items: [RULE] } }));
  apiRequestMock.mockImplementation((path: string, init?: { method?: string }) =>
    Promise.resolve(routeOf(path, init?.method ?? 'GET')()),
  );
});

describe('AgentRulesPanel', () => {
  it('渲染规则列表（名称 / 触发类型 / 裁决器参数）', async () => {
    render(<AgentRulesPanel />);
    await screen.findByText('复习提醒');
    expect(screen.getByTestId('rule-type').textContent).toBe('inboxTypeReviewDue');
    expect(screen.getByText(/agentRulesQuiet 22:00→07:00/)).toBeTruthy();
  });

  it('逐条启用：调 enabled 接口并更新本地状态', async () => {
    routes.set('PATCH /api/agent-rules/3/enabled', () => ({
      ok: true,
      data: { rule: { ...RULE, enabled: true } },
    }));
    render(<AgentRulesPanel />);
    await screen.findByText('复习提醒');
    const enable = screen.getByText('agentRulesEnable');
    fireEvent.click(enable);
    await waitFor(() => expect(screen.getByText('agentRulesDisable')).toBeTruthy());
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/agent-rules/3/enabled',
      { method: 'PATCH', body: { enabled: true } },
    );
  });

  it('新建规则：展开表单提交后追加到列表', async () => {
    routes.set('POST /api/agent-rules', () => ({
      ok: true,
      data: {
        rule: {
          ...RULE,
          id: 9,
          name: '考试冲刺',
          triggerType: 'exam_finished',
          enabled: false,
        },
      },
    }));
    render(<AgentRulesPanel />);
    await screen.findByText('复习提醒');
    fireEvent.click(screen.getByText('agentRulesCreate'));

    const nameInput = screen.getByLabelText('agentRulesNamePlaceholder');
    fireEvent.change(nameInput, { target: { value: '考试冲刺' } });
    fireEvent.click(screen.getByText('agentRulesCreate'));

    await screen.findByText('考试冲刺');
    expect(apiRequestMock).toHaveBeenCalledWith(
      '/api/agent-rules',
      {
        method: 'POST',
        body: expect.objectContaining({ name: '考试冲刺' }),
      },
    );
  });

  it('创建失败展示错误与重试', async () => {
    routes.set('POST /api/agent-rules', () => ({ ok: false, error: 'agentRulesSaveFailed' }));
    render(<AgentRulesPanel />);
    await screen.findByText('复习提醒');
    fireEvent.click(screen.getByText('agentRulesCreate'));
    const nameInput = screen.getByLabelText('agentRulesNamePlaceholder');
    fireEvent.change(nameInput, { target: { value: '坏规则' } });
    fireEvent.click(screen.getByText('agentRulesCreate'));
    await screen.findByRole('alert');
    expect(screen.getByText('agentRulesSaveFailed')).toBeTruthy();
  });

  it('删除规则后本地移除', async () => {
    routes.set('DELETE /api/agent-rules/3', () => ({ ok: true, data: { ok: true } }));
    render(<AgentRulesPanel />);
    await screen.findByText('复习提醒');
    const del = screen.getByLabelText('agentRulesDelete');
    fireEvent.click(del);
    await waitFor(() => expect(screen.queryByText('复习提醒')).toBeNull());
  });
});
