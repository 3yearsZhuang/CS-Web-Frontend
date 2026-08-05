/**
 * @file 活动统计 API — GET /api/admin/events/stats（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/admin/events/stats' });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const res = NextResponse.json({
    total: body.total ?? 0,
    upcoming: body.upcoming ?? 0,
    ongoing: body.ongoing ?? 0,
    ended: body.ended ?? 0,
    totalRegistrations: body.total_registrations ?? 0,
    totalCheckins: body.total_checkins ?? 0,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
