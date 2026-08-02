/**
 * @file 资源 CRUD 服务
 */

import crypto from 'node:crypto';
import { getDbEngine } from '@/shared/db/drivers';
import { getToolsRepository } from '@/shared/db/repositories';
import { computePagination } from '@/shared/utils/pagination';
import {
  type ResourceType,
  type ResourceStatus,
  type Resource,
  type ResourceWithAuthor,
  type CreateResourceInput,
  type UpdateResourceInput,
  type ResourceQueryInput,
  type ResourceListResult,
} from '../../types';
import type { QueryParams } from '@/shared/db/drivers';
import type { ResourceRow } from '@/shared/db/repositories';

/** 资源类型中文标签映射 */
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  article: '文章',
  video: '视频',
  course: '课程',
  tool: '工具',
  book: '书籍',
  other: '其他',
};

/** 提交新资源 */
export async function createResource(
  userId: string,
  input: CreateResourceInput,
): Promise<{ ok: true; resource: Resource } | { ok: false; error: string }> {
  const repo = getToolsRepository();
  const engine = await getDbEngine();
  const id = crypto.randomUUID();

  const title = input.title.trim();
  const url = input.url.trim();
  const description = input.description?.trim() || null;
  const resourceType: ResourceType = input.resourceType || 'article';
  const techTags = input.techTags?.length ? JSON.stringify(input.techTags) : null;
  const fileUrl = input.fileUrl || null;

  if (!title || !url) {
    return { ok: false, error: '标题和链接不能为空' };
  }

  await engine.transaction(async (tx) => {
    await repo.insertResource(tx, { id, title, url, description, resourceType, techTags, fileUrl, submittedBy: userId });
  });

  const resource = await repo.getResourceById(id);
  return { ok: true, resource: resource as Resource };
}

/** 更新资源信息 */
export async function updateResource(
  resourceId: string,
  userId: string,
  input: UpdateResourceInput,
): Promise<{ ok: true; resource: Resource } | { ok: false; error: string }> {
  const repo = getToolsRepository();
  const existing = await repo.getResourceById(resourceId);
  if (!existing) {
    return { ok: false, error: '资源不存在' };
  }
  if (existing.submitted_by !== userId) {
    return { ok: false, error: '只能编辑自己提交的资源' };
  }

  const fields: Record<string, unknown> = {};

  if (input.title !== undefined) fields.title = input.title.trim();
  if (input.url !== undefined) fields.url = input.url.trim();
  if (input.description !== undefined) fields.description = input.description.trim() || null;
  if (input.resourceType !== undefined) fields.resourceType = input.resourceType;
  if (input.techTags !== undefined) fields.techTags = input.techTags.length ? JSON.stringify(input.techTags) : null;

  if (Object.keys(fields).length === 0) {
    return { ok: false, error: '没有需要更新的字段' };
  }

  fields.status = 'draft';

  await repo.updateResource(resourceId, fields as Partial<ResourceRow>);

  const updated = await repo.getResourceById(resourceId);
  return { ok: true, resource: updated as Resource };
}

/** 删除资源 */
export async function deleteResource(
  resourceId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const repo = getToolsRepository();
  const existing = await repo.getResourceById(resourceId);
  if (!existing) {
    return { ok: false, error: '资源不存在' };
  }
  if (existing.submitted_by !== userId) {
    return { ok: false, error: '只能删除自己提交的资源' };
  }

  await repo.deleteResource(resourceId);
  return { ok: true };
}

function buildResourceQuery(input: ResourceQueryInput, userId?: string): {
  where: string;
  args: QueryParams;
} {
  const conditions: string[] = [];
  const args: QueryParams = [];

  if (input.status) {
    conditions.push('r.status = ?');
    args.push(input.status);
  } else {
    conditions.push("r.status = 'published'");
  }

  if (input.resourceType) {
    conditions.push('r.resource_type = ?');
    args.push(input.resourceType);
  }

  if (input.techTag) {
    conditions.push('EXISTS (SELECT 1 FROM json_each(r.tech_tags) WHERE value = ?)');
    args.push(input.techTag);
  }

  if (userId) {
    conditions.push('r.submitted_by = ?');
    args.push(userId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, args };
}

/** 分页列出资源 */
export async function listResources(
  input: ResourceQueryInput,
  userId?: string,
): Promise<ResourceListResult> {
  const repo = getToolsRepository();
  const { page, pageSize } = computePagination({
    page: input.page,
    pageSize: input.pageSize,
    defaultPageSize: 20,
    maxPageSize: 50,
  });

  const { where, args } = buildResourceQuery(input, userId);

  const orderBy = input.sort === 'popular'
    ? 'r.like_count DESC, r.view_count DESC, r.created_at DESC'
    : 'r.created_at DESC';

  const total = await repo.countResources(where, args);

  const offset = (page - 1) * pageSize;
  const resources = await repo.listResourcesWithAuthor(where, [...args, pageSize, offset] as QueryParams, orderBy);

  const techTagCounts: Record<string, number> = {};
  const counts = await repo.getTechTagCounts(input.techTag ?? null);
  for (const c of counts) {
    techTagCounts[c.tech_tag] = c.count;
  }

  const totalPages = Math.ceil(total / pageSize) || 1;

  return { resources: resources as ResourceWithAuthor[], total, page, totalPages, techTagCounts };
}

/** 根据 ID 获取资源详情 */
export async function getResourceById(resourceId: string): Promise<ResourceWithAuthor | null> {
  const repo = getToolsRepository();
  const rows = await repo.listResourcesWithAuthor('WHERE r.id = ?', [resourceId, 1, 0] as QueryParams);
  return (rows[0] as ResourceWithAuthor) ?? null;
}

/** 获取用户提交的资源列表 */
export async function getUserResources(
  userId: string,
  status?: ResourceStatus,
): Promise<Resource[]> {
  const repo = getToolsRepository();
  return repo.getUserResources(userId, status ?? null) as Promise<Resource[]>;
}

/** 增加资源查看次数 */
export async function incrementResourceView(resourceId: string): Promise<void> {
  const repo = getToolsRepository();
  await repo.incrementResourceView(resourceId);
}
