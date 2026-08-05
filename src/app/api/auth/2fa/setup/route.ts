/**
 * @file 2FA 初始化 API — POST /api/auth/2fa/setup（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const proxy = await proxyBackend(req, { path: '/auth/2fa/setup', method: 'POST' });

  if (proxy.status !== 200) {
    return NextResponse.json(normalizeError(proxy.body, '初始化失败'), { status: proxy.status });
  }

  const body = proxy.body as {
    secret: string;
    otpauthUri: string;
    backupCodes: string[];
  };
  const res = NextResponse.json({
    secret: body.secret,
    otpauthURI: body.otpauthUri,
    backupCodes: body.backupCodes,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
