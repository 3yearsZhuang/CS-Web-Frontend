/**
 * @file 图片上传 API — POST /api/community/forum/upload（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: '请求格式不正确', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: '/community/forum/upload',
    method: 'POST',
    formData,
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '上传失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ url: (proxy.body as { url?: string })?.url ?? null });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
