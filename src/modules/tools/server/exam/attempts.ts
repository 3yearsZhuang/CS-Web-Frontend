/**
 * @file 考试作答服务
 */

import crypto from 'node:crypto';
import { AppError } from '@/shared/app-error';
import { getDb } from '@/shared/db';
import {
  type ExamAttempt,
  type ExamRanking,
  type AttemptRow,
} from '../../types';

/** 提交考试答案 */
export function submitAnswer(userId: string, examId: string, questionId: string, answer: string): ExamAttempt {
  const db = getDb();

  const exam = db.prepare('SELECT id, status, start_time, end_time, duration_minutes FROM exams WHERE id = ?').get(examId) as
    | { id: string; status: string; start_time: string | null; end_time: string | null; duration_minutes: number }
    | undefined;
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
    const firstAttempt = db.prepare(
      "SELECT MIN(submitted_at) as first_at FROM exam_attempts WHERE user_id = ? AND exam_id = ?",
    ).get(userId, examId) as { first_at: string | null } | undefined;
    if (firstAttempt?.first_at) {
      const elapsed = now.getTime() - new Date(firstAttempt.first_at).getTime();
      if (elapsed > exam.duration_minutes * 60 * 1000) {
        throw new AppError('答题时间已超时', 'STATE_INVALID');
      }
    }
  }

  const question = db.prepare('SELECT type, score FROM exam_questions WHERE id = ? AND exam_id = ?').get(questionId, examId) as
    | { type: string; score: number }
    | undefined;
  if (!question) {
    throw new AppError('题目不属于该考试', 'NOT_FOUND');
  }

  let isCorrect: boolean | null = null;
  let score: number | null = null;
  if (question.type === 'single_choice') {
    const correctOption = db.prepare(
      'SELECT label FROM exam_question_options WHERE question_id = ? AND is_correct = 1',
    ).get(questionId) as { label: string } | undefined;
    isCorrect = correctOption ? correctOption.label === answer : false;
    score = isCorrect ? question.score : 0;
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO exam_attempts (id, user_id, exam_id, question_id, answer, is_correct, score)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, question_id) DO UPDATE SET answer = excluded.answer, is_correct = excluded.is_correct, score = excluded.score, submitted_at = excluded.submitted_at`,
  ).run(id, userId, examId, questionId, answer, isCorrect !== null ? (isCorrect ? 1 : 0) : null, score);

  const row = db.prepare(
    'SELECT * FROM exam_attempts WHERE user_id = ? AND question_id = ?',
  ).get(userId, questionId) as AttemptRow;
  return {
    id: row.id,
    userId: row.user_id,
    examId: row.exam_id,
    questionId: row.question_id,
    answer: row.answer,
    isCorrect: row.is_correct !== null ? row.is_correct === 1 : null,
    score: row.score,
    submittedAt: row.submitted_at,
  };
}

/** 获取用户在某个考试中的作答记录 */
export function getUserAttempts(userId: string, examId: string): ExamAttempt[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM exam_attempts WHERE user_id = ? AND exam_id = ? ORDER BY submitted_at ASC',
  ).all(userId, examId) as AttemptRow[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    examId: row.exam_id,
    questionId: row.question_id,
    answer: row.answer,
    isCorrect: row.is_correct !== null ? row.is_correct === 1 : null,
    score: row.score,
    submittedAt: row.submitted_at,
  }));
}

/** 获取考试排行榜 */
export function getExamRanking(examId: string): ExamRanking[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT
      u.id AS user_id,
      u.display_name,
      u.email,
      COALESCE(SUM(ea.score), 0) AS total_score,
      COUNT(ea.id) AS total_questions,
      COALESCE(SUM(CASE WHEN ea.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct_count,
      MAX(ea.submitted_at) AS submitted_at
    FROM exam_attempts ea
    JOIN users u ON ea.user_id = u.id
    WHERE ea.exam_id = ?
    GROUP BY u.id
    ORDER BY total_score DESC, submitted_at ASC
  `).all(examId) as Array<{
    user_id: string;
    display_name: string | null;
    email: string;
    total_score: number;
    total_questions: number;
    correct_count: number;
    submitted_at: string | null;
  }>;

  return rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    email: r.email,
    totalScore: r.total_score,
    totalQuestions: r.total_questions,
    correctCount: r.correct_count,
    submittedAt: r.submitted_at,
  }));
}