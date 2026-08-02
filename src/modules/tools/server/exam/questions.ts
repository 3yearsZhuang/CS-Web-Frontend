/**
 * @file 考试题目服务
 */

import crypto from 'node:crypto';
import { AppError } from '@/shared/app-error';
import { getDbEngine } from '@/shared/db/drivers';
import { getToolsRepository } from '@/shared/db/repositories';
import {
  type QuestionInput,
  type ExamQuestion,
  type QuestionType,
  type QuestionRow,
  type OptionRow,
} from '../../types';
import type { ExamQuestionRow } from '@/shared/db/repositories';

/** 列出某个考试的所有题目 */
export async function listQuestionsByExam(examId: string): Promise<ExamQuestion[]> {
  const repo = getToolsRepository();
  const questions = await repo.getExamQuestions(examId);

  const questionIds = questions.map((q) => q.id);
  const optionsMap: Map<string, OptionRow[]> = new Map();
  if (questionIds.length > 0) {
    const optionRows = await repo.getExamQuestionOptions(questionIds);
    for (const opt of optionRows as OptionRow[]) {
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
export async function createQuestion(examId: string, input: QuestionInput): Promise<ExamQuestion> {
  const repo = getToolsRepository();
  const engine = await getDbEngine();
  const existing = await repo.getExamById(examId);
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
  await engine.transaction(async (tx) => {
    await repo.insertExamQuestion(tx, {
      id,
      examId,
      type: input.type,
      title: input.title.trim(),
      contentMarkdown: input.contentMarkdown ?? null,
      score,
      sortOrder,
    });
    if (input.options && input.options.length > 0) {
      for (const opt of input.options) {
        if (!opt.label || !opt.content) continue;
        await repo.insertExamQuestionOption(tx, {
          id: crypto.randomUUID(),
          questionId: id,
          label: opt.label,
          content: opt.content,
          isCorrect: opt.isCorrect ?? false,
          sortOrder: opt.sortOrder ?? 0,
        });
      }
    }
  });

  const row = await repo.getExamQuestion(id);
  return {
    id: row!.id,
    examId: row!.exam_id,
    type: row!.type as QuestionType,
    title: row!.title,
    contentMarkdown: row!.content_markdown,
    score: row!.score,
    sortOrder: row!.sort_order,
    createdAt: row!.created_at,
    options: [],
  };
}

/** 更新题目内容 */
export async function updateQuestion(questionId: string, input: Partial<QuestionInput>): Promise<ExamQuestion> {
  const repo = getToolsRepository();
  const existing = await repo.getExamQuestion(questionId);
  if (!existing) {
    throw new AppError('题目不存在', 'NOT_FOUND');
  }

  const fields: Record<string, unknown> = {};
  if (input.title !== undefined) {
    if (!input.title || typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new AppError('题目标题不能为空', 'VALIDATION_ERROR');
    }
    fields.title = input.title.trim();
  }
  if (input.contentMarkdown !== undefined) fields.contentMarkdown = input.contentMarkdown ?? null;
  if (input.score !== undefined) {
    const score = typeof input.score === 'number' && input.score > 0 ? input.score : 5;
    fields.score = score;
  }
  if (input.sortOrder !== undefined) fields.sortOrder = input.sortOrder;

  await repo.updateExamQuestion(questionId, fields as Partial<ExamQuestionRow>);

  if (input.options !== undefined) {
    const opts = input.options;
    const engine = await getDbEngine();
    await engine.transaction(async (tx) => {
      await repo.deleteExamQuestionOptions(questionId);
      for (const opt of opts) {
        if (!opt.label || !opt.content) continue;
        await repo.insertExamQuestionOption(tx, {
          id: crypto.randomUUID(),
          questionId,
          label: opt.label,
          content: opt.content,
          isCorrect: opt.isCorrect ?? false,
          sortOrder: opt.sortOrder ?? 0,
        });
      }
    });
  }

  const row = await repo.getExamQuestion(questionId);
  return {
    id: row!.id,
    examId: row!.exam_id,
    type: row!.type as QuestionType,
    title: row!.title,
    contentMarkdown: row!.content_markdown,
    score: row!.score,
    sortOrder: row!.sort_order,
    createdAt: row!.created_at,
    options: [],
  };
}

/** 删除题目 */
export async function deleteQuestion(questionId: string): Promise<void> {
  const repo = getToolsRepository();
  const engine = await getDbEngine();
  const existing = await repo.getExamQuestion(questionId);
  if (!existing) {
    throw new AppError('题目不存在', 'NOT_FOUND');
  }
  await engine.transaction(async (tx) => {
    await repo.deleteExamQuestionOptions(questionId);
    await repo.deleteExamQuestion(questionId);
  });
}