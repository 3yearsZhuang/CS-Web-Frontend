/**
 * @file 考试排名 API — GET /api/admin/tools/exam/[id]/ranking（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);

  const proxy = await proxyBackend(req, {
    path: `/admin/tools/exam/${encodeURIComponent(id)}/ranking?limit=${limit}`,
  });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.ranking) ? body.ranking : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    ranking: items.map((r) => ({
      userId: String(r.user_id),
      displayName: r.display_name ?? null,
      score: r.score ?? 0,
      rank: r.rank ?? 0,
    })),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
