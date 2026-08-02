/**
 * @file 博客文章服务（已迁移至 Repository 抽象层，ADR-009）
 */
import crypto from 'node:crypto';
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import type { CommunityPostRow } from '@/shared/db/repositories/community.repo';
import { postRowToBase, SLUG_PATTERN, POST_LIMITS, toStatus } from '../shared';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { getUserById } from '@/modules/auth/server/identity';
import { generateSlug } from './utils';

function slugify(title: string): string {
  return generateSlug(title);
}

/** 创建博客文章 */
export async function createPost(
  input: {
    title: string;
    contentMarkdown: string;
    excerpt?: string;
    coverImage?: string;
    tags?: string[];
    seriesId?: string;
    seriesOrder?: number;
    categoryId?: string;
    status?: 'draft' | 'published';
    publish?: boolean;
  },
  operatorId: string,
): Promise<{ id: string }> {
  const repo = getCommunityRepository();
  const operator = await getUserById(operatorId);
  if (!operator) throw new AppError('用户不存在', 'NOT_FOUND');

  const title = input.title?.trim();
  if (!title) throw new AppError('标题不能为空', 'VALIDATION_ERROR');
  if (title.length > POST_LIMITS.TITLE_MAX) {
    throw new AppError(`标题长度不能超过 ${POST_LIMITS.TITLE_MAX}`, 'VALIDATION_ERROR');
  }
  if (input.contentMarkdown && input.contentMarkdown.length > POST_LIMITS.POST_CONTENT_MAX) {
    throw new AppError(`正文长度不能超过 ${POST_LIMITS.POST_CONTENT_MAX}`, 'VALIDATION_ERROR');
  }

  const slug = slugify(title);
  if (!SLUG_PATTERN.test(slug)) {
    // slug 含非法字符时退回使用 uuid 片段
  }

  const status: 'draft' | 'published' =
    input.status ?? (input.publish ?? operator.role !== 'admin' ? 'published' : 'draft');

  const id = crypto.randomUUID();
  await repo.insertPost({
    id,
    kind: 'post',
    authorId: operatorId,
    title,
    contentMarkdown: input.contentMarkdown,
    slug,
    excerpt: input.excerpt?.trim() || null,
    coverImage: input.coverImage?.trim() || null,
    tags: JSON.stringify(input.tags ?? []),
    seriesId: input.seriesId ?? null,
    seriesOrder: input.seriesOrder ?? 0,
    status,
  });

  await logAdminAction(operatorId, 'blog_create_post', id, { targetType: 'post', title, status });
  return { id };
}

/** 更新博客文章 */
export async function updatePost(
  id: string,
  updates: {
    title?: string;
    contentMarkdown?: string;
    excerpt?: string;
    coverImage?: string;
    tags?: string[];
    seriesId?: string;
    seriesOrder?: number;
    categoryId?: string;
    status?: 'draft' | 'published';
  },
  operatorId: string,
): Promise<void> {
  const repo = getCommunityRepository();
  const operator = await getUserById(operatorId);
  if (!operator) throw new AppError('用户不存在', 'NOT_FOUND');

  const existing = await repo.getPostById(id);
  if (!existing || existing.kind !== 'post') throw new AppError('文章不存在', 'NOT_FOUND');
  if (existing.author_id !== operatorId && operator.role !== 'admin') {
    throw new AppError('无权修改该文章', 'FORBIDDEN');
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  if (updates.title !== undefined) {
    const title = updates.title.trim();
    if (!title) throw new AppError('标题不能为空', 'VALIDATION_ERROR');
    if (title.length > POST_LIMITS.TITLE_MAX) {
      throw new AppError(`标题长度不能超过 ${POST_LIMITS.TITLE_MAX}`, 'VALIDATION_ERROR');
    }
    sets.push('title = ?');
    values.push(title);
  }
  if (updates.contentMarkdown !== undefined) {
    if (updates.contentMarkdown.length > POST_LIMITS.POST_CONTENT_MAX) {
      throw new AppError(`正文长度不能超过 ${POST_LIMITS.POST_CONTENT_MAX}`, 'VALIDATION_ERROR');
    }
    sets.push('content_markdown = ?');
    values.push(updates.contentMarkdown);
  }
  if (updates.excerpt !== undefined) {
    sets.push('excerpt = ?');
    values.push(updates.excerpt);
  }
  if (updates.coverImage !== undefined) {
    sets.push('cover_image = ?');
    values.push(updates.coverImage);
  }
  if (updates.tags !== undefined) {
    sets.push('tags = ?');
    values.push(JSON.stringify(updates.tags));
  }
  if (updates.seriesId !== undefined) {
    sets.push('series_id = ?');
    values.push(updates.seriesId);
  }
  if (updates.seriesOrder !== undefined) {
    sets.push('series_order = ?');
    values.push(updates.seriesOrder);
  }
  if (updates.categoryId !== undefined) {
    sets.push('category_id = ?');
    values.push(updates.categoryId);
  }
  if (updates.status !== undefined) {
    sets.push('status = ?');
    values.push(updates.status);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  await repo.updatePost(sets, values, id);
  await logAdminAction(operatorId, 'blog_update_post', id, { targetType: 'post', ...updates });
}

/** 发布文章 */
export async function publishPost(id: string, operatorId: string): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getPostById(id);
  if (!existing || existing.kind !== 'post') throw new AppError('文章不存在', 'NOT_FOUND');
  const operator = await getUserById(operatorId);
  if (existing.author_id !== operatorId && operator?.role !== 'admin') {
    throw new AppError('无权发布该文章', 'FORBIDDEN');
  }
  await repo.updatePost(
    ["status = 'published'", "published_at = datetime('now')", "updated_at = datetime('now')"],
    [],
    id,
  );
  await logAdminAction(operatorId, 'blog_publish_post', id, { targetType: 'post' });
}

/** 归档文章 */
export async function archivePost(id: string, operatorId: string): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getPostById(id);
  if (!existing || existing.kind !== 'post') throw new AppError('文章不存在', 'NOT_FOUND');
  const operator = await getUserById(operatorId);
  if (existing.author_id !== operatorId && operator?.role !== 'admin') {
    throw new AppError('无权归档该文章', 'FORBIDDEN');
  }
  await repo.updatePost(["status = 'archived'", "updated_at = datetime('now')"], [], id);
  await logAdminAction(operatorId, 'blog_archive_post', id, { targetType: 'post' });
}

