/**
 * @file 管理端公告列表 API — GET /api/admin/announcements（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toAnnouncement } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/admin/announcements' });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    announcements: items.map(toAnnouncement),
    total: Number(body.total ?? 0),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
