/**
 * @file 论坛服务层 — 回复（CRUD + 楼中楼，两层结构）
 *
 * 统一重构：forum_replies → community_comments（post_id / parent_comment_id）
 *          forum_topics → community_posts(kind='topic')
 *          forum_likes  → community_reactions(target_type='comment')
 */
import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { logger } from '@/shared/logger';
import { AppError, assertOwnership } from '@/shared/app-error';
import type { PaginatedComments } from '../../types';
import {
  POST_LIMITS,
  computePagination,
  computeTotalPages,
  loadAuthorSummaries,
  toAuthorSummary,
  toStatus,
  type CommunityComment,
  type CommunityCommentDetail,
  type CommentRow,
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
 */
export function listReplies(filters: ListRepliesFilters): PaginatedComments {
  const db = getDb();
  const where: string[] = ["post_id = ? AND kind = 'topic'", 'parent_comment_id IS NULL'];
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
    defaultPageSize: POST_LIMITS.COMMENTS_PAGE_SIZE,
    maxPageSize: 100,
  });

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM community_comments ${whereSql}`)
    .get(...params) as { count: number };
  const total = totalRow.count;
  const totalPages = computeTotalPages(total, pageSize);

  const rows = db
    .prepare(
      `SELECT * FROM community_comments ${whereSql} ORDER BY created_at ASC LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as CommentRow[];

  return buildReplyDetails(rows, filters.currentUserId, total, page, pageSize, totalPages);
}

/** 楼中楼列表（不分页，量小） */
export interface NestedCommentsResult {
  items: CommunityCommentDetail[];
  total: number;
}

/** 列出某主回复下的楼中楼 */
export function listNestedReplies(
  parentReplyId: string,
  currentUserId?: string,
  includeHidden = false,
): NestedCommentsResult {
  const db = getDb();
  const where: string[] = ['parent_comment_id = ?'];
  const params: unknown[] = [parentReplyId];
  if (includeHidden) {
    where.push("status IN ('published', 'hidden')");
  } else {
    where.push("status = 'published'");
  }
  const rows = db
    .prepare(
      `SELECT * FROM community_comments WHERE ${where.join(' AND ')} ORDER BY created_at ASC`,
    )
    .all(...params) as CommentRow[];

  const result = buildReplyDetails(rows, currentUserId, rows.length, 1, rows.length, 1);
  return { items: result.items, total: result.total };
}

