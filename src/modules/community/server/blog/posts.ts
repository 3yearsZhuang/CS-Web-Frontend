/**
 * @file 博客文章服务
 */

import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { AppError, assertOwnership } from '@/shared/app-error';
import type { BlogListOptions, BlogPost, BlogPostInput } from '../../types';
import { VALID_CATEGORIES } from '../../types';
import { generateSlug, parseTagsJson, toPost, type BlogPostRow } from './utils';

function validateInput(input: BlogPostInput): string | null {
  if (!input.title || input.title.trim().length === 0) return '标题不能为空';
  if (input.title.trim().length > 200) return '标题不能超过 200 字';
  if (!input.contentMarkdown || input.contentMarkdown.trim().length === 0) return '内容不能为空';
  if (input.category && !VALID_CATEGORIES.includes(input.category)) return `分类必须为 ${VALID_CATEGORIES.join(' / ')}`;
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
    `INSERT INTO blog_posts (id, title, slug, excerpt, content_markdown, cover_image, category, tags, author_id, series_id, series_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title.trim(),
    slug,
    input.excerpt?.trim() || null,
    input.contentMarkdown,
    input.coverImage?.trim() || null,
    input.category || 'general',
    tagsStr,
    authorId,
    input.seriesId || null,
    input.seriesOrder ?? 0,
  );

  return getPostById(id)!;
}

/** 更新博客文章 */
export function updatePost(authorId: string, postId: string, input: Partial<BlogPostInput>, isAdmin: boolean): BlogPost {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(postId) as BlogPostRow | undefined;
  if (!existing) throw new AppError('文章不存在', 'NOT_FOUND');

  assertOwnership(authorId, existing.author_id, isAdmin, '文章', '编辑');

  const merged: BlogPostInput = {
    title: input.title ?? existing.title,
    excerpt: input.excerpt !== undefined ? input.excerpt : existing.excerpt ?? undefined,
    contentMarkdown: input.contentMarkdown ?? existing.content_markdown,
    coverImage: input.coverImage !== undefined ? input.coverImage : existing.cover_image ?? undefined,
    category: input.category ?? existing.category,
    tags: input.tags ?? parseTagsJson(existing.tags),
    seriesId: input.seriesId !== undefined ? input.seriesId : existing.series_id ?? undefined,
    seriesOrder: input.seriesOrder ?? existing.series_order,
  };

  const err = validateInput(merged);
  if (err) throw new AppError(err, 'VALIDATION_ERROR');

  const tagsStr = merged.tags?.length ? JSON.stringify(merged.tags) : '[]';

  db.prepare(
    `UPDATE blog_posts SET title = ?, excerpt = ?, content_markdown = ?, cover_image = ?, category = ?, tags = ?, series_id = ?, series_order = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(
    merged.title.trim(),
    merged.excerpt?.trim() || null,
    merged.contentMarkdown,
    merged.coverImage?.trim() || null,
    merged.category || 'general',
    tagsStr,
    merged.seriesId || null,
    merged.seriesOrder ?? 0,
    postId,
  );

  return getPostById(postId)!;
}

/** 发布博客文章 */
export function publishPost(_adminId: string, postId: string): BlogPost {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(postId) as BlogPostRow | undefined;
  if (!existing) throw new AppError('文章不存在', 'NOT_FOUND');
  if (existing.status === 'published') throw new AppError('文章已发布', 'INVALID_STATUS');

  db.prepare(
    `UPDATE blog_posts SET status = 'published', published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
  ).run(postId);

  return getPostById(postId)!;
}

/** 归档博客文章 */
export function archivePost(_adminId: string, postId: string): BlogPost {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(postId) as BlogPostRow | undefined;
  if (!existing) throw new AppError('文章不存在', 'NOT_FOUND');

  db.prepare(
    `UPDATE blog_posts SET status = 'archived', updated_at = datetime('now') WHERE id = ?`,
  ).run(postId);

  return getPostById(postId)!;
}

/** 删除博客文章 */
export function deletePost(userId: string, postId: string, isAdmin: boolean): void {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM blog_posts WHERE id = ?').get(postId) as BlogPostRow | undefined;
  if (!existing) throw new AppError('文章不存在', 'NOT_FOUND');

  assertOwnership(userId, existing.author_id, isAdmin, '文章', '删除');

  db.prepare('DELETE FROM blog_posts WHERE id = ?').run(postId);
}

/** 根据 ID 获取文章 */
export function getPostById(postId: string): BlogPost | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT bp.*, u.display_name
       FROM blog_posts bp
       LEFT JOIN users u ON bp.author_id = u.id
       WHERE bp.id = ?`,
    )
    .get(postId) as (BlogPostRow & { display_name: string | null }) | undefined;
  if (!row) return null;
  return toPost(row, row.display_name);
}

/** 根据 slug 获取文章 */
export function getPostBySlug(slug: string): BlogPost | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT bp.*, u.display_name
       FROM blog_posts bp
       LEFT JOIN users u ON bp.author_id = u.id
       WHERE bp.slug = ?`,
    )
    .get(slug) as (BlogPostRow & { display_name: string | null }) | undefined;
  if (!row) return null;
  return toPost(row, row.display_name);
}

/** 分页列出博客文章 */
export function listPosts(opts: BlogListOptions = {}): { posts: BlogPost[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.status) {
    conditions.push('bp.status = ?');
    params.push(opts.status);
  }
  if (opts.category) {
    conditions.push('bp.category = ?');
    params.push(opts.category);
  }
  if (opts.authorId) {
    conditions.push('bp.author_id = ?');
    params.push(opts.authorId);
  }
  if (opts.seriesId) {
    conditions.push('bp.series_id = ?');
    params.push(opts.seriesId);
  }
  if (opts.tag) {
    conditions.push("bp.tags LIKE ?");
    params.push(`%"${opts.tag}"%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const total = (db.prepare(`SELECT COUNT(*) AS c FROM blog_posts bp ${where}`).all(...params) as Array<{ c: number }>)[0].c;

  const rows = db
    .prepare(
      `SELECT bp.*, u.display_name
       FROM blog_posts bp
       LEFT JOIN users u ON bp.author_id = u.id
       ${where}
       ORDER BY bp.published_at DESC NULLS LAST, bp.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as Array<BlogPostRow & { display_name: string | null }>;

  return {
    posts: rows.map((r) => toPost(r, r.display_name)),
    total,
  };
}

/** 获取用户的所有文章 */
export function getUserPosts(userId: string): BlogPost[] {
  return listPosts({ authorId: userId, pageSize: 100 }).posts;
}
