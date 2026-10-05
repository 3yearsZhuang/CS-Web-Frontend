/**
 * @file BFF 路由回归测试（AG-P3-01）：agent-inbox GET 包装与 PATCH 动作转发。
 * proxyBackend 打桩，锁定「后端裸数组 → { items }」「camel body → snake body」契约。
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
import { GET as inboxGet } from '@/app/api/agent-inbox/route';
import { PATCH as inboxPatch } from '@/app/api/agent-inbox/[id]/status/route';

const mockedProxy = vi.mocked(proxyBackend);

function ok(body: unknown): ProxyResult {
  return { status: 200, body, clearAuth: false };
}

function status(status: number, body: unknown = null, clearAuth = false): ProxyResult {
  return { status, body, clearAuth };
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

const ITEM = { id: 7, userId: 1, type: 'review_due', source: 'scheduler', title: '复习到期', status: 'pending' };

beforeEach(() => {
  mockedProxy.mockReset();
});

describe('GET /api/agent-inbox（AG-P3-01：裸数组 → { items }）', () => {
  it('分页参数折算 page/page_size，status/type 透传', async () => {
    mockedProxy.mockResolvedValue(ok([ITEM]));
    const res = await inboxGet(
      jsonReq('http://localhost/api/agent-inbox?status=pending&type=review_due&page=2&pageSize=20'),
    );
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        path: '/agent-inbox?status=pending&type=review_due&page=2&page_size=20',
      }),
    );
    const data = (await res.json()) as { items: unknown[] };
    expect(data.items).toHaveLength(1);
  });

  it('非 200 透传状态码与错误体；200 但非数组时回空列表', async () => {
    mockedProxy.mockResolvedValue(status(500, { error: 'x' }, true));
    const err = await inboxGet(jsonReq('http://localhost/api/agent-inbox'));
    expect(err.status).toBe(500);

    mockedProxy.mockResolvedValue(ok({ unexpected: 'shape' }));
    const wrapped = await inboxGet(jsonReq('http://localhost/api/agent-inbox'));
    expect(((await wrapped.json()) as { items: unknown[] }).items).toEqual([]);
  });
});

describe('PATCH /api/agent-inbox/[id]/status（camel body → snake body）', () => {
  it('snooze 携带 snoozeMinutes → snooze_minutes', async () => {
    mockedProxy.mockResolvedValue(ok(ITEM));
    const res = await inboxPatch(
      jsonReq('http://localhost/api/agent-inbox/7/status', 'PATCH', { action: 'snooze', snoozeMinutes: 30 }),
      await routeParams({ id: '7' }),
    );
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        path: '/agent-inbox/7/status',
        method: 'PATCH',
        jsonBody: { action: 'snooze', snooze_minutes: 30 },
      }),
    );
    expect(res.status).toBe(200);
  });

  it('accept/dismiss 不携带 snooze_minutes；非法 action → 400', async () => {
    mockedProxy.mockResolvedValue(ok(ITEM));
    await inboxPatch(
      jsonReq('http://localhost/api/agent-inbox/7/status', 'PATCH', { action: 'accept' }),
      await routeParams({ id: '7' }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ jsonBody: { action: 'accept' } }),
    );

    const bad = await inboxPatch(
      jsonReq('http://localhost/api/agent-inbox/7/status', 'PATCH', { action: 'bogus' }),
      await routeParams({ id: '7' }),
    );
    expect(bad.status).toBe(400);
  });

  it('后端错误透传（含 clearAuth）', async () => {
    mockedProxy.mockResolvedValue(status(404, { error: '不存在' }, true));
    const res = await inboxPatch(
      jsonReq('http://localhost/api/agent-inbox/99/status', 'PATCH', { action: 'accept' }),
      await routeParams({ id: '99' }),
    );
    expect(res.status).toBe(404);
  });
});
