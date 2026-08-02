/**
 * @file 组件注册表 — 服务层 CRUD（items / variants / guides 三表）
 */

import { randomUUID } from 'crypto';
import { getDbEngine } from '@/shared/db/drivers';
import { getToolsRepository } from '@/shared/db/repositories';
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
export async function listComponents(): Promise<ComponentItem[]> {
  const repo = getToolsRepository();

  const items = await repo.listComponentItems();

  if (items.length === 0) return [];

  // 批量查询变体与规范（避免 N+1）
  const variantsByItem = new Map<string, ComponentVariant[]>();
  const guidesByItem = new Map<string, ComponentGuide>();

  for (const row of items) {
    const variants = (await repo.getComponentVariants(row.id)).map(toVariant);
    variantsByItem.set(row.id, variants);
    const guideRow = await repo.getComponentGuide(row.id);
    guidesByItem.set(row.id, guideRow ? toGuide(guideRow) : { useCases: [], antiPatterns: [] });
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
export async function createComponent(input: ComponentItemInput): Promise<ComponentItem> {
  const repo = getToolsRepository();
  const engine = await getDbEngine();

  // slug 唯一性检查
  const existing = await repo.getComponentItemBySlug(input.slug);
  if (existing) throw new AppError('slug 已存在', 'SLUG_EXISTS');

  const id = `cmp-${randomUUID().slice(0, 8)}`;
  const status: MigrationStatus = input.migrationStatus ?? 'legacy';
  if (!VALID_STATUSES.includes(status)) throw new AppError('无效的迁移状态', 'VALIDATION_ERROR');

  // 计算 sort_order（追加到末尾）
  const maxOrder = await repo.getMaxComponentSortOrder();
  const sortOrder = maxOrder + 1;

  await engine.transaction(async (tx) => {
    await repo.insertComponentItem(tx, {
      id,
      name: input.name,
      slug: input.slug,
      category: input.category,
      description: input.description,
      migrationStatus: status,
      sortOrder,
    });

    // 生成全量变体网格
    for (const size of ALL_VARIANT_SIZES) {
      for (const color of ALL_VARIANT_COLORS) {
        for (const state of ALL_VARIANT_STATES) {
          await repo.insertComponentVariant(tx, {
            id: `${id}:${size}:${color}:${state}`,
            itemId: id,
            size,
            color,
            state,
          });
        }
      }
    }

    await repo.insertComponentGuide(tx, `guide:${id}`, id);
  });

  // 返回完整对象
  const row = (await repo.listComponentItems()).find((r) => r.id === id) as ComponentItemRow;
  const variants = (await repo.getComponentVariants(id)).map(toVariant);
  const guideRow = await repo.getComponentGuide(id);
  const guide = guideRow ? toGuide(guideRow) : { useCases: [], antiPatterns: [] };

  return toItem(row, variants, guide);
}

/** 更新组件条目（名称、分类、描述、迁移状态） */
export async function updateComponent(id: string, patch: Partial<ComponentItemInput>): Promise<ComponentItem> {
  const repo = getToolsRepository();
  const row = await repo.listComponentItems().then((items) => items.find((r) => r.id === id));
  if (!row) throw new AppError('组件不存在', 'NOT_FOUND');

  const updates: Record<string, unknown> = {};

  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.slug !== undefined) {
    // slug 唯一性检查（排除自身）
    const dup = await repo.getComponentItemBySlug(patch.slug);
    if (dup && dup.id !== id) throw new AppError('slug 已存在', 'SLUG_EXISTS');
    updates.slug = patch.slug;
  }
  if (patch.category !== undefined) updates.category = patch.category;
  if (patch.description !== undefined) updates.description = patch.description;
  if (patch.migrationStatus !== undefined) {
    if (!VALID_STATUSES.includes(patch.migrationStatus)) throw new AppError('无效的迁移状态', 'VALIDATION_ERROR');
    updates.migrationStatus = patch.migrationStatus;
  }

  if (Object.keys(updates).length > 0) {
    await repo.updateComponentItem(id, updates as Partial<ComponentItemRow>);
  }

  // 返回更新后的完整对象
  const updatedRow = (await repo.listComponentItems()).find((r) => r.id === id) as ComponentItemRow;
  const variants = (await repo.getComponentVariants(id)).map(toVariant);
  const guideRow = await repo.getComponentGuide(id);
  const guide = guideRow ? toGuide(guideRow) : { useCases: [], antiPatterns: [] };

  return toItem(updatedRow, variants, guide);
}

/** 删除组件条目（级联删除变体与规范） */
export async function deleteComponent(id: string): Promise<void> {
  const repo = getToolsRepository();
  const engine = await getDbEngine();
  const row = (await repo.listComponentItems()).find((r) => r.id === id);
  if (!row) throw new AppError('组件不存在', 'NOT_FOUND');
  await engine.transaction(async (tx) => {
    await repo.deleteComponentVariants(id);
    await repo.deleteComponentGuides(id);
    await repo.deleteComponentItem(id);
  });
}

/** 切换变体启用/禁用状态 */
export async function toggleVariant(itemId: string, variantId: string, enabled: boolean): Promise<void> {
  const repo = getToolsRepository();
  const variant = (await repo.getComponentVariants(itemId)).find((v) => v.id === variantId);
  if (!variant) throw new AppError('变体不存在', 'NOT_FOUND');

  await repo.updateVariantEnabled(variantId, enabled);
}

/** 更新使用规范（适用场景与反模式） */
export async function updateGuide(itemId: string, input: ComponentGuideInput): Promise<ComponentGuide> {
  const repo = getToolsRepository();
  const item = (await repo.listComponentItems()).find((r) => r.id === itemId);
  if (!item) throw new AppError('组件不存在', 'NOT_FOUND');

  await repo.upsertComponentGuide(itemId, JSON.stringify(input.useCases), JSON.stringify(input.antiPatterns));

  return { useCases: input.useCases, antiPatterns: input.antiPatterns };
}