/** 组装回复详情（含作者与当前用户点赞状态） */
export function buildReplyDetails(
  rows: CommentRow[],
  currentUserId: string | undefined,
  total: number,
  page: number,
  pageSize: number,
  totalPages: number,
): PaginatedComments {
  const authorMap = loadAuthorSummaries(rows.map((r) => r.author_id));

  const likedSet = new Set<string>();
  if (currentUserId && rows.length > 0) {
    const db = getDb();
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    const likedRows = db
      .prepare(
        `SELECT target_id FROM community_reactions
         WHERE user_id = ? AND target_type = 'comment' AND target_id IN (${placeholders})`,
      )
      .all(currentUserId, ...ids) as Array<{ target_id: string }>;
    for (const r of likedRows) likedSet.add(r.target_id);
  }

  const items: CommunityCommentDetail[] = rows.map((row) => ({
    id: row.id,
    postId: row.post_id,
    topicId: row.post_id,
    authorId: row.author_id,
    parentCommentId: row.parent_comment_id ?? null,
    parentReplyId: row.parent_comment_id ?? null,
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
  if (input.contentMarkdown.length > POST_LIMITS.COMMENT_CONTENT_MAX) {
    throw new AppError(`回复内容不能超过 ${POST_LIMITS.COMMENT_CONTENT_MAX} 字符`, 'VALIDATION_ERROR');
  }
}

/**
 * 创建回复（登录用户）
 */
export function createReply(
  authorId: string,
  topicId: string,
  input: ReplyInput,
): CommunityCommentDetail {
  validateReplyInput(input);
  const db = getDb();

  const topic = db
    .prepare("SELECT id, status, category_id FROM community_posts WHERE id = ? AND kind = 'topic'")
    .get(topicId) as { id: string; status: string; category_id: string } | undefined;
  if (!topic) {
    throw new AppError('主题不存在', 'NOT_FOUND');
  }
  if (topic.status === 'deleted') {
    throw new AppError('主题已删除，无法回复', 'STATUS_CONFLICT');
  }

  let parentReply: CommentRow | null = null;
  if (input.parentReplyId) {
    const found = db
      .prepare('SELECT * FROM community_comments WHERE id = ?')
      .get(input.parentReplyId) as CommentRow | undefined;
    if (!found) {
      throw new AppError('父回复不存在', 'NOT_FOUND');
    }
    parentReply = found;
    if (parentReply.post_id !== topicId) {
      throw new AppError('父回复不属于当前主题', 'INVALID_PARENT');
    }
    if (parentReply.parent_comment_id !== null) {
      throw new AppError('楼中楼不能嵌套，只能回复主回复', 'INVALID_PARENT');
    }
  }

  const id = crypto.randomUUID();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO community_comments (id, post_id, author_id, parent_comment_id, content_markdown)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(id, topicId, authorId, input.parentReplyId ?? null, input.contentMarkdown);

    if (parentReply) {
      db.prepare(
        'UPDATE community_comments SET reply_count = reply_count + 1 WHERE id = ?',
      ).run(parentReply.id);
    }
    db.prepare(
      `UPDATE community_posts
       SET reply_count = reply_count + 1,
           last_reply_at = datetime('now'),
           last_reply_id = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
    ).run(id, topicId);
    db.prepare(
      'UPDATE community_categories SET post_count = post_count + 1, updated_at = datetime(\'now\') WHERE id = ?',
    ).run(topic.category_id);
  });
  tx();

  try {
    notifyMentionsForContent(input.contentMarkdown, 'comment', id, authorId);
  } catch (err) {
    logger.error({ err }, '回复 @ 提及通知失败');
  }

  const row = db.prepare('SELECT * FROM community_comments WHERE id = ?').get(id) as CommentRow;
  const author = toAuthorSummary(
    db
      .prepare('SELECT id, display_name, avatar_url, avatar_type FROM users WHERE id = ?')
      .get(authorId) as UserSummaryRow | undefined,
  );

  return {
    id: row.id,
    postId: row.post_id,
    topicId: row.post_id,
    authorId: row.author_id,
    parentCommentId: row.parent_comment_id ?? null,
    parentReplyId: row.parent_comment_id ?? null,
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
): CommunityComment {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM community_comments WHERE id = ?').get(replyId) as
    | CommentRow
    | undefined;
  if (!existing) throw new AppError('回复不存在', 'NOT_FOUND');

  assertOwnership(userId, existing.author_id, isAdmin, '回复', '编辑');

  if (existing.status === 'deleted') throw new AppError('回复已删除', 'STATUS_CONFLICT');

  validateReplyInput({ contentMarkdown });

  db.prepare(
    "UPDATE community_comments SET content_markdown = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(contentMarkdown, replyId);

  const row = db.prepare('SELECT * FROM community_comments WHERE id = ?').get(replyId) as CommentRow;
  return {
    id: row.id,
    postId: row.post_id,
    topicId: row.post_id,
    authorId: row.author_id,
    parentCommentId: row.parent_comment_id ?? null,
    parentReplyId: row.parent_comment_id ?? null,
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
 */
export function deleteReply(userId: string, isAdmin: boolean, replyId: string): void {
  const db = getDb();
  const existing = db
    .prepare(
      'SELECT id, post_id, author_id, parent_comment_id, status FROM community_comments WHERE id = ?',
    )
    .get(replyId) as
    | { id: string; post_id: string; author_id: string; parent_comment_id: string | null; status: string }
    | undefined;
  if (!existing) throw new AppError('回复不存在', 'NOT_FOUND');

  assertOwnership(userId, existing.author_id, isAdmin, '回复', '删除');

  if (existing.status === 'deleted') return;

  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE community_comments SET status = 'deleted', updated_at = datetime('now') WHERE id = ?",
    ).run(replyId);

    if (existing.status === 'published' || existing.status === 'hidden') {
      db.prepare(
        'UPDATE community_posts SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
      ).run(existing.post_id);
      db.prepare(
        `UPDATE community_categories
         SET post_count = MAX(post_count - 1, 0), updated_at = datetime('now')
         WHERE id = (SELECT category_id FROM community_posts WHERE id = ?)`,
      ).run(existing.post_id);
      if (existing.parent_comment_id) {
        db.prepare(
          'UPDATE community_comments SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
        ).run(existing.parent_comment_id);
      }
    }
  });
  tx();
}
