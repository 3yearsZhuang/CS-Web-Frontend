/**
 * @file Origin / Referer 白名单校验（防 Login CSRF）
 *
 * 检查请求来源是否在白名单中，防止跨站请求伪造。
 * 所有控制服务端强制，不依赖客户端检查。
 */

import { NextResponse } from 'next/server';
import 'server-only';
import { ALLOWED_ORIGINS } from '@/shared/config/auth-constants';

import { jsonError } from './http-helpers';

/**
 * 校验请求来源是否在白名单中
 *
 * 检查顺序：Origin → Referer。两者都缺失时放行（同源浏览器请求可能不带 Origin）；
 * 任一存在但不在白名单内时拒绝。
 *
 * 安全：使用精确 origin 匹配（scheme + host + port），而非 `startsWith` 前缀匹配。
 * 前缀匹配会被形如 `https://example.com.evil.com` 的同形子域名绕过 ——
 * 攻击者注册 `example.com.evil.com` 即可伪装成受信来源。
 */
export function assertAllowedOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const candidate = origin || referer;

  if (!candidate) {
    // 同源 GET/POST 浏览器请求可能不带 Origin/Referer；放行由 SameSite cookie 兜底
    return null;
  }

  // 精确匹配：解析 candidate 的 scheme+host+port，与白名单逐一比较
  let candidateOrigin: string;
  try {
    candidateOrigin = new URL(candidate).origin;
  } catch {
    // Origin/Referer 解析失败 → 视为非法来源
    return jsonError('请求来源不合法', 403);
  }

  const allowed = ALLOWED_ORIGINS.some((base) => {
    try {
      return new URL(base).origin === candidateOrigin;
    } catch {
      return false;
    }
  });
  if (!allowed) {
    return jsonError('请求来源不合法', 403);
  }
  return null;
}
