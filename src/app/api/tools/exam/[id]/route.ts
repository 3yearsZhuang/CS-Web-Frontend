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
  // 题目列表走独立端点（公开端点不泄露答案）
  const qProxy = await proxyBackend(req, {
    path: `/tools/exam/${encodeURIComponent(id)}/questions`,
  });
  const qBody = (qProxy.body ?? {}) as Record<string, unknown>;
  const questions = (Array.isArray(qBody.questions) ? qBody.questions : []) as Array<
    Record<string, unknown>
  >;
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
      questions: questions.map((q) => ({
        id: String(q.id),
        questionType: q.type,
        content: q.content_markdown ?? q.title,
        options: Array.isArray(q.options)
          ? q.options.map((o) => ({
              id: String(o.id),
              label: o.label,
              content: o.content,
            }))
          : [],
        score: q.score ?? 0,
        orderIndex: q.sort_order ?? 0,
      })),
      myAttempts: Array.isArray(e.my_attempts) ? e.my_attempts : [],
      bestScore: e.best_score ?? null,
    },
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
