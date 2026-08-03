/**
 * @file 成员列表 API — GET /api/community/members（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toMember } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tag = url.searchParams.get('tag') || undefined;

  const proxy = await proxyBackend(req, {
    path: `/community/members${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`,
  });
  const list = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ members: list.map(toMember) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
