/**
 * @file 权限点 API — GET /api/admin/permissions（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/admin/permissions' });
  const res = NextResponse.json(proxy.body ?? []);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
