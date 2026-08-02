/**
 * @file 话题服务（已迁移至 Repository 抽象层，ADR-009）
 */
import crypto from 'node:crypto';
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import type { CommunityPostRow, CommunityCategoryRow } from '@/shared/db/repositories/community.repo';
import { computePagination, formatBlogPosts, formatPosts, type FormattedBlogPost, type FormattedPost, type PaginationInfo } from '../shared';
import { resolveMentionedUsers, notifyMentionedUsers } from './mentions';
import { processCommentMentions } from './replies';
import { generateSlug } from '@/modules/community/server/blog/utils';
import { parseTagsJson } from '../shared';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { getUserById } from '@/modules/auth/server/identity';
import { canManageCategory } from './categories';
import type { DbEngine } from '@/shared/db/drivers';

export interface TopicListResult {
  items: FormattedPost[];
  pagination: PaginationInfo;
}

export async function listTopics(params: {
  category?: string;
  author?: string;
  status?: string;
  pinned?: boolean;
  featured?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  currentUserId?: string;
}): Promise<TopicListResult> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const where: string[] = ["kind = 'topic'"];
  const queryParams: unknown[] = [];
  if (params.category) {
    where.push('category_id = ?');
    queryParams.push(params.category);
  }
  if (params.author) {
    where.push('author_id = ?');
    queryParams.push(params.author);
  }
  if (params.status) {
    where.push('status = ?');
    queryParams.push(params.status);
  }
  if (params.pinned !== undefined) {
    where.push('is_pinned = ?');
    queryParams.push(params.pinned ? 1 : 0);
  }
  if (params.featured !== undefined) {
    where.push('is_featured = ?');
    queryParams.push(params.featured ? 1 : 0);
  }
  if (params.search) {
    where.push('(title LIKE ? OR content_markdown LIKE ?)');
    const like = `%${params.search}%`;
    queryParams.push(like, like);
  }

  const total = await repo.countPosts(`WHERE ${where.join(' AND ')}`, queryParams);
  const rows = await repo.listPosts(where, queryParams, pageSize, offset);
  const items = await formatPosts(rows, { currentUserId: params.currentUserId });

  return { items, pagination: computePagination(page, pageSize, total) };
}

export async function getTopic(id: string, options?: { currentUserId?: string }): Promise<FormattedPost> {
  const repo = getCommunityRepository();
  const row = await repo.getPostById(id);
  if (!row || row.kind !== 'topic') throw new AppError('话题不存在', 'TOPIC_NOT_FOUND');
  const [formatted] = await formatPosts([row], { currentUserId: options?.currentUserId });
  return formatted;
}

export async function getTopicBySlug(slug: string, options?: { currentUserId?: string }): Promise<FormattedPost> {
  const repo = getCommunityRepository();
  const row = await repo.getPostBySlug(slug);
  if (!row || row.kind !== 'topic') throw new AppError('话题不存在', 'TOPIC_NOT_FOUND');
  const [formatted] = await formatPosts([row], { currentUserId: options?.currentUserId });
  return formatted;
}

export async function createTopic(input: {
  categoryId: string;
  title: string;
  contentMarkdown: string;
  authorId: string;
  status?: string;
  isPinned?: boolean;
  isFeatured?: boolean;
  tags?: string[];
}): Promise<{ id: string }> {
  const repo = getCommunityRepository();
  const category = await repo.getCategoryById(input.categoryId);
  if (!category) throw new AppError('分类不存在', 'CATEGORY_NOT_FOUND');

  const user = await getUserById(input.authorId);
  if (!user || user.role !== 'admin' || input.status !== 'draft') {
    // 普通作者发布需审核或默认 published（按现有逻辑默认 published）
  }
  const status = input.status ?? (user && user.role !== 'admin' ? 'pending_review' : 'published');

  const id = crypto.randomUUID();
  const slug = generateSlug(input.title);
  await repo.insertPost({
    id,
    kind: 'topic',
    authorId: input.authorId,
    title: input.title,
    contentMarkdown: input.contentMarkdown,
    slug,
    excerpt: null,
    coverImage: null,
    tags: JSON.stringify(input.tags ?? []),
    seriesId: null,
    seriesOrder: 0,
    status,
  });

  await processCommentMentions(id, input.contentMarkdown, input.authorId);

  if (status === 'published') {
    const mentioned = await resolveMentionedUsers(input.contentMarkdown);
    await notifyMentionedUsers(mentioned, 'topic', id, input.authorId);
    await repo.incrementCategoryPostCountByTopic(id);
  }

  return { id };
}

