/**
 * @file 社区模块 Repository（ADR-009）
 *
 * 覆盖表：community_categories / community_posts / community_comments /
 *        community_reactions / community_favorites / community_mentions /
 *        blog_series / users(只读摘要)
 *
 * 约定：每个方法以 `eng?: DbEngine` 收尾；事务内显式传入 tx。
 * SQLite 专属函数（datetime('now')/json）保留在 SQL 文本中（PG 实现留待 Phase 4）。
 */
import crypto from 'node:crypto';
import type { DbEngine, QueryRow, QueryParams } from '@/shared/db/drivers';
import { getDbEngine } from '@/shared/db/drivers';
import { resolveEngine } from './base';

export interface CommunityCategoryRow {
  [key: string]: unknown;
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
  post_count: number;
}

export interface CommunityPostRow {
  [key: string]: unknown;
  id: string;
  kind: string;
  category_id: string | null;
  author_id: string;
  title: string;
  content_markdown: string;
  status: string;
  is_pinned: number;
  is_featured: number;
  reply_count: number;
  favorite_count: number;
  last_reply_at: string | null;
  last_reply_id: string | null;
  hidden_by: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
  slug: string | null;
  excerpt: string | null;
  cover_image: string | null;
  tags: string | null;
  series_id: string | null;
  series_order: number;
  published_at: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityCommentRow {
  [key: string]: unknown;
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string;
  content_markdown: string;
  status: string;
  like_count: number;
  reply_count: number;
  hidden_by: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSummaryRow {
  [key: string]: unknown;
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_type: string;
}

export interface UserRow {
  [key: string]: unknown;
  id: string;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_type: string;
  github_url: string | null;
  website_url: string | null;
  tech_tags: string | null;
  role: string;
  is_active: number;
  created_at: string;
}

export interface AuthorSummary {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarType: string;
}

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
}

function toAuthorSummary(row: UserSummaryRow): AuthorSummary {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    avatarType: row.avatar_type,
  };
}

function toCategorySummary(row: CommunityCategoryRow): CategorySummary {
  return { id: row.id, slug: row.slug, name: row.name };
}

export interface CommunityRepository {
  // ---- categories ----
  listCategories(eng?: DbEngine): Promise<CommunityCategoryRow[]>;
  getCategoryBySlug(slug: string, eng?: DbEngine): Promise<CommunityCategoryRow | null>;
  getCategoryById(id: string, eng?: DbEngine): Promise<CommunityCategoryRow | null>;
  findCategoryBySlug(slug: string, eng?: DbEngine): Promise<{ id: string } | null>;
  findCategoryById(id: string, eng?: DbEngine): Promise<{ id: string; slug: string; name: string } | null>;
  insertCategory(
    input: {
      id: string;
      slug: string;
      name: string;
      description: string | null;
      icon: string | null;
      sortOrder: number;
      createdBy: string;
    },
    eng?: DbEngine,
  ): Promise<void>;
  updateCategory(
    categoryId: string,
    sets: string[],
    values: unknown[],
    eng?: DbEngine,
  ): Promise<void>;
  deleteCategory(categoryId: string, eng?: DbEngine): Promise<void>;

  // ---- posts ----
  getPostById(id: string, eng?: DbEngine): Promise<CommunityPostRow | null>;
  getPostBySlug(slug: string, eng?: DbEngine): Promise<CommunityPostRow | null>;
  getPublishedTopic(id: string, eng?: DbEngine): Promise<{ id: string; status: string; category_id: string } | null>;
  getTopicStatusCategory(id: string, eng?: DbEngine): Promise<{ id: string; status: string; category_id: string } | null>;
  getPostStatus(id: string, eng?: DbEngine): Promise<{ id: string; status: string } | null>;
  getPostForModeration(
    id: string,
    eng?: DbEngine,
  ): Promise<{ id: string; title: string; status: string; category_id: string } | null>;
  insertPost(
    input: {
      id: string;
      kind: string;
      authorId: string;
      title: string;
      contentMarkdown: string;
      slug: string;
      excerpt: string | null;
      coverImage: string | null;
      tags: string;
      seriesId: string | null;
      seriesOrder: number;
      status: string;
    },
    eng?: DbEngine,
  ): Promise<void>;
  updatePost(
    sets: string[],
    values: unknown[],
    postId: string,
    eng?: DbEngine,
  ): Promise<void>;
  incrementViewCount(postId: string, eng?: DbEngine): Promise<void>;
  listPosts(
    where: string[],
    params: unknown[],
    limit: number,
    offset: number,
    eng?: DbEngine,
  ): Promise<CommunityPostRow[]>;
  countPosts(whereSql: string, params: unknown[], eng?: DbEngine): Promise<number>;
  getUserPosts(authorId: string, eng?: DbEngine): Promise<CommunityPostRow[]>;

