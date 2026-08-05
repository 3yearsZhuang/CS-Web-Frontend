/**
 * @file 修改密码 API — POST /api/profile/password（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';
import { changePasswordSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await req.json().catch(() => null);
  const result = changePasswordSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = result.data;

  const proxy = await proxyBackend(req, {
    path: '/profile/password',
    method: 'POST',
    // 后端契约：ChangePasswordRequest{oldPassword, newPassword}（camel_config）
    jsonBody: { oldPassword: currentPassword, newPassword },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '修改失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.json({ message: '密码已修改' });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
