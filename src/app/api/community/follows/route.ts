/**
 * @file 关注/粉丝列表 API — GET /api/community/follows（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import {
  arrayFrom,
  bodyOrEmpty,
  clearAuthCookies,
  okJson,
  proxyBackend,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'following';
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const proxy = await proxyBackend(req, {
    path: `/community/follows?type=${type}&page=${page}&pageSize=${pageSize}`,
  });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ items: [], total: 0 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = bodyOrEmpty(proxy);
  const items = arrayFrom(body, 'items');
  return okJson({
    users: items.map((u) => ({
      id: String(u.id),
      displayName: u.display_name ?? null,
      avatarUrl: u.avatar_url ?? null,
      avatarType: u.avatar_type ?? 'initial',
      bio: u.bio ?? null,
      techTags: Array.isArray(u.tech_tags) ? u.tech_tags : [],
      followingCount: u.following_count ?? 0,
      followerCount: u.follower_count ?? 0,
      isFollowing: u.is_following ?? false,
    })),
    total: Number(body.total ?? 0),
    page,
    pageSize,
  }, proxy);
}
