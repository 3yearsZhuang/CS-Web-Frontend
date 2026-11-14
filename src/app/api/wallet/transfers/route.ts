/**
 * @file 转账 BFF — POST /api/wallet/transfers（服务端注入身份与 Idempotency-Key）。
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    recipientUserId?: number;
    amount?: string;
    remark?: string;
    relatedTaskId?: number;
  };
  const idempotencyKey =
    req.headers.get('Idempotency-Key') ??
    (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}`);

  const proxy = await proxyBackend(req, {
    path: '/wallet/transfers',
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    jsonBody: {
      recipient_user_id: body.recipientUserId,
      amount: body.amount,
      remark: body.remark,
      related_task_id: body.relatedTaskId,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '转账失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const b = (proxy.body ?? {}) as Record<string, unknown>;
  const res = NextResponse.json({
    transactionId: b.transaction_id,
    businessKey: b.business_key,
    fromAccountId: b.from_account_id,
    toAccountId: b.to_account_id,
    amount: b.amount,
    createdAt: b.created_at,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
