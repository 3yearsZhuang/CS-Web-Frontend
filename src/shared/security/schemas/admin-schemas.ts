/**
 * @file 用户资料与管理操作输入校验 Schema
 *
 * 收纳不属于具体业务域（论坛 / 考试 / 活动 / 公告 / 资源）的 schema：
 *   - 用户资料：updateProfileSchema
 *   - 管理操作：预设头像、用户管理、审计日志查询/删除
 *   - 工具函数：formatZodError
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// 用户资料
// ---------------------------------------------------------------------------

/** 更新个人资料请求 schema */
export const updateProfileSchema = z.object({
  displayName: z.string().max(50, '显示名最多 50 个字符').optional(),
  bio: z.string().max(500, '简介最多 500 个字符').optional(),
  avatarUrl: z.string().url('头像 URL 格式不正确').optional(),
  avatarType: z.enum(['initial', 'upload', 'github']).optional(),
  githubUrl: z.string().url('GitHub URL 格式不正确').optional().or(z.literal('')),
  websiteUrl: z.string().url('个人网站 URL 格式不正确').optional().or(z.literal('')),
  techTags: z.array(z.string()).max(10, '技术标签最多 10 个').optional(),
});

// ---------------------------------------------------------------------------
// 管理操作
// ---------------------------------------------------------------------------

export const presetAvatarSchema = z.object({
  presetId: z.coerce.number().int().min(0),
});

export const adminUpdateUserSchema = z.object({
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional(),
  techTags: z.array(z.string()).max(10).optional(),
});

export const adminActionLogQuerySchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const deleteActionLogSchema = z.object({
  before: z.string().min(1, '时间参数不能为空'),
});

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

/**
 * 将 zod 校验错误扁平化为前端友好的消息字符串。
 * 用于 API 响应中的 error 字段。
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((e) => e.message)
    .join('; ');
}

export type { z };
