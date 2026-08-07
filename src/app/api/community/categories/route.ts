/**
 * @file 分类列表 API — GET /api/community/categories（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toCommunityCategory } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/community/community/categories' });
  const list = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ categories: list.map(toCommunityCategory) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
