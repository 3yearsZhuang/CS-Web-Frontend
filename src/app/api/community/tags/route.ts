/**
 * @file 标签列表 API — GET /api/community/tags（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/community/tags' });
  const res = NextResponse.json(proxy.body ?? []);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
