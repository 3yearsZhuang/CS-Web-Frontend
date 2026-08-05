/**
 * @file 管理端通知 API — GET /api/notifications/broadcast-history（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies, toNotification } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const proxy = await proxyBackend(req, {
    path: `/notifications/broadcast-history?page=${page}&page_size=${pageSize}`,
  });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ notifications: [], total: 0 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.broadcast_history) ? body.broadcast_history : body.items ?? []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    notifications: items.map(toNotification),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
