/**
 * @file 博客文章服务（统一重构：blog_posts → community_posts(kind='post')）
 */
import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { AppError, assertOwnership } from '@/shared/app-error';
import type { BlogListOptions, BlogPost, BlogPostInput, BlogPostStatus } from '../../types';
import { POST_LIMITS } from '../shared';
import { generateSlug, parseTagsJson, toPost, type BlogPostRow } from './utils';

function validateInput(input: BlogPostInput): string | null {
  if (!input.title || input.title.trim().length === 0) return '标题不能为空';
  if (input.title.trim().length > POST_LIMITS.TITLE_MAX) return `标题不能超过 ${POST_LIMITS.TITLE_MAX} 字`;
  if (!input.contentMarkdown || input.contentMarkdown.trim().length === 0) return '内容不能为空';
  return null;
}

/** 创建博客文章 */
export function createPost(authorId: string, input: BlogPostInput): BlogPost {
  const err = validateInput(input);
  if (err) throw new AppError(err, 'VALIDATION_ERROR');

  const db = getDb();
  const id = crypto.randomUUID();
  const slug = generateSlug(input.title);
  const tagsStr = input.tags?.length ? JSON.stringify(input.tags) : '[]';

  db.prepare(
    `INSERT INTO community_posts (id, kind, author_id, title, content_markdown, slug, excerpt, cover_image, tags, series_id, series_order, status)
     VALUES (?, 'post', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    authorId,
    input.title.trim(),
    slug,
    input.excerpt?.trim() || null,
    input.contentMarkdown,
    input.coverImage?.trim() || null,
    tagsStr,
    input.seriesId || null,
    input.seriesOrder ?? 0,
    input.status || 'draft',
  );

  return getPostById(id)!;
}

/** 更新博客文章 */
export function updatePost(authorId: string, postId: string, input: Partial<BlogPostInput>, isAdmin: boolean): BlogPost {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM community_posts WHERE id = ? AND kind = 'post'").get(postId) as BlogPostRow | undefined;
  if (!existing) throw new AppError('文章不存在', 'NOT_FOUND');

  assertOwnership(authorId, existing.author_id, isAdmin, '文章', '编辑');

  const merged: BlogPostInput = {
    kind: 'post',
    title: input.title ?? existing.title,
    contentMarkdown: input.contentMarkdown ?? existing.content_markdown,
    excerpt: input.excerpt !== undefined ? input.excerpt : existing.excerpt ?? undefined,
    coverImage: input.coverImage !== undefined ? input.coverImage : existing.cover_image ?? undefined,
    tags: input.tags ?? parseTagsJson(existing.tags),
    seriesId: input.seriesId !== undefined ? input.seriesId : existing.series_id ?? undefined,
    seriesOrder: input.seriesOrder ?? existing.series_order,
    status: input.status ?? (existing.status as BlogPostStatus),
  };

  const err = validateInput(merged);
  if (err) throw new AppError(err, 'VALIDATION_ERROR');

  const tagsStr = merged.tags?.length ? JSON.stringify(merged.tags) : '[]';

  db.prepare(
    `UPDATE community_posts SET title = ?, excerpt = ?, content_markdown = ?, cover_image = ?, tags = ?, series_id = ?, series_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(
    merged.title.trim(),
    merged.excerpt?.trim() || null,
    merged.contentMarkdown,
    merged.coverImage?.trim() || null,
    tagsStr,
    merged.seriesId || null,
    merged.seriesOrder ?? 0,
    merged.status,
    postId,
  );

  return getPostById(postId)!;
}

/** 发布博客文章 */
export function publishPost(_adminId: string, postId: string): BlogPost {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM community_posts WHERE id = ? AND kind = 'post'").get(postId) as BlogPostRow | undefined;
  if (!existing) throw new AppError('文章不存在', 'NOT_FOUND');
  if (existing.status === 'published') throw new AppError('文章已发布', 'INVALID_STATUS');

  db.prepare(
    `UPDATE community_posts SET status = 'published', published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
  ).run(postId);

  return getPostById(postId)!;
}

/** 归档博客文章 */
export function archivePost(_adminId: string, postId: string): BlogPost {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM community_posts WHERE id = ? AND kind = 'post'").get(postId) as BlogPostRow | undefined;
  if (!existing) throw new AppError('文章不存在', 'NOT_FOUND');
  db.prepare(
    `UPDATE community_posts SET status = 'archived', updated_at = datetime('now') WHERE id = ?`,
  ).run(postId);
  return getPostById(postId)!;
}

/** 删除博客文章 */
export function deletePost(authorId: string, postId: string, isAdmin: boolean): void {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM community_posts WHERE id = ? AND kind = 'post'").get(postId) as BlogPostRow | undefined;
  if (!existing) throw new AppError('文章不存在', 'NOT_FOUND');
  assertOwnership(authorId, existing.author_id, isAdmin, '文章', '删除');
  db.prepare("UPDATE community_posts SET status = 'deleted', updated_at = datetime('now') WHERE id = ?").run(postId);
}

/** 根据 ID 获取博客文章 */
export function getPostById(id: string): BlogPost | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM community_posts WHERE id = ? AND kind = 'post'").get(id) as BlogPostRow | undefined;
  if (!row) return null;
  const authorName = db
    .prepare('SELECT display_name FROM users WHERE id = ?')
    .get(row.author_id) as { display_name: string | null } | undefined;
  return toPost(row, authorName?.display_name ?? null);
}

/** 根据 slug 获取博客文章 */
export function getPostBySlug(slug: string): BlogPost | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM community_posts WHERE slug = ? AND kind = 'post'").get(slug) as BlogPostRow | undefined;
  if (!row) return null;
  const authorName = db
    .prepare('SELECT display_name FROM users WHERE id = ?')
    .get(row.author_id) as { display_name: string | null } | undefined;
  return toPost(row, authorName?.display_name ?? null);
}

/** 列表查询（返回 { posts, total } 兼容旧 API） */
export function listPosts(options: BlogListOptions = {}): { posts: BlogPost[]; total: number } {
  const db = getDb();
  const where: string[] = ["kind = 'post'"];
  const params: unknown[] = [];

  if (options.status) {
    where.push('status = ?');
    params.push(options.status);
  }
  if (options.authorId) {
    where.push('author_id = ?');
    params.push(options.authorId);
  }
  if (options.seriesId) {
    where.push('series_id = ?');
    params.push(options.seriesId);
  }
  if (options.tag) {
    where.push('tags LIKE ?');
    params.push(`%"${options.tag}"%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const totalRow = db.prepare(`SELECT COUNT(*) as count FROM community_posts ${whereSql}`).get(...params) as { count: number };
  const total = totalRow.count;

  const { pageSize, offset } = computePaginationLocal(options.page, options.pageSize);
  const rows = db
    .prepare(
      `SELECT * FROM community_posts ${whereSql} ORDER BY published_at IS NULL, published_at DESC, created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as BlogPostRow[];

  const posts = rows.map((row) => {
    const authorName = db
      .prepare('SELECT display_name FROM users WHERE id = ?')
      .get(row.author_id) as { display_name: string | null } | undefined;
    return toPost(row, authorName?.display_name ?? null);
  });

  return { posts, total };
}

/** 获取用户发布的文章（兼容） */
export function getUserPosts(authorId: string): BlogPost[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM community_posts WHERE author_id = ? AND kind = 'post' ORDER BY created_at DESC`,
    )
    .all(authorId) as BlogPostRow[];
  return rows.map((row) => {
    const authorName = db.prepare('SELECT display_name FROM users WHERE id = ?').get(row.author_id) as { display_name: string | null } | undefined;
    return toPost(row, authorName?.display_name ?? null);
  });
}

/** 浏览计数 */
export function incrementViewCount(postId: string): void {
  const db = getDb();
  db.prepare("UPDATE community_posts SET view_count = view_count + 1 WHERE id = ? AND kind = 'post'").run(postId);
}

function computePaginationLocal(page?: number, pageSize?: number): { page: number; pageSize: number; offset: number } {
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.min(100, Math.max(1, pageSize ?? 20));
  return { page: safePage, pageSize: safePageSize, offset: (safePage - 1) * safePageSize };
}