  // ---- comments ----
  getCommentById(id: string, eng?: DbEngine): Promise<CommunityCommentRow | null>;
  getCommentForReply(
    id: string,
    eng?: DbEngine,
  ): Promise<CommunityCommentRow | null>;
  getCommentForModeration(
    id: string,
    eng?: DbEngine,
  ): Promise<{ id: string; status: string; post_id: string; author_id: string; parent_comment_id: string | null } | null>;
  getCommentTopicParent(
    id: string,
    eng?: DbEngine,
  ): Promise<{ id: string; post_id: string; author_id: string; parent_comment_id: string | null; status: string } | null>;
  getPublishedComment(id: string, eng?: DbEngine): Promise<{ id: string } | null>;
  insertComment(
    input: {
      id: string;
      topicId: string;
      authorId: string;
      parentCommentId: string | null;
      contentMarkdown: string;
    },
    eng?: DbEngine,
  ): Promise<void>;
  updateCommentCounts(parentReplyId: string | null, topicId: string, eng?: DbEngine): Promise<void>;
  touchTopicAfterReply(topicId: string, replyId: string, eng?: DbEngine): Promise<void>;
  incrementCategoryPostCountByTopic(topicId: string, eng?: DbEngine): Promise<void>;
  decrementCategoryPostCountByTopic(topicId: string, eng?: DbEngine): Promise<void>;
  listComments(whereSql: string, params: unknown[], eng?: DbEngine): Promise<CommunityCommentRow[]>;
  countComments(whereSql: string, params: unknown[], eng?: DbEngine): Promise<number>;
  getCommentsByIds(ids: string[], eng?: DbEngine): Promise<CommunityCommentRow[]>;
  updateCommentContent(replyId: string, contentMarkdown: string, eng?: DbEngine): Promise<void>;
  softDeleteComment(replyId: string, eng?: DbEngine): Promise<void>;
  decrementCommentCounts(parentCommentId: string | null, postId: string, eng?: DbEngine): Promise<void>;
  markCommentHidden(replyId: string, eng?: DbEngine): Promise<void>;
  restoreCommentCounts(parentCommentId: string | null, postId: string, eng?: DbEngine): Promise<void>;
  restoreComment(replyId: string, eng?: DbEngine): Promise<void>;
  hardDeleteComment(replyId: string, eng?: DbEngine): Promise<void>;
  getCommentStatus(id: string, eng?: DbEngine): Promise<{ status: string } | null>;
  getTopicByCommentId(commentId: string, eng?: DbEngine): Promise<{ category_id: string } | null>;

  // ---- reactions / favorites ----
  getReaction(userId: string, type: string, targetId: string, eng?: DbEngine): Promise<{ id: string } | null>;
  insertReaction(id: string, userId: string, type: string, targetId: string, eng?: DbEngine): Promise<void>;
  deleteReactionById(id: string, eng?: DbEngine): Promise<void>;
  getLikeCount(table: 'community_posts' | 'community_comments', targetId: string, eng?: DbEngine): Promise<number>;
  incrementLike(table: 'community_posts' | 'community_comments', targetId: string, eng?: DbEngine): Promise<void>;
  decrementLike(table: 'community_posts' | 'community_comments', targetId: string, eng?: DbEngine): Promise<void>;
  getFavorite(userId: string, targetId: string, eng?: DbEngine): Promise<{ id: string } | null>;
  insertFavorite(id: string, userId: string, targetId: string, eng?: DbEngine): Promise<void>;
  deleteFavoriteById(id: string, eng?: DbEngine): Promise<void>;
  getFavoriteCount(targetId: string, eng?: DbEngine): Promise<number>;
  incrementFavorite(targetId: string, eng?: DbEngine): Promise<void>;
  decrementFavorite(targetId: string, eng?: DbEngine): Promise<void>;
  countUserFavorites(userId: string, eng?: DbEngine): Promise<number>;
  listUserFavoritePosts(
    userId: string,
    limit: number,
    offset: number,
    eng?: DbEngine,
  ): Promise<CommunityPostRow[]>;
  getUserReactionTargets(
    userId: string,
    type: string,
    ids: string[],
    eng?: DbEngine,
  ): Promise<Set<string>>;
  getUserFavoriteTargets(userId: string, ids: string[], eng?: DbEngine): Promise<Set<string>>;

