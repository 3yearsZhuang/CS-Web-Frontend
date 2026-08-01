/**
 * @file 论坛服务层 — 回复（CRUD + 楼中楼，两层结构）
 */
import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { logger } from '@/shared/logger';
import { AppError, assertOwnership } from '@/shared/app-error';
import type { PaginatedReplies } from '../../types';
import {
  FORUM_LIMITS,
  computePagination,
  computeTotalPages,
  loadAuthorSummaries,
  toAuthorSummary,
  toStatus,
  type ForumReply,
  type ForumReplyDetail,
  type ForumReplyRow,
  type UserSummaryRow,
} from './shared';
import { notifyMentionsForContent } from './mentions';

/** 回复列表筛选 */
export interface ListRepliesFilters {
  topicId: string;
  page?: number;
  pageSize?: number;
  /** 管理员视角：包含 hidden 状态；默认仅 published */
  includeHidden?: boolean;
  currentUserId?: string;
}

/**
 * 列出主题下的主回复（分页）
 *
 * 仅返回 parent_reply_id IS NULL 的主回复；楼中楼请用 listNestedReplies。
 */
export function listReplies(filters: ListRepliesFilters): PaginatedReplies {
  const db = getDb();
  const where: string[] = ['topic_id = ?', 'parent_reply_id IS NULL'];
  const params: unknown[] = [filters.topicId];

  if (filters.includeHidden) {
    where.push("status IN ('published', 'hidden')");
  } else {
    where.push("status = 'published'");
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const { page, pageSize, offset } = computePagination({
    page: filters.page,
    pageSize: filters.pageSize,
    defaultPageSize: FORUM_LIMITS.REPLIES_PAGE_SIZE,
    maxPageSize: 100,
  });

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM forum_replies ${whereSql}`)
    .get(...params) as { count: number };
  const total = totalRow.count;
  const totalPages = computeTotalPages(total, pageSize);

  const rows = db
    .prepare(
      `SELECT * FROM forum_replies ${whereSql} ORDER BY created_at ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as ForumReplyRow[];

  return buildReplyDetails(rows, filters.currentUserId, total, page, pageSize, totalPages);
}

/** 楼中楼列表（不分页，量小） */
export interface NestedRepliesResult {
  items: ForumReplyDetail[];
  total: number;
}

/** 列出某主回复下的楼中楼 */
export function listNestedReplies(
  parentReplyId: string,
  currentUserId?: string,
  includeHidden = false,
): NestedRepliesResult {
  const db = getDb();
  const where: string[] = ['parent_reply_id = ?'];
  const params: unknown[] = [parentReplyId];
  if (includeHidden) {
    where.push("status IN ('published', 'hidden')");
  } else {
    where.push("status = 'published'");
  }
  const rows = db
    .prepare(
      `SELECT * FROM forum_replies WHERE ${where.join(' AND ')} ORDER BY created_at ASC`,
    )
    .all(...params) as ForumReplyRow[];

  const result = buildReplyDetails(rows, currentUserId, rows.length, 1, rows.length, 1);
  return { items: result.items, total: result.total };
}

/** 组装回复详情（含作者与当前用户点赞状态） */
export function buildReplyDetails(
  rows: ForumReplyRow[],
  currentUserId: string | undefined,
  total: number,
  page: number,
  pageSize: number,
  totalPages: number,
): PaginatedReplies {
  const authorMap = loadAuthorSummaries(rows.map((r) => r.author_id));

  // 批量查询当前用户对这些回复的点赞状态
  const likedSet = new Set<string>();
  if (currentUserId && rows.length > 0) {
    const db = getDb();
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const likedRows = db
      .prepare(
        `SELECT target_id FROM forum_likes
         WHERE user_id = ? AND target_type = 'reply' AND target_id IN (${placeholders})`,
      )
      .all(currentUserId, ...ids) as Array<{ target_id: string }>;
    for (const r of likedRows) likedSet.add(r.target_id);
  }

  const items: ForumReplyDetail[] = rows.map((row) => ({
    id: row.id,
    topicId: row.topic_id,
    authorId: row.author_id,
    parentReplyId: row.parent_reply_id ?? null,
    contentMarkdown: row.content_markdown,
    status: toStatus(row.status),
    likeCount: row.like_count,
    replyCount: row.reply_count,
    hiddenBy: row.hidden_by ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenReason: row.hidden_reason ?? null,
    author: authorMap.get(row.author_id) ?? null,
    isLikedByMe: likedSet.has(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { items, total, page, pageSize, totalPages };
}

/** 创建回复的输入 */
export interface ReplyInput {
  contentMarkdown: string;
  /** 非空表示楼中楼，必须指向同主题下的主回复 */
  parentReplyId?: string | null;
}

/** 校验回复输入 */
function validateReplyInput(input: ReplyInput): void {
  if (!input.contentMarkdown || !input.contentMarkdown.trim()) {
    throw new AppError('回复内容不能为空', 'VALIDATION_ERROR');
  }
  if (input.contentMarkdown.length > FORUM_LIMITS.REPLY_CONTENT_MAX) {
    throw new AppError(`回复内容不能超过 ${FORUM_LIMITS.REPLY_CONTENT_MAX} 字符`, 'VALIDATION_ERROR');
  }
}

/**
 * 创建回复（登录用户）
 *
 * 楼中楼约束：parentReplyId 非空时，所指向的回复必须存在、属于同一主题、
 * 且其 parent_reply_id 必须为 NULL（即必须是主回复，不允许二级楼中楼）。
 *
 * 抛错：'NOT_FOUND'（主题/父回复不存在）、'INVALID_PARENT'（楼中楼约束失败）、
 *      'STATUS_CONFLICT'（主题已删除/隐藏时禁止回复）
 */
export function createReply(
  authorId: string,
  topicId: string,
  input: ReplyInput,
): ForumReplyDetail {
  validateReplyInput(input);
  const db = getDb();

  const topic = db
    .prepare('SELECT id, status, category_id FROM forum_topics WHERE id = ?')
    .get(topicId) as { id: string; status: string; category_id: string } | undefined;
  if (!topic) {
    throw new AppError('主题不存在', 'NOT_FOUND');
  }
  if (topic.status === 'deleted') {
    throw new AppError('主题已删除，无法回复', 'STATUS_CONFLICT');
  }

  // 楼中楼约束校验
  let parentReply: ForumReplyRow | null = null;
  if (input.parentReplyId) {
    const found = db
      .prepare('SELECT * FROM forum_replies WHERE id = ?')
      .get(input.parentReplyId) as ForumReplyRow | undefined;
    if (!found) {
      throw new AppError('父回复不存在', 'NOT_FOUND');
    }
    parentReply = found;
    if (parentReply.topic_id !== topicId) {
      throw new AppError('父回复不属于当前主题', 'INVALID_PARENT');
    }
    if (parentReply.parent_reply_id !== null) {
      throw new AppError('楼中楼不能嵌套，只能回复主回复', 'INVALID_PARENT');
    }
  }

  const id = crypto.randomUUID();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO forum_replies (id, topic_id, author_id, parent_reply_id, content_markdown)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, topicId, authorId, input.parentReplyId ?? null, input.contentMarkdown);

    // 反范式计数
    if (parentReply) {
      // 楼中楼：主回复 reply_count + 1
      db.prepare(
        'UPDATE forum_replies SET reply_count = reply_count + 1 WHERE id = ?',
      ).run(parentReply.id);
    }
    // 主题 reply_count + 1，更新 last_reply_at / last_reply_id
    db.prepare(
      `UPDATE forum_topics
       SET reply_count = reply_count + 1,
           last_reply_at = datetime('now'),
           last_reply_id = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
    ).run(id, topicId);
    // 版块 post_count + 1
    db.prepare(
      'UPDATE forum_categories SET post_count = post_count + 1, updated_at = datetime(\'now\') WHERE id = ?',
    ).run(topic.category_id);
  });
  tx();

  // @ 提及通知（失败不影响回复）
  try {
    notifyMentionsForContent(
      input.contentMarkdown,
      'reply',
      id,
      authorId,
    );
  } catch (err) {
    logger.error({ err }, '回复 @ 提及通知失败');
  }

  const row = db.prepare('SELECT * FROM forum_replies WHERE id = ?').get(id) as ForumReplyRow;
  const author = toAuthorSummary(
    db
      .prepare('SELECT id, display_name, avatar_url, avatar_type FROM users WHERE id = ?')
      .get(authorId) as UserSummaryRow | undefined,
  );

  return {
    id: row.id,
    topicId: row.topic_id,
    authorId: row.author_id,
    parentReplyId: row.parent_reply_id ?? null,
    contentMarkdown: row.content_markdown,
    status: toStatus(row.status),
    likeCount: row.like_count,
    replyCount: row.reply_count,
    hiddenBy: row.hidden_by ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenReason: row.hidden_reason ?? null,
    author,
    isLikedByMe: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 更新回复（作者或管理员）— 仅 content 可编辑 */
export function updateReply(
  userId: string,
  isAdmin: boolean,
  replyId: string,
  contentMarkdown: string,
): ForumReply {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM forum_replies WHERE id = ?').get(replyId) as
    | ForumReplyRow
    | undefined;
  if (!existing) throw new AppError('回复不存在', 'NOT_FOUND');

  assertOwnership(userId, existing.author_id, isAdmin, '回复', '编辑');

  if (existing.status === 'deleted') throw new AppError('回复已删除', 'STATUS_CONFLICT');

  validateReplyInput({ contentMarkdown });

  db.prepare(
    "UPDATE forum_replies SET content_markdown = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(contentMarkdown, replyId);

  const row = db.prepare('SELECT * FROM forum_replies WHERE id = ?').get(replyId) as ForumReplyRow;
  return {
    id: row.id,
    topicId: row.topic_id,
    authorId: row.author_id,
    parentReplyId: row.parent_reply_id ?? null,
    contentMarkdown: row.content_markdown,
    status: toStatus(row.status),
    likeCount: row.like_count,
    replyCount: row.reply_count,
    hiddenBy: row.hidden_by ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenReason: row.hidden_reason ?? null,
    author: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 作者软删除自己的回复（status → 'deleted'，终态）
 *
 * 反范式计数同步回退：主题 reply_count、主回复 reply_count、版块 post_count。
 */
export function deleteReply(userId: string, isAdmin: boolean, replyId: string): void {
  const db = getDb();
  const existing = db
    .prepare(
      'SELECT id, topic_id, author_id, parent_reply_id, status FROM forum_replies WHERE id = ?',
    )
    .get(replyId) as
    | { id: string; topic_id: string; author_id: string; parent_reply_id: string | null; status: string }
    | undefined;
  if (!existing) throw new AppError('回复不存在', 'NOT_FOUND');

  assertOwnership(userId, existing.author_id, isAdmin, '回复', '删除');

  if (existing.status === 'deleted') return; // 幂等

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE forum_replies SET status = 'deleted', updated_at = datetime('now') WHERE id = ?",
    ).run(replyId);

    // 反范式计数回退（仅当原状态为 published/hidden）
    if (existing.status === 'published' || existing.status === 'hidden') {
      // 主题 reply_count - 1
      db.prepare(
        'UPDATE forum_topics SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
      ).run(existing.topic_id);
      // 版块 post_count - 1
      db.prepare(
        `UPDATE forum_categories
         SET post_count = MAX(post_count - 1, 0), updated_at = datetime('now')
         WHERE id = (SELECT category_id FROM forum_topics WHERE id = ?)`,
      ).run(existing.topic_id);
      // 若是楼中楼，主回复 reply_count - 1
      if (existing.parent_reply_id) {
        db.prepare(
          'UPDATE forum_replies SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
        ).run(existing.parent_reply_id);
      }
    }
  });
  tx();
}
