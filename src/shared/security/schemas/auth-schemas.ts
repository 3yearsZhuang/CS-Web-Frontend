/**
 * @file 认证模块输入校验 Schema
 *
 * 包含基础类型（邮箱 / 密码 / 验证码）、登录注册等认证流程、以及密码重置相关 schema。
 */

import { z } from 'zod';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_COMPLEXITY,
} from '@/shared/config/auth-constants';

// ---------------------------------------------------------------------------
// 基础类型
// ---------------------------------------------------------------------------

/** 邮箱 schema — 非空 + 格式校验 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, '邮箱不能为空')
  .email('邮箱格式不正确');

/**
 * 密码 schema — 长度边界 + 复杂度校验
 *
 * 复杂度规则由 PASSWORD_COMPLEXITY 配置驱动，默认要求大小写 + 数字 + 特殊字符。
 * 常见弱密码（如 12345678、password）也会被拒绝。
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `密码最少 ${PASSWORD_MIN_LENGTH} 个字符`)
  .max(PASSWORD_MAX_LENGTH, `密码最多 ${PASSWORD_MAX_LENGTH} 个字符`)
  .refine((pwd) => !PASSWORD_COMPLEXITY.requireUpper || /[A-Z]/.test(pwd), '密码必须包含至少 1 个大写字母')
  .refine((pwd) => !PASSWORD_COMPLEXITY.requireLower || /[a-z]/.test(pwd), '密码必须包含至少 1 个小写字母')
  .refine((pwd) => !PASSWORD_COMPLEXITY.requireDigit || /\d/.test(pwd), '密码必须包含至少 1 个数字')
  .refine((pwd) => !PASSWORD_COMPLEXITY.requireSymbol || /[^a-zA-Z\d]/.test(pwd), '密码必须包含至少 1 个特殊字符')
  .refine((pwd) => !COMMON_WEAK_PASSWORDS.has(pwd.toLowerCase()), '该密码过于常见，请更换');

/** 常见弱密码黑名单（小写匹配，含符号变体） */
const COMMON_WEAK_PASSWORDS = new Set([
  'password1!', 'password123!', 'passw0rd1!',
  '12345678!', '123456789!', '1234567890!',
  'qwerty123!', 'qwerty1!',
  'abc12345!', 'abcdefgh1!',
  'iloveyou1!', 'letmein1!',
  'admin123!', 'welcome1!',
  'monkey123!', 'dragon123!',
  'fztbu_cs!', 'fztbucs1!',
]);

/** 验证码 schema — 6 位数字 */
export const verificationCodeSchema = z
  .string()
  .regex(/^\d{6}$/, '验证码必须是 6 位数字');

// ---------------------------------------------------------------------------
// 认证相关
// ---------------------------------------------------------------------------

/** 登录请求 schema */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '密码不能为空'),
});

/** 注册请求 schema */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  verificationCode: verificationCodeSchema,
});

/** 发送验证码请求 schema */
export const sendCodeSchema = z.object({
  email: emailSchema,
});

/** 忘记密码请求 schema */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/** 修改密码请求 schema */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '当前密码不能为空'),
  newPassword: passwordSchema,
});

// ---------------------------------------------------------------------------
// 密码重置
// ---------------------------------------------------------------------------

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  password_confirmation: z.string().optional(),
});

export const approveRejectResetSchema = z.object({
  note: z.string().max(500).optional(),
});
