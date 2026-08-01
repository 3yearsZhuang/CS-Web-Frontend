/**
 * @file 考试模块输入校验 Schema
 *
 * 包含考试场次、题目、答题提交相关 schema。
 */

import { z } from 'zod';

export const createExamSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200),
  description: z.string().max(2000).optional(),
  startTime: z.string().min(1, '开始时间不能为空'),
  endTime: z.string().min(1, '结束时间不能为空'),
  durationMinutes: z.coerce.number().int().min(1, '考试时长至少 1 分钟').max(1440, '考试时长最多 1440 分钟'),
  techTags: z.array(z.string()).max(10).optional(),
});

export const updateExamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
  techTags: z.array(z.string()).max(10).optional(),
  status: z.enum(['draft', 'published', 'started', 'ended']).optional(),
});

export const addQuestionSchema = z.object({
  type: z.enum(['single_choice', 'coding']),
  title: z.string().min(1, '标题不能为空').max(500),
  contentMarkdown: z.string().max(10000).nullable().optional(),
  score: z.coerce.number().int().min(1).max(100).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  options: z.array(z.object({
    label: z.string().min(1, '选项标签不能为空').max(10),
    content: z.string().min(1, '选项内容不能为空').max(2000),
    isCorrect: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })).optional(),
});

export const updateQuestionSchema = z.object({
  type: z.enum(['single_choice', 'coding']).optional(),
  title: z.string().min(1).max(500).optional(),
  contentMarkdown: z.string().max(10000).nullable().optional(),
  score: z.coerce.number().int().min(1).max(100).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  options: z.array(z.object({
    label: z.string().min(1).max(10),
    content: z.string().min(1).max(2000),
    isCorrect: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })).optional(),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1, '题目 ID 不能为空'),
  answer: z.string().min(1, '答案不能为空'),
});
