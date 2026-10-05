/**
 * @file Agent 自动化规则启停 API — PATCH /api/agent-rules/[id]/enabled（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as { enabled?: boolean };
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json(
      { error: '参数不合法', code: 'VALIDATION_FAILED' },
      { status: 400 },
    );
  }
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/agent-rules/${encodeURIComponent(id)}/enabled`,
    method: 'PATCH',
    jsonBody: { enabled: body.enabled },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ rule: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
