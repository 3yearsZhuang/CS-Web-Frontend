/**
 * @file 考试作答服务
 */

import crypto from 'node:crypto';
import { AppError } from '@/shared/app-error';
import { getDbEngine } from '@/shared/db/drivers';
import { getToolsRepository } from '@/shared/db/repositories';
import {
  type ExamAttempt,
  type ExamRanking,
  type AttemptRow,
} from '../../types';

/** 提交考试答案 */
export async function submitAnswer(userId: string, examId: string, questionId: string, answer: string): Promise<ExamAttempt> {
  const repo = getToolsRepository();
  const engine = await getDbEngine();

  const exam = await repo.getExamById(examId);
  if (!exam) {
    throw new AppError('考试不存在', 'NOT_FOUND');
  }
  if (exam.status !== 'published') {
    throw new AppError('考试未开放', 'STATE_INVALID');
  }

  const now = new Date();
  if (exam.start_time && new Date(exam.start_time) > now) {
    throw new AppError('考试尚未开始', 'STATE_INVALID');
  }
  if (exam.end_time && new Date(exam.end_time) < now) {
    throw new AppError('考试已结束', 'STATE_INVALID');
  }

  if (exam.duration_minutes > 0) {
    const firstAttempt = await repo.getFirstAttemptTime(userId, examId);
    if (firstAttempt?.first_at) {
      const elapsed = now.getTime() - new Date(firstAttempt.first_at).getTime();
      if (elapsed > exam.duration_minutes * 60 * 1000) {
        throw new AppError('答题时间已超时', 'STATE_INVALID');
      }
    }
  }

  const question = await repo.getExamQuestion(questionId);
  if (!question || question.exam_id !== examId) {
    throw new AppError('题目不属于该考试', 'NOT_FOUND');
  }

  let isCorrect: boolean | null = null;
  let score: number | null = null;
  if (question.type === 'single_choice') {
    const correctOption = await repo.getCorrectOptionLabel(questionId);
    isCorrect = correctOption ? correctOption.label === answer : false;
    score = isCorrect ? question.score : 0;
  }

  const id = crypto.randomUUID();
  await engine.transaction(async (tx) => {
    await repo.upsertExamAttempt(tx, {
      id,
      userId,
      examId,
      questionId,
      answer,
      isCorrect: isCorrect !== null ? isCorrect : null,
      score,
    });
  });

  const row = await repo.getExamAttempt(userId, questionId);
  const r = row as AttemptRow;
  return {
    id: r.id,
    userId: r.user_id,
    examId: r.exam_id,
    questionId: r.question_id,
    answer: r.answer,
    isCorrect: r.is_correct !== null ? r.is_correct === 1 : null,
    score: r.score,
    submittedAt: r.submitted_at ?? '',
  };
}

/** 获取用户在某个考试中的作答记录 */
export async function getUserAttempts(userId: string, examId: string): Promise<ExamAttempt[]> {
  const repo = getToolsRepository();
  const rows = await repo.getUserAttempts(userId, examId);

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    examId: row.exam_id,
    questionId: row.question_id,
    answer: row.answer,
    isCorrect: row.is_correct !== null ? row.is_correct === 1 : null,
    score: row.score,
    submittedAt: row.submitted_at ?? '',
  }));
}

/** 获取考试排行榜 */
export async function getExamRanking(examId: string): Promise<ExamRanking[]> {
  const repo = getToolsRepository();
  const rows = await repo.getExamRanking(examId);

  return rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    email: r.email,
    totalScore: r.total_score,
    totalQuestions: r.total_questions,
    correctCount: r.correct_count,
    submittedAt: r.submitted_at ?? '',
  }));
}