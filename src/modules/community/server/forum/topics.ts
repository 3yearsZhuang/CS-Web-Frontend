/**
 * @file 论坛服务层 — 主题（CRUD + 浏览计数去重）
 */
import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { logger } from '@/shared/logger';
import { AppError, assertOwnership } from '@/shared/app-error';
import {
  FORUM_LIMITS,
  VIEW_DEDUP_WINDOW_HOURS,
  computePagination,
  computeTotalPages,
  loadAuthorSummaries,
  loadCategorySummaries,
  toAuthorSummary,
  topicRowToBase,
  type ForumStatus,
  type ForumTopic,
  type ForumTopicDetail,
  type ForumTopicRow,
  type UserSummaryRow,
} from './shared';
import { notifyMentionsForContent } from './mentions';

/** 主题列表筛选 */
export interface ListTopicsFilters {
  categoryId?: string;
  search?: string;
  status?: ForumStatus;
  authorId?: string;
  sort?: 'latest' | 'hot' | 'top';
  page?: number;
  pageSize?: number;
  /** 管理员视角：包含 hidden/deleted 状态；默认仅 published */
  includeHidden?: boolean;
}

/** 主题分页结果 */
export interface PaginatedTopics {
  items: ForumTopic[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 列出主题（公开） */
export function listTopics(filters: ListTopicsFilters = {}): PaginatedTopics {
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  // 默认仅展示 published；管理员视角可包含 hidden（仍排除 deleted）
  if (filters.includeHidden) {
    where.push("status IN ('published', 'hidden')");
  } else if (filters.status) {
    where.push('status = ?');
    params.push(filters.status);
  } else {
    where.push("status = 'published'");
  }

  if (filters.categoryId) {
    where.push('category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.authorId) {
    where.push('author_id = ?');
    params.push(filters.authorId);
  }
  if (filters.search && filters.search.trim()) {
    // 使用 FTS5 全文搜索，支持布尔操作符和相关性排序
    const keyword = filters.search.trim();
    where.push('t.rowid IN (SELECT rowid FROM forum_topics_fts WHERE forum_topics_fts MATCH ?)');
    params.push(keyword);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  // 排序：置顶永远在前，其次按指定字段
  const sortField = (() => {
    switch (filters.sort) {
      case 'hot':
        return 'reply_count DESC, like_count DESC';
      case 'top':
        return 'like_count DESC, view_count DESC';
      case 'latest':
      default:
        return 'last_reply_at IS NULL, last_reply_at DESC, created_at DESC';
    }
  })();
  const orderBy = `is_pinned DESC, ${sortField}`;

  const { page, pageSize, offset } = computePagination({
    page: filters.page,
    pageSize: filters.pageSize,
    defaultPageSize: FORUM_LIMITS.TOPICS_PAGE_SIZE,
    maxPageSize: 100,
  });

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM forum_topics t ${whereSql}`)
    .get(...params) as { count: number };
  const total = totalRow.count;
  const totalPages = computeTotalPages(total, pageSize);

  const rows = db
    .prepare(
      `SELECT t.* FROM forum_topics t ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as ForumTopicRow[];

  // 批量加载作者与版块摘要
  const authorMap = loadAuthorSummaries(rows.map((r) => r.author_id));
  const categoryMap = loadCategorySummaries(rows.map((r) => r.category_id));

  const items: ForumTopic[] = rows.map((row) => ({
    ...topicRowToBase(row),
    author: authorMap.get(row.author_id) ?? null,
    category: categoryMap.get(row.category_id) ?? null,
  }));

  return { items, total, page, pageSize, totalPages };
}

/**
 * 查询主题详情（公开）
 *
 * currentUserId 用于回填 isLikedByMe / isFavoritedByMe；未登录时为 false。
 */
export function getTopicById(
  topicId: string,
  currentUserId?: string,
): ForumTopicDetail | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM forum_topics WHERE id = ?').get(topicId) as
    | ForumTopicRow
    | undefined;
  if (!row) return null;

  const author = toAuthorSummary(
    db
      .prepare('SELECT id, display_name, avatar_url, avatar_type FROM users WHERE id = ?')
      .get(row.author_id) as UserSummaryRow | undefined,
  );
  const categoryRow = db
    .prepare('SELECT id, slug, name FROM forum_categories WHERE id = ?')
    .get(row.category_id) as { id: string; slug: string; name: string } | undefined;

  let isLikedByMe = false;
  let isFavoritedByMe = false;
  if (currentUserId) {
    const liked = db
      .prepare(
        "SELECT id FROM forum_likes WHERE user_id = ? AND target_type = 'topic' AND target_id = ?",
      )
      .get(currentUserId, topicId);
    isLikedByMe = !!liked;
    const favorited = db
      .prepare('SELECT id FROM forum_favorites WHERE user_id = ? AND topic_id = ?')
      .get(currentUserId, topicId);
    isFavoritedByMe = !!favorited;
  }

  return {
    ...topicRowToBase(row),
    author,
    category: categoryRow ?? null,
    isLikedByMe,
    isFavoritedByMe,
  };
}

/** 创建主题的输入 */
export interface TopicInput {
  categoryId: string;
  title: string;
  contentMarkdown: string;
}

/** 校验主题输入 */
function validateTopicInput(input: TopicInput): void {
  if (!input.categoryId) {
    throw new AppError('请选择版块', 'VALIDATION_ERROR');
  }
  if (!input.title || !input.title.trim()) {
    throw new AppError('标题不能为空', 'VALIDATION_ERROR');
  }
  if (input.title.length > FORUM_LIMITS.TITLE_MAX) {
    throw new AppError(`标题不能超过 ${FORUM_LIMITS.TITLE_MAX} 字符`, 'VALIDATION_ERROR');
  }
  if (!input.contentMarkdown || !input.contentMarkdown.trim()) {
    throw new AppError('内容不能为空', 'VALIDATION_ERROR');
  }
  if (input.contentMarkdown.length > FORUM_LIMITS.TOPIC_CONTENT_MAX) {
    throw new AppError(`内容不能超过 ${FORUM_LIMITS.TOPIC_CONTENT_MAX} 字符`, 'VALIDATION_ERROR');
  }
}

/** 创建主题（登录用户）— 版块不存在抛 'NOT_FOUND' */
export function createTopic(authorId: string, input: TopicInput): ForumTopic {
  validateTopicInput(input);
  const db = getDb();

  const category = db
    .prepare('SELECT id FROM forum_categories WHERE id = ?')
    .get(input.categoryId);
  if (!category) {
    throw new AppError('版块不存在', 'NOT_FOUND');
  }

  const id = crypto.randomUUID();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO forum_topics (id, category_id, author_id, title, content_markdown)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, input.categoryId, authorId, input.title.trim(), input.contentMarkdown);
    // 反范式计数：版块 topic_count + 1
    db.prepare(
      'UPDATE forum_categories SET topic_count = topic_count + 1, post_count = post_count + 1, updated_at = datetime(\'now\') WHERE id = ?',
    ).run(input.categoryId);
  });
  tx();

