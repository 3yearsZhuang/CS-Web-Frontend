/**
 * @file 番茄钟专注记录上报 — POST /api/workbench/focus-sessions（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // 空 body
  }
  const proxy = await proxyBackend(req, {
    path: '/workbench/focus-sessions',
    method: 'POST',
    jsonBody: body,
  });
  const status = proxy.status === 200 ? 200 : 401;
  const res = NextResponse.json(proxy.body ?? {}, { status });
  if (proxy.clearAuth && status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
