/**
 * @file 考试题目 API — GET/POST /api/admin/tools/exam/[id]/questions（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/admin/tools/exam/${encodeURIComponent(id)}/questions`,
  });

  if (proxy.status !== 200) {
    return NextResponse.json({ questions: [] });
  }
  const res = NextResponse.json({ questions: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/admin/tools/exam/${encodeURIComponent(id)}/questions`,
    method: 'POST',
    jsonBody: {
      question_type: body.questionType ?? 'single_choice',
      content: body.content,
      options: Array.isArray(body.options) ? body.options : [],
      score: body.score ?? 1,
      order_index: body.orderIndex ?? 0,
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '创建失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ question: proxy.body }, { status: 201 });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
