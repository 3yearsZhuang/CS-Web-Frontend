/**
 * @file 认领提交 API — POST /api/tools/task/claims/[id]/submit（BFF 薄转发）
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

  const body = (await req.json().catch(() => ({}))) as { submissionUrl?: string; note?: string };
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/tools/task/claims/${encodeURIComponent(id)}/submit`,
    method: 'POST',
    jsonBody: {
      submission_url: body.submissionUrl,
      note: body.note ?? null,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '提交失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ claim: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
