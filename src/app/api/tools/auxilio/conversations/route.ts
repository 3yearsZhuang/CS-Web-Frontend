/**
 * @file 学习助手会话列表 API — GET /api/tools/auxilio/conversations
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/auxilio/conversations' });
  // 透传后端真实状态码（此前 200?200:401 会把 404 等误报为未登录）
  const status = proxy.status;
  const res = NextResponse.json(proxy.body ?? {}, { status });
  if (proxy.clearAuth && status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
