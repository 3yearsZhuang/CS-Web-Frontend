/**
 * @file 论坛上传 API
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { saveForumImage } from '@/modules/community/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  getCookieValue,
  getClientIp,
  forumUploadLimiter,
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
  const rateKey = `forum-upload:${ip}`;
  if (!forumUploadLimiter.check(rateKey)) {
    const retryAfter = forumUploadLimiter.retryAfterSeconds(rateKey);
    return jsonError('上传过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { error: '请使用 multipart/form-data 上传' },
      { status: 400 },
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '请选择图片文件' }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = saveForumImage(userId, fileBuffer, file.type, file.name);
    return NextResponse.json({ ok: true, url }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
