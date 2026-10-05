/**
 * @file BFF 路由回归测试（AG-P3-02）：agent-rules CRUD 的 camel→snake 映射与错误透传。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/backend-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/backend-client')>();
  return { ...actual, proxyBackend: vi.fn() };
});

vi.mock('@/shared/security/security', () => ({
  assertAllowedOrigin: vi.fn(() => null),
  getCookieValue: vi.fn(() => null),
}));

import { proxyBackend, type ProxyResult } from '@/shared/backend-client';
import { GET as rulesGet, POST as rulesPost } from '@/app/api/agent-rules/route';
import { DELETE as ruleDelete, PATCH as rulePatch } from '@/app/api/agent-rules/[id]/route';
import { PATCH as enablePatch } from '@/app/api/agent-rules/[id]/enabled/route';

const mockedProxy = vi.mocked(proxyBackend);

function ok(body: unknown): ProxyResult {
  return { status: 200, body, clearAuth: false };
}

function status(s: number, body: unknown = null, clearAuth = false): ProxyResult {
  return { status: s, body, clearAuth };
}

function jsonReq(url: string, method = 'GET', body?: unknown): Request {
  return new Request(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
      : {}),
  });
}

async function routeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

const RULE = {
  id: 3,
  userId: 1,
  name: '复习提醒',
  triggerType: 'review_due',
  enabled: false,
  cooldownMinutes: 240,
  maxPerHour: 3,
};

beforeEach(() => {
  mockedProxy.mockReset();
});

describe('GET /api/agent-rules（裸数组 → { items }）', () => {
  it('enabled 过滤与分页透传', async () => {
    mockedProxy.mockResolvedValue(ok([RULE]));
    const res = await rulesGet(
      jsonReq('http://localhost/api/agent-rules?enabled=true&page=2&pageSize=10'),
    );
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/agent-rules?enabled=true&page=2&page_size=10' }),
    );
    expect(((await res.json()) as { items: unknown[] }).items).toHaveLength(1);
  });

  it('非 200 透传错误', async () => {
    mockedProxy.mockResolvedValue(status(500, { error: 'x' }, true));
    const res = await rulesGet(jsonReq('http://localhost/api/agent-rules'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/agent-rules（camel → snake，extra=forbid 白名单映射）', () => {
  it('创建映射触发类型/静音时段/冷却/水位，201 返回', async () => {
    mockedProxy.mockResolvedValue(ok(RULE));
    const res = await rulesPost(
      jsonReq('http://localhost/api/agent-rules', 'POST', {
        name: '复习提醒',
        triggerType: 'review_due',
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        cooldownMinutes: 120,
        maxPerHour: 2,
      }),
    );
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        path: '/agent-rules',
        method: 'POST',
        jsonBody: {
          name: '复习提醒',
          trigger_type: 'review_due',
          quiet_hours_start: '22:00',
          quiet_hours_end: '07:00',
          cooldown_minutes: 120,
          max_per_hour: 2,
        },
      }),
    );
    expect(res.status).toBe(201);
  });

  it('创建失败透传', async () => {
    mockedProxy.mockResolvedValue(status(422, { error: 'validation' }));
    const res = await rulesPost(
      jsonReq('http://localhost/api/agent-rules', 'POST', { name: 'x', triggerType: 'bogus' }),
    );
    expect(res.status).toBe(422);
  });
});

describe('PATCH/DELETE /api/agent-rules/[id]', () => {
  it('部分更新映射', async () => {
    mockedProxy.mockResolvedValue(ok(RULE));
    await rulePatch(
      jsonReq('http://localhost/api/agent-rules/3', 'PATCH', { cooldownMinutes: 30 }),
      await routeParams({ id: '3' }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({
        path: '/agent-rules/3',
        method: 'PATCH',
        jsonBody: { cooldown_minutes: 30 },
      }),
    );
  });

  it('启停：布尔透传，非布尔 400', async () => {
    mockedProxy.mockResolvedValue(ok({ ...RULE, enabled: true }));
    const res = await enablePatch(
      jsonReq('http://localhost/api/agent-rules/3/enabled', 'PATCH', { enabled: true }),
      await routeParams({ id: '3' }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/agent-rules/3/enabled', jsonBody: { enabled: true } }),
    );
    expect(res.status).toBe(200);

    const bad = await enablePatch(
      jsonReq('http://localhost/api/agent-rules/3/enabled', 'PATCH', { enabled: 'yes' }),
      await routeParams({ id: '3' }),
    );
    expect(bad.status).toBe(400);
  });

  it('删除与错误透传', async () => {
    mockedProxy.mockResolvedValue(ok({ ok: true }));
    const res = await ruleDelete(
      jsonReq('http://localhost/api/agent-rules/3', 'DELETE'),
      await routeParams({ id: '3' }),
    );
    expect(res.status).toBe(200);

    mockedProxy.mockResolvedValue(status(404, { error: '不存在' }, true));
    const del404 = await ruleDelete(
      jsonReq('http://localhost/api/agent-rules/9', 'DELETE'),
      await routeParams({ id: '9' }),
    );
    expect(del404.status).toBe(404);
  });
});
