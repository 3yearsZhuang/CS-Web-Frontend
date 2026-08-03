/**
 * @file 活动签到 API — GET/POST /api/admin/events/[id]/checkin（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, { path: `/admin/events/${encodeURIComponent(id)}/checkins` });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ checkins: [] });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const list = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ checkins: list });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as { code?: string; userId?: string };
  const { id } = await params;
  if (!body.code && !body.userId) {
    return NextResponse.json({ error: '缺少核销码或用户', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: `/admin/events/${encodeURIComponent(id)}/checkin`,
    method: 'POST',
    jsonBody: body.userId ? { user_id: Number(body.userId) } : { code: body.code },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '核销失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ checkin: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
