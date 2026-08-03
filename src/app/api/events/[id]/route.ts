/**
 * @file 活动详情 API — GET /api/events/[id]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toEventItem } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, { path: `/events/${encodeURIComponent(id)}` });

  if (proxy.status !== 200) {
    return NextResponse.json({ event: null });
  }
  const res = NextResponse.json({ event: toEventItem(proxy.body) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
