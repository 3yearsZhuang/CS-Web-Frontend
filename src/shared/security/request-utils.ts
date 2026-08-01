/**
 * @file 请求工具函数
 *
 * 从 Request 中提取客户端 IP 与 Cookie 值。
 * 所有控制服务端强制，不依赖客户端检查。
 */

import 'server-only';

/**
 * 从请求中获取客户端 IP
 *
 * 两种模式：
 *   - TRUST_PROXY=true（信任反向代理）：读取 X-Forwarded-For 首个 IP，
 *     回退到 X-Real-IP。适用于 Cloudflare / Nginx 等可信代理后的部署。
 *   - 默认（不信任代理）：仅读取 X-Real-IP（由 server.ts 从 socket 注入），
 *     忽略客户端伪造的 X-Forwarded-For，防止绕过限流。
 *
 * 安全：server.ts 在非信任模式下已删除客户端传入的代理头并注入真实 socket IP，
 * 此处的二次校验是纵深防御 — 即使 server.ts 未启用（如 Edge runtime 或直接调用），
 * 也不会信任 X-Forwarded-For。
 */
export function getClientIp(req: Request): string {
  const trustProxy = process.env.TRUST_PROXY === 'true';
  if (trustProxy) {
    // 信任反向代理链：X-Forwarded-For 首个 IP 为客户端真实 IP
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0].trim();
  }
  // 非信任模式：仅读取 server.ts 注入的 X-Real-IP（socket 对端地址）
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

/**
 * 从请求的 Cookie 头中提取指定 cookie 的值
 *
 * 安全：仅返回匹配的值，不解析或执行。UUID 不含 = 所以 split('=')[1] 安全。
 */
export function getCookieValue(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  const found = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!found) return null;
  // 取第一个 = 之后的所有内容（值可能包含 =，虽然我们的 token 不含）
  const eqIdx = found.indexOf('=');
  return eqIdx >= 0 ? found.slice(eqIdx + 1) : null;
}
