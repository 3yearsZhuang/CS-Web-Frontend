/**
 * @file 我的任务认领 API — GET /api/tools/task/claims（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/tools/task/claims' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ claims: [] });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    claims: items,
    total: Number(body.total ?? 0),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
