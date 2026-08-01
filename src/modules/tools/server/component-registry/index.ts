/**
 * @file 组件注册表 — 服务层 CRUD（items / variants / guides 三表）
 */

import { randomUUID } from 'crypto';
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import {
  type MigrationStatus,
  type VariantSize,
  type VariantColor,
  type VariantState,
  type ComponentItem,
  type ComponentVariant,
  type ComponentGuide,
  type ComponentItemInput,
  type ComponentGuideInput,
  type ComponentItemRow,
  type ComponentVariantRow,
  type ComponentGuideRow,
  ALL_VARIANT_SIZES,
  ALL_VARIANT_COLORS,
  ALL_VARIANT_STATES,
} from '../../types';

const VALID_STATUSES: MigrationStatus[] = ['legacy', 'migrating', 'done'];

/** DB 行 → 领域对象转换 */
function toVariant(row: ComponentVariantRow): ComponentVariant {
  return {
    id: row.id,
    itemId: row.item_id,
    size: row.size as VariantSize,
    color: row.color as VariantColor,
    state: row.state as VariantState,
    isEnabled: row.is_enabled === 1,
  };
}

function toGuide(row: ComponentGuideRow): ComponentGuide {
  let useCases: string[] = [];
  let antiPatterns: string[] = [];
  try {
    useCases = JSON.parse(row.use_cases) as string[];
  } catch { /* ignore */ }
  try {
    antiPatterns = JSON.parse(row.anti_patterns) as string[];
  } catch { /* ignore */ }
  return { useCases, antiPatterns };
}

function toItem(row: ComponentItemRow, variants: ComponentVariant[], guide: ComponentGuide): ComponentItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    description: row.description ?? '',
    migrationStatus: (row.migration_status as MigrationStatus) ?? 'legacy',
    sortOrder: row.sort_order,
    variants,
    guide,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 查询全量组件列表（含变体与使用规范），按 sort_order 排序 */
export function listComponents(): ComponentItem[] {
  const db = getDb();

  const items = db
    .prepare('SELECT * FROM component_registry_items ORDER BY sort_order ASC')
    .all() as ComponentItemRow[];

  if (items.length === 0) return [];

  // 批量查询变体与规范（避免 N+1）
  const variantsByItem = new Map<string, ComponentVariant[]>();
  const guidesByItem = new Map<string, ComponentGuide>();

  const allVariants = db
    .prepare('SELECT * FROM component_registry_variants ORDER BY item_id, size, color, state')
    .all() as ComponentVariantRow[];

  for (const v of allVariants) {
    const list = variantsByItem.get(v.item_id) ?? [];
    list.push(toVariant(v));
    variantsByItem.set(v.item_id, list);
  }

  const allGuides = db
    .prepare('SELECT * FROM component_registry_guides')
    .all() as ComponentGuideRow[];

  for (const g of allGuides) {
    guidesByItem.set(g.item_id, toGuide(g));
  }

  return items.map((row) =>
    toItem(
      row,
      variantsByItem.get(row.id) ?? [],
      guidesByItem.get(row.id) ?? { useCases: [], antiPatterns: [] },
    ),
  );
}

