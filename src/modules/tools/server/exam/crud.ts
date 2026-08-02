/**
 * @file 考试 CRUD 服务
 */

import crypto from 'node:crypto';
import { AppError } from '@/shared/app-error';
import { getDbEngine } from '@/shared/db/drivers';
import { getToolsRepository } from '@/shared/db/repositories';
import { validateTechTags } from '@/shared/utils/tech-tags';
import { computePagination, computeTotalPages } from '@/shared/utils/pagination';
import {
  type ExamStatus,
  type ExamInput,
  type Exam,
  type ExamRow,
} from '../../types';
import type { QueryParams } from '@/shared/db/drivers';

/** 将考试数据库行转换为 Exam 对象 */
export function examRowToExam(row: ExamRow): Exam {
  let techTags: string[] = [];
  if (row.tech_tags) {
    try { techTags = JSON.parse(row.tech_tags); } catch { /* ignore */ }
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as ExamStatus,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    techTags,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 创建考试 */
export async function createExam(createdBy: string, input: ExamInput): Promise<Exam> {
  const repo = getToolsRepository();
  const engine = await getDbEngine();

  if (!input.title || typeof input.title !== 'string' || input.title.trim().length === 0) {
    throw new AppError('考试标题不能为空', 'VALIDATION_ERROR');
  }

  let tagsJson: string | null = null;
  if (input.techTags) {
    const validation = validateTechTags(input.techTags);
    if (!validation.ok) {
      throw new AppError(validation.error, 'VALIDATION_ERROR');
    }
    tagsJson = JSON.stringify(validation.tags);
  }

  const id = crypto.randomUUID();
  const duration = typeof input.durationMinutes === 'number' && input.durationMinutes > 0 ? input.durationMinutes : 0;

  await engine.transaction(async (tx) => {
    await repo.insertExam(tx, id, {
      title: input.title.trim(),
      description: input.description ?? null,
      status: 'draft',
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      durationMinutes: duration,
      techTags: tagsJson,
      createdBy,
    });
  });

  const row = await repo.getExamById(id);
  return examRowToExam(row as ExamRow);
}

/** 更新考试信息 */
export async function updateExam(examId: string, input: Partial<ExamInput>): Promise<Exam> {
  const repo = getToolsRepository();
  const existing = await repo.getExamById(examId);
  if (!existing) {
    throw new AppError('考试不存在', 'NOT_FOUND');
  }
  if (existing.status !== 'draft') {
    throw new AppError('仅草稿状态的考试可编辑', 'STATE_INVALID');
  }

  const fields: Record<string, unknown> = {};

  if (input.title !== undefined) {
    if (!input.title || typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new AppError('考试标题不能为空', 'VALIDATION_ERROR');
    }
    fields.title = input.title.trim();
  }
  if (input.description !== undefined) {
    fields.description = input.description ?? null;
  }
  if (input.startTime !== undefined) {
    fields.startTime = input.startTime ?? null;
  }
  if (input.endTime !== undefined) {
    fields.endTime = input.endTime ?? null;
  }
  if (input.durationMinutes !== undefined) {
    fields.durationMinutes = typeof input.durationMinutes === 'number' && input.durationMinutes > 0 ? input.durationMinutes : 0;
  }
  if (input.techTags !== undefined) {
    const validation = validateTechTags(input.techTags);
    if (!validation.ok) {
      throw new AppError(validation.error, 'VALIDATION_ERROR');
    }
    fields.techTags = JSON.stringify(validation.tags);
  }

  await repo.updateExam(examId, fields as Partial<ExamRow>);

  const row = await repo.getExamById(examId);
  return examRowToExam(row as ExamRow);
}

/** 发布考试 */
export async function publishExam(examId: string): Promise<Exam> {
  const repo = getToolsRepository();
  const existing = await repo.getExamById(examId);
  if (!existing) {
    throw new AppError('考试不存在', 'NOT_FOUND');
  }
  if (existing.status !== 'draft') {
    throw new AppError('仅草稿状态的考试可发布', 'STATE_INVALID');
  }

  await repo.setExamStatus(examId, 'published');
  const row = await repo.getExamById(examId);
  return examRowToExam(row as ExamRow);
}

/** 结束考试 */
export async function endExam(examId: string): Promise<Exam> {
  const repo = getToolsRepository();
  const existing = await repo.getExamById(examId);
  if (!existing) {
    throw new AppError('考试不存在', 'NOT_FOUND');
  }
  if (existing.status !== 'published') {
    throw new AppError('仅已发布的考试可结束', 'STATE_INVALID');
  }

  await repo.setExamStatus(examId, 'ended');
  const row = await repo.getExamById(examId);
  return examRowToExam(row as ExamRow);
}

/** 删除考试 */
export async function deleteExam(examId: string): Promise<void> {
  const repo = getToolsRepository();
  const existing = await repo.getExamById(examId);
  if (!existing) {
    throw new AppError('考试不存在', 'NOT_FOUND');
  }
  await repo.deleteExam(examId);
}

/** 根据 ID 获取考试 */
export async function getExamById(examId: string): Promise<Exam | null> {
  const repo = getToolsRepository();
  const row = await repo.getExamById(examId);
  return row ? examRowToExam(row) : null;
}

/** 分页列出考试 */
export async function listExams(params: {
  status?: ExamStatus;
  page?: number;
  pageSize?: number;
} = {}): Promise<{ exams: Exam[]; total: number; page: number; pageSize: number; totalPages: number }> {
  const repo = getToolsRepository();
  const { status, page = 1, pageSize = 20 } = params;

  const conditions: string[] = [];
  const args: QueryParams = [];
  if (status) {
    conditions.push('status = ?');
    args.push(status);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = await repo.countExams(where, args);

  const { page: safePage, pageSize: safePageSize, offset } = computePagination({ page, pageSize, defaultPageSize: 20, maxPageSize: 100 });

  const rows = await repo.listExams(where, [...args, safePageSize, offset] as QueryParams);

  return {
    exams: rows.map(examRowToExam),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: computeTotalPages(total, safePageSize),
  };
}