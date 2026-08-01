/**
 * @file HTTP 入口安全工具聚合 re-export（向后兼容 @/shared/security/security 路径）
 * 所有校验服务端强制执行，不依赖客户端检查
 */

// ---- HTTP 响应与请求体校验 ----
export {
  jsonError,
  parseJsonBody,
  validateBody,
  formatZodErrors,
  errorResponse,
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
  twoFactorSetupLimiter,
} from './rate-limiter';

// ---- 请求工具 ----
export { getClientIp, getCookieValue } from './request-utils';