/** 创建组件条目，同时生成全量变体网格与空规范 */
export function createComponent(input: ComponentItemInput): ComponentItem {
  const db = getDb();

  // slug 唯一性检查
  const existing = db.prepare('SELECT id FROM component_registry_items WHERE slug = ?').get(input.slug);
  if (existing) throw new AppError('slug 已存在', 'SLUG_EXISTS');

  const id = `cmp-${randomUUID().slice(0, 8)}`;
  const status: MigrationStatus = input.migrationStatus ?? 'legacy';
  if (!VALID_STATUSES.includes(status)) throw new AppError('无效的迁移状态', 'VALIDATION_ERROR');

  // 计算 sort_order（追加到末尾）
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM component_registry_items').get() as { m: number | null } | undefined;
  const sortOrder = (maxOrder?.m ?? 0) + 1;

  const insertItem = db.prepare(
    `INSERT INTO component_registry_items (id, name, slug, category, description, migration_status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertVariant = db.prepare(
    `INSERT OR IGNORE INTO component_registry_variants (id, item_id, size, color, state, is_enabled)
     VALUES (?, ?, ?, ?, ?, 1)`,
  );
  const insertGuide = db.prepare(
    `INSERT INTO component_registry_guides (id, item_id, use_cases, anti_patterns)
     VALUES (?, ?, '[]', '[]')`,
  );

  const tx = db.transaction(() => {
    insertItem.run(id, input.name, input.slug, input.category, input.description, status, sortOrder);

    // 生成全量变体网格
    for (const size of ALL_VARIANT_SIZES) {
      for (const color of ALL_VARIANT_COLORS) {
        for (const state of ALL_VARIANT_STATES) {
          insertVariant.run(`${id}:${size}:${color}:${state}`, id, size, color, state);
        }
      }
    }

    insertGuide.run(`guide:${id}`, id);
  });

  tx();

  // 返回完整对象
  const row = db.prepare('SELECT * FROM component_registry_items WHERE id = ?').get(id) as ComponentItemRow;
  const variants = (db.prepare('SELECT * FROM component_registry_variants WHERE item_id = ? ORDER BY size, color, state').all(id) as ComponentVariantRow[]).map(toVariant);
  const guideRow = db.prepare('SELECT * FROM component_registry_guides WHERE item_id = ?').get(id) as ComponentGuideRow | undefined;
  const guide = guideRow ? toGuide(guideRow) : { useCases: [], antiPatterns: [] };

  return toItem(row, variants, guide);
}

/** 更新组件条目（名称、分类、描述、迁移状态） */
export function updateComponent(id: string, patch: Partial<ComponentItemInput>): ComponentItem {
  const db = getDb();

  const row = db.prepare('SELECT * FROM component_registry_items WHERE id = ?').get(id) as ComponentItemRow | undefined;
  if (!row) throw new AppError('组件不存在', 'NOT_FOUND');

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (patch.name !== undefined) {
    updates.push('name = ?');
    params.push(patch.name);
  }
  if (patch.slug !== undefined) {
    // slug 唯一性检查（排除自身）
    const dup = db.prepare('SELECT id FROM component_registry_items WHERE slug = ? AND id != ?').get(patch.slug, id);
    if (dup) throw new AppError('slug 已存在', 'SLUG_EXISTS');
    updates.push('slug = ?');
    params.push(patch.slug);
  }
  if (patch.category !== undefined) {
    updates.push('category = ?');
    params.push(patch.category);
  }
  if (patch.description !== undefined) {
    updates.push('description = ?');
    params.push(patch.description);
  }
  if (patch.migrationStatus !== undefined) {
    if (!VALID_STATUSES.includes(patch.migrationStatus)) throw new AppError('无效的迁移状态', 'VALIDATION_ERROR');
    updates.push('migration_status = ?');
    params.push(patch.migrationStatus);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE component_registry_items SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  // 返回更新后的完整对象
  const updatedRow = db.prepare('SELECT * FROM component_registry_items WHERE id = ?').get(id) as ComponentItemRow;
  const variants = (db.prepare('SELECT * FROM component_registry_variants WHERE item_id = ? ORDER BY size, color, state').all(id) as ComponentVariantRow[]).map(toVariant);
  const guideRow = db.prepare('SELECT * FROM component_registry_guides WHERE item_id = ?').get(id) as ComponentGuideRow | undefined;
  const guide = guideRow ? toGuide(guideRow) : { useCases: [], antiPatterns: [] };

  return toItem(updatedRow, variants, guide);
}

/** 删除组件条目（级联删除变体与规范） */
export function deleteComponent(id: string): void {
  const db = getDb();
  const row = db.prepare('SELECT id FROM component_registry_items WHERE id = ?').get(id);
  if (!row) throw new AppError('组件不存在', 'NOT_FOUND');
  db.prepare('DELETE FROM component_registry_items WHERE id = ?').run(id);
}

/** 切换变体启用/禁用状态 */
export function toggleVariant(itemId: string, variantId: string, enabled: boolean): void {
  const db = getDb();

  const variant = db.prepare('SELECT * FROM component_registry_variants WHERE id = ? AND item_id = ?').get(variantId, itemId) as ComponentVariantRow | undefined;
  if (!variant) throw new AppError('变体不存在', 'NOT_FOUND');

  db.prepare('UPDATE component_registry_variants SET is_enabled = ? WHERE id = ?').run(enabled ? 1 : 0, variantId);
}

/** 更新使用规范（适用场景与反模式） */
export function updateGuide(itemId: string, input: ComponentGuideInput): ComponentGuide {
  const db = getDb();

  const item = db.prepare('SELECT id FROM component_registry_items WHERE id = ?').get(itemId);
  if (!item) throw new AppError('组件不存在', 'NOT_FOUND');

  const guide = db.prepare('SELECT * FROM component_registry_guides WHERE item_id = ?').get(itemId) as ComponentGuideRow | undefined;
  if (!guide) {
    db.prepare(
      `INSERT INTO component_registry_guides (id, item_id, use_cases, anti_patterns)
       VALUES (?, ?, ?, ?)`,
    ).run(`guide:${itemId}`, itemId, JSON.stringify(input.useCases), JSON.stringify(input.antiPatterns));
  } else {
    db.prepare(
      `UPDATE component_registry_guides SET use_cases = ?, anti_patterns = ?, updated_at = datetime('now') WHERE item_id = ?`,
    ).run(JSON.stringify(input.useCases), JSON.stringify(input.antiPatterns), itemId);
  }

  return { useCases: input.useCases, antiPatterns: input.antiPatterns };
}
