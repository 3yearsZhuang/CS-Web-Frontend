/**
 * @file BFF 路由回归测试（AG-P3-03）：agent-briefing GET 包装与 date 透传。
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
import { GET as briefingGet } from '@/app/api/agent-briefing/route';

const mockedProxy = vi.mocked(proxyBackend);

function ok(body: unknown): ProxyResult {
  return { status: 200, body, clearAuth: false };
}

function jsonReq(url: string): Request {
  return new Request(url, { method: 'GET' });
}

beforeEach(() => {
  mockedProxy.mockReset();
});

describe('GET /api/agent-briefing（AG-P3-03）', () => {
  it('无 date → 默认路径，包装 { briefing }', async () => {
    mockedProxy.mockResolvedValue(ok({ id: 1, status: 'ready' }));
    const res = await briefingGet(jsonReq('http://localhost/api/agent-briefing'));
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/agent-briefing' }),
    );
    expect(((await res.json()) as { briefing: unknown }).briefing).toEqual({
      id: 1,
      status: 'ready',
    });
  });

  it('date 参数透传；非 200 透传错误', async () => {
    mockedProxy.mockResolvedValue(ok({ id: 2 }));
    await briefingGet(jsonReq('http://localhost/api/agent-briefing?date=2026-10-05'));
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/agent-briefing?date=2026-10-05' }),
    );

    mockedProxy.mockResolvedValue({ status: 500, body: { error: 'x' }, clearAuth: true });
    const res = await briefingGet(jsonReq('http://localhost/api/agent-briefing'));
    expect(res.status).toBe(500);
  });
});