  // ---- mentions ----
  findUsersByDisplayNames(names: string[], eng?: DbEngine): Promise<Array<{ id: string; display_name: string }>>;
  insertMention(
    id: string,
    userId: string,
    sourceType: string,
    sourceId: string,
    sourceAuthorId: string,
    eng?: DbEngine,
  ): Promise<void>;

  // ---- blog series ----
  getSeriesById(seriesId: string, eng?: DbEngine): Promise<{ id: string; title: string; description: string | null; slug: string; created_by: string; created_at: string } | null>;
  listSeries(eng?: DbEngine): Promise<Array<{ id: string; title: string; description: string | null; slug: string; created_by: string; created_at: string }>>;
  insertSeries(
    input: { id: string; title: string; description: string | null; slug: string; createdBy: string },
    eng?: DbEngine,
  ): Promise<void>;
  countPostsBySeries(seriesId: string, eng?: DbEngine): Promise<number>;
  clearSeriesOnPosts(seriesId: string, eng?: DbEngine): Promise<void>;
  deleteSeriesById(seriesId: string, eng?: DbEngine): Promise<void>;

  // ---- batch summaries ----
  loadAuthorSummaries(ids: string[], eng?: DbEngine): Promise<Map<string, AuthorSummary>>;
  loadCategorySummaries(ids: string[], eng?: DbEngine): Promise<Map<string, CategorySummary>>;
  listActiveMembers(eng?: DbEngine): Promise<UserRow[]>;
  listActiveMemberTechTags(eng?: DbEngine): Promise<Array<{ tech_tags: string }>>;
  getDisplayNamesByIds(ids: string[], eng?: DbEngine): Promise<Map<string, string | null>>;
  getTopicSummariesByIds(ids: string[], eng?: DbEngine): Promise<Map<string, { id: string; title: string; category_id: string }>>;

  // ---- ids ----
  newId(): string;
}

