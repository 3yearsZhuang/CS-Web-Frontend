/**
 * @file 任务列表 API — GET /api/tools/task（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get('category') || undefined;
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (category) params.set('category', category);

  const proxy = await proxyBackend(req, { path: `/tools/task?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    tasks: items.map((t) => ({
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
    })),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
