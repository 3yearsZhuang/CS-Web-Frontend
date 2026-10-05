/**
 * @file Agent 建议收件箱处理 API — PATCH /api/agent-inbox/[id]/status（BFF 薄转发）
 *
 * AG-P3-01：body {action, snoozeMinutes?}（camel）→ 后端 InboxStatusActionIn
 * {action, snooze_minutes?}（snake，该 schema 未配 camel alias）。
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

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    snoozeMinutes?: number;
  };
  if (!body.action || !['accept', 'dismiss', 'snooze'].includes(body.action)) {
    return NextResponse.json(
      { error: '参数不合法', code: 'VALIDATION_FAILED' },
      { status: 400 },
    );
  }
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/agent-inbox/${encodeURIComponent(id)}/status`,
    method: 'PATCH',
    jsonBody: {
      action: body.action,
      ...(body.action === 'snooze' && body.snoozeMinutes
        ? { snooze_minutes: body.snoozeMinutes }
        : {}),
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ item: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
