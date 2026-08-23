/**
 * @file 学习助手错题本 API — GET /api/tools/auxilio/mistakes
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.search;
  const proxy = await proxyBackend(req, { path: `/auxilio/mistakes${query}` });
  const res = NextResponse.json(proxy.body ?? {}, { status: proxy.status });
  if (proxy.clearAuth && proxy.status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
