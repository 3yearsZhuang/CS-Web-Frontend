/**
 * @file 内存速率限制器 — 按 key 统计请求次数，超阈值返回 false（单进程，多实例需换 Redis）
 */

import 'server-only';

interface RateBucket {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private buckets = new Map<string, RateBucket>();
  private readonly max: number;
  private readonly windowMs: number;

  constructor(max = 10, windowMs = 60_000) {
    this.max = max;
    this.windowMs = windowMs;
  }

  /** 检查 key 是否在限流阈值内。返回 true 表示放行，false 表示已超限。 */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.buckets.get(key);

    if (!entry || entry.resetAt < now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    entry.count++;
    if (entry.count > this.max) {
      return false;
    }
    return true;
  }

  /** 当前 key 的剩余尝试次数（用于调试与响应头） */
  remaining(key: string): number {
    const entry = this.buckets.get(key);
    if (!entry || entry.resetAt < Date.now()) return this.max;
    return Math.max(0, this.max - entry.count);
  }

  /** 当前 key 的重置时间戳（Unix ms），用于 Retry-After 头 */
  retryAfterSeconds(key: string): number {
    const entry = this.buckets.get(key);
    if (!entry || entry.resetAt < Date.now()) return 0;
    return Math.ceil((entry.resetAt - Date.now()) / 1000);
  }

  /** 主动清除过期 bucket（建议定期调用） */
  sweep(): void {
    const now = Date.now();
    for (const [k, v] of this.buckets) {
      if (v.resetAt < now) this.buckets.delete(k);
    }
  }
}

/**
 * 速率限制集中配置
 *
 * 所有限制器的阈值与窗口集中定义于此，便于统一调整。
 * 支持环境变量覆盖（运维无需改代码即可调参）：
 *   RATE_LIMIT_<NAME>_MAX        — 窗口内最大请求次数
 *   RATE_LIMIT_<NAME>_WINDOW_MS  — 窗口时长（毫秒）
 *
 * <NAME> 为下方 key 的大写形式，如 login → RATE_LIMIT_LOGIN_MAX=20。
 * 未设置或解析失败时回退到默认值。
 */
interface RateLimitEntry {
  /** 窗口内最大请求次数 */
  max: number;
  /** 窗口时长（毫秒） */
  windowMs: number;
  /** 用途说明（供运维理解） */
  desc: string;
}

const RATE_LIMIT_CONFIG = {
  login:          { max: 10, windowMs: 60_000, desc: '登录：每个 IP+邮箱每分钟 10 次' },
  register:       { max: 5,  windowMs: 60_000, desc: '注册：每个 IP 每分钟 5 次（注册更敏感）' },
  profileUpdate:  { max: 10, windowMs: 60_000, desc: '资料更新：每个 IP 每分钟 10 次' },
  avatarPreset:   { max: 10, windowMs: 60_000, desc: '预设头像选择：每个 IP 每分钟 10 次' },
  avatarUpload:   { max: 5,  windowMs: 60_000, desc: '头像上传：每个 IP 每分钟 5 次' },
  adminActions:   { max: 30, windowMs: 60_000, desc: '管理员操作：每个 IP 每分钟 30 次' },
  sendCode:       { max: 3,  windowMs: 60_000, desc: '验证码发送：每个 IP+email 每分钟 3 次（防邮件轰炸）' },
  forgotPassword: { max: 3,  windowMs: 60_000, desc: '忘记密码：每个 IP 每分钟 3 次（防滥用）' },
  auth:           { max: 20, windowMs: 60_000, desc: '认证操作：每个 IP 每分钟 20 次' },
  forumPost:      { max: 5,  windowMs: 60_000, desc: '论坛发主题：每个 IP 每分钟 5 次（防垃圾主题）' },
  forumReply:     { max: 10, windowMs: 60_000, desc: '论坛回复：每个 IP 每分钟 10 次' },
  forumLike:      { max: 30, windowMs: 60_000, desc: '论坛点赞：每个 IP 每分钟 30 次（点赞轻量）' },
  forumUpload:    { max: 10, windowMs: 60_000, desc: '论坛图片上传：每个 IP 每分钟 10 次' },
  examSubmit:     { max: 10, windowMs: 60_000, desc: '考试答题提交：每个 IP 每分钟 10 次（防刷分）' },
  resourceSubmit: { max: 5,  windowMs: 60_000, desc: '资源提交：每个 IP 每分钟 5 次（防垃圾资源）' },
  resourceUpload: { max: 5,  windowMs: 60_000, desc: '资源文件上传：每个 IP 每分钟 5 次' },
  joinApplication:{ max: 3,  windowMs: 60_000, desc: '入社申请：每个 IP 每分钟 3 次（防垃圾申请）' },
  eventCheckin:   { max: 10, windowMs: 60_000, desc: '活动签到核销：每个 IP 每分钟 10 次' },
  twoFactor:      { max: 5,  windowMs: 60_000, desc: '2FA 验证：每个 IP+用户每分钟 5 次（防 TOTP 暴力破解）' },
  twoFactorSetup: { max: 3,  windowMs: 60_000, desc: '2FA 设置：每个 IP+用户每分钟 3 次（防资源消耗 DoS）' },
} as const satisfies Record<string, RateLimitEntry>;

