/**
 * @file 管理端考试 API — GET/POST /api/admin/tools/exam（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status) params.set('status', status);

  const proxy = await proxyBackend(req, { path: `/admin/tools/exam?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    exams: items.map((e) => ({
      id: String(e.id),
      title: e.title,
      category: e.category,
      difficulty: e.difficulty,
      status: e.status,
      questionCount: e.question_count ?? 0,
      attemptCount: e.attempt_count ?? 0,
      createdAt: e.created_at ?? '',
    })),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const proxy = await proxyBackend(req, {
    path: '/admin/tools/exam',
    method: 'POST',
    jsonBody: {
      title: body.title,
      description: body.description ?? '',
      category: body.category ?? 'general',
      difficulty: body.difficulty ?? 'medium',
      duration_minutes: body.durationMinutes ?? 30,
      pass_score: body.passScore ?? 60,
      max_attempts: body.maxAttempts ?? 1,
      questions: Array.isArray(body.questions) ? body.questions : [],
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '创建失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ exam: proxy.body }, { status: 201 });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
