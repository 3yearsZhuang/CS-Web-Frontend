/**
 * @file GitHub 贡献热力图 API — GET /api/workbench/contributions/github（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get('username') || undefined;
  const year = url.searchParams.get('year') || '';
  const refresh = url.searchParams.get('refresh') === '1';

  const params = new URLSearchParams();
  if (username) params.set('username', username);
  if (year) params.set('year', year);
  if (refresh) params.set('refresh', '1');
  const qs = params.toString();

  const proxy = await proxyBackend(req, {
    path: `/workbench/contributions/github${qs ? `?${qs}` : ''}`,
  });

  const status = proxy.status === 200 ? 200 : 401;
  const res = NextResponse.json(proxy.body ?? {}, { status });
  if (proxy.clearAuth && status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
