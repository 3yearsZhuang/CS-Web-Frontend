/**
 * @file 认证相关常量 — re-export 自 shared/config/auth-constants 保持向后兼容
 */

export {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE,
  OAUTH_2FA_COOKIE_NAME,
  OAUTH_2FA_COOKIE_MAX_AGE,
  EMAIL_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  COOKIE_SECURE,
} from '@/shared/config';
