/**
 * @file 会话管理 API — GET/DELETE /api/sessions（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/auth/sessions' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const sessions = ((proxy.body as { sessions?: Array<Record<string, unknown>> }).sessions ?? []).map(
    (s) => ({
      // 后端 SessionOut 经 camel_config() 输出 camelCase 字段，勿读 snake_case
      id: String(s.id),
      userAgent: s.userAgent ?? null,
      ipAddress: s.ipAddress ?? null,
      isCurrent: false, // 后端未提供"当前会话"标记（无 is_current 字段）
      createdAt: s.createdAt ?? '',
      lastSeenAt: null,
      expiresAt: s.expiresAt ?? null,
    }),
  );
  const res = NextResponse.json({ sessions });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function DELETE(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as { sessionId?: string };
  if (!body.sessionId) {
    return NextResponse.json({ error: '缺少会话 ID', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: `/auth/sessions/${encodeURIComponent(body.sessionId)}`,
    method: 'DELETE',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
