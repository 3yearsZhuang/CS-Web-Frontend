/**
 * @file 组件变体开关 API — PATCH /api/tools/component-registry/[id]/variants（BFF 薄转发）
 *
 * 与后端 PATCH /tools/component-registry/{item_id}/variants 对齐：
 * 复用 Pydantic 校验（variantId/enabled），成功后返回该 item 的最新变体列表。
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

  const body = (await req.json().catch(() => ({}))) as { variantId?: number; enabled?: boolean };
  const { id } = await params;
  if (body.variantId == null) {
    return NextResponse.json({ error: '缺少变体 ID', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: `/tools/component-registry/${encodeURIComponent(id)}/variants`,
    method: 'PATCH',
    jsonBody: { variantId: body.variantId, enabled: body.enabled ?? true },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  // 后端直接返回变体数组，透传给前端 store 做 SYNC_VARIANTS。
  const res = NextResponse.json(proxy.body);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
