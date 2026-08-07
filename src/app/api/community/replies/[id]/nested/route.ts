/**
 * @file 楼中楼 API — GET /api/community/comments/[id]/nested（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toCommunityComment } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/community/comments/${encodeURIComponent(id)}/nested`,
  });
  const list = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ comments: list.map(toCommunityComment) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
