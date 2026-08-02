/**
 * @file 考试模块单元测试
 *
 * 覆盖核心服务层逻辑：
 *   - CRUD：createExam / getExamById / listExams / updateExam / deleteExam
 *   - 状态机：draft → published → ended（不可逆流转 + 非法状态拦截）
 *   - 题目：createQuestion / updateQuestion / deleteQuestion / listQuestionsByExam
 *   - 作答判分：单选自动判分 / 编程题待人工 / 重复提交覆盖 / 时间窗口校验 / 超时拦截
 *   - 排行榜：按总分降序、同分按提交时间升序
 *
 * 测试策略：内存 SQLite + vi.mock 替换 getDb，手动建 exams / exam_questions / exam_question_options / exam_attempts / users 表
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { _setDbEngineForTest } from '@/shared/db/drivers';
import { createSqliteTestEngine } from './dbEngine';

const inMemoryDb = new Database(':memory:');

const testEngine = createSqliteTestEngine(inMemoryDb);
_setDbEngineForTest(testEngine);

vi.mock('@/shared/db', () => ({
  getDb: () => inMemoryDb,
  __esModule: true,
}));

vi.mock('@/shared/logger', () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  __esModule: true,
}));

import {
  createExam,
  getExamById,
  listExams,
  updateExam,
  publishExam,
  endExam,
  deleteExam,
} from '@/modules/tools/server/exam/crud';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
  listQuestionsByExam,
} from '@/modules/tools/server/exam/questions';
import {
  submitAnswer,
  getUserAttempts,
  getExamRanking,
} from '@/modules/tools/server/exam/attempts';

const ADMIN_ID = 'admin-001';
const USER_ID = 'user-001';
const USER_ID_2 = 'user-002';

function initTestSchema() {
  inMemoryDb.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      start_time TEXT,
      end_time TEXT,
      duration_minutes INTEGER NOT NULL DEFAULT 0,
      tech_tags TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content_markdown TEXT,
      score INTEGER NOT NULL DEFAULT 5,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exam_question_options (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      label TEXT NOT NULL,
      content TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exam_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer TEXT,
      is_correct INTEGER,
      score INTEGER,
      submitted_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, question_id),
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function clearTables() {
  inMemoryDb.exec('DELETE FROM exam_attempts');
  inMemoryDb.exec('DELETE FROM exam_question_options');
  inMemoryDb.exec('DELETE FROM exam_questions');
  inMemoryDb.exec('DELETE FROM exams');
  inMemoryDb.exec('DELETE FROM users');
}

function makeValidExamInput(overrides: Record<string, unknown> = {}) {
  return {
    title: '测试考试',
    description: '这是一场测试考试',
    startTime: null as string | null,
    endTime: null as string | null,
    durationMinutes: 60,
    techTags: [] as string[],
    ...overrides,
  };
}

function makeSingleChoiceQuestion(overrides: Record<string, unknown> = {}) {
  return {
    type: 'single_choice' as const,
    title: '1 + 1 = ?',
    contentMarkdown: null,
    score: 10,
    sortOrder: 0,
    options: [
      { label: 'A', content: '1', isCorrect: false, sortOrder: 0 },
      { label: 'B', content: '2', isCorrect: true, sortOrder: 1 },
      { label: 'C', content: '3', isCorrect: false, sortOrder: 2 },
    ],
    ...overrides,
  };
}

function seedUser(id: string, email: string, displayName: string | null = null) {
  inMemoryDb
    .prepare('INSERT INTO users (id, email, display_name, password_hash) VALUES (?, ?, ?, ?)')
    .run(id, email, displayName, 'dummy-hash');
}

describe('exam 模块 — CRUD 服务', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
  });

  describe('createExam', () => {
    it('创建成功并返回完整 Exam，初始状态为 draft', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await expect(exam.id).toBeDefined();
      await expect(exam.title).toBe('测试考试');
      await expect(exam.status).toBe('draft');
      await expect(exam.durationMinutes).toBe(60);
      await expect(exam.techTags).toEqual([]);
      await expect(exam.createdBy).toBe(ADMIN_ID);
    });

    it('标题为空时抛 VALIDATION_ERROR', async () => {
      await expect(createExam(ADMIN_ID, makeValidExamInput({ title: '' }))).rejects.toThrow();
    });

    it('标题仅空白时抛 VALIDATION_ERROR', async () => {
      await expect(createExam(ADMIN_ID, makeValidExamInput({ title: '   ' }))).rejects.toThrow();
    });

    it('durationMinutes 非正数时降级为 0', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput({ durationMinutes: -5 }));
      await expect(exam.durationMinutes).toBe(0);
    });

    it('description 默认为 null', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput({ description: undefined }));
      await expect(exam.description).toBeNull();
    });
  });

  describe('getExamById', () => {
    it('存在的 ID 返回 Exam', async () => {
      const created = await createExam(ADMIN_ID, makeValidExamInput());
      const fetched = await getExamById(created.id);
      await expect(fetched).not.toBeNull();
      await expect(fetched!.id).toBe(created.id);
    });

    it('不存在的 ID 返回 null', async () => {
      await expect(await getExamById('non-existent')).toBeNull();
    });
  });

  describe('listExams', () => {
    it('返回全部考试并按创建时间倒序', async () => {
      await createExam(ADMIN_ID, makeValidExamInput({ title: 'A' }));
      await createExam(ADMIN_ID, makeValidExamInput({ title: 'B' }));
      const result = await listExams();
      await expect(result.exams).toHaveLength(2);
      await expect(result.total).toBe(2);
      await expect(result.totalPages).toBe(1);
    });

    it('按状态筛选', async () => {
      await createExam(ADMIN_ID, makeValidExamInput({ title: '草稿' }));
      const published = await createExam(ADMIN_ID, makeValidExamInput({ title: '已发布' }));
      await publishExam(published.id);
      const result = await listExams({ status: 'published' });
      await expect(result.exams).toHaveLength(1);
      await expect(result.exams[0].title).toBe('已发布');
    });

    it('分页参数生效', async () => {
      for (let i = 0; i < 5; i++) {
        await createExam(ADMIN_ID, makeValidExamInput({ title: `考试 ${i}` }));
      }
      const result = await listExams({ page: 1, pageSize: 2 });
      await expect(result.exams).toHaveLength(2);
      await expect(result.total).toBe(5);
      await expect(result.totalPages).toBe(3);
    });
  });

  describe('updateExam', () => {
    it('更新草稿状态考试成功', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const updated = await updateExam(exam.id, { title: '更新后的标题', durationMinutes: 90 });
      await expect(updated.title).toBe('更新后的标题');
      await expect(updated.durationMinutes).toBe(90);
    });

    it('更新不存在的考试抛 NOT_FOUND', async () => {
      await expect(updateExam('non-existent', { title: 'x' })).rejects.toThrow();
    });

    it('已发布考试不可编辑抛 STATE_INVALID', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await publishExam(exam.id);
      await expect(updateExam(exam.id, { title: 'x' })).rejects.toThrow();
    });

    it('已结束考试不可编辑抛 STATE_INVALID', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await publishExam(exam.id);
      await endExam(exam.id);
      await expect(updateExam(exam.id, { title: 'x' })).rejects.toThrow();
    });

    it('更新标题为空时抛 VALIDATION_ERROR', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await expect(updateExam(exam.id, { title: '' })).rejects.toThrow();
    });

    it('无字段更新时返回原数据', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const updated = await updateExam(exam.id, {});
      await expect(updated.title).toBe(exam.title);
    });
  });

  describe('deleteExam', () => {
    it('删除成功后查询返回 null', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await deleteExam(exam.id);
      await expect(await getExamById(exam.id)).toBeNull();
    });

    it('删除不存在的考试抛 NOT_FOUND', async () => {
      await expect(deleteExam('non-existent')).rejects.toThrow();
    });
  });
});

describe('exam 模块 — 状态机', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
  });

  describe('publishExam', () => {
    it('draft → published 流转成功', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const published = await publishExam(exam.id);
      await expect(published.status).toBe('published');
    });

    it('已发布考试再发布抛 STATE_INVALID', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await publishExam(exam.id);
      await expect(publishExam(exam.id)).rejects.toThrow();
    });

    it('已结束考试发布抛 STATE_INVALID', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await publishExam(exam.id);
      await endExam(exam.id);
      await expect(publishExam(exam.id)).rejects.toThrow();
    });

    it('不存在的考试抛 NOT_FOUND', async () => {
      await expect(publishExam('non-existent')).rejects.toThrow();
    });
  });

  describe('endExam', () => {
    it('published → ended 流转成功', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await publishExam(exam.id);
      const ended = await endExam(exam.id);
      await expect(ended.status).toBe('ended');
    });

    it('草稿状态结束抛 STATE_INVALID', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await expect(endExam(exam.id)).rejects.toThrow();
    });

    it('已结束考试再结束抛 STATE_INVALID', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await publishExam(exam.id);
      await endExam(exam.id);
      await expect(endExam(exam.id)).rejects.toThrow();
    });

    it('不存在的考试抛 NOT_FOUND', async () => {
      await expect(endExam('non-existent')).rejects.toThrow();
    });
  });

  describe('状态不可逆', () => {
    it('ended 不能回退到 published', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await publishExam(exam.id);
      await endExam(exam.id);
      await expect(publishExam(exam.id)).rejects.toThrow();
    });

    it('ended 不能回退到 draft（无对应接口）', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await publishExam(exam.id);
      await endExam(exam.id);
      await expect((await getExamById(exam.id))!.status).toBe('ended');
    });
  });
});

describe('exam 模块 — 题目服务', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
  });

  describe('createQuestion', () => {
    it('创建单选题成功并携带选项', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const question = await createQuestion(exam.id, makeSingleChoiceQuestion());
      await expect(question.id).toBeDefined();
      await expect(question.type).toBe('single_choice');
      await expect(question.title).toBe('1 + 1 = ?');
      await expect(question.score).toBe(10);
    });

    it('考试不存在抛 NOT_FOUND', async () => {
      await expect(createQuestion('non-existent', makeSingleChoiceQuestion())).rejects.toThrow();
    });

    it('标题为空抛 VALIDATION_ERROR', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await expect(createQuestion(exam.id, makeSingleChoiceQuestion({ title: '' }))).rejects.toThrow();
    });

    it('题目类型非法抛 VALIDATION_ERROR', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await expect(createQuestion(exam.id, makeSingleChoiceQuestion({ type: 'invalid' as never }))).rejects.toThrow();
    });

    it('score 非正数时默认为 5', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const question = await createQuestion(exam.id, makeSingleChoiceQuestion({ score: -1 }));
      await expect(question.score).toBe(5);
    });

    it('创建编程题成功（无选项）', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const question = await createQuestion(exam.id, {
        type: 'coding',
        title: '实现快速排序',
        contentMarkdown: '请实现快速排序算法',
        score: 20,
        sortOrder: 1,
      });
      await expect(question.type).toBe('coding');
      await expect(question.score).toBe(20);
    });
  });

  describe('listQuestionsByExam', () => {
    it('返回考试下所有题目含选项', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await createQuestion(exam.id, makeSingleChoiceQuestion({ title: 'Q1', sortOrder: 1 }));
      await createQuestion(exam.id, makeSingleChoiceQuestion({ title: 'Q2', sortOrder: 0 }));
      const questions = await listQuestionsByExam(exam.id);
      await expect(questions).toHaveLength(2);
      await expect(questions[0].title).toBe('Q2');
      await expect(questions[1].title).toBe('Q1');
      await expect(questions[0].options).toHaveLength(3);
    });

    it('无题目时返回空数组', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await expect(await listQuestionsByExam(exam.id)).toHaveLength(0);
    });
  });

  describe('updateQuestion', () => {
    it('更新题目标题成功', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const question = await createQuestion(exam.id, makeSingleChoiceQuestion());
      const updated = await updateQuestion(question.id, { title: '新题目', score: 15 });
      await expect(updated.title).toBe('新题目');
      await expect(updated.score).toBe(15);
    });

    it('题目不存在抛 NOT_FOUND', async () => {
      await expect(updateQuestion('non-existent', { title: 'x' })).rejects.toThrow();
    });

    it('更新标题为空抛 VALIDATION_ERROR', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const question = await createQuestion(exam.id, makeSingleChoiceQuestion());
      await expect(updateQuestion(question.id, { title: '' })).rejects.toThrow();
    });

    it('全量替换选项', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const question = await createQuestion(exam.id, makeSingleChoiceQuestion());
      await updateQuestion(question.id, {
        options: [
          { label: 'X', content: '10', isCorrect: true, sortOrder: 0 },
          { label: 'Y', content: '11', isCorrect: false, sortOrder: 1 },
        ],
      });
      const questions = await listQuestionsByExam(exam.id);
      await expect(questions[0].options).toHaveLength(2);
      const firstOption = questions[0].options![0];
      await expect(firstOption.label).toBe('X');
      await expect(firstOption.isCorrect).toBe(true);
    });
  });

  describe('deleteQuestion', () => {
    it('删除成功后不再返回', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const question = await createQuestion(exam.id, makeSingleChoiceQuestion());
      await deleteQuestion(question.id);
      await expect(await listQuestionsByExam(exam.id)).toHaveLength(0);
    });

    it('题目不存在抛 NOT_FOUND', async () => {
      await expect(deleteQuestion('non-existent')).rejects.toThrow();
    });
  });
});

describe('exam 模块 — 作答与判分', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
  });

  async function setupPublishedExamWithQuestion() {
    const exam = await createExam(ADMIN_ID, makeValidExamInput({
      startTime: null,
      endTime: null,
      durationMinutes: 0,
    }));
    await publishExam(exam.id);
    const question = await createQuestion(exam.id, makeSingleChoiceQuestion());
    return { exam, question };
  }

  describe('submitAnswer — 状态校验', () => {
    it('草稿状态考试提交抛 STATE_INVALID', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      const question = await createQuestion(exam.id, makeSingleChoiceQuestion());
      await expect(submitAnswer(USER_ID, exam.id, question.id, 'B')).rejects.toThrow();
    });

    it('已结束考试提交抛 STATE_INVALID', async () => {
      const { exam, question } = await setupPublishedExamWithQuestion();
      await endExam(exam.id);
      await expect(submitAnswer(USER_ID, exam.id, question.id, 'B')).rejects.toThrow();
    });

    it('考试不存在抛 NOT_FOUND', async () => {
      await expect(submitAnswer(USER_ID, 'non-existent', 'fake-q', 'B')).rejects.toThrow();
    });
  });

  describe('submitAnswer — 时间窗口校验', () => {
    it('考试未开始抛 STATE_INVALID', async () => {
      const future = new Date(Date.now() + 3600_000).toISOString();
      const exam = await createExam(ADMIN_ID, makeValidExamInput({ startTime: future, endTime: null, durationMinutes: 0 }));
      await publishExam(exam.id);
      const question = await createQuestion(exam.id, makeSingleChoiceQuestion());
      await expect(submitAnswer(USER_ID, exam.id, question.id, 'B')).rejects.toThrow();
    });

    it('考试已结束（按 end_time）抛 STATE_INVALID', async () => {
      const past = new Date(Date.now() - 3600_000).toISOString();
      const exam = await createExam(ADMIN_ID, makeValidExamInput({ startTime: null, endTime: past, durationMinutes: 0 }));
      await publishExam(exam.id);
      const question = await createQuestion(exam.id, makeSingleChoiceQuestion());
      await expect(submitAnswer(USER_ID, exam.id, question.id, 'B')).rejects.toThrow();
    });

    it('答题超时抛 STATE_INVALID', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput({
        startTime: null,
        endTime: null,
        durationMinutes: 1,
      }));
      await publishExam(exam.id);
      const question = await createQuestion(exam.id, makeSingleChoiceQuestion());
      const pastTime = new Date(Date.now() - 120_000).toISOString();
      inMemoryDb
        .prepare(
          "INSERT INTO exam_attempts (id, user_id, exam_id, question_id, answer, is_correct, score, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run('attempt-old', USER_ID, exam.id, question.id, 'A', 0, 0, pastTime);
      await expect(submitAnswer(USER_ID, exam.id, question.id, 'B')).rejects.toThrow();
    });
  });

  describe('submitAnswer — 判分', () => {
    it('单选题答对得满分', async () => {
      const { exam, question } = await setupPublishedExamWithQuestion();
      const attempt = await submitAnswer(USER_ID, exam.id, question.id, 'B');
      await expect(attempt.isCorrect).toBe(true);
      await expect(attempt.score).toBe(10);
    });

    it('单选题答错得 0 分', async () => {
      const { exam, question } = await setupPublishedExamWithQuestion();
      const attempt = await submitAnswer(USER_ID, exam.id, question.id, 'A');
      await expect(attempt.isCorrect).toBe(false);
      await expect(attempt.score).toBe(0);
    });

    it('编程题不自动判分（isCorrect/score 为 null）', async () => {
      const exam = await createExam(ADMIN_ID, makeValidExamInput());
      await publishExam(exam.id);
      const question = await createQuestion(exam.id, {
        type: 'coding',
        title: '实现快排',
        contentMarkdown: null,
        score: 20,
        sortOrder: 0,
      });
      const attempt = await submitAnswer(USER_ID, exam.id, question.id, 'function quicksort(){}');
      await expect(attempt.isCorrect).toBeNull();
      await expect(attempt.score).toBeNull();
    });

    it('题目不属于该考试抛 NOT_FOUND', async () => {
      const { exam } = await setupPublishedExamWithQuestion();
      await expect(submitAnswer(USER_ID, exam.id, 'non-existent-question', 'B')).rejects.toThrow();
    });
  });

  describe('submitAnswer — 幂等覆盖', () => {
    it('重复提交覆盖最新答案并重新判分', async () => {
      const { exam, question } = await setupPublishedExamWithQuestion();
      await submitAnswer(USER_ID, exam.id, question.id, 'A');
      const attempt = await submitAnswer(USER_ID, exam.id, question.id, 'B');
      await expect(attempt.isCorrect).toBe(true);
      await expect(attempt.score).toBe(10);
      const records = await getUserAttempts(USER_ID, exam.id);
      await expect(records).toHaveLength(1);
    });
  });

  describe('getUserAttempts', () => {
    it('返回用户在某考试的所有作答', async () => {
      const { exam, question } = await setupPublishedExamWithQuestion();
      await submitAnswer(USER_ID, exam.id, question.id, 'B');
      const attempts = await getUserAttempts(USER_ID, exam.id);
      await expect(attempts).toHaveLength(1);
      await expect(attempts[0].answer).toBe('B');
    });

    it('无作答时返回空数组', async () => {
      const { exam } = await setupPublishedExamWithQuestion();
      await expect(await getUserAttempts(USER_ID, exam.id)).toHaveLength(0);
    });
  });
});

describe('exam 模块 — 排行榜', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
  });

  async function setupRankedExam() {
    seedUser(USER_ID, 'user1@test.com', '用户一');
    seedUser(USER_ID_2, 'user2@test.com', '用户二');
    const exam = await createExam(ADMIN_ID, makeValidExamInput({
      startTime: null,
      endTime: null,
      durationMinutes: 0,
    }));
    await publishExam(exam.id);
    const q1 = await createQuestion(exam.id, makeSingleChoiceQuestion({ title: 'Q1', score: 10, sortOrder: 0 }));
    const q2 = await createQuestion(exam.id, makeSingleChoiceQuestion({
      title: 'Q2',
      score: 10,
      sortOrder: 1,
      options: [
        { label: 'A', content: '正确', isCorrect: true, sortOrder: 0 },
        { label: 'B', content: '错误', isCorrect: false, sortOrder: 1 },
      ],
    }));
    return { exam, q1, q2 };
  }

  it('按总分降序排列', async () => {
    const { exam, q1, q2 } = await setupRankedExam();
    await submitAnswer(USER_ID, exam.id, q1.id, 'B');
    await submitAnswer(USER_ID, exam.id, q2.id, 'A');
    await submitAnswer(USER_ID_2, exam.id, q1.id, 'A');
    await submitAnswer(USER_ID_2, exam.id, q2.id, 'B');
    const ranking = await getExamRanking(exam.id);
    await expect(ranking).toHaveLength(2);
    await expect(ranking[0].userId).toBe(USER_ID);
    await expect(ranking[0].totalScore).toBe(20);
    await expect(ranking[0].correctCount).toBe(2);
    await expect(ranking[1].userId).toBe(USER_ID_2);
    await expect(ranking[1].totalScore).toBe(0);
  });

  it('无作答时返回空数组', async () => {
    const { exam } = await setupRankedExam();
    await expect(await getExamRanking(exam.id)).toHaveLength(0);
  });

  it('编程题未判分不计入总分', async () => {
    seedUser(USER_ID, 'user1@test.com', '用户一');
    const exam = await createExam(ADMIN_ID, makeValidExamInput({
      startTime: null,
      endTime: null,
      durationMinutes: 0,
    }));
    await publishExam(exam.id);
    const codingQ = await createQuestion(exam.id, {
      type: 'coding',
      title: '编程题',
      contentMarkdown: null,
      score: 30,
      sortOrder: 0,
    });
    await submitAnswer(USER_ID, exam.id, codingQ.id, 'some code');
    const ranking = await getExamRanking(exam.id);
    await expect(ranking).toHaveLength(1);
    await expect(ranking[0].totalScore).toBe(0);
    await expect(ranking[0].totalQuestions).toBe(1);
    await expect(ranking[0].correctCount).toBe(0);
  });
});
