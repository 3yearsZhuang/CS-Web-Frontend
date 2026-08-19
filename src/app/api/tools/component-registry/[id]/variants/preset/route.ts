/**
 * @file 组件变体矩阵预设 API — POST /api/tools/component-registry/[id]/variants/preset（BFF 薄转发）
 *
 * 与后端 POST /tools/component-registry/{item_id}/variants/preset 对齐：
 * 应用一个预设批量翻转变体 is_enabled，成功后返回该 item 的最新变体列表。
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

  const body = (await req.json().catch(() => ({}))) as { preset?: string };
  const { id } = await params;
  if (!body.preset) {
    return NextResponse.json({ error: '缺少预设', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: `/tools/component-registry/${encodeURIComponent(id)}/variants/preset`,
    method: 'POST',
    jsonBody: { preset: body.preset },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '应用预设失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  // 后端直接返回变体数组，透传给前端 store 做 SYNC_VARIANTS。
  const res = NextResponse.json(proxy.body);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
