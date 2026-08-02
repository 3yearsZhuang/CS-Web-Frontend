/**
 * @file 个人资料 API 路由 — GET / PUT /api/profile
 *
 * GET: 获取当前用户完整资料（含活动记录）
 * PUT: 更新显示名、简介、社交链接
 *
 * 安全控制：
 *   - 必须登录（session cookie 校验）
 *   - PUT 需 Origin 白名单 + JSON Content-Type
 *   - userId 始终从 session 获取，不接受请求体传入
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { getProfile, updateProfile } from '@/modules/user/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getCookieValue,
  getClientIp,
  jsonError,
  errorResponse,
  profileUpdateLimiter,
} from '@/shared/security/security';
import { updateProfileSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  return session.user.id;
}

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rateKey = `profile-update:${ip}`;
  if (!profileUpdateLimiter.check(rateKey)) {
    const retryAfter = profileUpdateLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updateProfileSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  try {
    const user = await updateProfile(userId, result.data);
    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}