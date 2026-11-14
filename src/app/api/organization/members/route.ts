/**
 * @file 成员列表 BFF — GET /api/organization/members。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const search = new URL(req.url).search;
  const proxy = await proxyBackend(req, { path: `/organization/members${search}` });
  if (proxy.status !== 200) {
    const res = NextResponse.json(proxy.body ?? { items: [] }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const b = (proxy.body ?? {}) as Record<string, unknown>;
  const items = ((b.items ?? []) as Record<string, unknown>[]).map((m) => ({
    id: m.id,
    userId: m.user_id,
    username: m.username,
    displayName: m.display_name,
    studentId: m.student_id,
    peakId: m.peak_id,
    peakName: m.peak_name,
    membershipStatus: m.membership_status,
    joinedAt: m.joined_at,
    leftAt: m.left_at,
  }));
  const res = NextResponse.json({
    items,
    total: b.total ?? items.length,
    skip: b.skip,
    limit: b.limit,
    totalPages: b.total_pages,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
