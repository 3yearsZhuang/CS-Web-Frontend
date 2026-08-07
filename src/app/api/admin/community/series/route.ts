/**
 * @file 社区管理 API — POST /api/admin/community/community（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toCommunityPost } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    sub?: string;
    postId?: string;
  };
  if (!body.sub || !body.postId) {
    return NextResponse.json({ error: '参数不合法', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: '/admin/community/community',
    method: 'POST',
    jsonBody: { sub: body.sub, post_id: Number(body.postId) },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({
    ok: true,
    post: proxy.body && typeof proxy.body === 'object' && 'post' in proxy.body
      ? toCommunityPost((proxy.body as { post: Record<string, unknown> }).post)
      : null,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