/**
 * 从配置创建 RateLimiter，支持环境变量覆盖
 *
 * 环境变量格式：RATE_LIMIT_<NAME>_MAX / RATE_LIMIT_<NAME>_WINDOW_MS
 * 解析失败或未设置时回退到 RATE_LIMIT_CONFIG 中的默认值。
 */
function createRateLimiter(name: keyof typeof RATE_LIMIT_CONFIG): RateLimiter {
  const config = RATE_LIMIT_CONFIG[name];
  const prefix = `RATE_LIMIT_${name.toUpperCase()}`;
  const envMax = parseInt(process.env[`${prefix}_MAX`] ?? '', 10);
  const envWindow = parseInt(process.env[`${prefix}_WINDOW_MS`] ?? '', 10);
  return new RateLimiter(
    Number.isFinite(envMax) && envMax > 0 ? envMax : config.max,
    Number.isFinite(envWindow) && envWindow > 0 ? envWindow : config.windowMs,
  );
}

// ============= 速率限制器实例（从配置生成） =============

/** 全局登录速率限制器 */
export const loginRateLimiter = createRateLimiter('login');

/** 全局注册速率限制器 */
export const registerRateLimiter = createRateLimiter('register');

/** 全局资料更新速率限制器 */
export const profileUpdateLimiter = createRateLimiter('profileUpdate');

/** 全局预设头像选择速率限制器 */
export const avatarPresetLimiter = createRateLimiter('avatarPreset');

/** 全局头像上传速率限制器 */
export const avatarUploadLimiter = createRateLimiter('avatarUpload');

/** 全局管理员操作速率限制器 */
export const adminActionsLimiter = createRateLimiter('adminActions');

/** 全局验证码发送速率限制器 */
export const sendCodeLimiter = createRateLimiter('sendCode');

/** 全局忘记密码申请速率限制器 */
export const forgotPasswordLimiter = createRateLimiter('forgotPassword');

/** 全局认证操作速率限制器 */
export const authRateLimiter = createRateLimiter('auth');

/** 论坛发主题速率限制器 */
export const forumPostLimiter = createRateLimiter('forumPost');

/** 论坛回复速率限制器 */
export const forumReplyLimiter = createRateLimiter('forumReply');

/** 论坛点赞速率限制器 */
export const forumLikeLimiter = createRateLimiter('forumLike');

/** 论坛图片上传速率限制器 */
export const forumUploadLimiter = createRateLimiter('forumUpload');

/** 考试答题提交速率限制器 */
export const examSubmitLimiter = createRateLimiter('examSubmit');

/** 资源提交速率限制器 */
export const resourceSubmitLimiter = createRateLimiter('resourceSubmit');

/** 资源文件上传速率限制器 */
export const resourceUploadLimiter = createRateLimiter('resourceUpload');

/** 入社申请速率限制器 */
export const joinApplicationLimiter = createRateLimiter('joinApplication');

/** 活动签到核销速率限制器 */
export const eventCheckinLimiter = createRateLimiter('eventCheckin');

/** 2FA 验证速率限制器（防 TOTP 暴力破解） */
export const twoFactorLimiter = createRateLimiter('twoFactor');
export const twoFactorSetupLimiter = createRateLimiter('twoFactorSetup');
