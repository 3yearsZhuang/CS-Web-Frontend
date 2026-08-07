/**
 * @file 点赞 API — POST /api/community/like（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    targetType?: 'post' | 'comment';
    targetId?: string;
  };
  if (!body.targetType || !body.targetId) {
    return NextResponse.json({ error: '参数不合法', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: '/community/reactions',
    method: 'POST',
    jsonBody: { targetType: body.targetType, targetId: Number(body.targetId) },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const bodyOut = proxy.body as { liked?: boolean; like_count?: number };
  const res = NextResponse.json({
    liked: bodyOut.liked ?? false,
    likeCount: bodyOut.like_count ?? 0,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