export function createCommunityRepository(): CommunityRepository {
  return {
    // ---- categories ----
    async listCategories(eng?) {
      const e = await resolveEngine(eng);
      return e.query<CommunityCategoryRow>(
        'SELECT * FROM community_categories ORDER BY sort_order ASC, created_at ASC',
      );
    },
    async getCategoryBySlug(slug, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<CommunityCategoryRow>(
        'SELECT * FROM community_categories WHERE slug = ?',
        [slug],
      );
    },
    async getCategoryById(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<CommunityCategoryRow>(
        'SELECT * FROM community_categories WHERE id = ?',
        [id],
      );
    },
    async findCategoryBySlug(slug, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string }>(
        'SELECT id FROM community_categories WHERE slug = ?',
        [slug],
      );
    },
    async findCategoryById(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string; slug: string; name: string }>(
        'SELECT id, slug, name FROM community_categories WHERE id = ?',
        [id],
      );
    },
    async insertCategory(input, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        `INSERT INTO community_categories (id, slug, name, description, icon, sort_order, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [input.id, input.slug, input.name, input.description, input.icon, input.sortOrder, input.createdBy],
      );
    },
    async updateCategory(categoryId, sets, values, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        `UPDATE community_categories SET ${sets.join(', ')} WHERE id = ?`,
        [...values, categoryId] as QueryParams,
      );
    },
    async deleteCategory(categoryId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM community_categories WHERE id = ?', [categoryId]);
    },

    // ---- posts ----
    async getPostById(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<CommunityPostRow>('SELECT * FROM community_posts WHERE id = ?', [id]);
    },
    async getPostBySlug(slug, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<CommunityPostRow>('SELECT * FROM community_posts WHERE slug = ?', [slug]);
    },
    async getPublishedTopic(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string; status: string; category_id: string }>(
        "SELECT id, status, category_id FROM community_posts WHERE id = ? AND kind = 'topic' AND status = 'published'",
        [id],
      );
    },
    async getTopicStatusCategory(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string; status: string; category_id: string }>(
        "SELECT id, status, category_id FROM community_posts WHERE id = ? AND kind = 'topic'",
        [id],
      );
    },
    async getPostStatus(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string; status: string }>(
        "SELECT id, status FROM community_posts WHERE id = ?",
        [id],
      );
    },
    async getPostForModeration(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string; title: string; status: string; category_id: string }>(
        'SELECT id, title, status, category_id FROM community_posts WHERE id = ?',
        [id],
      );
    },
    async insertPost(input, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        `INSERT INTO community_posts (id, kind, author_id, title, content_markdown, slug, excerpt, cover_image, tags, series_id, series_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.id,
          input.kind,
          input.authorId,
          input.title,
          input.contentMarkdown,
          input.slug,
          input.excerpt,
          input.coverImage,
          input.tags,
          input.seriesId,
          input.seriesOrder,
          input.status,
        ],
      );
    },
    async updatePost(sets, values, postId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(`UPDATE community_posts SET ${sets.join(', ')} WHERE id = ?`, [...values, postId] as QueryParams);
    },
    async incrementViewCount(postId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE community_posts SET view_count = view_count + 1 WHERE id = ? AND kind = 'post'",
        [postId],
      );
    },
    async listPosts(where, params, limit, offset, eng?) {
      const e = await resolveEngine(eng);
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      return e.query<CommunityPostRow>(
        `SELECT * FROM community_posts ${whereSql} ORDER BY published_at IS NULL, published_at DESC, created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset] as QueryParams,
      );
    },
    async countPosts(whereSql, params, eng?) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM community_posts ${whereSql}`,
        params as QueryParams,
      );
      return row?.count ?? 0;
    },
    async getUserPosts(authorId, eng?) {
      const e = await resolveEngine(eng);
      return e.query<CommunityPostRow>(
        `SELECT * FROM community_posts WHERE author_id = ? AND kind = 'post' ORDER BY created_at DESC`,
        [authorId],
      );
    },

    // ---- comments ----
    async getCommentById(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<CommunityCommentRow>('SELECT * FROM community_comments WHERE id = ?', [id]);
    },
    async getCommentForReply(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<CommunityCommentRow>('SELECT * FROM community_comments WHERE id = ?', [id]);
    },
    async getCommentForModeration(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string; status: string; post_id: string; author_id: string; parent_comment_id: string | null }>(
        'SELECT id, status, post_id, author_id, parent_comment_id FROM community_comments WHERE id = ?',
        [id],
      );
    },
    async getCommentTopicParent(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string; post_id: string; author_id: string; parent_comment_id: string | null; status: string }>(
        'SELECT id, post_id, author_id, parent_comment_id, status FROM community_comments WHERE id = ?',
        [id],
      );
    },
    async getPublishedComment(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string }>(
        "SELECT id FROM community_comments WHERE id = ? AND status = 'published'",
        [id],
      );
    },
    async insertComment(input, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        `INSERT INTO community_comments (id, post_id, author_id, parent_comment_id, content_markdown)
         VALUES (?, ?, ?, ?, ?)`,
        [input.id, input.topicId, input.authorId, input.parentCommentId, input.contentMarkdown],
      );
    },
    async updateCommentCounts(parentReplyId, topicId, eng?) {
      const e = await resolveEngine(eng);
      if (parentReplyId) {
        await e.execute('UPDATE community_comments SET reply_count = reply_count + 1 WHERE id = ?', [parentReplyId]);
      }
    },
    async touchTopicAfterReply(topicId, replyId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        `UPDATE community_posts
         SET reply_count = reply_count + 1,
             last_reply_at = datetime('now'),
             last_reply_id = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
        [replyId, topicId],
      );
    },
    async incrementCategoryPostCountByTopic(topicId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE community_categories SET post_count = post_count + 1, updated_at = datetime('now') WHERE id = (SELECT category_id FROM community_posts WHERE id = ?)",
        [topicId],
      );
    },
    async decrementCategoryPostCountByTopic(topicId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE community_categories SET post_count = MAX(post_count - 1, 0), updated_at = datetime('now') WHERE id = (SELECT category_id FROM community_posts WHERE id = ?)",
        [topicId],
      );
    },
    async listComments(whereSql, params, eng?) {
      const e = await resolveEngine(eng);
      return e.query<CommunityCommentRow>(`SELECT * FROM community_comments ${whereSql}`, params as QueryParams);
    },
    async countComments(whereSql, params, eng?) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM community_comments ${whereSql}`,
        params as QueryParams,
      );
      return row?.count ?? 0;
    },
    async getCommentsByIds(ids, eng?) {
      const e = await resolveEngine(eng);
      if (ids.length === 0) return [];
      const placeholders = ids.map(() => '?').join(',');
      return e.query<CommunityCommentRow>(
        `SELECT * FROM community_comments WHERE id IN (${placeholders})`,
        ids,
      );
    },
    async updateCommentContent(replyId, contentMarkdown, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE community_comments SET content_markdown = ?, updated_at = datetime('now') WHERE id = ?",
        [contentMarkdown, replyId],
      );
    },
    async softDeleteComment(replyId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE community_comments SET status = 'deleted', updated_at = datetime('now') WHERE id = ?",
        [replyId],
      );
    },
    async decrementCommentCounts(parentCommentId, postId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute('UPDATE community_posts SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?', [postId]);
      if (parentCommentId) {
        await e.execute(
          'UPDATE community_comments SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
          [parentCommentId],
        );
      }
    },
    async markCommentHidden(replyId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE community_comments SET status = 'hidden', hidden_by = ?, hidden_at = datetime('now'), hidden_reason = ?, updated_at = datetime('now') WHERE id = ?",
        [replyId],
      );
    },
    async restoreCommentCounts(parentCommentId, postId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute('UPDATE community_posts SET reply_count = reply_count + 1 WHERE id = ?', [postId]);
      if (parentCommentId) {
        await e.execute(
          'UPDATE community_comments SET reply_count = reply_count + 1 WHERE id = ?',
          [parentCommentId],
        );
      }
    },
    async restoreComment(replyId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE community_comments SET status = 'published', hidden_by = NULL, hidden_at = NULL, hidden_reason = NULL, updated_at = datetime('now') WHERE id = ?",
        [replyId],
      );
    },
    async hardDeleteComment(replyId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM community_comments WHERE id = ?', [replyId]);
    },
    async getCommentStatus(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ status: string }>('SELECT status FROM community_comments WHERE id = ?', [id]);
    },
    async getTopicByCommentId(commentId, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ category_id: string }>(
        'SELECT category_id FROM community_posts WHERE id = (SELECT post_id FROM community_comments WHERE id = ?)',
        [commentId],
      );
    },

    // ---- reactions / favorites ----
    async getReaction(userId, type, targetId, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string }>(
        'SELECT id FROM community_reactions WHERE user_id = ? AND target_type = ? AND target_id = ?',
        [userId, type, targetId],
      );
    },
    async insertReaction(id, userId, type, targetId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        'INSERT INTO community_reactions (id, user_id, target_type, target_id) VALUES (?, ?, ?, ?)',
        [id, userId, type, targetId],
      );
    },
    async deleteReactionById(id, eng?) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM community_reactions WHERE id = ?', [id]);
    },
    async getLikeCount(table, targetId, eng?) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ like_count: number }>(
        `SELECT like_count FROM ${table} WHERE id = ?`,
        [targetId],
      );
      return row?.like_count ?? 0;
    },
    async incrementLike(table, targetId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(`UPDATE ${table} SET like_count = like_count + 1 WHERE id = ?`, [targetId]);
    },
    async decrementLike(table, targetId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(`UPDATE ${table} SET like_count = MAX(like_count - 1, 0) WHERE id = ?`, [targetId]);
    },
    async getFavorite(userId, targetId, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string }>(
        "SELECT id FROM community_favorites WHERE user_id = ? AND target_type = 'post' AND target_id = ?",
        [userId, targetId],
      );
    },
    async insertFavorite(id, userId, targetId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "INSERT INTO community_favorites (id, user_id, target_type, target_id) VALUES (?, ?, 'post', ?)",
        [id, userId, targetId],
      );
    },
    async deleteFavoriteById(id, eng?) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM community_favorites WHERE id = ?', [id]);
    },
    async getFavoriteCount(targetId, eng?) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ favorite_count: number }>(
        'SELECT favorite_count FROM community_posts WHERE id = ?',
        [targetId],
      );
      return row?.favorite_count ?? 0;
    },
    async incrementFavorite(targetId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE community_posts SET favorite_count = favorite_count + 1 WHERE id = ?",
        [targetId],
      );
    },
    async decrementFavorite(targetId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE community_posts SET favorite_count = MAX(favorite_count - 1, 0) WHERE id = ?",
        [targetId],
      );
    },
    async countUserFavorites(userId, eng?) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM community_favorites WHERE user_id = ? AND target_type = 'post'",
        [userId],
      );
      return row?.count ?? 0;
    },
    async listUserFavoritePosts(userId, limit, offset, eng?) {
      const e = await resolveEngine(eng);
      return e.query<CommunityPostRow>(
        `SELECT t.* FROM community_posts t
         INNER JOIN community_favorites f ON t.id = f.target_id
         WHERE f.user_id = ? AND f.target_type = 'post' AND t.kind = 'topic' AND t.status = 'published'
         ORDER BY f.created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
      );
    },
    async getUserReactionTargets(userId, type, ids, eng?) {
      const e = await resolveEngine(eng);
      const set = new Set<string>();
      if (ids.length === 0) return set;
      const placeholders = ids.map(() => '?').join(',');
      const rows = await e.query<{ target_id: string }>(
        `SELECT target_id FROM community_reactions
         WHERE user_id = ? AND target_type = ? AND target_id IN (${placeholders})`,
        [userId, type, ...ids] as QueryParams,
      );
      for (const r of rows) set.add(r.target_id);
      return set;
    },
    async getUserFavoriteTargets(userId, ids, eng?) {
      const e = await resolveEngine(eng);
      const set = new Set<string>();
      if (ids.length === 0) return set;
      const placeholders = ids.map(() => '?').join(',');
      const rows = await e.query<{ target_id: string }>(
        `SELECT target_id FROM community_favorites
         WHERE user_id = ? AND target_type = 'post' AND target_id IN (${placeholders})`,
        [userId, ...ids] as QueryParams,
      );
      for (const r of rows) set.add(r.target_id);
      return set;
    },

    // ---- mentions ----
    async findUsersByDisplayNames(names, eng?) {
      const e = await resolveEngine(eng);
      if (names.length === 0) return [];
      const placeholders = names.map(() => '?').join(',');
      return e.query<{ id: string; display_name: string }>(
        `SELECT id, display_name FROM users
         WHERE display_name IN (${placeholders}) AND is_active = 1`,
        names as QueryParams,
      );
    },
    async insertMention(id, userId, sourceType, sourceId, sourceAuthorId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        `INSERT INTO community_mentions (id, mentioned_user_id, source_type, source_id, source_author_id, is_notified)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [id, userId, sourceType, sourceId, sourceAuthorId] as QueryParams,
      );
    },

    // ---- blog series ----
    async getSeriesById(seriesId, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string; title: string; description: string | null; slug: string; created_by: string; created_at: string }>(
        'SELECT * FROM blog_series WHERE id = ?',
        [seriesId],
      );
    },
    async listSeries(eng?) {
      const e = await resolveEngine(eng);
      return e.query<{ id: string; title: string; description: string | null; slug: string; created_by: string; created_at: string }>(
        'SELECT * FROM blog_series ORDER BY created_at DESC',
      );
    },
    async insertSeries(input, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        'INSERT INTO blog_series (id, title, description, slug, created_by) VALUES (?, ?, ?, ?, ?)',
        [input.id, input.title, input.description, input.slug, input.createdBy],
      );
    },
    async countPostsBySeries(seriesId, eng?) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ c: number }>(
        'SELECT COUNT(*) AS c FROM community_posts WHERE series_id = ?',
        [seriesId],
      );
      return row?.c ?? 0;
    },
    async clearSeriesOnPosts(seriesId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute('UPDATE community_posts SET series_id = NULL WHERE series_id = ?', [seriesId]);
    },
    async deleteSeriesById(seriesId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM blog_series WHERE id = ?', [seriesId]);
    },

    // ---- batch summaries ----
    async listActiveMembers(eng?) {
      const e = await resolveEngine(eng);
      return e.query<UserRow>(
        'SELECT * FROM users WHERE is_active = 1 ORDER BY display_name COLLATE NOCASE ASC',
      );
    },
    async listActiveMemberTechTags(eng?) {
      const e = await resolveEngine(eng);
      return e.query<{ tech_tags: string }>(
        `SELECT tech_tags FROM users WHERE is_active = 1 AND tech_tags IS NOT NULL AND tech_tags != '[]'`,
      );
    },
    async loadAuthorSummaries(ids, eng?) {
      const e = await resolveEngine(eng);
      const map = new Map<string, AuthorSummary>();
      if (ids.length === 0) return map;
      const unique = [...new Set(ids)];
      const placeholders = unique.map(() => '?').join(',');
      const rows = await e.query<UserSummaryRow>(
        `SELECT id, display_name, avatar_url, avatar_type FROM users WHERE id IN (${placeholders})`,
        unique,
      );
      for (const row of rows) map.set(row.id, toAuthorSummary(row));
      return map;
    },
    async loadCategorySummaries(ids, eng?) {
      const e = await resolveEngine(eng);
      const map = new Map<string, CategorySummary>();
      if (ids.length === 0) return map;
      const unique = [...new Set(ids)];
      const placeholders = unique.map(() => '?').join(',');
      const rows = await e.query<CommunityCategoryRow>(
        `SELECT id, slug, name FROM community_categories WHERE id IN (${placeholders})`,
        unique,
      );
      for (const row of rows) map.set(row.id, toCategorySummary(row));
      return map;
    },
    async getDisplayNamesByIds(ids, eng?) {
      const e = await resolveEngine(eng);
      const map = new Map<string, string | null>();
      if (ids.length === 0) return map;
      const unique = [...new Set(ids)];
      const placeholders = unique.map(() => '?').join(',');
      const rows = await e.query<{ id: string; display_name: string | null }>(
        `SELECT id, display_name FROM users WHERE id IN (${placeholders})`,
        unique,
      );
      for (const row of rows) map.set(row.id, row.display_name ?? null);
      return map;
    },
    async getTopicSummariesByIds(ids, eng?) {
      const e = await resolveEngine(eng);
      const map = new Map<string, { id: string; title: string; category_id: string }>();
      if (ids.length === 0) return map;
      const unique = [...new Set(ids)];
      const placeholders = unique.map(() => '?').join(',');
      const rows = await e.query<{ id: string; title: string; category_id: string }>(
        `SELECT id, title, category_id FROM community_posts WHERE id IN (${placeholders}) AND kind = 'topic'`,
        unique,
      );
      for (const row of rows) map.set(row.id, { id: row.id, title: row.title, category_id: row.category_id });
      return map;
    },

    // ---- ids ----
    newId() {
      return crypto.randomUUID();
    },
  };
}

let singleton: CommunityRepository | null = null;

/**
 * 同步获取单例。仓库实例不持有引擎，方法内经 resolveEngine 延迟绑定默认引擎，
 * 因此此处不必调用 async 的 getDbEngine()，可在模块加载期安全调用。
 */
export function getCommunityRepository(): CommunityRepository {
  if (!singleton) singleton = createCommunityRepository();
  return singleton;
}

/** 测试注入：重建单例（传入带数据的引擎） */
export function _setCommunityRepositoryForTest(_engine: DbEngine): void {
  singleton = createCommunityRepository();
}