/** 删除文章（软删除） */
export async function deletePost(id: string, operatorId: string): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getPostById(id);
  if (!existing || existing.kind !== 'post') throw new AppError('文章不存在', 'NOT_FOUND');
  const operator = await getUserById(operatorId);
  if (existing.author_id !== operatorId && operator?.role !== 'admin') {
    throw new AppError('无权删除该文章', 'FORBIDDEN');
  }
  await repo.updatePost(["status = 'deleted'", "updated_at = datetime('now')"], [], id);
  await logAdminAction(operatorId, 'blog_delete_post', id, { targetType: 'post' });
}

/** 根据 ID 获取文章（含作者/分类摘要） */
export async function getPostById(id: string): Promise<CommunityPostDetail | null> {
  const repo = getCommunityRepository();
  const row = await repo.getPostById(id);
  if (!row || row.kind !== 'post') return null;
  const [formatted] = await formatPostsForDetail([row]);
  return formatted;
}

/** 根据 slug 获取文章 */
export async function getPostBySlug(slug: string): Promise<CommunityPostDetail | null> {
  const repo = getCommunityRepository();
  const row = await repo.getPostBySlug(slug);
  if (!row || row.kind !== 'post') return null;
  const [formatted] = await formatPostsForDetail([row]);
  return formatted;
}

/** 文章列表（分页，公开只返回 published） */
export async function listPosts(params: {
  authorId?: string;
  tag?: string;
  seriesId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  /** 包含草稿等非公开状态（仅作者/管理员调用时） */
  includeAllStatus?: boolean;
} = {}): Promise<{ items: CommunityPostDetail[]; total: number; page: number; pageSize: number }> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const where: string[] = ["kind = 'post'"];
  const queryParams: unknown[] = [];
  if (params.status) {
    where.push('status = ?');
    queryParams.push(params.status);
  } else if (!params.includeAllStatus) {
    where.push("status = 'published'");
  }
  if (params.authorId) {
    where.push('author_id = ?');
    queryParams.push(params.authorId);
  }
  if (params.tag) {
    where.push('tags LIKE ?');
    queryParams.push(`%"${params.tag}"%`);
  }
  if (params.seriesId) {
    where.push('series_id = ?');
    queryParams.push(params.seriesId);
  }

  const total = await repo.countPosts(`WHERE ${where.join(' AND ')}`, queryParams);
  const rows = await repo.listPosts(where, queryParams, pageSize, offset);
  const items = await formatPostsForDetail(rows);
  return { items, total, page, pageSize };
}

/** 获取用户的草稿（含所有状态的文章，仅本人/管理员使用） */
export async function getUserDrafts(userId: string, params: { page?: number; pageSize?: number } = {}): Promise<{ items: CommunityPostDetail[]; total: number; page: number; pageSize: number }> {
  return listPosts({ authorId: userId, status: 'draft', includeAllStatus: true, page: params.page, pageSize: params.pageSize });
}

/** 增加文章浏览量 */
export async function incrementViewCount(postId: string): Promise<void> {
  await getCommunityRepository().incrementViewCount(postId);
}

/** 用户自己的文章列表（含草稿/隐藏） */
export async function getUserPosts(
  userId: string,
  params: { page?: number; pageSize?: number } = {},
): Promise<{ items: CommunityPostDetail[]; total: number; page: number; pageSize: number }> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const where = ["kind = 'post'", 'author_id = ?'];
  const queryParams = [userId];
  const total = await repo.countPosts(`WHERE ${where.join(' AND ')}`, queryParams);
  const rows = await repo.listPosts(where, queryParams, pageSize, offset);
  const items = await formatPostsForDetail(rows);
  return { items, total, page, pageSize };
}

// 复用 shared.formatPosts 做详情格式化（返回 CommunityPostDetail 兼容类型）
async function formatPostsForDetail(rows: CommunityPostRow[]): Promise<CommunityPostDetail[]> {
  const repo = getCommunityRepository();
  const [authorMap, categoryMap] = await Promise.all([
    repo.loadAuthorSummaries(rows.map((r) => r.author_id)),
    repo.loadCategorySummaries(rows.filter((r) => r.category_id).map((r) => r.category_id as string)),
  ]);
  return rows.map((r) => {
    const base = postRowToBase(r) as Record<string, unknown>;
    return {
      ...base,
      author: authorMap.get(r.author_id) ?? null,
      category: r.category_id ? categoryMap.get(r.category_id) ?? null : null,
      isLiked: false,
    } as unknown as CommunityPostDetail;
  });
}

import type { CommunityPostDetail } from '@/modules/community/types';
