/**
 * @file 收藏 API — POST /api/community/favorite（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as { targetId?: string };
  if (!body.targetId) {
    return NextResponse.json({ error: '参数不合法', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: '/community/favorites',
    method: 'POST',
    jsonBody: { targetId: Number(body.targetId) },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const bodyOut = proxy.body as { favorited?: boolean; favorite_count?: number };
  const res = NextResponse.json({
    favorited: bodyOut.favorited ?? false,
    favoriteCount: bodyOut.favorite_count ?? 0,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
