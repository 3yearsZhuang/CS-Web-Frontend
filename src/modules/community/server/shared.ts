/**
 * @file 社区模块共享工具（含批量加载/摘要格式化，统一经 Repository 访问 DB）
 */
import type { DbEngine } from '@/shared/db/drivers';
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import type { CommunityPostRow } from '@/shared/db/repositories/community.repo';
import type { CommunityCommentRow } from '@/shared/db/repositories/community.repo';

// ============ 类型 ============

export interface AuthorSummary {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarType: string;
}

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FormattedCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  postCount: number;
}

export interface FormattedPost {
  id: string;
  kind: string;
  categoryId: string | null;
  category: CategorySummary | null;
  authorId: string;
  author: AuthorSummary | null;
  authorName: string | null;
  title: string;
  contentMarkdown: string;
  excerpt: string | null;
  coverImage: string | null;
  status: string;
  isPinned: boolean;
  isFeatured: boolean;
  replyCount: number;
  favoriteCount: number;
  likeCount: number;
  lastReplyAt: string | null;
  lastReplyId: string | null;
  hiddenBy: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  slug: string | null;
  tags: string[];
  seriesId: string | null;
  seriesOrder: number;
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FormattedComment {
  id: string;
  topicId: string;
  parentReplyId: string | null;
  authorId: string;
  author: AuthorSummary | null;
  contentMarkdown: string;
  status: string;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  hiddenBy: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: FormattedComment[];
}

export interface FormattedBlogPost {
  id: string;
  kind: string;
  categoryId: string | null;
  category: CategorySummary | null;
  authorId: string;
  author: AuthorSummary | null;
  authorName: string | null;
  title: string;
  contentMarkdown: string;
  excerpt: string | null;
  coverImage: string | null;
  status: string;
  isPinned: boolean;
  isFeatured: boolean;
  replyCount: number;
  favoriteCount: number;
  likeCount: number;
  lastReplyAt: string | null;
  lastReplyId: string | null;
  hiddenBy: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  slug: string;
  tags: string[];
  seriesId: string | null;
  seriesOrder: number;
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============ 纯工具函数（无 DB 访问） ============

export function toAuthorSummary(row: {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_type: string;
}): AuthorSummary {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    avatarType: row.avatar_type,
  };
}

export function toCategorySummary(row: {
  id: string;
  slug: string;
  name: string;
}): CategorySummary {
  return { id: row.id, slug: row.slug, name: row.name };
}

export function computePagination(page: number, pageSize: number, total: number): PaginationInfo {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/** 解析 tags JSON 字符串为字符串数组 */
export function parseTagsJson(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toFormattedCategory(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  post_count: number;
}): FormattedCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    postCount: row.post_count,
  };
}

export function toFormattedCategoryList(
  rows: Array<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    post_count: number;
  }>,
): FormattedCategory[] {
  return rows.map(toFormattedCategory);
}

