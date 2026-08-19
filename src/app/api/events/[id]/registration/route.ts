/**
 * @file 我的报名状态 API — GET /api/events/[id]/registration（BFF 薄转发）
 * 取消报名走 DELETE /api/events/[id]/register（见 register/route.ts），与后端路由一致。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/events/${encodeURIComponent(id)}/registration`,
  });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ registration: null });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ registration: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
