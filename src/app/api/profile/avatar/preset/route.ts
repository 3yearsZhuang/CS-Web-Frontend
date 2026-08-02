/**
 * @file 预设头像选择 API — POST /api/profile/avatar/preset，设置用户头像为指定预设
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { setPresetAvatar } from '@/modules/user/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getCookieValue,
  getClientIp,
  jsonError,
  avatarPresetLimiter,
} from '@/shared/security/security';
import { presetAvatarSchema } from '@/shared/security/schemas';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const userId = session.user.id;

  const ip = getClientIp(req);
  const rateKey = `avatar-preset:${ip}`;
  if (!avatarPresetLimiter.check(rateKey)) {
    const retryAfter = avatarPresetLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = presetAvatarSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message || '请求格式不正确' }, { status: 400 });
  }

  const presetId = result.data.presetId;

  const log = createRequestLogger(req);
  try {
    const user = setPresetAvatar(userId, presetId);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof Error && err.name === 'INVALID_PRESET') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    log.error({ err }, '预设头像设置失败');
    return NextResponse.json({ error: '设置失败' }, { status: 500 });
  }
}