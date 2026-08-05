/**
 * @file 考试提交 API — POST /api/tools/exam/[id]/submit（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    answers?: Array<{ questionId?: string; answer?: unknown }>;
  };
  const { id } = await params;
  if (!Array.isArray(body.answers)) {
    return NextResponse.json({ error: '缺少答案', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: `/tools/exam/${encodeURIComponent(id)}/submit`,
    method: 'POST',
    jsonBody: {
      answers: body.answers.map((a) => ({
        question_id: Number(a.questionId),
        answer: a.answer,
      })),
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '提交失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json(proxy.body);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
