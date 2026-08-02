/**
 * @file 修改密码 API — POST /api/profile/password，校验当前密码后更新并清除其他会话
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { changeUserPassword } from '@/modules/user/server';
import { AUTH_COOKIE_NAME, PASSWORD_MAX_LENGTH } from '@/modules/auth/types/constants';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getCookieValue,
  getClientIp,
  jsonError,
  profileUpdateLimiter,
} from '@/shared/security/security';
import { changePasswordSchema } from '@/shared/security/schemas';

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

  const ip = getClientIp(req);
  const rateKey = `profile-password:${ip}`;
  if (!profileUpdateLimiter.check(rateKey)) {
    const retryAfter = profileUpdateLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = changePasswordSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = result.data;

  if (currentPassword.length > PASSWORD_MAX_LENGTH) {
    return NextResponse.json({ error: '当前密码错误' }, { status: 400 });
  }

  // 修改密码：验证旧密码 + 历史复用检测 + 更新 + 删除其他 session
  // （保留当前 session）。DB 操作下沉至 user/server 层。
  const changeResult = await changeUserPassword(
    session.user.id,
    currentPassword,
    newPassword,
    { keepSessionId: session.session.id },
  );
  if (!changeResult.ok) {
    if (changeResult.reason === 'PASSWORD_IN_HISTORY') {
      return NextResponse.json(
        { error: '新密码不能与最近使用过的密码相同' },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: '当前密码错误' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}