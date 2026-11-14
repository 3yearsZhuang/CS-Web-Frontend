/**
 * @file 活动结束 BFF — POST /api/admin/events/[id]/close。
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/admin/events/${encodeURIComponent(id)}/close`,
    method: 'POST',
  });
  if (proxy.status !== 200) {
    const res = NextResponse.json(normalizeError(proxy.body, '结束活动失败'), { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json(proxy.body ?? {});
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
