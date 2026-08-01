/**
 * @file 全站公告与通知输入校验 Schema
 *
 * 包含公告创建/更新、群发通知相关 schema。
 */

import { z } from 'zod';

/**
 * 公告过期时间 schema — 可空、可选，但非空时必须是可解析的日期字符串
 *
 * 强制校验可解析性，配合 server 层 datetime(expires_at) 归一化双保险。
 */
const announcementExpiresAtSchema = z
  .string()
  .nullable()
  .optional()
  .refine(
    (val) => val === null || val === undefined || val === '' || !Number.isNaN(new Date(val).getTime()),
    '过期时间格式不正确，请提供有效的日期时间',
  );

export const createAnnouncementSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  content: z.string().max(5000).optional(),
  level: z.enum(['info', 'warning', 'success', 'error']).optional(),
  isDismissible: z.boolean().optional(),
  priority: z.coerce.number().int().min(0).max(100).optional(),
  expiresAt: announcementExpiresAtSchema,
  targetRoles: z.array(z.string()).nullable().optional(),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(5000).optional(),
  level: z.enum(['info', 'warning', 'success', 'error']).optional(),
  isActive: z.boolean().optional(),
  isDismissible: z.boolean().optional(),
  priority: z.coerce.number().int().min(0).max(100).optional(),
  expiresAt: announcementExpiresAtSchema,
  targetRoles: z.array(z.string()).nullable().optional(),
});

export const broadcastNotificationSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  content: z.string().min(1, '内容不能为空').max(5000),
  type: z.enum(['system', 'admin', 'activity']),
  targetUserId: z.string().optional(),
});
