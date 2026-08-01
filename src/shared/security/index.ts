/**
 * @file shared/security 统一导出 — HTTP 安全工具、校验 schema、权限点与审计日志（server-only）
 */

// ---- HTTP 响应与请求体校验 ----
export {
  jsonError,
  validateBody,
  formatZodErrors,
  errorResponse,
  parseJsonBody,
} from './http-helpers';

// ---- Origin / Referer 白名单校验 ----
export { assertAllowedOrigin } from './origin-guard';

// ---- 速率限制 ----
export {
  RateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  profileUpdateLimiter,
  avatarPresetLimiter,
  avatarUploadLimiter,
  adminActionsLimiter,
  sendCodeLimiter,
  forgotPasswordLimiter,
  authRateLimiter,
  forumPostLimiter,
  forumReplyLimiter,
  forumLikeLimiter,
  forumUploadLimiter,
  examSubmitLimiter,
  resourceSubmitLimiter,
  resourceUploadLimiter,
  joinApplicationLimiter,
  eventCheckinLimiter,
  twoFactorLimiter,
} from './rate-limiter';

// ---- 请求工具 ----
export { getClientIp, getCookieValue } from './request-utils';

// ---- 输入校验 schema ----
export * from './schemas';

// ---- 权限点定义与角色元数据 ----
export * from './permission-points';
export * from './builtin-roles';

// ---- 管理员操作审计日志 ----
export { logAdminAction } from './audit';
export type { AuditContext } from './audit';

// ---- 反向代理头清理 ----
export { sanitizeProxyHeaders } from './proxy-headers';

// ---- 密码哈希原语（scrypt）----
// 下沉自 modules/auth/server/identity，消除 admin → auth 的密码哈希依赖
export {
  hashPassword,
  verifyPassword,
  SCRYPT_KEYLEN,
  SCRYPT_SALT_LEN,
} from './password';
