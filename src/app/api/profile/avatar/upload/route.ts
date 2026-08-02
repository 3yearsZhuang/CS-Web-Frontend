/**
 * @file 头像上传 API 路由 — POST /api/profile/avatar/upload
 *
 * 接收 multipart/form-data，提取 `file` 字段并保存为用户头像。
 *
 * 安全控制：
 *   - 必须登录
 *   - Origin 白名单校验
 *   - 速率限制：每 IP 每分钟 5 次上传
 *   - 文件大小 ≤ 2MB
 *   - MIME 类型白名单（JPEG/PNG/WebP/GIF）
 *   - 魔数校验（防止伪造 MIME）
 *   - 文件名使用 userId+timestamp，不使用原始文件名
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { saveUploadedAvatar } from '@/modules/user/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  getCookieValue,
  getClientIp,
  avatarUploadLimiter,
  jsonError,
  errorResponse,
} from '@/shared/security/security';

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
  const rateKey = `avatar-upload:${ip}`;
  if (!avatarUploadLimiter.check(rateKey)) {
    const retryAfter = avatarUploadLimiter.retryAfterSeconds(rateKey);
    return jsonError('上传过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: '请使用 multipart/form-data 上传' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '请选择头像文件' }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const user = saveUploadedAvatar(userId, fileBuffer, file.type, file.name);
    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}