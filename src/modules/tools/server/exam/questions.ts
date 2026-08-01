/**
 * @file 考试题目服务
 */

import crypto from 'node:crypto';
import { AppError } from '@/shared/app-error';
import { getDb } from '@/shared/db';
import {
  type QuestionInput,
  type ExamQuestion,
  type QuestionType,
  type QuestionRow,
  type OptionRow,
} from '../../types';

/** 列出某个考试的所有题目 */
export function listQuestionsByExam(examId: string): ExamQuestion[] {
  const db = getDb();
  const questions = db.prepare('SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY sort_order ASC').all(examId) as QuestionRow[];

  const questionIds = questions.map((q) => q.id);
  const optionsMap: Map<string, OptionRow[]> = new Map();
  if (questionIds.length > 0) {
    const placeholders = questionIds.map(() => '?').join(',');
    const optionRows = db.prepare(`SELECT * FROM exam_question_options WHERE question_id IN (${placeholders}) ORDER BY sort_order ASC`).all(...questionIds) as OptionRow[];
    for (const opt of optionRows) {
      const list = optionsMap.get(opt.question_id) || [];
      list.push(opt);
      optionsMap.set(opt.question_id, list);
    }
  }

  return questions.map((q) => ({
    id: q.id,
    examId: q.exam_id,
    type: q.type as QuestionType,
    title: q.title,
    contentMarkdown: q.content_markdown,
    score: q.score,
    sortOrder: q.sort_order,
    createdAt: q.created_at,
    options: (optionsMap.get(q.id) || []).map((o) => ({
      id: o.id,
      questionId: o.question_id,
      label: o.label,
      content: o.content,
      isCorrect: o.is_correct === 1,
      sortOrder: o.sort_order,
    })),
  }));
}

/** 为考试创建题目 */
export function createQuestion(examId: string, input: QuestionInput): ExamQuestion {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM exams WHERE id = ?').get(examId) as { id: string } | undefined;
  if (!existing) {
    throw new AppError('考试不存在', 'NOT_FOUND');
  }

  if (!input.title || typeof input.title !== 'string' || input.title.trim().length === 0) {
    throw new AppError('题目标题不能为空', 'VALIDATION_ERROR');
  }
  if (input.type !== 'single_choice' && input.type !== 'coding') {
    throw new AppError('题目类型必须为 single_choice 或 coding', 'VALIDATION_ERROR');
  }
  const score = typeof input.score === 'number' && input.score > 0 ? input.score : 5;
  const sortOrder = typeof input.sortOrder === 'number' ? input.sortOrder : 0;

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO exam_questions (id, exam_id, type, title, content_markdown, score, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, examId, input.type, input.title.trim(), input.contentMarkdown ?? null, score, sortOrder);

  if (input.options && input.options.length > 0) {
    for (const opt of input.options) {
      if (!opt.label || !opt.content) continue;
      const optId = crypto.randomUUID();
      db.prepare(
        'INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(optId, id, opt.label, opt.content, opt.isCorrect ? 1 : 0, opt.sortOrder ?? 0);
    }
  }

  const row = db.prepare('SELECT * FROM exam_questions WHERE id = ?').get(id) as QuestionRow;
  return {
    id: row.id,
    examId: row.exam_id,
    type: row.type as QuestionType,
    title: row.title,
    contentMarkdown: row.content_markdown,
    score: row.score,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    options: [],
  };
}

/** 更新题目内容 */
export function updateQuestion(questionId: string, input: Partial<QuestionInput>): ExamQuestion {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM exam_questions WHERE id = ?').get(questionId) as QuestionRow | undefined;
  if (!existing) {
    throw new AppError('题目不存在', 'NOT_FOUND');
  }

  const sets: string[] = [];
  const values: unknown[] = [];

  if (input.title !== undefined) {
    if (!input.title || typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new AppError('题目标题不能为空', 'VALIDATION_ERROR');
    }
    sets.push('title = ?');
    values.push(input.title.trim());
  }
  if (input.contentMarkdown !== undefined) {
    sets.push('content_markdown = ?');
    values.push(input.contentMarkdown ?? null);
  }
  if (input.score !== undefined) {
    const score = typeof input.score === 'number' && input.score > 0 ? input.score : 5;
    sets.push('score = ?');
    values.push(score);
  }
  if (input.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    values.push(input.sortOrder);
  }

  if (sets.length > 0) {
    values.push(questionId);
    db.prepare(`UPDATE exam_questions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  if (input.options !== undefined) {
    db.prepare('DELETE FROM exam_question_options WHERE question_id = ?').run(questionId);
    for (const opt of input.options) {
      if (!opt.label || !opt.content) continue;
      const optId = crypto.randomUUID();
      db.prepare(
        'INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(optId, questionId, opt.label, opt.content, opt.isCorrect ? 1 : 0, opt.sortOrder ?? 0);
    }
  }

  const row = db.prepare('SELECT * FROM exam_questions WHERE id = ?').get(questionId) as QuestionRow;
  return {
    id: row.id,
    examId: row.exam_id,
    type: row.type as QuestionType,
    title: row.title,
    contentMarkdown: row.content_markdown,
    score: row.score,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    options: [],
  };
}

/** 删除题目 */
export function deleteQuestion(questionId: string): void {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM exam_questions WHERE id = ?').get(questionId) as { id: string } | undefined;
  if (!existing) {
    throw new AppError('题目不存在', 'NOT_FOUND');
  }
  db.prepare('DELETE FROM exam_questions WHERE id = ?').run(questionId);
}