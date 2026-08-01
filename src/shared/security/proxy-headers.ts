/**
 * @file 反向代理头清理 — 不信任代理时清理伪造头并注入真实 socket IP，防绕过速率限制
 */
import type { IncomingMessage } from 'http';
import 'server-only';

/** 需要清除的代理相关头名（小写） */
const PROXY_HEADERS = ['x-forwarded-for', 'x-real-ip'];

/** 清理客户端伪造的代理头并注入真实 socket IP（仅 trustProxy=false 时调用，直接修改 req） */
export function sanitizeProxyHeaders(req: IncomingMessage): void {
  const rawHeaders = req.rawHeaders;
  for (let i = rawHeaders.length - 1; i >= 0; i -= 2) {
    const name = (rawHeaders[i - 1] || '').toLowerCase();
    if (PROXY_HEADERS.includes(name)) {
      rawHeaders.splice(i - 1, 2);
    }
  }
  if (req.headers) {
    delete req.headers['x-forwarded-for'];
    delete req.headers['x-real-ip'];
  }
  const socketIp = req.socket?.remoteAddress || 'unknown';
  const normalizedIp = socketIp.replace(/^::ffff:/, '');
  req.headers['x-real-ip'] = normalizedIp;
}
