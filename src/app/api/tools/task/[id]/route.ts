/**
 * @file 任务详情 API — GET /api/tools/task/[id]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, { path: `/tools/task/${encodeURIComponent(id)}` });

  if (proxy.status !== 200) {
    return NextResponse.json({ task: null });
  }
  const t = proxy.body as Record<string, unknown>;
  const res = NextResponse.json({
    task: {
      id: String(t.id),
      title: t.title,
      description: t.description ?? null,
      contentMarkdown: t.content_markdown ?? null,
      category: t.category,
      tags: Array.isArray(t.tags) ? t.tags : [],
      points: t.points ?? 0,
      maxClaimants: t.max_claimants ?? 1,
      claimantCount: t.claimant_count ?? 0,
      status: t.status,
      createdBy: t.created_by != null ? String(t.created_by) : null,
      createdAt: t.created_at ?? '',
      updatedAt: t.updated_at ?? '',
      myClaim: t.my_claim ?? null,
      claimants: Array.isArray(t.claimants) ? t.claimants : [],
    },
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
