/**
 * @file 我的考试成绩 API — GET /api/tools/exam/[id]/my-results（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/tools/exam/${encodeURIComponent(id)}/my-results`,
  });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ results: [] });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ results: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
