/**
 * @file 社区概览 API — GET /api/community/overview（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toCommunityPost } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/community/community/overview' });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const latest = (Array.isArray(body.latest_posts) ? body.latest_posts : []) as Array<
    Record<string, unknown>
  >;
  const hot = (Array.isArray(body.hot_posts) ? body.hot_posts : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    latestPosts: latest.map(toCommunityPost),
    hotPosts: hot.map(toCommunityPost),
    totalPosts: body.total_posts ?? 0,
    totalComments: body.total_comments ?? 0,
    totalUsers: body.total_users ?? 0,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
