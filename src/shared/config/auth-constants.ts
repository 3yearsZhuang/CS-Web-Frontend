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

/** 是否启用生产环境 Cookie Secure 标志（dev 环境 HTTP 下不启用避免 cookie 永不写入） */
export const COOKIE_SECURE = process.env.NODE_ENV === 'production';
