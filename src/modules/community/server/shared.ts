/**
 * @file 社区服务层 — 共享基础（内部类型与工具函数）
 */
import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { logger } from '@/shared/logger';
import { computePagination, computeTotalPages } from '@/shared/utils/pagination';
import { maskEmail } from '@/shared/utils/mask';
import {
  POST_LIMITS,
  type AuthorSummary,
  type CategorySummary,
  type CommunityCategory,
  type CommunityPost,
  type CommunityComment,
  type PostStatus,
  type PostKind,
} from '../types';

// 兼容旧 forum/* 实现引用 FORUM_LIMITS（旧字段名 → 新 POST_LIMITS 字段）
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
export { computePagination, computeTotalPages };
export { POST_LIMITS, SLUG_PATTERN, MENTION_PATTERN, VIEW_DEDUP_WINDOW_HOURS, TAG_PATTERN } from '../types';
export type {
  AuthorSummary,
  CategorySummary,
  CommunityCategory,
  CommunityPost,
  CommunityPostDetail,
  CommunityComment,
  CommunityCommentDetail,
  PostStatus,
  PostKind,
} from '../types';

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

if (!process.env.COMMUNITY_IP_HASH_SECRET && process.env.NODE_ENV === 'production') {
  logger.warn('COMMUNITY_IP_HASH_SECRET 未设置，生产环境将使用进程级随机密钥，重启后匿名浏览去重失效。');
}

export function hashIpForView(ip: string): string {
  return crypto.createHmac('sha256', IP_HASH_SECRET).update(ip).digest('hex');
}

// ============= 数据库行类型 =============

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
  updated_at: string;
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
  author_id: string;
  parent_comment_id: string | null;
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
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_type: string | null;
}

// ============= 转换函数 =============

export function toCategory(row: CategoryRow): CommunityCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    icon: row.icon ?? null,
    sortOrder: row.sort_order,
    postCount: row.post_count,
    topicCount: row.post_count,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toAuthorSummary(row: UserSummaryRow | null | undefined): AuthorSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    email: maskEmail(row.email) ?? '',
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    avatarType: row.avatar_type ?? 'initial',
  };
}

export function toStatus(s: string): PostStatus {
  return (['published', 'draft', 'hidden', 'deleted', 'archived'].includes(s) ? s : 'published') as PostStatus;
}

export function parseTagsJson(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base || 'post'}-${suffix}`;
}

// ============= 批量加载（避免 N+1） =============

export function loadAuthorSummaries(userIds: Array<string | null>): Map<string, AuthorSummary> {
  const map = new Map<string, AuthorSummary>();
  if (userIds.length === 0) return map;
  const db = getDb();
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return map;
  const placeholders = unique.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT id, email, display_name, avatar_url, avatar_type FROM users WHERE id IN (${placeholders})`)
    .all(...unique) as UserSummaryRow[];
  for (const row of rows) map.set(row.id, toAuthorSummary(row)!);
  return map;
}

export function loadCategorySummaries(
  categoryIds: Array<string | null>,
): Map<string, CategorySummary> {
  const map = new Map<string, CategorySummary>();
  if (categoryIds.length === 0) return map;
  const db = getDb();
  const unique = [...new Set(categoryIds)].filter(Boolean);
  if (unique.length === 0) return map;
  const placeholders = unique.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT id, slug, name FROM community_categories WHERE id IN (${placeholders})`)
    .all(...unique) as Array<{ id: string; slug: string; name: string }>;
  for (const row of rows) map.set(row.id, { id: row.id, slug: row.slug, name: row.name });
  return map;
}

// ============= 帖子行转换 =============

export function postRowToBase(row: PostRow): CommunityPost {
  return {
    id: row.id,
    kind: (row.kind === 'post' ? 'post' : 'topic') as PostKind,
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
    author: null,
    authorName: null,
    category: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function commentRowToBase(row: CommentRow): CommunityComment {
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
    author: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
