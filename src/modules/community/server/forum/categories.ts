/**
 * @file 论坛分类服务（已迁移至 Repository 抽象层，ADR-009）
 */
import crypto from 'node:crypto';
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import type { CommunityCategoryRow } from '@/shared/db/repositories/community.repo';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { getUserById } from '@/modules/auth/server/identity';
import { FORUM_LIMITS, SLUG_PATTERN, toCategory } from './shared';
import type { CommunityCategory, CategorySummary, CategoryInput } from '@/modules/community/types';

export type { CategoryInput };

function toCategorySummary(row: CommunityCategoryRow): CategorySummary {
  return { id: row.id, slug: row.slug, name: row.name };
}

function rowToCategory(row: CommunityCategoryRow): CommunityCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
    postCount: row.post_count,
    topicCount: row.post_count,
    createdBy: row.created_by ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? '',
  };
}

export async function listCategories(): Promise<CommunityCategory[]> {
  const repo = getCommunityRepository();
  const rows = await repo.listCategories();
  return rows.map(rowToCategory);
}

export async function getCategoryById(id: string): Promise<CommunityCategory | null> {
  const repo = getCommunityRepository();
  const row = await repo.getCategoryById(id);
  return row ? rowToCategory(row) : null;
}

export async function getCategoryBySlug(slug: string): Promise<CommunityCategory | null> {
  const repo = getCommunityRepository();
  const row = await repo.getCategoryBySlug(slug);
  return row ? rowToCategory(row) : null;
}

export async function createCategory(
  input: { name: string; slug: string; description?: string; icon?: string },
  operatorId: string,
): Promise<{ id: string }> {
  const repo = getCommunityRepository();
  const operator = await getUserById(operatorId);
  if (operator?.role !== 'admin') throw new AppError('权限不足', 'FORBIDDEN');

  const name = input.name?.trim();
  const slug = input.slug?.trim();
  if (!name) throw new AppError('分类名称不能为空', 'VALIDATION_ERROR');
  if (!slug) throw new AppError('分类 slug 不能为空', 'VALIDATION_ERROR');
  if (!SLUG_PATTERN.test(slug)) throw new AppError('slug 格式不正确', 'VALIDATION_ERROR');
  if (name.length > FORUM_LIMITS.CATEGORY_NAME_MAX) {
    throw new AppError(`分类名称长度不能超过 ${FORUM_LIMITS.CATEGORY_NAME_MAX}`, 'VALIDATION_ERROR');
  }
  if (input.description && input.description.length > FORUM_LIMITS.CATEGORY_DESC_MAX) {
    throw new AppError(`分类描述长度不能超过 ${FORUM_LIMITS.CATEGORY_DESC_MAX}`, 'VALIDATION_ERROR');
  }

  const existing = await repo.findCategoryBySlug(slug);
  if (existing) throw new AppError('分类 slug 已存在', 'CONFLICT');

  const id = crypto.randomUUID();
  await repo.insertCategory({
    id,
    slug,
    name,
    description: input.description ?? null,
    icon: input.icon ?? null,
    sortOrder: 0,
    createdBy: operatorId,
  });
  await logAdminAction(operatorId, 'community.category.create', id, { targetType: 'category', name, slug });
  return { id };
}

export async function updateCategory(
  categoryId: string,
  updates: { name?: string; description?: string; icon?: string; slug?: string },
  operatorId: string,
): Promise<void> {
  const repo = getCommunityRepository();
  const operator = await getUserById(operatorId);
  if (operator?.role !== 'admin') throw new AppError('权限不足', 'FORBIDDEN');

  const category = await repo.getCategoryById(categoryId);
  if (!category) throw new AppError('分类不存在', 'NOT_FOUND');

  const sets: string[] = [];
  const values: unknown[] = [];
  if (updates.name !== undefined) {
    const name = updates.name.trim();
    if (!name) throw new AppError('分类名称不能为空', 'VALIDATION_ERROR');
    if (name.length > FORUM_LIMITS.CATEGORY_NAME_MAX) {
      throw new AppError(`分类名称长度不能超过 ${FORUM_LIMITS.CATEGORY_NAME_MAX}`, 'VALIDATION_ERROR');
    }
    sets.push('name = ?');
    values.push(name);
  }
  if (updates.description !== undefined) {
    sets.push('description = ?');
    values.push(updates.description);
  }
  if (updates.icon !== undefined) {
    sets.push('icon = ?');
    values.push(updates.icon);
  }
  if (updates.slug !== undefined) {
    const slug = updates.slug.trim();
    if (!SLUG_PATTERN.test(slug)) throw new AppError('slug 格式不正确', 'VALIDATION_ERROR');
    const existing = await repo.findCategoryBySlug(slug);
    if (existing && existing.id !== categoryId) throw new AppError('分类 slug 已存在', 'CONFLICT');
    sets.push('slug = ?');
    values.push(slug);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  await repo.updateCategory(categoryId, sets, values);
  await logAdminAction(operatorId, 'community.category.update', categoryId, { targetType: 'category', ...updates });
}

export async function deleteCategory(categoryId: string, operatorId: string): Promise<void> {
  const repo = getCommunityRepository();
  const operator = await getUserById(operatorId);
  if (operator?.role !== 'admin') throw new AppError('权限不足', 'FORBIDDEN');

  const category = await repo.getCategoryById(categoryId);
  if (!category) throw new AppError('分类不存在', 'NOT_FOUND');
  await repo.deleteCategory(categoryId);
  await logAdminAction(operatorId, 'community.category.delete', categoryId, { targetType: 'category' });
}

export async function canManageCategory(userId: string, categoryId: string): Promise<boolean> {
  const operator = await getUserById(userId);
  if (operator?.role === 'admin') return true;
  return false;
}
