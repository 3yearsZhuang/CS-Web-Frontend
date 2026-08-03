/**
 * @file 预设头像 API — POST /api/profile/avatar/preset（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as { avatarType?: string };
  const avatarType = body.avatarType;
  if (!avatarType) {
    return NextResponse.json({ error: '请选择头像类型', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: '/auth/profile/avatar',
    method: 'PUT',
    jsonBody: { avatar_type: avatarType },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '设置失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
