/**
 * @file 考试列表 API — GET /api/tools/exam（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status) params.set('status', status);

  const proxy = await proxyBackend(req, { path: `/tools/exam?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    exams: items.map((e) => ({
      id: String(e.id),
      title: e.title,
      description: e.description ?? null,
      category: e.category,
      difficulty: e.difficulty,
      durationMinutes: e.duration_minutes ?? 0,
      questionCount: e.question_count ?? 0,
      totalScore: e.total_score ?? 0,
      status: e.status,
      maxAttempts: e.max_attempts ?? 1,
      passScore: e.pass_score ?? 0,
      publishedAt: e.published_at ?? null,
      endedAt: e.ended_at ?? null,
      createdAt: e.created_at ?? '',
      attemptCount: e.attempt_count ?? 0,
    })),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
