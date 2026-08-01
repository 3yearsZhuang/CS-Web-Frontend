/**
 * @file 论坛服务层 — 版块（公开读 + 管理员写）
 */
import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import {
  FORUM_LIMITS,
  SLUG_PATTERN,
  toCategory,
  type CommunityCategory,
  type CategoryRow,
} from './shared';

/** 列出所有版块（按 sort_order 升序），含统计数 */
export function listCategories(): CommunityCategory[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM community_categories ORDER BY sort_order ASC, created_at ASC')
    .all() as CategoryRow[];
  return rows.map(toCategory);
}

/** 按 slug 查询版块 */
export function getCategoryBySlug(slug: string): CommunityCategory | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM community_categories WHERE slug = ?')
    .get(slug) as CategoryRow | undefined;
  return row ? toCategory(row) : null;
}

/** 按 ID 查询版块 */
export function getCategoryById(id: string): CommunityCategory | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM community_categories WHERE id = ?').get(id) as
    | CategoryRow
    | undefined;
  return row ? toCategory(row) : null;
}

/** 创建版块的输入 */
export interface CategoryInput {
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

/** 校验版块输入 */
function validateCategoryInput(input: CategoryInput, isUpdate = false): void {
  if (!isUpdate || input.slug !== undefined) {
    if (!input.slug || !SLUG_PATTERN.test(input.slug)) {
      throw new AppError('slug 只能包含小写字母、数字和短横线，长度 1-32', 'VALIDATION_ERROR');
    }
  }
  if (!isUpdate || input.name !== undefined) {
    if (!input.name || !input.name.trim()) {
      throw new AppError('版块名称不能为空', 'VALIDATION_ERROR');
    }
    if (input.name.length > FORUM_LIMITS.CATEGORY_NAME_MAX) {
      throw new AppError(`版块名称不能超过 ${FORUM_LIMITS.CATEGORY_NAME_MAX} 字符`, 'VALIDATION_ERROR');
    }
  }
  if (input.description !== undefined && input.description !== null) {
    if (input.description.length > FORUM_LIMITS.CATEGORY_DESC_MAX) {
      throw new AppError(`版块描述不能超过 ${FORUM_LIMITS.CATEGORY_DESC_MAX} 字符`, 'VALIDATION_ERROR');
    }
  }
}

/** 创建版块（管理员）— slug 冲突抛 'SLUG_EXISTS' */
export function createCategory(adminId: string, input: CategoryInput): CommunityCategory {
  validateCategoryInput(input);
  const db = getDb();

  const existing = db
    .prepare('SELECT id FROM community_categories WHERE slug = ?')
    .get(input.slug);
  if (existing) {
    throw new AppError('slug 已存在', 'SLUG_EXISTS');
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO community_categories (id, slug, name, description, icon, sort_order, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.slug,
    input.name.trim(),
    input.description ?? null,
    input.icon ?? null,
    input.sortOrder ?? 0,
    adminId,
  );

  logAdminAction(adminId, 'forum_create_category', null, {
    categoryId: id,
    slug: input.slug,
    name: input.name,
  });

  const row = db.prepare('SELECT * FROM community_categories WHERE id = ?').get(id) as CategoryRow;
  return toCategory(row);
}

/** 更新版块（管理员） */
export function updateCategory(
  adminId: string,
  categoryId: string,
  input: Partial<CategoryInput>,
): CommunityCategory {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM community_categories WHERE id = ?')
    .get(categoryId) as CategoryRow | undefined;
  if (!existing) {
    throw new AppError('版块不存在', 'NOT_FOUND');
  }

  const merged: CategoryInput = {
    slug: input.slug !== undefined ? input.slug : existing.slug,
    name: input.name !== undefined ? input.name : existing.name,
    description: input.description !== undefined ? input.description : existing.description,
    icon: input.icon !== undefined ? input.icon : existing.icon,
    sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sort_order,
  };
  validateCategoryInput(merged, true);

  // slug 变更时检查冲突
  if (input.slug !== undefined && input.slug !== existing.slug) {
    const conflict = db
      .prepare('SELECT id FROM community_categories WHERE slug = ? AND id != ?')
      .get(input.slug, categoryId);
    if (conflict) {
      throw new AppError('slug 已存在', 'SLUG_EXISTS');
    }
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  if (input.slug !== undefined) {
    sets.push('slug = ?');
    values.push(input.slug);
  }
  if (input.name !== undefined) {
    sets.push('name = ?');
    values.push(input.name.trim());
  }
  if (input.description !== undefined) {
    sets.push('description = ?');
    values.push(input.description ?? null);
  }
  if (input.icon !== undefined) {
    sets.push('icon = ?');
    values.push(input.icon ?? null);
  }
  if (input.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    values.push(input.sortOrder);
  }
  if (sets.length === 0) return toCategory(existing);

  sets.push("updated_at = datetime('now')");
  values.push(categoryId);
  db.prepare(`UPDATE community_categories SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  logAdminAction(adminId, 'forum_update_category', null, { categoryId, changes: input });

  const row = db
    .prepare('SELECT * FROM community_categories WHERE id = ?')
    .get(categoryId) as CategoryRow;
  return toCategory(row);
}

/** 删除版块（管理员）— 级联删除主题与回复（FK ON DELETE CASCADE） */
export function deleteCategory(adminId: string, categoryId: string): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, slug, name FROM community_categories WHERE id = ?')
    .get(categoryId) as { id: string; slug: string; name: string } | undefined;
  if (!existing) {
    throw new AppError('版块不存在', 'NOT_FOUND');
  }

  db.prepare('DELETE FROM community_categories WHERE id = ?').run(categoryId);

  logAdminAction(adminId, 'forum_delete_category', null, {
    categoryId,
    slug: existing.slug,
    name: existing.name,
  });
}
