/**
 * @file 工具模块 Repository（ADR-009）
 *
 * 覆盖表：points_transactions / exams / exam_questions / exam_attempts /
 *        resources / resource_reviews / components / component_registry /
 *        tasks / task_claims
 *
 * 约定：每个方法以 `eng?: DbEngine` 收尾；事务内显式传入 tx。
 * SQLite 专属函数（datetime('now')/json）保留在 SQL 文本中（PG 实现留待 Phase 4）。
 */
import type { DbEngine, QueryRow, QueryParams } from '@/shared/db/drivers';
import { getDbEngine } from '@/shared/db/drivers';
import { resolveEngine } from './base';

type QueryParam = string | number | null;

export interface PointsTransactionRow {
  [key: string]: unknown;
  id: string;
  user_id: string;
  amount: number;
  reason: string;
  source_type: string;
  source_id: string | null;
  balance_after: number;
  created_at: string;
}

export interface ExamRow {
  [key: string]: unknown;
  id: string;
  title: string;
  description: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  tech_tags: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExamQuestionRow {
  [key: string]: unknown;
  id: string;
  exam_id: string;
  type: string;
  title: string;
  content_markdown: string | null;
  score: number;
  sort_order: number;
  created_at: string;
}

export interface ExamQuestionOptionRow {
  [key: string]: unknown;
  id: string;
  question_id: string;
  label: string;
  content: string;
  is_correct: number;
  sort_order: number;
}

export interface ExamAttemptRow {
  [key: string]: unknown;
  id: string;
  user_id: string;
  exam_id: string;
  question_id: string;
  answer: string;
  is_correct: number | null;
  score: number | null;
  submitted_at: string | null;
}

export interface ResourceRow {
  [key: string]: unknown;
  id: string;
  title: string;
  url: string;
  description: string | null;
  resource_type: string;
  tech_tags: string | null;
  file_url: string | null;
  submitted_by: string;
  reviewed_by: string | null;
  review_note: string | null;
  like_count: number;
  view_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceWithAuthorRow {
  [key: string]: unknown;
  id: string;
  title: string;
  url: string;
  description: string | null;
  resource_type: string;
  tech_tags: string | null;
  file_url: string | null;
  submitted_by: string;
  reviewed_by: string | null;
  review_note: string | null;
  like_count: number;
  view_count: number;
  status: string;
  created_at: string;
  updated_at: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_tech_tags: string | null;
  reviewer_display_name: string | null;
}

export interface ResourceReviewRow {
  [key: string]: unknown;
  id: string;
  resource_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface ComponentItemRow {
  [key: string]: unknown;
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string | null;
  migration_status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ComponentVariantRow {
  [key: string]: unknown;
  id: string;
  item_id: string;
  size: string;
  color: string;
  state: string;
  is_enabled: number;
}

export interface ComponentGuideRow {
  [key: string]: unknown;
  id: string;
  item_id: string;
  use_cases: string;
  anti_patterns: string;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  [key: string]: unknown;
  id: string;
  title: string;
  description: string;
  content_markdown: string | null;
  category: string;
  tags: string;
  points: number;
  max_claimants: number;
  status: string;
  created_by: string;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskClaimRow {
  [key: string]: unknown;
  id: string;
  task_id: string;
  user_id: string;
  status: string;
  claim_note: string | null;
  completed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
}

export interface ToolsRepository {
  // ----- points -----
  getPointsBalanceAfter(userId: string, eng?: DbEngine): Promise<number>;
  getPointTransactions(
    userId: string,
    opts?: { limit?: number; offset?: number },
    eng?: DbEngine,
  ): Promise<PointsTransactionRow[]>;
  insertPointTransaction(
    tx: DbEngine,
    id: string,
    userId: string,
    amount: number,
    reason: string,
    sourceType: string,
    sourceId: string | null,
    balanceAfter: number,
  ): Promise<void>;
  getPointStats(eng?: DbEngine): Promise<Array<{ user_id: string; balance: number }>>;
  listLeaderboard(
    topN: number,
    eng?: DbEngine,
  ): Promise<Array<{ user_id: string; balance: number; display_name: string | null }>>;

  // ----- exam -----
  insertExam(
    tx: DbEngine,
    id: string,
    exam: { title: string; description: string | null; status: string; startTime: string | null; endTime: string | null; durationMinutes: number; techTags: string | null; createdBy: string },
  ): Promise<void>;
  getExamById(examId: string, eng?: DbEngine): Promise<ExamRow | null>;
  updateExam(examId: string, fields: Partial<ExamRow>, eng?: DbEngine): Promise<void>;
  setExamStatus(examId: string, status: string, eng?: DbEngine): Promise<void>;
  deleteExam(examId: string, eng?: DbEngine): Promise<void>;
  countExams(where: string, params: QueryParams, eng?: DbEngine): Promise<number>;
  listExams(where: string, params: QueryParams, eng?: DbEngine): Promise<ExamRow[]>;
  insertExamQuestion(
    tx: DbEngine,
    q: { id: string; examId: string; type: string; title: string; contentMarkdown: string | null; score: number; sortOrder: number },
  ): Promise<void>;
  getExamQuestions(examId: string, eng?: DbEngine): Promise<ExamQuestionRow[]>;
  getExamQuestion(questionId: string, eng?: DbEngine): Promise<ExamQuestionRow | null>;
  insertExamQuestionOption(
    tx: DbEngine,
    opt: { id: string; questionId: string; label: string; content: string; isCorrect: boolean; sortOrder: number },
  ): Promise<void>;
  getExamQuestionOptions(questionIds: string[], eng?: DbEngine): Promise<ExamQuestionOptionRow[]>;
  updateExamQuestion(questionId: string, fields: Partial<ExamQuestionRow>, eng?: DbEngine): Promise<void>;
  deleteExamQuestionOptions(questionId: string, eng?: DbEngine): Promise<void>;
  deleteExamQuestion(questionId: string, eng?: DbEngine): Promise<void>;
  insertExamAttempt(
    tx: DbEngine,
    attempt: { id: string; userId: string; examId: string; questionId: string; answer: string; isCorrect: boolean | null; score: number | null },
  ): Promise<void>;
  upsertExamAttempt(
    tx: DbEngine,
    attempt: { id: string; userId: string; examId: string; questionId: string; answer: string; isCorrect: boolean | null; score: number | null },
  ): Promise<void>;
  getExamAttempt(userId: string, questionId: string, eng?: DbEngine): Promise<ExamAttemptRow | null>;
  getFirstAttemptTime(userId: string, examId: string, eng?: DbEngine): Promise<{ first_at: string | null } | null>;
  getCorrectOptionLabel(questionId: string, eng?: DbEngine): Promise<{ label: string } | null>;
  getUserAttempts(userId: string, examId: string, eng?: DbEngine): Promise<ExamAttemptRow[]>;
  getExamRanking(
    examId: string,
    eng?: DbEngine,
  ): Promise<Array<{ user_id: string; display_name: string | null; email: string; total_score: number; total_questions: number; correct_count: number; submitted_at: string | null }>>;

  // ----- resource -----
  insertResource(
    tx: DbEngine,
    res: { id: string; title: string; url: string; description: string | null; resourceType: string; techTags: string | null; fileUrl: string | null; submittedBy: string },
  ): Promise<void>;
  getResourceById(resourceId: string, eng?: DbEngine): Promise<ResourceRow | null>;
  updateResource(resourceId: string, fields: Partial<ResourceRow>, eng?: DbEngine): Promise<void>;
  deleteResource(resourceId: string, eng?: DbEngine): Promise<void>;
  incrementResourceView(resourceId: string, eng?: DbEngine): Promise<void>;
  countResources(where: string, params: QueryParams, eng?: DbEngine): Promise<number>;
  listResourcesWithAuthor(where: string, params: QueryParams, orderBy?: string, eng?: DbEngine): Promise<ResourceWithAuthorRow[]>;
  getUserResources(userId: string, status: string | null, eng?: DbEngine): Promise<ResourceRow[]>;
  countPendingResources(eng?: DbEngine): Promise<number>;
  listPendingResourcesWithAuthor(pageSize: number, offset: number, eng?: DbEngine): Promise<ResourceWithAuthorRow[]>;
  getTechTagCounts(techTag: string | null, eng?: DbEngine): Promise<Array<{ tech_tag: string; count: number }>>;

  // ----- component registry (component_registry_items / variants / guides) -----
  listComponentItems(eng?: DbEngine): Promise<ComponentItemRow[]>;
  getComponentItemBySlug(slug: string, eng?: DbEngine): Promise<ComponentItemRow | null>;
  getMaxComponentSortOrder(eng?: DbEngine): Promise<number>;
  insertComponentItem(
    tx: DbEngine,
    item: { id: string; name: string; slug: string; category: string; description: string | null; migrationStatus: string; sortOrder: number },
  ): Promise<void>;
  insertComponentVariant(
    tx: DbEngine,
    variant: { id: string; itemId: string; size: string; color: string; state: string },
  ): Promise<void>;
  insertComponentGuide(tx: DbEngine, id: string, itemId: string): Promise<void>;
  updateComponentItem(id: string, fields: Partial<ComponentItemRow>, eng?: DbEngine): Promise<void>;
  deleteComponentItem(id: string, eng?: DbEngine): Promise<void>;
  deleteComponentVariants(itemId: string, eng?: DbEngine): Promise<void>;
  deleteComponentGuides(itemId: string, eng?: DbEngine): Promise<void>;
  getComponentVariants(itemId: string, eng?: DbEngine): Promise<ComponentVariantRow[]>;
  getComponentGuide(itemId: string, eng?: DbEngine): Promise<ComponentGuideRow | null>;
  updateVariantEnabled(variantId: string, enabled: boolean, eng?: DbEngine): Promise<void>;
  upsertComponentGuide(itemId: string, useCases: string, antiPatterns: string, eng?: DbEngine): Promise<void>;

  // ----- agent (learning profile) -----
  getExamAttemptAnalysis(
    userId: string,
    eng?: DbEngine,
  ): Promise<Array<{ is_correct: number; question_title: string; exam_tags: string | null }>>;
  getExamAttemptStats(
    userId: string,
    eng?: DbEngine,
  ): Promise<{ total: number; correct: number }>;
  listPublishedResources(eng?: DbEngine): Promise<ResourceRow[]>;

  // ----- tasks -----
  insertTask(
    tx: DbEngine,
    task: { id: string; title: string; description: string; contentMarkdown: string | null; category: string; tags: string; points: number; maxClaimants: number; createdBy: string },
  ): Promise<void>;
  getTaskById(taskId: string, eng?: DbEngine): Promise<TaskRow | null>;
  updateTaskFields(taskId: string, fields: Partial<TaskRow>, eng?: DbEngine): Promise<void>;
  deleteTask(taskId: string, eng?: DbEngine): Promise<void>;
  countTasks(where: string, params: QueryParams, eng?: DbEngine): Promise<number>;
  listTasks(where: string, params: QueryParams, eng?: DbEngine): Promise<TaskRow[]>;
  getTaskClaimCount(taskId: string, statusFilter: 'active' | 'completed', eng?: DbEngine): Promise<number>;
  insertTaskClaim(tx: DbEngine, id: string, taskId: string, userId: string, note: string | null): Promise<void>;
  getTaskClaimById(claimId: string, eng?: DbEngine): Promise<TaskClaimRow | null>;
  getTaskClaim(taskId: string, userId: string, eng?: DbEngine): Promise<TaskClaimRow | null>;
  updateClaimStatus(claimId: string, status: string, eng?: DbEngine): Promise<void>;
  completeClaim(claimId: string, adminId: string, note: string | null, eng?: DbEngine): Promise<void>;
  rejectClaim(claimId: string, adminId: string, note: string | null, eng?: DbEngine): Promise<void>;
  reactivateClaim(claimId: string, note: string | null, eng?: DbEngine): Promise<void>;
  getClaimByTaskAndUser(taskId: string, userId: string, status: string, eng?: DbEngine): Promise<{ id: string } | null>;
  getUserClaims(userId: string, eng?: DbEngine): Promise<Array<TaskClaimRow & { display_name: string | null }>>;
  getTaskClaims(taskId: string, eng?: DbEngine): Promise<Array<TaskClaimRow & { display_name: string | null }>>;
  listPendingClaims(eng?: DbEngine): Promise<Array<TaskClaimRow & { display_name: string | null }>>;
}

function createToolsRepository(): ToolsRepository {
  return {
    // ----- points -----
    async getPointsBalanceAfter(userId, eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ balance_after: number | null }>(
        'SELECT balance_after FROM points_transactions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
        [userId],
      );
      return row?.balance_after ?? 0;
    },
    async getPointTransactions(userId, opts = {}, eng) {
      const e = await resolveEngine(eng);
      const limit = opts.limit ?? 50;
      const offset = opts.offset ?? 0;
      return e.query<PointsTransactionRow>(
        'SELECT * FROM points_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [userId, limit, offset],
      );
    },
    async insertPointTransaction(tx, id, userId, amount, reason, sourceType, sourceId, balanceAfter) {
      await tx.execute(
        `INSERT INTO points_transactions (id, user_id, amount, reason, source_type, source_id, balance_after)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, amount, reason, sourceType, sourceId, balanceAfter],
      );
    },
    async getPointStats(eng) {
      const e = await resolveEngine(eng);
      return e.query<{ user_id: string; balance: number }>(
        `SELECT user_id, MAX(balance_after) AS balance
         FROM points_transactions
         GROUP BY user_id`,
      );
    },
    async listLeaderboard(topN, eng) {
      const e = await resolveEngine(eng);
      return e.query<{ user_id: string; balance: number; display_name: string | null }>(
        `SELECT pt.user_id, MAX(pt.balance_after) AS balance, u.display_name
         FROM points_transactions pt
         LEFT JOIN users u ON pt.user_id = u.id
         GROUP BY pt.user_id
         ORDER BY balance DESC
         LIMIT ?`,
        [topN],
      );
    },

    // ----- exam -----
    async insertExam(tx, id, exam) {
      await tx.execute(
        `INSERT INTO exams (id, title, description, status, start_time, end_time, duration_minutes, tech_tags, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, exam.title, exam.description, exam.status, exam.startTime, exam.endTime, exam.durationMinutes, exam.techTags, exam.createdBy],
      );
    },
    async getExamById(examId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<ExamRow>('SELECT * FROM exams WHERE id = ?', [examId]);
    },
    async updateExam(examId, fields, eng) {
      const e = await resolveEngine(eng);
      const sets: string[] = [];
      const params: QueryParams = [];
      const map: Record<string, keyof ExamRow> = {
        title: 'title',
        description: 'description',
        status: 'status',
        startTime: 'start_time',
        endTime: 'end_time',
        durationMinutes: 'duration_minutes',
        techTags: 'tech_tags',
      };
      for (const [k, v] of Object.entries(fields)) {
        const col = map[k];
        if (col !== undefined) {
          sets.push(`${String(col)} = ?`);
          params.push(v as QueryParam);
        }
      }
      if (sets.length === 0) return;
      params.push(examId);
      await e.execute(`UPDATE exams SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, params);
    },
    async setExamStatus(examId, status, eng) {
      const e = await resolveEngine(eng);
      await e.execute("UPDATE exams SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, examId]);
    },
    async deleteExam(examId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM exams WHERE id = ?', [examId]);
    },
    async countExams(where, params, eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ cnt: number }>(`SELECT COUNT(*) AS cnt FROM exams ${where}`, params);
      return row?.cnt ?? 0;
    },
    async listExams(where, params, eng) {
      const e = await resolveEngine(eng);
      return e.query<ExamRow>(`SELECT * FROM exams ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, params);
    },
    async insertExamQuestion(tx, q) {
      await tx.execute(
        `INSERT INTO exam_questions (id, exam_id, type, title, content_markdown, score, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [q.id, q.examId, q.type, q.title, q.contentMarkdown, q.score, q.sortOrder],
      );
    },
    async getExamQuestions(examId, eng) {
      const e = await resolveEngine(eng);
      return e.query<ExamQuestionRow>('SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY sort_order ASC', [examId]);
    },
    async getExamQuestion(questionId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<ExamQuestionRow>('SELECT * FROM exam_questions WHERE id = ?', [questionId]);
    },
    async insertExamQuestionOption(tx, opt) {
      await tx.execute(
        `INSERT INTO exam_question_options (id, question_id, label, content, is_correct, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [opt.id, opt.questionId, opt.label, opt.content, opt.isCorrect ? 1 : 0, opt.sortOrder],
      );
    },
    async getExamQuestionOptions(questionIds, eng) {
      const e = await resolveEngine(eng);
      if (questionIds.length === 0) return [];
      const placeholders = questionIds.map(() => '?').join(',');
      return e.query<ExamQuestionOptionRow>(
        `SELECT * FROM exam_question_options WHERE question_id IN (${placeholders}) ORDER BY question_id, sort_order ASC`,
        questionIds,
      );
    },
    async updateExamQuestion(questionId, fields, eng) {
      const e = await resolveEngine(eng);
      const sets: string[] = [];
      const params: QueryParams = [];
      const map: Record<string, keyof ExamQuestionRow> = {
        type: 'type',
        title: 'title',
        contentMarkdown: 'content_markdown',
        score: 'score',
        sortOrder: 'sort_order',
      };
      for (const [k, v] of Object.entries(fields)) {
        const col = map[k];
        if (col !== undefined) {
          sets.push(`${String(col)} = ?`);
          params.push(v as QueryParam);
        }
      }
      if (sets.length === 0) return;
      params.push(questionId);
      await e.execute(`UPDATE exam_questions SET ${sets.join(', ')} WHERE id = ?`, params);
    },
    async deleteExamQuestionOptions(questionId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM exam_question_options WHERE question_id = ?', [questionId]);
    },
    async deleteExamQuestion(questionId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM exam_questions WHERE id = ?', [questionId]);
    },
    async insertExamAttempt(tx, attempt) {
      await tx.execute(
        `INSERT INTO exam_attempts (id, user_id, exam_id, question_id, answer, is_correct, score)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [attempt.id, attempt.userId, attempt.examId, attempt.questionId, attempt.answer, attempt.isCorrect, attempt.score],
      );
    },
    async upsertExamAttempt(tx, attempt) {
      await tx.execute(
        `INSERT INTO exam_attempts (id, user_id, exam_id, question_id, answer, is_correct, score)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, question_id) DO UPDATE SET
           answer = excluded.answer,
           is_correct = excluded.is_correct,
           score = excluded.score`,
        [attempt.id, attempt.userId, attempt.examId, attempt.questionId, attempt.answer, attempt.isCorrect, attempt.score],
      );
    },
    async getExamAttempt(userId, questionId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<ExamAttemptRow>('SELECT * FROM exam_attempts WHERE user_id = ? AND question_id = ?', [userId, questionId]);
    },
    async getFirstAttemptTime(userId, examId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ first_at: string | null }>(
        'SELECT MIN(submitted_at) AS first_at FROM exam_attempts WHERE user_id = ? AND exam_id = ?',
        [userId, examId],
      );
    },
    async getCorrectOptionLabel(questionId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ label: string }>(
        'SELECT label FROM exam_question_options WHERE question_id = ? AND is_correct = 1 LIMIT 1',
        [questionId],
      );
    },
    async getUserAttempts(userId, examId, eng) {
      const e = await resolveEngine(eng);
      return e.query<ExamAttemptRow>(
        'SELECT * FROM exam_attempts WHERE user_id = ? AND exam_id = ?',
        [userId, examId],
      );
    },
    async getExamRanking(examId, eng) {
      const e = await resolveEngine(eng);
      return e.query<{
        user_id: string;
        display_name: string | null;
        email: string;
        total_score: number;
        total_questions: number;
        correct_count: number;
        submitted_at: string | null;
      }>(
        `SELECT ea.user_id,
                u.display_name,
                u.email,
                COALESCE(SUM(ea.score), 0) AS total_score,
                COUNT(ea.id) AS total_questions,
                COALESCE(SUM(CASE WHEN ea.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct_count,
                MAX(ea.submitted_at) AS submitted_at
         FROM exam_attempts ea
         JOIN users u ON u.id = ea.user_id
         WHERE ea.exam_id = ?
         GROUP BY ea.user_id
         ORDER BY total_score DESC, submitted_at ASC`,
        [examId],
      );
    },

    // ----- resource -----
    async insertResource(tx, res) {
      await tx.execute(
        `INSERT INTO resources (id, title, url, description, resource_type, tech_tags, file_url, submitted_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [res.id, res.title, res.url, res.description, res.resourceType, res.techTags, res.fileUrl, res.submittedBy],
      );
    },
    async getResourceById(resourceId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<ResourceRow>('SELECT * FROM resources WHERE id = ?', [resourceId]);
    },
    async updateResource(resourceId, fields, eng) {
      const e = await resolveEngine(eng);
      const sets: string[] = [];
      const params: QueryParams = [];
      const map: Record<string, keyof ResourceRow> = {
        title: 'title',
        description: 'description',
        url: 'url',
        resourceType: 'resource_type',
        techTags: 'tech_tags',
        fileUrl: 'file_url',
        status: 'status',
        reviewedBy: 'reviewed_by',
        reviewNote: 'review_note',
      };
      for (const [k, v] of Object.entries(fields)) {
        const col = map[k];
        if (col !== undefined) {
          sets.push(`${String(col)} = ?`);
          params.push(v as QueryParam);
        }
      }
      if (sets.length === 0) return;
      sets.push("updated_at = datetime('now')");
      params.push(resourceId);
      await e.execute(`UPDATE resources SET ${sets.join(', ')} WHERE id = ?`, params);
    },
    async deleteResource(resourceId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM resources WHERE id = ?', [resourceId]);
    },
    async incrementResourceView(resourceId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('UPDATE resources SET view_count = view_count + 1 WHERE id = ?', [resourceId]);
    },
    async countResources(where, params, eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ count: number }>(`SELECT COUNT(*) AS count FROM resources r ${where}`, params);
      return row?.count ?? 0;
    },
    async listResourcesWithAuthor(where, params, orderBy, eng) {
      const e = await resolveEngine(eng);
      const order = orderBy && orderBy.length > 0 ? orderBy : 'r.created_at DESC';
      return e.query<ResourceWithAuthorRow>(
        `SELECT r.*,
                u.display_name AS author_display_name,
                u.avatar_url AS author_avatar_url,
                u.tech_tags AS author_tech_tags,
                ur.display_name AS reviewer_display_name
         FROM resources r
         LEFT JOIN users u ON r.submitted_by = u.id
         LEFT JOIN users ur ON r.reviewed_by = ur.id
         ${where}
         ORDER BY ${order}
         LIMIT ? OFFSET ?`,
        params,
      );
    },
    async getUserResources(userId, status, eng) {
      const e = await resolveEngine(eng);
      if (status) {
        return e.query<ResourceRow>(
          'SELECT * FROM resources WHERE submitted_by = ? AND status = ? ORDER BY created_at DESC',
          [userId, status],
        );
      }
      return e.query<ResourceRow>(
        'SELECT * FROM resources WHERE submitted_by = ? ORDER BY created_at DESC',
        [userId],
      );
    },
    async countPendingResources(eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ count: number }>("SELECT COUNT(*) AS count FROM resources WHERE status = 'draft'");
      return row?.count ?? 0;
    },
    async listPendingResourcesWithAuthor(pageSize, offset, eng) {
      const e = await resolveEngine(eng);
      return e.query<ResourceWithAuthorRow>(
        `SELECT r.*,
                u.display_name AS author_display_name,
                u.avatar_url AS author_avatar_url,
                u.tech_tags AS author_tech_tags
         FROM resources r
         LEFT JOIN users u ON r.submitted_by = u.id
         WHERE r.status = 'draft'
         ORDER BY r.created_at ASC
         LIMIT ? OFFSET ?`,
        [pageSize, offset],
      );
    },
    async getTechTagCounts(techTag, eng) {
      const e = await resolveEngine(eng);
      if (techTag) {
        return e.query<{ tech_tag: string; count: number }>(
          `SELECT tech_tag, COUNT(*) AS count FROM (
             SELECT json_each.value AS tech_tag
             FROM resources r, json_each(r.tech_tags)
             WHERE r.status = 'published'
           )
           WHERE tech_tag = ?
           GROUP BY tech_tag`,
          [techTag],
        );
      }
      return e.query<{ tech_tag: string; count: number }>(
        `SELECT json_each.value AS tech_tag, COUNT(*) AS count
         FROM resources r, json_each(r.tech_tags)
         WHERE r.status = 'published'
         GROUP BY tech_tag`,
      );
    },

    // ----- component registry (component_registry_items / variants / guides) -----
    async listComponentItems(eng) {
      const e = await resolveEngine(eng);
      return e.query<ComponentItemRow>('SELECT * FROM component_registry_items ORDER BY sort_order ASC');
    },
    async getComponentItemBySlug(slug, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<ComponentItemRow>('SELECT * FROM component_registry_items WHERE slug = ?', [slug]);
    },
    async getMaxComponentSortOrder(eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ m: number | null }>('SELECT MAX(sort_order) AS m FROM component_registry_items');
      return row?.m ?? 0;
    },
    async insertComponentItem(tx, item) {
      await tx.execute(
        `INSERT INTO component_registry_items (id, name, slug, category, description, migration_status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.name, item.slug, item.category, item.description, item.migrationStatus, item.sortOrder],
      );
    },
    async insertComponentVariant(tx, variant) {
      await tx.execute(
        `INSERT OR IGNORE INTO component_registry_variants (id, item_id, size, color, state, is_enabled)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [variant.id, variant.itemId, variant.size, variant.color, variant.state],
      );
    },
    async insertComponentGuide(tx, id, itemId) {
      await tx.execute(
        `INSERT INTO component_registry_guides (id, item_id, use_cases, anti_patterns)
         VALUES (?, ?, '[]', '[]')`,
        [id, itemId],
      );
    },
    async updateComponentItem(id, fields, eng) {
      const e = await resolveEngine(eng);
      const sets: string[] = [];
      const params: QueryParams = [];
      const map: Record<string, keyof ComponentItemRow> = {
        name: 'name',
        slug: 'slug',
        category: 'category',
        description: 'description',
        migrationStatus: 'migration_status',
        sortOrder: 'sort_order',
      };
      for (const [k, v] of Object.entries(fields)) {
        const col = map[k];
        if (col !== undefined) {
          sets.push(`${String(col)} = ?`);
          params.push(v as QueryParam);
        }
      }
      if (sets.length === 0) return;
      sets.push("updated_at = datetime('now')");
      params.push(id);
      await e.execute(`UPDATE component_registry_items SET ${sets.join(', ')} WHERE id = ?`, params);
    },
    async deleteComponentItem(id, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM component_registry_items WHERE id = ?', [id]);
    },
    async deleteComponentVariants(itemId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM component_registry_variants WHERE item_id = ?', [itemId]);
    },
    async deleteComponentGuides(itemId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM component_registry_guides WHERE item_id = ?', [itemId]);
    },
    async getComponentVariants(itemId, eng) {
      const e = await resolveEngine(eng);
      return e.query<ComponentVariantRow>(
        'SELECT * FROM component_registry_variants WHERE item_id = ? ORDER BY size, color, state',
        [itemId],
      );
    },
    async getComponentGuide(itemId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<ComponentGuideRow>('SELECT * FROM component_registry_guides WHERE item_id = ?', [itemId]);
    },
    async updateVariantEnabled(variantId, enabled, eng) {
      const e = await resolveEngine(eng);
      await e.execute('UPDATE component_registry_variants SET is_enabled = ? WHERE id = ?', [enabled ? 1 : 0, variantId]);
    },
    async upsertComponentGuide(itemId, useCases, antiPatterns, eng) {
      const e = await resolveEngine(eng);
      const existing = await e.queryOne<ComponentGuideRow>(
        'SELECT * FROM component_registry_guides WHERE item_id = ?',
        [itemId],
      );
      if (!existing) {
        await e.execute(
          `INSERT INTO component_registry_guides (id, item_id, use_cases, anti_patterns)
           VALUES (?, ?, ?, ?)`,
          [`guide:${itemId}`, itemId, useCases, antiPatterns],
        );
      } else {
        await e.execute(
          `UPDATE component_registry_guides SET use_cases = ?, anti_patterns = ?, updated_at = datetime('now') WHERE item_id = ?`,
          [useCases, antiPatterns, itemId],
        );
      }
    },

    // ----- agent (learning profile) -----
    async getExamAttemptAnalysis(userId, eng) {
      const e = await resolveEngine(eng);
      return e.query<{ is_correct: number; question_title: string; exam_tags: string | null }>(
        `SELECT ea.is_correct, eq.title AS question_title, e.tech_tags AS exam_tags
         FROM exam_attempts ea
         JOIN exam_questions eq ON ea.question_id = eq.id
         JOIN exams e ON ea.exam_id = e.id
         WHERE ea.user_id = ? AND ea.is_correct IS NOT NULL`,
        [userId],
      );
    },
    async getExamAttemptStats(userId, eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ total: number; correct: number }>(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct
         FROM exam_attempts
         WHERE user_id = ? AND is_correct IS NOT NULL`,
        [userId],
      );
      return row ?? { total: 0, correct: 0 };
    },
    async listPublishedResources(eng) {
      const e = await resolveEngine(eng);
      return e.query<ResourceRow>(
        "SELECT * FROM resources WHERE status = 'published' ORDER BY view_count DESC, like_count DESC LIMIT 500",
      );
    },

    // ----- tasks -----
    async insertTask(tx, task) {
      await tx.execute(
        `INSERT INTO tasks (id, title, description, content_markdown, category, tags, points, max_claimants, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [task.id, task.title, task.description, task.contentMarkdown, task.category, task.tags, task.points, task.maxClaimants, task.createdBy],
      );
    },
    async getTaskById(taskId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<TaskRow>('SELECT * FROM tasks WHERE id = ?', [taskId]);
    },
    async updateTaskFields(taskId, fields, eng) {
      const e = await resolveEngine(eng);
      const sets: string[] = [];
      const params: QueryParams = [];
      const map: Record<string, keyof TaskRow> = {
        title: 'title',
        description: 'description',
        contentMarkdown: 'content_markdown',
        category: 'category',
        tags: 'tags',
        points: 'points',
        maxClaimants: 'max_claimants',
        status: 'status',
        publishedAt: 'published_at',
        closedAt: 'closed_at',
      };
      for (const [k, v] of Object.entries(fields)) {
        const col = map[k];
        if (col) {
          sets.push(`${String(col)} = ?`);
          params.push(v as QueryParam);
        }
      }
      if (sets.length === 0) return;
      params.push(taskId);
      await e.execute(`UPDATE tasks SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`, params);
    },
    async deleteTask(taskId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM tasks WHERE id = ?', [taskId]);
    },
    async countTasks(where, params, eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM tasks ${where}`, params);
      return row?.c ?? 0;
    },
    async listTasks(where, params, eng) {
      const e = await resolveEngine(eng);
      return e.query<TaskRow>(
        `SELECT * FROM tasks ${where} ORDER BY published_at DESC NULLS LAST, created_at DESC LIMIT ? OFFSET ?`,
        params,
      );
    },
    async getTaskClaimCount(taskId, statusFilter, eng) {
      const e = await resolveEngine(eng);
      const sql =
        statusFilter === 'completed'
          ? 'SELECT COUNT(*) AS c FROM task_claims WHERE task_id = ? AND status = ?'
          : statusFilter === 'active'
            ? 'SELECT COUNT(*) AS c FROM task_claims WHERE task_id = ? AND status != ?'
            : 'SELECT COUNT(*) AS c FROM task_claims WHERE task_id = ?';
      const params =
        statusFilter === 'completed' || statusFilter === 'active'
          ? [taskId, 'cancelled']
          : [taskId];
      const row = await e.queryOne<{ c: number }>(sql, params);
      return row?.c ?? 0;
    },
    async insertTaskClaim(tx, id, taskId, userId, note) {
      await tx.execute(
        `INSERT INTO task_claims (id, task_id, user_id, claim_note) VALUES (?, ?, ?, ?)`,
        [id, taskId, userId, note],
      );
    },
    async getTaskClaimById(claimId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<TaskClaimRow>('SELECT * FROM task_claims WHERE id = ?', [claimId]);
    },
    async getTaskClaim(taskId, userId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<TaskClaimRow>('SELECT * FROM task_claims WHERE task_id = ? AND user_id = ?', [taskId, userId]);
    },
    async updateClaimStatus(claimId, status, eng) {
      const e = await resolveEngine(eng);
      await e.execute("UPDATE task_claims SET status = ? WHERE id = ?", [status, claimId]);
    },
    async completeClaim(claimId, adminId, note, eng) {
      const e = await resolveEngine(eng);
      await e.execute(
        `UPDATE task_claims SET status = 'completed', completed_at = datetime('now'), reviewed_by = ?, review_note = ? WHERE id = ?`,
        [adminId, note, claimId],
      );
    },
    async rejectClaim(claimId, adminId, note, eng) {
      const e = await resolveEngine(eng);
      await e.execute(
        `UPDATE task_claims SET status = 'cancelled', reviewed_by = ?, review_note = ? WHERE id = ?`,
        [adminId, note, claimId],
      );
    },
    async reactivateClaim(claimId, note, eng) {
      const e = await resolveEngine(eng);
      await e.execute(
        `UPDATE task_claims SET status = 'claimed', claim_note = ?, created_at = datetime('now') WHERE id = ?`,
        [note, claimId],
      );
    },
    async getClaimByTaskAndUser(taskId, userId, status, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string }>(
        'SELECT id FROM task_claims WHERE task_id = ? AND user_id = ? AND status = ?',
        [taskId, userId, status],
      );
    },
    async getUserClaims(userId, eng) {
      const e = await resolveEngine(eng);
      return e.query<TaskClaimRow & { display_name: string | null }>(
        `SELECT tc.*, u.display_name
         FROM task_claims tc
         LEFT JOIN users u ON tc.reviewed_by = u.id
         WHERE tc.user_id = ?
         ORDER BY tc.created_at DESC`,
        [userId],
      );
    },
    async getTaskClaims(taskId, eng) {
      const e = await resolveEngine(eng);
      return e.query<TaskClaimRow & { display_name: string | null }>(
        `SELECT tc.*, u.display_name
         FROM task_claims tc
         LEFT JOIN users u ON tc.user_id = u.id
         WHERE tc.task_id = ?
         ORDER BY tc.created_at DESC`,
        [taskId],
      );
    },
    async listPendingClaims(eng) {
      const e = await resolveEngine(eng);
      return e.query<TaskClaimRow & { display_name: string | null }>(
        `SELECT tc.*, u.display_name
         FROM task_claims tc
         LEFT JOIN users u ON tc.user_id = u.id
         WHERE tc.status = 'claimed'
         ORDER BY tc.created_at ASC`,
      );
    },
  };
}

let toolsRepo: ToolsRepository | null = null;

/** 同步返回 ToolsRepository 单例（实例不持引擎，延迟绑定） */
export function getToolsRepository(): ToolsRepository {
  if (!toolsRepo) toolsRepo = createToolsRepository();
  return toolsRepo;
}

export type { DbEngine, QueryRow, QueryParams };
export { getDbEngine };