export async function updateTopic(
  id: string,
  updates: {
    categoryId?: string;
    title?: string;
    contentMarkdown?: string;
    status?: string;
    isPinned?: boolean;
    isFeatured?: boolean;
    tags?: string[];
  },
  editorId: string,
): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getPostById(id);
  if (!existing) throw new AppError('话题不存在', 'TOPIC_NOT_FOUND');

  const editor = await getUserById(editorId);
  const isAdmin = editor?.role === 'admin';
  if (existing.author_id !== editorId && !isAdmin) {
    throw new AppError('无权修改该话题', 'FORBIDDEN');
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  if (updates.categoryId !== undefined) {
    sets.push('category_id = ?');
    values.push(updates.categoryId);
  }
  if (updates.title !== undefined) {
    sets.push('title = ?');
    values.push(updates.title);
  }
  if (updates.contentMarkdown !== undefined) {
    sets.push('content_markdown = ?');
    values.push(updates.contentMarkdown);
  }
  if (updates.isPinned !== undefined) {
    sets.push('is_pinned = ?');
    values.push(updates.isPinned ? 1 : 0);
  }
  if (updates.isFeatured !== undefined) {
    sets.push('is_featured = ?');
    values.push(updates.isFeatured ? 1 : 0);
  }
  if (updates.tags !== undefined) {
    sets.push('tags = ?');
    values.push(JSON.stringify(updates.tags));
  }
  if (updates.status !== undefined) {
    sets.push('status = ?');
    values.push(updates.status);
  }
  sets.push("updated_at = datetime('now')");
  await repo.updatePost(sets, values, id);

  if (updates.contentMarkdown !== undefined) {
    const mentioned = await resolveMentionedUsers(updates.contentMarkdown);
    await notifyMentionedUsers(mentioned, 'topic', id, editorId);
  }
}

export async function deleteTopic(id: string, deleterId: string, reason?: string): Promise<void> {
  const repo = getCommunityRepository();
  const topic = await repo.getTopicStatusCategory(id);
  if (!topic) throw new AppError('话题不存在', 'TOPIC_NOT_FOUND');
  await repo.updatePost(["status = 'deleted'", "updated_at = datetime('now')"], [], id);
  await logAdminAction(deleterId, 'community.topic.delete', id, { targetType: 'topic', reason });
}

export async function pinTopic(id: string, pinned: boolean, operatorId: string): Promise<void> {
  const repo = getCommunityRepository();
  if (!(await repo.getTopicStatusCategory(id))) throw new AppError('话题不存在', 'TOPIC_NOT_FOUND');
  await repo.updatePost(['is_pinned = ?', "updated_at = datetime('now')"], [pinned ? 1 : 0], id);
  await logAdminAction(operatorId, 'community.topic.pin', id, { targetType: 'topic', pinned });
}

export async function featureTopic(id: string, featured: boolean, operatorId: string): Promise<void> {
  const repo = getCommunityRepository();
  if (!(await repo.getTopicStatusCategory(id))) throw new AppError('话题不存在', 'TOPIC_NOT_FOUND');
  await repo.updatePost(['is_featured = ?', "updated_at = datetime('now')"], [featured ? 1 : 0], id);
  await logAdminAction(operatorId, 'community.topic.feature', id, { targetType: 'topic', featured });
}

export async function incrementViewCount(topicId: string): Promise<void> {
  await getCommunityRepository().incrementViewCount(topicId);
}

export async function listBlogPosts(params: {
  category?: string;
  author?: string;
  status?: string;
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
  currentUserId?: string;
}): Promise<{ items: FormattedBlogPost[]; pagination: PaginationInfo }> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const where: string[] = ["kind = 'post'"];
  const queryParams: unknown[] = [];
  if (params.category) {
    where.push('category_id = ?');
    queryParams.push(params.category);
  }
  if (params.author) {
    where.push('author_id = ?');
    queryParams.push(params.author);
  }
  if (params.status) {
    where.push('status = ?');
    queryParams.push(params.status);
  }
  if (params.search) {
    where.push('(title LIKE ? OR content_markdown LIKE ?)');
    const like = `%${params.search}%`;
    queryParams.push(like, like);
  }

  const total = await repo.countPosts(`WHERE ${where.join(' AND ')}`, queryParams);
  const rows = await repo.listPosts(where, queryParams, pageSize, offset);
  const items = await formatBlogPosts(rows, { currentUserId: params.currentUserId });

  return { items, pagination: computePagination(page, pageSize, total) };
}

export async function getBlogPost(id: string, options?: { currentUserId?: string }): Promise<FormattedBlogPost> {
  const repo = getCommunityRepository();
  const row = await repo.getPostById(id);
  if (!row || row.kind !== 'post') throw new AppError('文章不存在', 'POST_NOT_FOUND');
  const [formatted] = await formatBlogPosts([row], { currentUserId: options?.currentUserId });
  return formatted;
}

