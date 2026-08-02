/**
 * @file 资源审核服务
 */

import { getToolsRepository } from '@/shared/db/repositories';
import { logAdminAction } from '@/shared/security/audit';
import {
  type Resource,
  type ResourceWithAuthor,
  type ReviewResourceInput,
} from '../../types';
import type { ResourceRow } from '@/shared/db/repositories';

/** 管理员审核资源 */
export async function reviewResource(
  resourceId: string,
  adminId: string,
  input: ReviewResourceInput,
  ip?: string,
  userAgent?: string,
): Promise<{ ok: true; resource: Resource } | { ok: false; error: string }> {
  const repo = getToolsRepository();
  const existing = await repo.getResourceById(resourceId);
  if (!existing) {
    return { ok: false, error: '资源不存在' };
  }
  if (existing.status !== 'draft') {
    return { ok: false, error: '该资源已审核' };
  }

  const note = input.note?.trim() || null;

  await repo.updateResource(resourceId, {
    status: input.status,
    reviewedBy: adminId,
    reviewNote: note,
  } as Partial<ResourceRow>);

  logAdminAction(
    adminId,
    input.status === 'published' ? 'approve_resource' : 'hide_resource',
    existing.submitted_by,
    { resource_id: resourceId, title: existing.title, note },
    ip ?? null,
    userAgent ?? null,
  );

  const updated = await repo.getResourceById(resourceId);
  return { ok: true, resource: updated as Resource };
}

/** 列出待审核的资源 */
export async function listPendingResources(page = 1, pageSize = 20): Promise<{
  resources: ResourceWithAuthor[];
  total: number;
  totalPages: number;
}> {
  const repo = getToolsRepository();
  const offset = (page - 1) * pageSize;

  const total = await repo.countPendingResources();
  const resources = await repo.listPendingResourcesWithAuthor(pageSize, offset);

  return { resources: resources as ResourceWithAuthor[], total, totalPages: Math.ceil(total / pageSize) || 1 };
}
