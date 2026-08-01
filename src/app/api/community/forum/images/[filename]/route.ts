/**
 * @file 论坛图片服务 API
 *
 * 安全：访问控制 — 仅登录用户可读取论坛图片。
 * 论坛帖子默认对登录用户可见，未登录用户无法访问图片资源。
 * Cache-Control 设为 private，避免公共代理缓存可能含敏感内容的图片。
 */

import { readForumImage } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/shared/config/auth-constants';
import { getCookieValue } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  // 访问控制：仅登录用户可读取论坛图片
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  const session = getSession(token);
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { filename } = await params;

  const result = readForumImage(filename);
  if (!result) {
    return new Response('Not Found', { status: 404 });
  }

  const body = new Uint8Array(result.data);

  return new Response(body, {
    headers: {
      'Content-Type': result.mimeType,
      // private：仅浏览器缓存，不经过公共代理缓存（防敏感图片泄漏）
      'Cache-Control': 'private, max-age=86400, immutable',
    },
  });
}