function toFormattedPostBase(row: CommunityPostRow, category: CategorySummary | null, author: AuthorSummary | null): FormattedPost {
  return {
    id: row.id,
    kind: row.kind,
    categoryId: row.category_id,
    category,
    authorId: row.author_id,
    author,
    authorName: author?.displayName ?? null,
    title: row.title,
    contentMarkdown: row.content_markdown,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    status: row.status,
    isPinned: row.is_pinned === 1,
    isFeatured: row.is_featured === 1,
    replyCount: row.reply_count,
    favoriteCount: row.favorite_count,
    likeCount: row.like_count,
    lastReplyAt: row.last_reply_at,
    lastReplyId: row.last_reply_id,
    hiddenBy: row.hidden_by,
    hiddenAt: row.hidden_at,
    hiddenReason: row.hidden_reason,
    slug: row.slug,
    tags: parseTagsJson(row.tags),
    seriesId: row.series_id,
    seriesOrder: row.series_order,
    publishedAt: row.published_at,
    viewCount: row.view_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 批量格式化帖子（统一加载作者/分类摘要，避免 N+1） */
export async function formatPosts(
  rows: CommunityPostRow[],
  options?: { currentUserId?: string },
  eng?: DbEngine,
): Promise<FormattedPost[]> {
  const repo = getCommunityRepository();
  const [authorMap, categoryMap] = await Promise.all([
    repo.loadAuthorSummaries(rows.map((r) => r.author_id), eng),
    repo.loadCategorySummaries(rows.filter((r) => r.category_id).map((r) => r.category_id as string), eng),
  ]);

  const likedSet = new Set<string>();
  if (options?.currentUserId) {
    const targets = await repo.getUserReactionTargets(
      options.currentUserId,
      'like',
      rows.map((r) => r.id),
      eng,
    );
    for (const t of targets) likedSet.add(t);
  }

  return rows.map((r) => {
    const base = toFormattedPostBase(
      r,
      r.category_id ? categoryMap.get(r.category_id) ?? null : null,
      authorMap.get(r.author_id) ?? null,
    );
    return { ...base, isLiked: likedSet.has(r.id) } as FormattedPost;
  });
}

/** 批量格式化博客文章（同 formatPosts，但类型为 BlogPost 兼容） */
export async function formatBlogPosts(
  rows: CommunityPostRow[],
  options?: { currentUserId?: string },
  eng?: DbEngine,
): Promise<FormattedBlogPost[]> {
  const formatted = await formatPosts(rows, options, eng);
  return formatted.map((p) => ({
    id: p.id,
    kind: p.kind,
    categoryId: p.categoryId,
    category: p.category,
    authorId: p.authorId,
    author: p.author,
    authorName: p.authorName,
    title: p.title,
    contentMarkdown: p.contentMarkdown,
    excerpt: p.excerpt,
    coverImage: p.coverImage,
    status: p.status,
    isPinned: p.isPinned,
    isFeatured: p.isFeatured,
    replyCount: p.replyCount,
    favoriteCount: p.favoriteCount,
    likeCount: p.likeCount,
    lastReplyAt: p.lastReplyAt,
    lastReplyId: p.lastReplyId,
    hiddenBy: p.hiddenBy,
    hiddenAt: p.hiddenAt,
    hiddenReason: p.hiddenReason,
    slug: p.slug ?? '',
    tags: p.tags,
    seriesId: p.seriesId,
    seriesOrder: p.seriesOrder,
    publishedAt: p.publishedAt,
    viewCount: p.viewCount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

function toFormattedCommentBase(
  row: CommunityCommentRow,
  author: AuthorSummary | null,
  isLiked: boolean,
): FormattedComment {
  return {
    id: row.id,
    topicId: row.post_id,
    parentReplyId: row.parent_comment_id,
    authorId: row.author_id,
    author,
    contentMarkdown: row.content_markdown,
    status: row.status,
    likeCount: row.like_count,
    replyCount: row.reply_count,
    isLiked,
    hiddenBy: row.hidden_by,
    hiddenAt: row.hidden_at,
    hiddenReason: row.hidden_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 批量格式化评论（统一加载作者摘要，避免 N+1） */
export async function formatComments(
  rows: CommunityCommentRow[],
  options?: { currentUserId?: string; withReplies?: boolean },
  eng?: DbEngine,
): Promise<FormattedComment[]> {
  const repo = getCommunityRepository();
  const authorMap = await repo.loadAuthorSummaries(rows.map((r) => r.author_id), eng);

  const likedSet = new Set<string>();
  if (options?.currentUserId) {
    const targets = await repo.getUserReactionTargets(
      options.currentUserId,
      'like',
      rows.map((r) => r.id),
      eng,
    );
    for (const t of targets) likedSet.add(t);
  }

  const formatted = rows.map((r) =>
    toFormattedCommentBase(r, authorMap.get(r.author_id) ?? null, likedSet.has(r.id)),
  );

  if (options?.withReplies) {
    const byParent = new Map<string | null, FormattedComment[]>();
    for (const c of formatted) {
      const key = c.parentReplyId;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(c);
    }
    const root = byParent.get(null) ?? [];
    const attach = (list: FormattedComment[]): FormattedComment[] =>
      list.map((c) => {
        const children = byParent.get(c.id) ?? [];
        return children.length ? { ...c, replies: attach(children) } : c;
      });
    return attach(root);
  }

  return formatted;
}

/** 批量加载作者摘要（经 Repository，供 service 层复用） */
export async function loadAuthorSummaries(
  ids: string[],
  eng?: DbEngine,
): Promise<Map<string, AuthorSummary>> {
  return getCommunityRepository().loadAuthorSummaries(ids, eng);
}

/** 批量加载分类摘要（经 Repository，供 service 层复用） */
export async function loadCategorySummaries(
  ids: string[],
  eng?: DbEngine,
): Promise<Map<string, CategorySummary>> {
  return getCommunityRepository().loadCategorySummaries(ids, eng);
}

/** 批量获取作者显示名（替代原始 getDb 查询，供通知等模块复用） */
export async function getDisplayNamesByIds(
  ids: string[],
  eng?: DbEngine,
): Promise<Map<string, string | null>> {
  return getCommunityRepository().getDisplayNamesByIds(ids, eng);
}

/** 批量获取话题摘要（id/title/categoryId，供通知等模块复用） */
export async function getTopicSummariesByIds(
  ids: string[],
  eng?: DbEngine,
): Promise<Map<string, { id: string; title: string; categoryId: string }>> {
  const map = await getCommunityRepository().getTopicSummariesByIds(ids, eng);
  const out = new Map<string, { id: string; title: string; categoryId: string }>();
  for (const [k, v] of map) out.set(k, { id: v.id, title: v.title, categoryId: v.category_id });
  return out;
}

// ============ 兼容性导出（供 forum/shared.ts 与旧 forum/* 实现复用，无 DB 访问） ============

import { POST_LIMITS, SLUG_PATTERN, MENTION_PATTERN, VIEW_DEDUP_WINDOW_HOURS } from '@/modules/community/types';
import { computeTotalPages } from '@/shared/utils/pagination';
import crypto from 'node:crypto';

export {
  POST_LIMITS,
  SLUG_PATTERN,
  MENTION_PATTERN,
  VIEW_DEDUP_WINDOW_HOURS,
  computeTotalPages,
};

// FORUM_LIMITS 兼容旧字段名
export const FORUM_LIMITS = {
  ...POST_LIMITS,
  TOPICS_PAGE_SIZE: POST_LIMITS.POSTS_PAGE_SIZE,
  REPLIES_PAGE_SIZE: POST_LIMITS.COMMENTS_PAGE_SIZE,
  TOPIC_CONTENT_MAX: POST_LIMITS.POST_CONTENT_MAX,
  REPLY_CONTENT_MAX: POST_LIMITS.COMMENT_CONTENT_MAX,
  CATEGORY_NAME_MAX: POST_LIMITS.CATEGORY_NAME_MAX,
  CATEGORY_DESC_MAX: POST_LIMITS.CATEGORY_DESC_MAX,
  CATEGORY_SLUG_MAX: POST_LIMITS.CATEGORY_SLUG_MAX,
  MENTIONS_MAX: POST_LIMITS.MENTIONS_MAX,
  TITLE_MAX: POST_LIMITS.TITLE_MAX,
};

const IP_HASH_SECRET =
  process.env.COMMUNITY_IP_HASH_SECRET ||
  (() => {
    const key = '__FZTBU_COMMUNITY_IP_HASH_SECRET__';
    const g = globalThis as Record<string, unknown>;
    if (typeof g[key] === 'string') return g[key] as string;
    const secret = crypto.randomBytes(32).toString('hex');
    g[key] = secret;
    return secret;
  })();

export function hashIpForView(ip: string): string {
  return crypto.createHmac('sha256', IP_HASH_SECRET).update(ip).digest('hex');
}

// ---- DB 行类型（供旧 forum/* 使用） ----
export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  post_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PostRow {
  id: string;
  kind: string;
  category_id: string | null;
  author_id: string;
  title: string;
  content_markdown: string;
  status: string;
  is_pinned: number;
  is_featured: number;
  reply_count: number;
  favorite_count: number;
  last_reply_at: string | null;
  last_reply_id: string | null;
  hidden_by: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
  slug: string | null;
  excerpt: string | null;
  cover_image: string | null;
  tags: string | null;
  series_id: string | null;
  series_order: number;
  published_at: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommentRow {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_id: string;
  content_markdown: string;
  status: string;
  like_count: number;
  reply_count: number;
  hidden_by: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSummaryRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_type: string;
}

// ---- 行转换工具（无 DB） ----
export type PostStatus = 'published' | 'draft' | 'hidden' | 'deleted' | 'archived';
export type PostKind = 'topic' | 'post';

export function toStatus(s: string): PostStatus {
  return (['published', 'draft', 'hidden', 'deleted', 'archived'].includes(s) ? s : 'draft') as PostStatus;
}

export function toCategory(
  row: CategoryRow | { id: string; slug: string; name: string; description?: string | null; icon?: string | null; post_count?: number; created_by?: string | null; created_at?: string; updated_at?: string | null },
): { id: string; slug: string; name: string; description: string | null; icon: string | null; postCount: number } {
  const r = row as CategoryRow;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description ?? null,
    icon: r.icon ?? null,
    postCount: r.post_count ?? 0,
  };
}

export function postRowToBase(row: PostRow): Record<string, unknown> {
  return {
    id: row.id,
    kind: row.kind === 'post' ? 'post' : 'topic',
    categoryId: row.category_id ?? null,
    authorId: row.author_id,
    title: row.title,
    contentMarkdown: row.content_markdown,
    status: toStatus(row.status),
    isPinned: row.is_pinned === 1,
    isFeatured: row.is_featured === 1,
    replyCount: row.reply_count,
    favoriteCount: row.favorite_count,
    lastReplyAt: row.last_reply_at ?? null,
    lastReplyId: row.last_reply_id ?? null,
    hiddenBy: row.hidden_by ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenReason: row.hidden_reason ?? null,
    slug: row.slug ?? null,
    excerpt: row.excerpt ?? null,
    coverImage: row.cover_image ?? null,
    tags: parseTagsJson(row.tags),
    seriesId: row.series_id ?? null,
    seriesOrder: row.series_order,
    publishedAt: row.published_at ?? null,
    viewCount: row.view_count,
    likeCount: row.like_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function commentRowToBase(row: CommentRow): Record<string, unknown> {
  return {
    id: row.id,
    postId: row.post_id,
    topicId: row.post_id,
    authorId: row.author_id,
    parentCommentId: row.parent_comment_id ?? null,
    parentReplyId: row.parent_comment_id ?? null,
    contentMarkdown: row.content_markdown,
    status: toStatus(row.status),
    likeCount: row.like_count,
    replyCount: row.reply_count,
    hiddenBy: row.hidden_by ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenReason: row.hidden_reason ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type {
  CommunityCategory,
  CommunityPost,
  CommunityPostDetail,
  CommunityComment,
  CommunityCommentDetail,
} from '@/modules/community/types';

export { generateSlug } from './blog/utils';
