/**
 * @file 博客系列服务（已迁移至 Repository 抽象层，ADR-009）
 */
import crypto from 'node:crypto';
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
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

function toBlogSeries(row: BlogSeriesRow, postCount: number): BlogSeries {
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

/** 创建博客系列 */
export async function createSeries(userId: string, input: BlogSeriesInput): Promise<BlogSeries> {
  if (!input.title?.trim()) throw new AppError('系列标题不能为空', 'VALIDATION_ERROR');
  const repo = getCommunityRepository();
  const id = crypto.randomUUID();
  const slug = generateSlug(input.title);
  await repo.insertSeries({ id, title: input.title.trim(), description: input.description?.trim() || null, slug, createdBy: userId });
  return (await getSeriesById(id))!;
}

/** 根据 ID 获取系列 */
export async function getSeriesById(seriesId: string): Promise<BlogSeries | null> {
  const repo = getCommunityRepository();
  const row = await repo.getSeriesById(seriesId);
  if (!row) return null;
  const postCount = await repo.countPostsBySeries(seriesId);
  return toBlogSeries(row, postCount);
}

/** 列出所有系列 */
export async function listSeries(): Promise<BlogSeries[]> {
  const repo = getCommunityRepository();
  const rows = await repo.listSeries();
  return Promise.all(
    rows.map(async (row) => {
      const postCount = await repo.countPostsBySeries(row.id);
      return toBlogSeries(row, postCount);
    }),
  );
}

/** 删除系列 */
export async function deleteSeries(userId: string, seriesId: string, isAdmin: boolean): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getSeriesById(seriesId);
  if (!existing) throw new AppError('系列不存在', 'NOT_FOUND');
  assertOwnership(userId, existing.created_by, isAdmin, '系列', '删除');
  await repo.clearSeriesOnPosts(seriesId);
  await repo.deleteSeriesById(seriesId);
}
