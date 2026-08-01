/**
 * @file 考试模块 schema 初始化
 *
 * 包含考试、题目、选项、答题记录表。
 *
 * 拆分自 src/shared/db/sqlite-init.ts 的 initSchema 中考试模块部分。
 */
import type { Database as DB } from 'better-sqlite3';

/**
 * 初始化考试模块表结构（幂等，使用 CREATE TABLE IF NOT EXISTS）
 *
 * - exams：考试表，一次考试包含多道题目，有时间窗口和防作弊规则
 * - exam_questions：题目表，支持单选和编程两种类型
 * - exam_question_options：选项表，选择题的选项（编程题无选项）
 * - exam_attempts：答题记录表，每次答题提交一道题的答案
 */
export function initExamSchema(db: DB): void {
  db.exec(`
    -- ============= 考试系统（5 张表） =============

    -- 考试表：一次考试包含多道题目，有时间窗口和防作弊规则
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'published' | 'ended'
      start_time TEXT,            -- 考试开始时间（ISO 8601）
      end_time TEXT,              -- 考试结束时间（ISO 8601）
      duration_minutes INTEGER,   -- 答题时长限制（分钟，0 表示不限）
      tech_tags TEXT,             -- 关联技术标签（JSON 数组）
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 题目表：每道题属于一场考试，支持单选和编程两种类型
    CREATE TABLE IF NOT EXISTS exam_questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'single_choice', -- 'single_choice' | 'coding'
      title TEXT NOT NULL,        -- 题目标题
      content_markdown TEXT,      -- 题目描述（Markdown，编程题必填）
      score INTEGER NOT NULL DEFAULT 5,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    -- 选项表：选择题的选项（编程题无选项）
    CREATE TABLE IF NOT EXISTS exam_question_options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      label TEXT NOT NULL,        -- A / B / C / D
      content TEXT NOT NULL,      -- 选项内容
      is_correct INTEGER NOT NULL DEFAULT 0, -- 1 = 正确答案
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
    );

    -- 答题记录表：每次答题提交一道题的答案
    CREATE TABLE IF NOT EXISTS exam_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer TEXT,                -- 用户答案（选择题存 label，编程题存代码文本）
      is_correct INTEGER,         -- 是否正确（NULL = 未批改/编程题待批改）
      score INTEGER,              -- 得分（NULL = 未批改）
      submitted_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE,
      UNIQUE(user_id, question_id)
    );

    CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
    CREATE INDEX IF NOT EXISTS idx_exams_start_time ON exams(start_time);
    CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
    CREATE INDEX IF NOT EXISTS idx_exam_questions_sort_order ON exam_questions(sort_order);
    CREATE INDEX IF NOT EXISTS idx_exam_question_options_question_id ON exam_question_options(question_id);
    CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON exam_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id);
    CREATE INDEX IF NOT EXISTS idx_exam_attempts_question_id ON exam_attempts(question_id);
  `);
}
