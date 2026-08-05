/**
 * @file 考试题目操作 API — PUT/DELETE /api/tools/admin/exam/[id]/questions/[qid]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { id, qid } = await params;

  const proxy = await proxyBackend(req, {
    path: `/tools/admin/exam/${encodeURIComponent(id)}/questions/${encodeURIComponent(qid)}`,
    method: 'PUT',
    jsonBody: {
      question_type: body.questionType,
      content: body.content,
      options: Array.isArray(body.options) ? body.options : undefined,
      score: body.score,
      order_index: body.orderIndex,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '更新失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ question: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { id, qid } = await params;
  const proxy = await proxyBackend(req, {
    path: `/tools/admin/exam/${encodeURIComponent(id)}/questions/${encodeURIComponent(qid)}`,
    method: 'DELETE',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '删除失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
