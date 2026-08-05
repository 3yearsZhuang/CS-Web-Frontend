/**
 * @file 公告 API — GET/POST /api/announcements（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import {
  clearAuthCookies,
  normalizeError,
  proxyBackend,
  setAuthCookies,
  toAnnouncement,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/announcements' });

  const list = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json(list.map((item) => toAnnouncement(item)));
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const proxy = await proxyBackend(req, {
    path: '/admin/announcements',
    method: 'POST',
    jsonBody: {
      title: body.title,
      content: body.content ?? '',
      level: body.level ?? 'info',
      is_active: body.isActive ?? true,
      is_dismissible: body.isDismissible ?? true,
      priority: body.priority ?? 0,
      expires_at: body.expiresAt ?? null,
      target_roles: body.targetRoles ?? null,
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '发布失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json(toAnnouncement(proxy.body));
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
