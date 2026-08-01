/**
 * @file 头像文件服务 — GET /api/avatars/[filename]
 *
 * 提供上传头像的静态文件服务。
 *
 * 安全控制：
 *   - filename 严格校验（UUID-timestamp.ext 格式）
 *   - 防路径遍历（拒绝 .. / \）
 *   - 公开访问（头像非敏感数据，无需登录）
 *
 * 说明：预设头像直接从 public/avatars/presets/ 静态服务，不经过此路由。
 */
import { readUploadedAvatar } from '@/modules/user/server';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  const result = readUploadedAvatar(filename);
  if (!result) {
    return new Response('Not Found', { status: 404 });
  }

  const body = new Uint8Array(result.data);

  return new Response(body, {
    headers: {
      'Content-Type': result.mimeType,
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}