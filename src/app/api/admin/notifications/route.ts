/**
 * @file 管理端通知 API — /api/admin/notifications
 * GET  = 群发记录（后端 /notifications/broadcast-history 裸数组聚合）
 * POST = 发送全站/定向通知（后端 POST /notifications/broadcast）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

/** 群发记录聚合项（后端 list_recent_broadcasts 的 dict 形状，snake_case） */
type BroadcastRow = {
  title?: unknown;
  content?: unknown;
  type?: unknown;
  created_at?: unknown;
  cnt?: unknown;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100);

  const proxy = await proxyBackend(req, {
    path: `/notifications/broadcast-history?limit=${limit}`,
  });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ broadcasts: [] });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  // P1-8 修复：后端返回裸数组（聚合 dict：title/content/type/created_at/cnt），
  // 此前按 {broadcast_history|items} 解构恒空，且键名/形状与消费方（NotifHistoryItem）不符。
  const raw = proxy.body as unknown;
  const items = (Array.isArray(raw) ? raw : []) as BroadcastRow[];
  const res = NextResponse.json({
    broadcasts: items.map((r) => ({
      title: r.title ?? '',
      content: r.content ?? null,
      type: r.type ?? 'system',
      createdAt: r.created_at ?? '',
      recipientCount: Number(r.cnt ?? 0),
    })),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    content?: string | null;
  };
  if (!body.title) {
    return NextResponse.json({ error: '参数不合法', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: '/notifications/broadcast',
    method: 'POST',
    jsonBody: { title: body.title, content: body.content ?? null },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '发送失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  // 后端返回 { ok, sent }；面板读取 count，此处映射对齐
  const sent = (proxy.body as Record<string, unknown> | null)?.sent;
  const res = NextResponse.json({ ok: true, count: Number(sent ?? 0) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
