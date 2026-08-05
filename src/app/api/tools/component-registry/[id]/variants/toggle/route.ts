/**
 * @file 组件变体开关 API — POST /api/tools/component-registry/[id]/variants/toggle（BFF 薄转发）
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

  const body = (await req.json().catch(() => ({}))) as { variantId?: string; enabled?: boolean };
  const { id } = await params;
  if (!body.variantId) {
    return NextResponse.json({ error: '缺少变体 ID', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: `/tools/component-registry/${encodeURIComponent(id)}/variants/${encodeURIComponent(body.variantId)}/toggle`,
    method: 'POST',
    jsonBody: { enabled: body.enabled ?? true },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ component: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
