/**
 * @file 学习资源站输入校验 Schema
 *
 * 包含资源创建/更新、审核、查询相关 schema。
 */

import { z } from 'zod';

export const createResourceSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  url: z.string().min(1, '链接不能为空').url('链接格式不正确').max(2000),
  description: z.string().max(5000).optional(),
  resourceType: z.enum(['article', 'video', 'course', 'tool', 'book', 'other']).optional(),
  techTags: z.array(z.string()).max(10).optional(),
  fileUrl: z.string().max(500).optional(),
});

export const updateResourceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  url: z.string().url('链接格式不正确').max(2000).optional(),
  description: z.string().max(5000).optional(),
  resourceType: z.enum(['article', 'video', 'course', 'tool', 'book', 'other']).optional(),
  techTags: z.array(z.string()).max(10).optional(),
});

export const reviewResourceSchema = z.object({
  status: z.enum(['published', 'hidden']),
  note: z.string().max(500).optional(),
});

export const resourceQuerySchema = z.object({
  resourceType: z.string().optional(),
  techTag: z.string().optional(),
  status: z.enum(['draft', 'published', 'hidden']).optional(),
  sort: z.enum(['latest', 'popular']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
