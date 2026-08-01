/**
 * @file 论坛服务层 — 点赞与收藏（topic/reply + 主题收藏）
 *
 * 统一重构：forum_likes → community_reactions；forum_favorites → community_favorites
 * targetType 'topic'→'post'，'reply'→'comment'
 */
import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import {
  POST_LIMITS,
  computePagination,
  computeTotalPages,
  loadAuthorSummaries,
  loadCategorySummaries,
  postRowToBase,
  type CommunityPost,
  type PostRow,
  type LikeTargetType,
} from './shared';
import type { PaginatedPosts } from './topics';

/**
 * 切换点赞（登录用户）
 */
export function toggleLike(
  userId: string,
  targetType: LikeTargetType,
  targetId: string,
): { liked: boolean; likeCount: number } {
  if (targetType !== 'topic' && targetType !== 'reply') {
    throw new AppError('targetType 必须为 topic 或 reply', 'VALIDATION_ERROR');
  }

  // 统一映射：topic→post，reply→comment
  const unifiedType = targetType === 'topic' ? 'post' : 'comment';
  const db = getDb();

  if (unifiedType === 'post') {
    const row = db
      .prepare("SELECT id FROM community_posts WHERE id = ? AND kind = 'topic' AND status = 'published'")
      .get(targetId);
    if (!row) throw new AppError('主题不存在或已删除', 'NOT_FOUND');
  } else {
    const row = db
      .prepare("SELECT id FROM community_comments WHERE id = ? AND status = 'published'")
      .get(targetId);
    if (!row) throw new AppError('回复不存在或已删除', 'NOT_FOUND');
  }

  const existing = db
    .prepare(
      'SELECT id FROM community_reactions WHERE user_id = ? AND target_type = ? AND target_id = ?',
    )
    .get(userId, unifiedType, targetId) as { id: string } | undefined;

  const table = unifiedType === 'post' ? 'community_posts' : 'community_comments';
  let liked: boolean;
  let likeCount: number;

  const tx = db.transaction(() => {
    if (existing) {
      db.prepare('DELETE FROM community_reactions WHERE id = ?').run(existing.id);
      db.prepare(`UPDATE ${table} SET like_count = MAX(like_count - 1, 0) WHERE id = ?`).run(targetId);
      liked = false;
    } else {
      const id = crypto.randomUUID();
      db.prepare(
        'INSERT INTO community_reactions (id, user_id, target_type, target_id) VALUES (?, ?, ?, ?)',
      ).run(id, userId, unifiedType, targetId);
      db.prepare(`UPDATE ${table} SET like_count = like_count + 1 WHERE id = ?`).run(targetId);
      liked = true;
    }
    const row = db.prepare(`SELECT like_count FROM ${table} WHERE id = ?`).get(targetId) as
      | { like_count: number }
      | undefined;
    likeCount = row?.like_count ?? 0;
  });
  tx();

  return { liked: liked!, likeCount: likeCount! };
}

/** 切换主题收藏（登录用户） */
export function toggleFavorite(
  userId: string,
  topicId: string,
): { favorited: boolean; favoriteCount: number } {
  const db = getDb();
  const topic = db
    .prepare("SELECT id FROM community_posts WHERE id = ? AND kind = 'topic' AND status = 'published'")
    .get(topicId);
  if (!topic) {
    throw new AppError('主题不存在或已删除', 'NOT_FOUND');
  }

  const existing = db
    .prepare("SELECT id FROM community_favorites WHERE user_id = ? AND target_type = 'post' AND target_id = ?")
    .get(userId, topicId) as { id: string } | undefined;

  let favorited: boolean;
  let favoriteCount: number;

  const tx = db.transaction(() => {
    if (existing) {
      db.prepare('DELETE FROM community_favorites WHERE id = ?').run(existing.id);
      db.prepare(
        "UPDATE community_posts SET favorite_count = MAX(favorite_count - 1, 0) WHERE id = ?",
      ).run(topicId);
      favorited = false;
    } else {
      const id = crypto.randomUUID();
      db.prepare(
        "INSERT INTO community_favorites (id, user_id, target_type, target_id) VALUES (?, ?, 'post', ?)",
      ).run(id, userId, topicId);
      db.prepare(
        "UPDATE community_posts SET favorite_count = favorite_count + 1 WHERE id = ?",
      ).run(topicId);
      favorited = true;
    }
    const row = db
      .prepare('SELECT favorite_count FROM community_posts WHERE id = ?')
      .get(topicId) as { favorite_count: number } | undefined;
    favoriteCount = row?.favorite_count ?? 0;
  });
  tx();

  return { favorited: favorited!, favoriteCount: favoriteCount! };
}

/** 列出当前用户收藏的主题（分页） */
export function listUserFavorites(
  userId: string,
  page: number = 1,
  pageSize: number = POST_LIMITS.POSTS_PAGE_SIZE,
): PaginatedPosts {
  const db = getDb();
  const { page: safePage, pageSize: safePageSize, offset } = computePagination({
    page,
    pageSize,
    defaultPageSize: POST_LIMITS.POSTS_PAGE_SIZE,
    maxPageSize: 100,
  });

  const totalRow = db
    .prepare("SELECT COUNT(*) as count FROM community_favorites WHERE user_id = ? AND target_type = 'post'")
    .get(userId) as { count: number };
  const total = totalRow.count;
  const totalPages = computeTotalPages(total, safePageSize);

  const rows = db
    .prepare(
      `SELECT t.* FROM community_posts t
       INNER JOIN community_favorites f ON t.id = f.target_id
       WHERE f.user_id = ? AND f.target_type = 'post' AND t.kind = 'topic' AND t.status = 'published'
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(userId, safePageSize, offset) as PostRow[];

  const authorMap = loadAuthorSummaries(rows.map((r) => r.author_id));
  const categoryMap = loadCategorySummaries(rows.map((r) => r.category_id));

  const items: CommunityPost[] = rows.map((row) => ({
    ...postRowToBase(row),
    author: authorMap.get(row.author_id) ?? null,
    category: categoryMap.get(row.category_id ?? '') ?? null,
  }));

  return { items, total, page: safePage, pageSize: safePageSize, totalPages };
}
