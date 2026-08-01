/**
 * @file 认证相关常量（shared 层）
 *
 * 从 modules/auth 提取被 shared 层引用的常量，消除 shared → modules 的跨层依赖。
 */

/**
 * 认证 cookie 名称
 *
 * 生产环境用 `__Host-` 前缀强制 Secure + Path=/ + 无 Domain，防 cookie 属性被篡改；
 * 开发环境 HTTP 下无法满足 Secure 要求，使用无前缀名称。
 */
export const AUTH_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-auth_session' : 'auth_session';

/** Session cookie 有效期（秒）— 7 天 */
export const AUTH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * OAuth 2FA 预认证 cookie 名称
 *
 * 2FA token 经 HttpOnly cookie 传递而非 URL query，避免 Referer/历史/日志泄漏；
 * `__Host-` 前缀强制 Secure + Path=/ + 无 Domain。有效期 5 分钟，verify 后立即清除。
 */
export const OAUTH_2FA_COOKIE_NAME = '__Host-oauth_2fa';

/** OAuth 2FA 预认证 cookie 有效期（秒）— 5 分钟，与 TWO_FACTOR_TOKEN_TTL_MS 一致 */
export const OAUTH_2FA_COOKIE_MAX_AGE = 5 * 60;

/** 邮箱格式正则（RFC 5322 简化版） */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 密码长度边界 — MIN ≥8（NIST SP 800-63B），MAX 1024 防 scryptSync 同步阻塞 DoS */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 1024;

/** 密码复杂度策略 — 默认全开，符合 NIST SP 800-63B 附录 A 基线建议 */
export const PASSWORD_COMPLEXITY = {
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSymbol: true,
} as const;

/** 历史密码复用检测 — 检查最近 N 次历史密码，设为 0 可禁用 */
export const PASSWORD_HISTORY_LIMIT = 5;

/**
 * 允许的请求来源（Origin / Referer 白名单）— POST 端点 Login CSRF 防御
 *
 * 优先读 ALLOWED_ORIGINS 环境变量（逗号分隔）；生产环境未配置则拒绝启动，开发环境默认允许 localhost 与局域网 IP。
 */
export const ALLOWED_ORIGINS = ((): string[] => {
  const env = process.env.ALLOWED_ORIGINS;
  if (env) {
    return env.split(',').map((s) => s.trim()).filter(Boolean);
  }
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[FATAL] ALLOWED_ORIGINS 环境变量未配置。生产环境必须设置此变量以启用 Origin 白名单校验。\n' +
      '  示例: ALLOWED_ORIGINS=https://example.com,https://www.example.com'
    );
    process.exit(1);
  }
  const origins = ['http://localhost:2333', 'http://localhost:3000'];
  try {
    // 此文件被客户端代码导入获取纯常量，不能用静态 import 'node:os'（浏览器 bundle 无法解析）；
    // require() 包 try/catch：服务端获取网卡 IP，客户端静默失败回退默认白名单。
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const interfaces = (require('os') as typeof import('os')).networkInterfaces();
    for (const addrs of Object.values(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          origins.push(`http://${addr.address}:2333`);
        }
      }
    }
  } catch {
    // 获取网络接口失败时保持默认白名单
  }
  return origins;
})();

/** 是否启用生产环境 Cookie Secure 标志（dev 环境 HTTP 下不启用避免 cookie 永不写入） */
export const COOKIE_SECURE = process.env.NODE_ENV === 'production';
