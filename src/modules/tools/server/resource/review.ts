/**
 * @file 资源审核服务
 */

import { getDb } from '@/shared/db';
import { logAdminAction } from '@/shared/security/audit';
import {
  type Resource,
  type ResourceWithAuthor,
  type ReviewResourceInput,
} from '../../types';

/** 管理员审核资源 */
export function reviewResource(
  resourceId: string,
  adminId: string,
  input: ReviewResourceInput,
  ip?: string,
  userAgent?: string,
): { ok: true; resource: Resource } | { ok: false; error: string } {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Resource | undefined;
  if (!existing) {
    return { ok: false, error: '资源不存在' };
  }
  if (existing.status !== 'draft') {
    return { ok: false, error: '该资源已审核' };
  }

  const note = input.note?.trim() || null;

  db.prepare(`
    UPDATE resources
    SET status = ?, reviewed_by = ?, review_note = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(input.status, adminId, note, resourceId);

  logAdminAction(
    adminId,
    input.status === 'published' ? 'approve_resource' : 'hide_resource',
    existing.submitted_by,
    { resource_id: resourceId, title: existing.title, note },
    ip ?? null,
    userAgent ?? null,
  );

  const updated = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Resource;
  return { ok: true, resource: updated };
}

/** 列出待审核的资源 */
export function listPendingResources(page = 1, pageSize = 20): {
  resources: ResourceWithAuthor[];
  total: number;
  totalPages: number;
} {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  const total = (db.prepare(
    'SELECT COUNT(*) as count FROM resources WHERE status = \'draft\'',
  ).get() as { count: number }).count;

  const resources = db.prepare(`
    SELECT r.*,
      u.display_name AS author_display_name,
      u.avatar_url AS author_avatar_url,
      u.tech_tags AS author_tech_tags
    FROM resources r
    LEFT JOIN users u ON r.submitted_by = u.id
    WHERE r.status = 'draft'
    ORDER BY r.created_at ASC
    LIMIT ? OFFSET ?
  `).all(pageSize, offset) as ResourceWithAuthor[];

  return { resources, total, totalPages: Math.ceil(total / pageSize) || 1 };
}
