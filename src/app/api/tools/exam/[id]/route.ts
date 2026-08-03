/**
 * @file 考试详情 API — GET /api/tools/exam/[id]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, { path: `/tools/exam/${encodeURIComponent(id)}` });

  if (proxy.status !== 200) {
    return NextResponse.json({ exam: null });
  }
  const e = proxy.body as Record<string, unknown>;
  const res = NextResponse.json({
    exam: {
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
      questions: Array.isArray(e.questions)
        ? e.questions.map((q) => ({
            id: String(q.id),
            questionType: q.question_type,
            content: q.content,
            options: q.options ?? [],
            score: q.score ?? 0,
            orderIndex: q.order_index ?? 0,
          }))
        : [],
      myAttempts: Array.isArray(e.my_attempts) ? e.my_attempts : [],
      bestScore: e.best_score ?? null,
    },
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
