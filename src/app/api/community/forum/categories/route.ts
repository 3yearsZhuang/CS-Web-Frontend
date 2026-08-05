/**
 * @file 分类列表 API — GET /api/community/forum/categories（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toForumCategory } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/community/forum/categories' });
  const list = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ categories: list.map(toForumCategory) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