  // @ 提及扫描与通知（失败不影响发帖）
  try {
    notifyMentionsForContent(
      input.contentMarkdown,
      'topic',
      id,
      authorId,
    );
  } catch (err) {
    logger.error({ err }, '主题 @ 提及通知失败');
  }

  const row = db.prepare('SELECT * FROM forum_topics WHERE id = ?').get(id) as ForumTopicRow;
  return topicRowToBase(row);
}

/** 更新主题（作者或管理员）— 仅 title + content 可编辑 */
export function updateTopic(
  userId: string,
  isAdmin: boolean,
  topicId: string,
  input: Partial<Pick<TopicInput, 'title' | 'contentMarkdown'>>,
): ForumTopic {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM forum_topics WHERE id = ?').get(topicId) as
    | ForumTopicRow
    | undefined;
  if (!existing) throw new AppError('主题不存在', 'NOT_FOUND');

  assertOwnership(userId, existing.author_id, isAdmin, '主题', '编辑');

  // 已删除的主题不允许编辑
  if (existing.status === 'deleted') throw new AppError('主题已删除', 'STATUS_CONFLICT');

  const merged: TopicInput = {
    categoryId: existing.category_id,
    title: input.title !== undefined ? input.title : existing.title,
    contentMarkdown:
      input.contentMarkdown !== undefined ? input.contentMarkdown : existing.content_markdown,
  };
  validateTopicInput(merged);

  db.prepare(
    `UPDATE forum_topics
     SET title = ?, content_markdown = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(merged.title.trim(), merged.contentMarkdown, topicId);

  // 编辑后重新扫描 @ 提及
  try {
    notifyMentionsForContent(
      merged.contentMarkdown,
      'topic',
      topicId,
      existing.author_id,
    );
  } catch (err) {
    logger.error({ err }, '主题编辑 @ 提及通知失败');
  }

  const row = db.prepare('SELECT * FROM forum_topics WHERE id = ?').get(topicId) as ForumTopicRow;
  return topicRowToBase(row);
}

/**
 * 作者软删除自己的主题（status → 'deleted'，终态）
 *
 * 管理员请使用 hardDeleteTopic 硬删除（审计保留）。
 */
export function deleteTopic(userId: string, isAdmin: boolean, topicId: string): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, author_id, status, category_id FROM forum_topics WHERE id = ?')
    .get(topicId) as
    | { id: string; author_id: string; status: string; category_id: string }
    | undefined;
  if (!existing) throw new AppError('主题不存在', 'NOT_FOUND');

  assertOwnership(userId, existing.author_id, isAdmin, '主题', '删除');

  if (existing.status === 'deleted') return; // 幂等

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE forum_topics SET status = 'deleted', updated_at = datetime('now') WHERE id = ?",
    ).run(topicId);
    // 反范式计数：版块 topic_count - 1（仅当原状态为 published/hidden）
    if (existing.status === 'published' || existing.status === 'hidden') {
      db.prepare(
        'UPDATE forum_categories SET topic_count = MAX(topic_count - 1, 0), updated_at = datetime(\'now\') WHERE id = ?',
      ).run(existing.category_id);
    }
  });
  tx();
}

// ============= 浏览计数 =============

/**
 * 记录主题浏览（去重）
 *
 * 登录用户按 user_id 去重，匿名访客按 ip_hash 去重。
 * 24 小时窗口内同一 user_id / ip_hash 对同一主题仅计一次。
 *
 * 返回是否为新增浏览（true 表示 view_count 已 +1）。
 */
export function recordTopicView(
  topicId: string,
  currentUserId?: string,
  ipHash?: string,
): boolean {
  const db = getDb();

  // 主题必须存在且为 published
  const topic = db
    .prepare("SELECT id FROM forum_topics WHERE id = ? AND status = 'published'")
    .get(topicId) as { id: string } | undefined;
  if (!topic) return false;

  const since = `datetime('now', '-${VIEW_DEDUP_WINDOW_HOURS} hours')`;

  if (currentUserId) {
    // 登录用户：检查 24h 内是否已记录
    const existing = db
      .prepare(
        `SELECT id FROM forum_topic_views
         WHERE topic_id = ? AND user_id = ? AND viewed_at >= ${since}`,
      )
      .get(topicId, currentUserId);
    if (existing) return false;

    const id = crypto.randomUUID();
    const tx = db.transaction(() => {
      db.prepare(
        'INSERT OR IGNORE INTO forum_topic_views (id, topic_id, user_id) VALUES (?, ?, ?)',
      ).run(id, topicId, currentUserId);
      db.prepare(
        "UPDATE forum_topics SET view_count = view_count + 1 WHERE id = ?",
      ).run(topicId);
    });
    tx();
    return true;
  }

  if (ipHash) {
    const existing = db
      .prepare(
        `SELECT id FROM forum_topic_views
         WHERE topic_id = ? AND ip_hash = ? AND viewed_at >= ${since}`,
      )
      .get(topicId, ipHash);
    if (existing) return false;

    const id = crypto.randomUUID();
    const tx = db.transaction(() => {
      db.prepare(
        'INSERT OR IGNORE INTO forum_topic_views (id, topic_id, ip_hash) VALUES (?, ?, ?)',
      ).run(id, topicId, ipHash);
      db.prepare(
        "UPDATE forum_topics SET view_count = view_count + 1 WHERE id = ?",
      ).run(topicId);
    });
    tx();
    return true;
  }

  return false;
}