export async function getBlogPostBySlug(slug: string, options?: { currentUserId?: string }): Promise<FormattedBlogPost> {
  const repo = getCommunityRepository();
  const row = await repo.getPostBySlug(slug);
  if (!row || row.kind !== 'post') throw new AppError('文章不存在', 'POST_NOT_FOUND');
  const [formatted] = await formatBlogPosts([row], { currentUserId: options?.currentUserId });
  return formatted;
}

export async function createBlogPost(input: {
  categoryId?: string;
  title: string;
  contentMarkdown: string;
  authorId: string;
  status?: string;
  excerpt?: string;
  coverImage?: string;
  tags?: string[];
  seriesId?: string;
  seriesOrder?: number;
  publish?: boolean;
}): Promise<{ id: string }> {
  const repo = getCommunityRepository();
  const id = crypto.randomUUID();
  const slug = generateSlug(input.title);
  const status = input.status ?? (input.publish ? 'published' : 'draft');
  await repo.insertPost({
    id,
    kind: 'post',
    authorId: input.authorId,
    title: input.title,
    contentMarkdown: input.contentMarkdown,
    slug,
    excerpt: input.excerpt ?? null,
    coverImage: input.coverImage ?? null,
    tags: JSON.stringify(input.tags ?? []),
    seriesId: input.seriesId ?? null,
    seriesOrder: input.seriesOrder ?? 0,
    status,
  });
  await processCommentMentions(id, input.contentMarkdown, input.authorId);
  if (status === 'published') {
    const mentioned = await resolveMentionedUsers(input.contentMarkdown);
    await notifyMentionedUsers(mentioned, 'post', id, input.authorId);
  }
  return { id };
}

export async function updateBlogPost(
  id: string,
  updates: {
    categoryId?: string;
    title?: string;
    contentMarkdown?: string;
    status?: string;
    excerpt?: string;
    coverImage?: string;
    tags?: string[];
    seriesId?: string;
    seriesOrder?: number;
  },
  editorId: string,
): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getPostById(id);
  if (!existing) throw new AppError('文章不存在', 'POST_NOT_FOUND');
  const editor = await getUserById(editorId);
  const isAdmin = editor?.role === 'admin';
  if (existing.author_id !== editorId && !isAdmin) {
    throw new AppError('无权修改该文章', 'FORBIDDEN');
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  if (updates.categoryId !== undefined) {
    sets.push('category_id = ?');
    values.push(updates.categoryId);
  }
  if (updates.title !== undefined) {
    sets.push('title = ?');
    values.push(updates.title);
  }
  if (updates.contentMarkdown !== undefined) {
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
  if (updates.status !== undefined) {
    sets.push('status = ?');
    values.push(updates.status);
  }
  sets.push("updated_at = datetime('now')");
  await repo.updatePost(sets, values, id);

  if (updates.contentMarkdown !== undefined) {
    const mentioned = await resolveMentionedUsers(updates.contentMarkdown);
    await notifyMentionedUsers(mentioned, 'post', id, editorId);
  }
}

export async function deleteBlogPost(id: string, deleterId: string, reason?: string): Promise<void> {
  const repo = getCommunityRepository();
  const post = await repo.getPostStatus(id);
  if (!post) throw new AppError('文章不存在', 'POST_NOT_FOUND');
  await repo.updatePost(["status = 'deleted'", "updated_at = datetime('now')"], [], id);
  await logAdminAction(deleterId, 'community.post.delete', id, { targetType: 'post', reason });
}

export async function publishBlogPost(id: string, operatorId: string): Promise<void> {
  const repo = getCommunityRepository();
  if (!(await repo.getPostStatus(id))) throw new AppError('文章不存在', 'POST_NOT_FOUND');
  await repo.updatePost(["status = 'published'", "published_at = datetime('now')", "updated_at = datetime('now')"], [], id);
  await logAdminAction(operatorId, 'community.post.publish', id, { targetType: 'post' });
}

export async function getPostForEdit(id: string): Promise<CommunityPostRow> {
  const repo = getCommunityRepository();
  const row = await repo.getPostById(id);
  if (!row) throw new AppError('文章不存在', 'POST_NOT_FOUND');
  return row;
}

export async function searchTopics(params: {
  q: string;
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<TopicListResult> {
  return listTopics({
    search: params.q,
    category: params.category,
    page: params.page,
    pageSize: params.pageSize,
    status: 'published',
  });
}

export { canManageCategory };

/** 兼容别名 */
export async function getTopicById(id: string, options?: { currentUserId?: string }): Promise<FormattedPost> {
  return getTopic(id, options);
}
export async function recordTopicView(topicId: string): Promise<void> {
  return incrementViewCount(topicId);
}
export type { ListTopicsFilters, PaginatedPosts, PostInput } from '@/modules/community/types';
export type { TopicListResult as PaginatedPostsResult } from './topics';
