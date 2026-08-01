/**
 * @file 活动模块输入校验 Schema
 *
 * 包含活动创建/更新、报名管理、批量操作、报名表单提交相关 schema。
 */

import { z } from 'zod';

/** 创建活动请求 schema */
export const createEventSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  description: z.string().max(10000).nullable().optional(),
  contentMarkdown: z.string().max(50000).nullable().optional(),
  month: z.string().min(1).max(8).nullable().optional(),
  date: z.string().min(1).max(32).nullable().optional(),
  year: z.string().min(1).max(8).nullable().optional(),
  status: z.enum(['upcoming', 'ongoing', 'ended']).nullable().optional(),
  topics: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  registrationFields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    required: z.boolean().optional(),
  })).optional(),
});

/** 更新活动请求 schema */
export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).nullable().optional(),
  contentMarkdown: z.string().max(50000).nullable().optional(),
  month: z.string().min(1).max(8).nullable().optional(),
  date: z.string().min(1).max(32).nullable().optional(),
  year: z.string().min(1).max(8).nullable().optional(),
  status: z.enum(['upcoming', 'ongoing', 'ended']).nullable().optional(),
  topics: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  registrationFields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    required: z.boolean().optional(),
  })).optional(),
});

/** 管理报名请求 schema */
export const manageRegistrationSchema = z.object({
  userId: z.string().min(1),
});

/** 更新报名状态请求 schema */
export const updateRegistrationSchema = z.object({
  registrationId: z.string().min(1),
  status: z.enum(['registered', 'cancelled', 'waitlisted']),
});

export const batchEventSchema = z.object({
  eventIds: z.array(z.string().min(1)).min(1, '至少选择一个活动'),
  status: z.enum(['upcoming', 'ongoing', 'ended']),
});

export const eventRegistrationSchema = z.object({
  formData: z.record(z.string(), z.string()).optional(),
});
