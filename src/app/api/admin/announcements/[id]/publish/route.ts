/**
 * @file 公告发布 BFF — POST /api/admin/announcements/[id]/publish。
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toAnnouncement } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/announcements/admin/${encodeURIComponent(id)}/publish`,
    method: 'POST',
  });
  if (proxy.status !== 200) {
    const res = NextResponse.json(normalizeError(proxy.body, '发布失败'), { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json(toAnnouncement(proxy.body));
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
