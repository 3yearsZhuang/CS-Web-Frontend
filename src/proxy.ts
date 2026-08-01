/**
 * @file Next.js 全局代理 — 请求 ID 注入 + 安全响应头 + CSP nonce
 *
 * Next.js 16 将 middleware 文件约定重命名为 proxy，功能不变。
 * 详见 https://nextjs.org/docs/messages/middleware-to-proxy
 *
 * 职责：
 *   1. Q6 请求 ID 注入：每个请求分配唯一 requestId，贯穿日志链路
 *      - 优先复用客户端传入的 X-Request-Id（用于跨服务追踪）
 *      - 否则生成 UUID v4
 *      - 注入到响应头 X-Request-Id（客户端可观测）
 *      - 注入到请求头 x-request-id（下游 API 路由可读取用于日志）
 *
 *   2. F3 安全响应头统一入口：从 next.config.ts 迁移至 proxy
 *      - Content-Security-Policy / HSTS / X-Frame-Options 等
 *      - 静态资源（_next/static）由 next.config.ts headers() 兜底
 *
 *   3. F2 CSP nonce 化：每请求生成随机 nonce，注入 CSP 与请求头
 *      - script-src 移除 'unsafe-inline'，改为 'nonce-<random>'
 *      - nonce 通过 x-nonce 请求头传递，layout.tsx 经 next/headers 读取
 *      - 内联脚本（theme-init / sw-register）注入 nonce 后方可执行
 *      - 'unsafe-eval' 暂保留（开发热重载依赖），生产可进一步收紧
 *
 * matcher 排除静态资源与图片优化，避免无谓开销：
 *   - _next/static/*   构建产物（JS/CSS），由 next.config headers() 覆盖
 *   - _next/image/*    图片优化代理
 *   - favicon.ico      站点图标
 *
 * 运行时：默认 Edge Runtime — crypto.randomUUID / getRandomValues 均可用
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** 请求 ID 响应头名称 */
const REQUEST_ID_HEADER = 'X-Request-Id';

/** CSP nonce 请求头名称 — layout.tsx 通过 next/headers 读取 */
const NONCE_HEADER = 'x-nonce';

/**
 * 生成 RFC 4122 v4 UUID
 *
 * 优先使用 crypto.randomUUID（Node.js 19+ / Edge 均支持），
 * 回退到基于 crypto.getRandomValues 的手动实现。
 */
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/**
 * 生成 CSP nonce — 16 字节随机值的 base64 编码
 *
 * 规范参考：https://content-security-policy.com/nonce/
 * nonce 每请求生成，仅对当前响应的内联脚本有效，防止重放攻击。
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * 基础安全响应头（不含 CSP，CSP 需注入动态 nonce）
 */
const BASE_SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

/**
 * 构建 CSP 响应头值 — 注入 per-request nonce
 *
 * script-src:
 *   - 'self'              同源脚本
 *   - 'nonce-<random>'   本次请求的内联脚本凭证
 *   - 'unsafe-eval'      仅开发环境保留（热重载依赖）；生产环境已移除
 *   移除了 'unsafe-inline' — nonce 存在时浏览器忽略 'unsafe-inline'，
 *   内联脚本必须携带 nonce 才能执行，收紧 XSS 防护。
 *
 * style-src:
 *   - 'unsafe-inline'     保留 — Next.js 运行时大量内联样式依赖此指令，
 *     移除会导致样式全面崩溃。Next.js 官方也建议保留 style-src unsafe-inline。
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV !== 'production';
  // 开发环境保留 unsafe-eval（热重载依赖）；生产环境移除收紧 XSS 防护
  const scriptSrc = isDev
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}'`;
  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://q1.qlogo.cn https://q2.qlogo.cn https://q.qlogo.cn",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/**
 * 开发环境禁用缓存响应头 — 彻底解决旧 chunk 缓存问题
 *
 * Next.js dev server 重启后 chunk hash 会变，若浏览器缓存了旧 HTML，
 * 旧 HTML 引用旧 hash chunk → 404 → React 无法 hydrate → 按钮无响应。
 *
 * 通过 HTTP 响应头告知浏览器不缓存任何响应，每次都向服务器取最新版：
 *   - Cache-Control: no-cache, no-store, must-revalidate  主流浏览器
 *   - Pragma: no-cache                                   HTTP/1.0 兼容
 *   - Expires: 0                                         强制过期
 *
 * 仅在开发环境注入，生产环境不受影响。
 */
const DEV_NO_CACHE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export function proxy(request: NextRequest): NextResponse {
  // Q6：请求 ID 注入（优先复用客户端传入，否则生成）
  const incomingRequestId = request.headers.get(REQUEST_ID_HEADER.toLowerCase());
  const requestId = incomingRequestId || generateRequestId();

  // F2：生成 per-request CSP nonce
  const nonce = generateNonce();

  // 将 requestId 与 nonce 注入请求头
  // - x-request-id: 下游 API 路由日志关联
  // - x-nonce: layout.tsx 经 next/headers 读取，注入到内联脚本
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set(NONCE_HEADER, nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // F3：安全响应头（基础头 + CSP nonce）
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  for (const [key, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // 开发环境：禁用浏览器缓存，防止旧 chunk hash 引用失效
  if (process.env.NODE_ENV !== 'production') {
    for (const [key, value] of Object.entries(DEV_NO_CACHE_HEADERS)) {
      response.headers.set(key, value);
    }
  }

  // 响应头暴露 requestId（客户端可观测，便于排障）
  response.headers.set(REQUEST_ID_HEADER, requestId);

  return response;
}

export const config = {
  matcher: [
    // 排除静态资源与图片优化，这些由 next.config.ts headers() 兜底
    // 排除 prefetch 请求（next/link 预取），避免为预取生成无谓 nonce
    {
      source: '/((?!_next/static|_next/image|favicon\\.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
