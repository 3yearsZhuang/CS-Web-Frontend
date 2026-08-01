/**
 * @file 2FA 状态查询 + 初始化设置 API
 *
 * GET  /api/auth/2fa          — 查询当前 2FA 状态
 * POST /api/auth/2fa/setup    — 初始化 2FA（生成 secret + backup codes）
 */
import { NextResponse } from 'next/server';
import { getSession, is2FAEnabled, setup2FA, require2FAForAdmin } from '@/modules/auth/server';
import QRCode from 'qrcode';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
  const session = getSession(token);
  if (!session) return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });

  const enabled = is2FAEnabled(session.user.id);
  const required = require2FAForAdmin(session.user.role);

  return NextResponse.json({ enabled, required });
}