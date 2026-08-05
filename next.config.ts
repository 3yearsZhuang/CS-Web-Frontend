/**
 * @file Next.js 配置
 *
 * 安全配置：
 *   - poweredByHeader: false  禁用 X-Powered-By 头，避免指纹识别
 *   - headers()          静态资源安全响应头（_next/static / _next/image）
 *
 * 安全头职责划分（F3 迁移后）：
 *   - proxy.ts          覆盖页面与 API 路由的安全头（支持未来 F2 nonce CSP）
 *   - next.config headers()  仅覆盖 _next/static / _next/image 静态资源
 *     （proxy matcher 排除静态资源，此处兜底）
 *
 * 安全头清单：
 *   - Content-Security-Policy   限制资源加载源，防 XSS 注入
 *   - X-Content-Type-Options    nosniff，禁用 MIME 嗅探
 *   - X-Frame-Options           DENY，防点击劫持
 *   - Referrer-Policy           strict-origin-when-cross-origin
 *   - Permissions-Policy        禁用敏感浏览器 API（摄像头/麦克风/地理位置）
 *   - Strict-Transport-Security 强制 HTTPS（生产环境生效）
 *
 * CSP 说明：
 *   - img-src 允许 'self' / data: / blob: / QQ 头像 CDN (q*.qlogo.cn)
 *     — 项目图片为同源（logo、预设头像），用户上传头像为同源，
 *       QQ 头像彩蛋需要加载 qlogo.cn 外部图源
 *   - style-src 允许 fonts.googleapis.com 用于 Google Fonts CSS @import
 *   - font-src 允许 fonts.gstatic.com 用于 Google Fonts 字体文件
 *   - script-src 仅 'self' 'unsafe-eval'
 *     — 静态资源（_next/static）为外部 JS 文件，'self' 即可加载
 *     — 'unsafe-eval' 供开发热重载；生产可移除
 *     — 页面与 API 路由的 CSP 由 proxy.ts 注入 nonce（F2），此处不适用
 */
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/** next-intl 无 i18n 路由模式：仅用于解析 src/i18n/request.ts，不注入 locale 路由中间件 */
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * 从 ALLOWED_ORIGINS 环境变量构建 allowedDevOrigins
 *
 * Next.js 16 默认阻止跨域访问 dev 资源（HMR、JS chunks）。
 * 通过 Cloudflare tunnel 访问时，tunnel URL 与 localhost 不同源，
 * 需将其加入白名单，否则客户端 JS 无法加载 → React 水合失败
 * → 表单 onSubmit 等事件处理器不生效 → 回退为原生表单提交。
 *
 * allowedDevOrigins 接受 hostname（不含协议），如 'bond-prize-limitations-squad.trycloudflare.com'。
 * tunnel.mjs 更新 .env 的 ALLOWED_ORIGINS 时自动覆盖此列表。
 *
 * 注意：未设置 ALLOWED_ORIGINS 时返回 undefined（而非空数组 []），
 * Next.js 默认允许所有 origin 访问 dev 资源，避免 IDE 预览浏览器等
 * 非 localhost 环境出现 net::ERR_ABORTED 错误。
 */
const allowedDevOrigins: string[] | undefined = (() => {
  const env = process.env.ALLOWED_ORIGINS;
  if (!env) return undefined;
  const origins = env
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((o) => {
      // 提取 hostname：去掉协议前缀
      try {
        return new URL(o).hostname;
      } catch {
        return o;
      }
    });
  return origins.length > 0 ? origins : undefined;
})();

const nextConfig: NextConfig = {
  // 禁用 X-Powered-By 头，避免暴露技术栈指纹
  poweredByHeader: false,

  // 构建产物统一输出到 .build/ 目录，替代默认的 .next/
  distDir: '.build',

  // 允许 Cloudflare tunnel 等外部 origin 访问 dev 资源（HMR / JS chunks）
  allowedDevOrigins,

  async redirects() {
    return [
      // 社区聚合：独立列表页永久重定向到 /community
      // 详情页（/forum/[category]/[topicId]、/blog/[slug]、/users/[id]）不受影响
      {
        source: '/blog',
        destination: '/community',
        permanent: true,
      },
      {
        source: '/members',
        destination: '/community',
        permanent: true,
      },
      {
        source: '/forum/search',
        destination: '/community',
        permanent: true,
      },
      // 社区统一重构：forum/blog 顶层列表合并为 /community
      {
        source: '/community/forum',
        destination: '/community?tab=topic',
        permanent: true,
      },
      {
        source: '/community/blog',
        destination: '/community?tab=post',
        permanent: true,
      },
      // 去除 /community/posts 中间层，合并到 /community
      {
        source: '/community/posts',
        destination: '/community',
        permanent: true,
      },
    ];
  },

  async headers() {
    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https://q1.qlogo.cn https://q2.qlogo.cn https://q.qlogo.cn",
          "connect-src 'self'",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
    ];

    return [
      // 静态资源安全头 — proxy.ts matcher 排除 _next/static，此处兜底
      {
        source: '/_next/static/:path*',
        headers: securityHeaders,
      },
      {
        source: '/_next/image/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
