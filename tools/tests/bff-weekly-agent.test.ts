/**
 * @file BFF 路由回归测试（AG-P3-04）：agent-weekly-review GET 包装与 weekStart 透传。
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
import { GET as weeklyGet } from '@/app/api/agent-weekly-review/route';

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

describe('GET /api/agent-weekly-review（AG-P3-04）', () => {
  it('无 weekStart → 默认路径，包装 { review }', async () => {
    mockedProxy.mockResolvedValue(ok({ id: 1, status: 'ready' }));
    const res = await weeklyGet(jsonReq('http://localhost/api/agent-weekly-review'));
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/agent-weekly-review' }),
    );
    expect(((await res.json()) as { review: unknown }).review).toEqual({ id: 1, status: 'ready' });
  });

  it('weekStart 透传；非 200 透传错误', async () => {
    mockedProxy.mockResolvedValue(ok({ id: 2 }));
    await weeklyGet(jsonReq('http://localhost/api/agent-weekly-review?weekStart=2026-09-28'));
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/agent-weekly-review?weekStart=2026-09-28' }),
    );

    mockedProxy.mockResolvedValue({ status: 500, body: { error: 'x' }, clearAuth: true });
    const res = await weeklyGet(jsonReq('http://localhost/api/agent-weekly-review'));
    expect(res.status).toBe(500);
  });
});
