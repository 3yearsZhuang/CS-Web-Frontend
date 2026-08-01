/**
 * @file 博客系列服务
 */

import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { AppError, assertOwnership } from '@/shared/app-error';
import type { BlogSeries, BlogSeriesInput } from '../../types';
import { generateSlug } from './utils';

interface BlogSeriesRow {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  created_by: string;
  created_at: string;
}

/** 创建博客系列 */
export function createSeries(userId: string, input: BlogSeriesInput): BlogSeries {
  if (!input.title?.trim()) throw new AppError('系列标题不能为空', 'VALIDATION_ERROR');

  const db = getDb();
  const id = crypto.randomUUID();
  const slug = generateSlug(input.title);

  db.prepare(
    'INSERT INTO blog_series (id, title, description, slug, created_by) VALUES (?, ?, ?, ?, ?)',
  ).run(id, input.title.trim(), input.description?.trim() || null, slug, userId);

  return getSeriesById(id)!;
}

/** 根据 ID 获取系列 */
export function getSeriesById(seriesId: string): BlogSeries | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM blog_series WHERE id = ?').get(seriesId) as BlogSeriesRow | undefined;
  if (!row) return null;

  const postCount = (db.prepare('SELECT COUNT(*) AS c FROM blog_posts WHERE series_id = ?').get(seriesId) as { c: number }).c;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    createdBy: row.created_by,
    createdAt: row.created_at,
    postCount,
  };
}

/** 列出所有系列 */
export function listSeries(): BlogSeries[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM blog_series ORDER BY created_at DESC').all() as BlogSeriesRow[];

  return rows.map((row) => {
    const postCount = (db.prepare('SELECT COUNT(*) AS c FROM blog_posts WHERE series_id = ?').get(row.id) as { c: number }).c;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      createdBy: row.created_by,
      createdAt: row.created_at,
      postCount,
    };
  });
}

/** 删除系列 */
export function deleteSeries(userId: string, seriesId: string, isAdmin: boolean): void {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM blog_series WHERE id = ?').get(seriesId) as BlogSeriesRow | undefined;
  if (!existing) throw new AppError('系列不存在', 'NOT_FOUND');

  assertOwnership(userId, existing.created_by, isAdmin, '系列', '删除');

  db.prepare('UPDATE blog_posts SET series_id = NULL WHERE series_id = ?').run(seriesId);
  db.prepare('DELETE FROM blog_series WHERE id = ?').run(seriesId);
}
