/**
 * @file 论坛模块输入校验 Schema
 *
 * 包含主题 / 回复 / 点赞 / 收藏 / 搜索等论坛交互 schema，以及论坛管理操作
 * （置顶、加精、隐藏、版块增删改）相关 schema。
 */

import { z } from 'zod';

/** 创建主题请求 schema */
export const createTopicSchema = z.object({
  categoryId: z.string().min(1, '版块不能为空'),
  title: z.string().min(1, '标题不能为空').max(200, '标题最多 200 个字符'),
  contentMarkdown: z.string().min(1, '内容不能为空').max(50000, '内容最多 50000 个字符'),
  tags: z.array(z.string()).max(5, '标签最多 5 个').optional(),
});

/** 更新主题请求 schema */
export const updateTopicSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contentMarkdown: z.string().min(1).max(50000).optional(),
  categoryId: z.string().min(1).optional(),
  tags: z.array(z.string()).max(5).optional(),
});

/** 创建回复请求 schema */
export const createReplySchema = z.object({
  topicId: z.string().min(1, '主题 ID 不能为空'),
  contentMarkdown: z.string().min(1, '内容不能为空').max(10000, '内容最多 10000 个字符'),
  parentReplyId: z.string().optional(),
});

/** 点赞请求 schema */
export const likeSchema = z.object({
  targetType: z.enum(['topic', 'reply'], { message: '目标类型必须是 topic 或 reply' }),
  targetId: z.string().min(1, '目标 ID 不能为空'),
});

/** 收藏请求 schema */
export const favoriteSchema = z.object({
  topicId: z.string().min(1, '主题 ID 不能为空'),
  action: z.enum(['add', 'remove'], { message: '操作必须是 add 或 remove' }),
});

/** 论坛搜索请求 schema */
export const forumSearchSchema = z.object({
  q: z.string().min(1, '搜索关键词不能为空').max(100),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// ---------------------------------------------------------------------------
// 论坛管理操作
// ---------------------------------------------------------------------------

/** 置顶主题请求 schema */
export const pinTopicSchema = z.object({
  pinned: z.boolean(),
});

/** 加精主题请求 schema */
export const featureTopicSchema = z.object({
  featured: z.boolean(),
});

export const hideTopicSchema = z.object({
  reason: z.string().max(500).optional(),
});

/** 举报请求 schema */
export const reportSchema = z.object({
  targetType: z.enum(['topic', 'comment'], { message: '举报目标类型必须是 topic 或 comment' }),
  targetId: z.string().min(1, '举报目标 ID 不能为空'),
  reason: z.string().min(1, '举报理由不能为空').max(200, '理由最多 200 个字符'),
  detail: z.string().max(1000).optional(),
});

export const createCategorySchema = z.object({
  slug: z.string().min(1, '标识不能为空').max(50).regex(/^[a-z0-9-]+$/, '标识只能包含小写字母、数字和连字符'),
  name: z.string().min(1, '名称不能为空').max(50),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export const updateCategorySchema = z.object({
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});
