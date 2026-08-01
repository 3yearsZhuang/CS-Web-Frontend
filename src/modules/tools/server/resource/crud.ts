/**
 * @file 资源 CRUD 服务
 */

import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
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
export function createResource(
  userId: string,
  input: CreateResourceInput,
): { ok: true; resource: Resource } | { ok: false; error: string } {
  const db = getDb();
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

  db.prepare(`
    INSERT INTO resources (id, title, url, description, resource_type, tech_tags, file_url, submitted_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, url, description, resourceType, techTags, fileUrl, userId);

  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as Resource;
  return { ok: true, resource };
}

/** 更新资源信息 */
export function updateResource(
  resourceId: string,
  userId: string,
  input: UpdateResourceInput,
): { ok: true; resource: Resource } | { ok: false; error: string } {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Resource | undefined;
  if (!existing) {
    return { ok: false, error: '资源不存在' };
  }
  if (existing.submitted_by !== userId) {
    return { ok: false, error: '只能编辑自己提交的资源' };
  }

  const fields: string[] = [];
  const args: unknown[] = [];

  if (input.title !== undefined) {
    fields.push('title = ?');
    args.push(input.title.trim());
  }
  if (input.url !== undefined) {
    fields.push('url = ?');
    args.push(input.url.trim());
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    args.push(input.description.trim() || null);
  }
  if (input.resourceType !== undefined) {
    fields.push('resource_type = ?');
    args.push(input.resourceType);
  }
  if (input.techTags !== undefined) {
    fields.push('tech_tags = ?');
    args.push(input.techTags.length ? JSON.stringify(input.techTags) : null);
  }

  if (fields.length === 0) {
    return { ok: false, error: '没有需要更新的字段' };
  }

  fields.push('updated_at = datetime(\'now\')');
  fields.push('status = \'draft\'');
  args.push(resourceId);

  db.prepare(`UPDATE resources SET ${fields.join(', ')} WHERE id = ?`).run(...args);

  const updated = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Resource;
  return { ok: true, resource: updated };
}

/** 删除资源 */
export function deleteResource(
  resourceId: string,
  userId: string,
): { ok: true } | { ok: false; error: string } {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId) as Resource | undefined;
  if (!existing) {
    return { ok: false, error: '资源不存在' };
  }
  if (existing.submitted_by !== userId) {
    return { ok: false, error: '只能删除自己提交的资源' };
  }

  db.prepare('DELETE FROM resources WHERE id = ?').run(resourceId);
  return { ok: true };
}

function buildResourceQuery(input: ResourceQueryInput, userId?: string): {
  where: string;
  args: unknown[];
} {
  const conditions: string[] = [];
  const args: unknown[] = [];

  if (input.status) {
    conditions.push('r.status = ?');
    args.push(input.status);
  } else {
    conditions.push('r.status = \'published\'');
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
export function listResources(
  input: ResourceQueryInput,
  userId?: string,
): ResourceListResult {
  const db = getDb();
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

  const totalRow = db.prepare(
    `SELECT COUNT(*) as count FROM resources r ${where}`,
  ).get(...args) as { count: number };
  const total = totalRow.count;

  const offset = (page - 1) * pageSize;
  const resources = db.prepare(`
    SELECT r.*,
      u.display_name AS author_display_name,
      u.avatar_url AS author_avatar_url,
      u.tech_tags AS author_tech_tags,
      ur.display_name AS reviewer_display_name
    FROM resources r
    LEFT JOIN users u ON r.submitted_by = u.id
    LEFT JOIN users ur ON r.reviewed_by = ur.id
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...args, pageSize, offset) as ResourceWithAuthor[];

  const techTagCounts: Record<string, number> = {};
  if (input.techTag) {
    const counts = db.prepare(`
      SELECT tech_tag, COUNT(*) as count FROM (
        SELECT json_each.value AS tech_tag
        FROM resources r, json_each(r.tech_tags)
        WHERE r.status = 'published'
      )
      WHERE tech_tag = ?
      GROUP BY tech_tag
    `).all(input.techTag) as Array<{ tech_tag: string; count: number }>;
    for (const c of counts) {
      techTagCounts[c.tech_tag] = c.count;
    }
  } else {
    const counts = db.prepare(`
      SELECT json_each.value AS tech_tag, COUNT(*) as count
      FROM resources r, json_each(r.tech_tags)
      WHERE r.status = 'published'
      GROUP BY tech_tag
    `).all() as Array<{ tech_tag: string; count: number }>;
    for (const c of counts) {
      techTagCounts[c.tech_tag] = c.count;
    }
  }

  const totalPages = Math.ceil(total / pageSize) || 1;

  return { resources, total, page, totalPages, techTagCounts };
}

/** 根据 ID 获取资源详情 */
export function getResourceById(resourceId: string): ResourceWithAuthor | null {
  const db = getDb();
  return db.prepare(`
    SELECT r.*,
      u.display_name AS author_display_name,
      u.avatar_url AS author_avatar_url,
      u.tech_tags AS author_tech_tags,
      ur.display_name AS reviewer_display_name
    FROM resources r
    LEFT JOIN users u ON r.submitted_by = u.id
    LEFT JOIN users ur ON r.reviewed_by = ur.id
    WHERE r.id = ?
  `).get(resourceId) as ResourceWithAuthor | undefined ?? null;
}

/** 获取用户提交的资源列表 */
export function getUserResources(
  userId: string,
  status?: ResourceStatus,
): Resource[] {
  const db = getDb();
  if (status) {
    return db.prepare(
      'SELECT * FROM resources WHERE submitted_by = ? AND status = ? ORDER BY created_at DESC',
    ).all(userId, status) as Resource[];
  }
  return db.prepare(
    'SELECT * FROM resources WHERE submitted_by = ? ORDER BY created_at DESC',
  ).all(userId) as Resource[];
}

/** 增加资源查看次数 */
export function incrementResourceView(resourceId: string): void {
  const db = getDb();
  db.prepare(
    'UPDATE resources SET view_count = view_count + 1 WHERE id = ?',
  ).run(resourceId);
}
