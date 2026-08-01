/**
 * @file 考试 CRUD 服务
 */

import crypto from 'node:crypto';
import { AppError } from '@/shared/app-error';
import { getDb } from '@/shared/db';
import { validateTechTags } from '@/shared/utils/tech-tags';
import { computePagination, computeTotalPages } from '@/shared/utils/pagination';
import {
  type ExamStatus,
  type ExamInput,
  type Exam,
  type ExamRow,
} from '../../types';

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
export function createExam(createdBy: string, input: ExamInput): Exam {
  const db = getDb();

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

  db.prepare(
    `INSERT INTO exams (id, title, description, status, start_time, end_time, duration_minutes, tech_tags, created_by)
     VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
  ).run(id, input.title.trim(), input.description ?? null, input.startTime ?? null, input.endTime ?? null, duration, tagsJson, createdBy);

  const row = db.prepare('SELECT * FROM exams WHERE id = ?').get(id) as ExamRow;
  return examRowToExam(row);
}

/** 更新考试信息 */
export function updateExam(examId: string, input: Partial<ExamInput>): Exam {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId) as ExamRow | undefined;
  if (!existing) {
    throw new AppError('考试不存在', 'NOT_FOUND');
  }
  if (existing.status !== 'draft') {
    throw new AppError('仅草稿状态的考试可编辑', 'STATE_INVALID');
  }

  const sets: string[] = [];
  const values: unknown[] = [];

  if (input.title !== undefined) {
    if (!input.title || typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new AppError('考试标题不能为空', 'VALIDATION_ERROR');
    }
    sets.push('title = ?');
    values.push(input.title.trim());
  }
  if (input.description !== undefined) {
    sets.push('description = ?');
    values.push(input.description ?? null);
  }
  if (input.startTime !== undefined) {
    sets.push('start_time = ?');
    values.push(input.startTime ?? null);
  }
  if (input.endTime !== undefined) {
    sets.push('end_time = ?');
    values.push(input.endTime ?? null);
  }
  if (input.durationMinutes !== undefined) {
    sets.push('duration_minutes = ?');
    values.push(typeof input.durationMinutes === 'number' && input.durationMinutes > 0 ? input.durationMinutes : 0);
  }
  if (input.techTags !== undefined) {
    const validation = validateTechTags(input.techTags);
    if (!validation.ok) {
      throw new AppError(validation.error, 'VALIDATION_ERROR');
    }
    sets.push('tech_tags = ?');
    values.push(JSON.stringify(validation.tags));
  }

  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    values.push(examId);
    db.prepare(`UPDATE exams SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  const row = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId) as ExamRow;
  return examRowToExam(row);
}

/** 发布考试 */
export function publishExam(examId: string): Exam {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId) as ExamRow | undefined;
  if (!existing) {
    throw new AppError('考试不存在', 'NOT_FOUND');
  }
  if (existing.status !== 'draft') {
    throw new AppError('仅草稿状态的考试可发布', 'STATE_INVALID');
  }

  db.prepare("UPDATE exams SET status = 'published', updated_at = datetime('now') WHERE id = ?").run(examId);
  const row = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId) as ExamRow;
  return examRowToExam(row);
}

/** 结束考试 */
export function endExam(examId: string): Exam {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId) as ExamRow | undefined;
  if (!existing) {
    throw new AppError('考试不存在', 'NOT_FOUND');
  }
  if (existing.status !== 'published') {
    throw new AppError('仅已发布的考试可结束', 'STATE_INVALID');
  }

  db.prepare("UPDATE exams SET status = 'ended', updated_at = datetime('now') WHERE id = ?").run(examId);
  const row = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId) as ExamRow;
  return examRowToExam(row);
}

/** 删除考试 */
export function deleteExam(examId: string): void {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM exams WHERE id = ?').get(examId) as { id: string } | undefined;
  if (!existing) {
    throw new AppError('考试不存在', 'NOT_FOUND');
  }
  db.prepare('DELETE FROM exams WHERE id = ?').run(examId);
}

/** 根据 ID 获取考试 */
export function getExamById(examId: string): Exam | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId) as ExamRow | undefined;
  return row ? examRowToExam(row) : null;
}

/** 分页列出考试 */
export function listExams(params: {
  status?: ExamStatus;
  page?: number;
  pageSize?: number;
} = {}): { exams: Exam[]; total: number; page: number; pageSize: number; totalPages: number } {
  const db = getDb();
  const { status, page = 1, pageSize = 20 } = params;

  const conditions: string[] = [];
  const args: unknown[] = [];
  if (status) {
    conditions.push('status = ?');
    args.push(status);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM exams ${where}`).get(...args) as { cnt: number }).cnt;

  const { page: safePage, pageSize: safePageSize, offset } = computePagination({ page, pageSize, defaultPageSize: 20, maxPageSize: 100 });

  const rows = db.prepare(`SELECT * FROM exams ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...args, safePageSize, offset) as ExamRow[];

  return {
    exams: rows.map(examRowToExam),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: computeTotalPages(total, safePageSize),
  };
}