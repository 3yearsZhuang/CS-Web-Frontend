/**
 * @file exam.schema.ts — 考试模块 Drizzle schema 定义（exams / questions / options / attempts）
 */
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import {
  pgTable,
  text as pgText,
  integer as pgInteger,
  timestamp,
  index as pgIndex,
  uniqueIndex as pgUniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const examsSqlite = sqliteTable(
  'exams',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('draft'),
    startTime: text('start_time'),
    endTime: text('end_time'),
    durationMinutes: integer('duration_minutes'),
    techTags: text('tech_tags'),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    statusIdx: index('idx_exams_status').on(table.status),
    startTimeIdx: index('idx_exams_start_time').on(table.startTime),
  }),
);

export const examsPg = pgTable(
  'exams',
  {
    id: pgText('id').primaryKey(),
    title: pgText('title').notNull(),
    description: pgText('description'),
    status: pgText('status').notNull().default('draft'),
    startTime: timestamp('start_time', { withTimezone: true }),
    endTime: timestamp('end_time', { withTimezone: true }),
    durationMinutes: pgInteger('duration_minutes'),
    techTags: pgText('tech_tags'),
    createdBy: pgText('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    statusIdx: pgIndex('idx_exams_status').on(table.status),
    startTimeIdx: pgIndex('idx_exams_start_time').on(table.startTime),
  }),
);

export const examQuestionsSqlite = sqliteTable(
  'exam_questions',
  {
    id: text('id').primaryKey(),
    examId: text('exam_id').notNull(),
    type: text('type').notNull().default('single_choice'),
    title: text('title').notNull(),
    contentMarkdown: text('content_markdown'),
    score: integer('score').notNull().default(5),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    examIdIdx: index('idx_exam_questions_exam_id').on(table.examId),
    sortOrderIdx: index('idx_exam_questions_sort_order').on(table.sortOrder),
  }),
);

export const examQuestionsPg = pgTable(
  'exam_questions',
  {
    id: pgText('id').primaryKey(),
    examId: pgText('exam_id').notNull(),
    type: pgText('type').notNull().default('single_choice'),
    title: pgText('title').notNull(),
    contentMarkdown: pgText('content_markdown'),
    score: pgInteger('score').notNull().default(5),
    sortOrder: pgInteger('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    examIdIdx: pgIndex('idx_exam_questions_exam_id').on(table.examId),
    sortOrderIdx: pgIndex('idx_exam_questions_sort_order').on(table.sortOrder),
  }),
);

export const examQuestionOptionsSqlite = sqliteTable(
  'exam_question_options',
  {
    id: text('id').primaryKey(),
    questionId: text('question_id').notNull(),
    label: text('label').notNull(),
    content: text('content').notNull(),
    isCorrect: integer('is_correct').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => ({
    questionIdIdx: index('idx_exam_question_options_question_id').on(table.questionId),
  }),
);

export const examQuestionOptionsPg = pgTable(
  'exam_question_options',
  {
    id: pgText('id').primaryKey(),
    questionId: pgText('question_id').notNull(),
    label: pgText('label').notNull(),
    content: pgText('content').notNull(),
    isCorrect: pgInteger('is_correct').notNull().default(0),
    sortOrder: pgInteger('sort_order').notNull().default(0),
  },
  (table) => ({
    questionIdIdx: pgIndex('idx_exam_question_options_question_id').on(table.questionId),
  }),
);

// isCorrect / score 为 NULL 表示未批改（编程题待人工批改）
export const examAttemptsSqlite = sqliteTable(
  'exam_attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    examId: text('exam_id').notNull(),
    questionId: text('question_id').notNull(),
    answer: text('answer'),
    isCorrect: integer('is_correct'),
    score: integer('score'),
    submittedAt: text('submitted_at').default(sql`datetime('now')`),
  },
  (table) => ({
    userIdIdx: index('idx_exam_attempts_user_id').on(table.userId),
    examIdIdx: index('idx_exam_attempts_exam_id').on(table.examId),
    questionIdIdx: index('idx_exam_attempts_question_id').on(table.questionId),
    // UNIQUE(user_id, question_id) — 每道题每人只能答一次
    userQuestionUniqueIdx: uniqueIndex('idx_exam_attempts_unique').on(
      table.userId,
      table.questionId,
    ),
  }),
);

export const examAttemptsPg = pgTable(
  'exam_attempts',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id').notNull(),
    examId: pgText('exam_id').notNull(),
    questionId: pgText('question_id').notNull(),
    answer: pgText('answer'),
    isCorrect: pgInteger('is_correct'),
    score: pgInteger('score'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: pgIndex('idx_exam_attempts_user_id').on(table.userId),
    examIdIdx: pgIndex('idx_exam_attempts_exam_id').on(table.examId),
    questionIdIdx: pgIndex('idx_exam_attempts_question_id').on(table.questionId),
    userQuestionUniqueIdx: pgUniqueIndex('idx_exam_attempts_unique').on(
      table.userId,
      table.questionId,
    ),
  }),
);

export interface ExamSchemaSet {
  exams: typeof examsSqlite | typeof examsPg;
  examQuestions: typeof examQuestionsSqlite | typeof examQuestionsPg;
  examQuestionOptions: typeof examQuestionOptionsSqlite | typeof examQuestionOptionsPg;
  examAttempts: typeof examAttemptsSqlite | typeof examAttemptsPg;
}

export function getExamSchema(): ExamSchemaSet {
  if (process.env.DATABASE_PROVIDER === 'pg') {
    return {
      exams: examsPg,
      examQuestions: examQuestionsPg,
      examQuestionOptions: examQuestionOptionsPg,
      examAttempts: examAttemptsPg,
    };
  }
  return {
    exams: examsSqlite,
    examQuestions: examQuestionsSqlite,
    examQuestionOptions: examQuestionOptionsSqlite,
    examAttempts: examAttemptsSqlite,
  };
}
