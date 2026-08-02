/**
 * @file 资源站文件上传 API — POST /api/tools/resource/upload
 *
 * 接收 multipart/form-data，提取 file 字段保存为资源附件。
 * 返回 { url } 供资源提交时使用。
 *
 * 安全控制：
 *   - 必须登录
 *   - Origin 白名单校验
 *   - 速率限制：10/min/IP
 *   - 文件大小 ≤ 10MB
 *   - MIME 白名单：JPEG/PNG/WebP/GIF/PDF/ZIP
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  getCookieValue,
  getClientIp,
  forumUploadLimiter,
  jsonError,
  errorResponse,
} from '@/shared/security/security';
import { saveResourceFile } from '@/modules/tools/server';

export const runtime = 'nodejs';

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/zip', 'application/x-zip-compressed',
];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.zip'];

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
  if (!forumUploadLimiter.check(`resource-upload:${ip}`)) {
    const retryAfter = forumUploadLimiter.retryAfterSeconds(`resource-upload:${ip}`);
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
    return NextResponse.json({ error: '请选择文件' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: '文件大小不能超过 10MB' }, { status: 400 });
  }

  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) {
    return NextResponse.json(
      { error: '仅支持 JPEG/PNG/WebP/GIF/PDF/ZIP 格式' },
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: '不支持的文件类型' },
      { status: 400 },
    );
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = saveResourceFile(userId, fileBuffer, ext);
    return NextResponse.json({ ok: true, url }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(req: Request) {
  const filename = new URL(req.url).searchParams.get('filename');
  if (!filename) {
    return NextResponse.json({ error: '缺少文件名' }, { status: 400 });
  }

  const { readResourceFile } = await import('@/modules/tools/server');
  const result = readResourceFile(filename);
  if (!result) {
    return NextResponse.json({ error: '文件不存在' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      'Content-Type': result.mimeType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
