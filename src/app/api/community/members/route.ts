/**
 * @file 成员列表 API — GET /api/community/members（BFF 薄转发到后端 /community/members）
 * 透传 tag / search / sort / limit 参数，后端返回成员数组。
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toMember } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tag = url.searchParams.get('tag') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const sort = url.searchParams.get('sort') || 'active';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);

  const params = new URLSearchParams({ sort, limit: String(limit) });
  if (tag) params.set('tag', tag);
  if (search) params.set('search', search);

  const proxy = await proxyBackend(req, {
    path: `/community/members?${params.toString()}`,
  });
  const list = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ members: list.map(toMember) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
