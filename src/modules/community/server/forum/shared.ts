/**
 * @file 论坛服务层 — 共享基础（内部类型与工具函数）
 */
import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { logger } from '@/shared/logger';
import { computePagination, computeTotalPages } from '@/shared/utils/pagination';
import { maskEmail } from '@/shared/utils/mask';
import {
  type ForumStatus,
  type ForumCategory,
  type ForumAuthorSummary,
} from '../../types';

// ============= 常量（re-export from types，便于 forum 内部引用） =============

export { FORUM_LIMITS, SLUG_PATTERN, MENTION_PATTERN, VIEW_DEDUP_WINDOW_HOURS } from '../../types';

// ============= 类型（re-export from types，便于 forum 内部引用） =============

export type {
  ForumStatus,
  LikeTargetType,
  MentionSourceType,
  ForumCategory,
  ForumAuthorSummary,
  ForumTopic,
  ForumTopicDetail,
  ForumReply,
  ForumReplyDetail,
} from '../../types';

// ============= 分页（re-export 便于 forum 模块统一引用） =============

export { computePagination, computeTotalPages };

/**
 * 浏览计数 IP HMAC 密钥
 *
 * 使用独立密钥而非复用 AUTH_SESSION_SECRET：
 *   - 密钥隔离：单一密钥泄露不影响其他子系统
 *   - 可独立轮换：未来可为论坛引入专用密钥轮换机制
 *
 * 与 session token 一样使用 globalThis 缓存以应对 Next.js dev mode 热重载。
 */
const IP_HASH_SECRET =
  process.env.FORUM_IP_HASH_SECRET ||
  (() => {
    const key = '__FZTBU_FORUM_IP_HASH_SECRET__';
    const g = globalThis as Record<string, unknown>;
    if (typeof g[key] === 'string') return g[key] as string;
    const secret = crypto.randomBytes(32).toString('hex');
    g[key] = secret;
    return secret;
  })();

if (!process.env.FORUM_IP_HASH_SECRET && process.env.NODE_ENV === 'production') {
  logger.warn(
    'FORUM_IP_HASH_SECRET 未设置，生产环境将使用进程级随机密钥，重启后匿名浏览去重失效。请通过环境变量设置稳定的随机密钥。',
  );
}

/** IP HMAC 哈希（用于匿名浏览去重，不存明文 IP） */
export function hashIpForView(ip: string): string {
  return crypto.createHmac('sha256', IP_HASH_SECRET).update(ip).digest('hex');
}

// ============= 数据库行类型（内部使用，不对外公开） =============

export interface ForumCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  topic_count: number;
  post_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForumTopicRow {
  id: string;
  category_id: string;
  author_id: string;
  title: string;
  content_markdown: string;
  status: string;
  is_pinned: number;
  is_featured: number;
  view_count: number;
  reply_count: number;
  like_count: number;
  favorite_count: number;
  last_reply_at: string | null;
  last_reply_id: string | null;
  hidden_by: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForumReplyRow {
  id: string;
  topic_id: string;
  author_id: string;
  parent_reply_id: string | null;
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

/** 将数据库行转换为 ForumCategory 对象 */
export function toCategory(row: ForumCategoryRow): ForumCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    icon: row.icon ?? null,
    sortOrder: row.sort_order,
    topicCount: row.topic_count,
    postCount: row.post_count,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 将用户数据库行转换为作者摘要对象（email 脱敏） */
export function toAuthorSummary(row: UserSummaryRow | null | undefined): ForumAuthorSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    email: maskEmail(row.email) ?? '',
    displayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    avatarType: row.avatar_type ?? 'initial',
  };
}

/** 将状态字符串转换为 ForumStatus */
export function toStatus(s: string): ForumStatus {
  return s === 'hidden' || s === 'deleted' ? s : 'published';
}

// ============= 批量加载（避免 N+1） =============

/** 批量加载用户摘要（避免 N+1） */
export function loadAuthorSummaries(userIds: string[]): Map<string, ForumAuthorSummary> {
  const map = new Map<string, ForumAuthorSummary>();
  if (userIds.length === 0) return map;
  const db = getDb();
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return map;
  const placeholders = unique.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT id, email, display_name, avatar_url, avatar_type FROM users WHERE id IN (${placeholders})`,
    )
    .all(...unique) as UserSummaryRow[];
  for (const row of rows) {
    map.set(row.id, toAuthorSummary(row)!);
  }
  return map;
}

/** 批量加载版块摘要（避免 N+1） */
export function loadCategorySummaries(
  categoryIds: string[],
): Map<string, Pick<ForumCategory, 'id' | 'slug' | 'name'>> {
  const map = new Map<string, Pick<ForumCategory, 'id' | 'slug' | 'name'>>();
  if (categoryIds.length === 0) return map;
  const db = getDb();
  const unique = [...new Set(categoryIds)].filter(Boolean);
  if (unique.length === 0) return map;
  const placeholders = unique.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT id, slug, name FROM forum_categories WHERE id IN (${placeholders})`)
    .all(...unique) as Array<{ id: string; slug: string; name: string }>;
  for (const row of rows) {
    map.set(row.id, { id: row.id, slug: row.slug, name: row.name });
  }
  return map;
}

// ============= 通用：主题行转公开对象 =============

/** 将 ForumTopicRow 转换为公开对象（不含作者/版块摘要，需调用方自行填充） */
export function topicRowToBase(row: ForumTopicRow): import('../../types').ForumTopic {
  return {
    id: row.id,
    categoryId: row.category_id,
    authorId: row.author_id,
    title: row.title,
    contentMarkdown: row.content_markdown,
    status: toStatus(row.status),
    isPinned: row.is_pinned === 1,
    isFeatured: row.is_featured === 1,
    viewCount: row.view_count,
    replyCount: row.reply_count,
    likeCount: row.like_count,
    favoriteCount: row.favorite_count,
    lastReplyAt: row.last_reply_at ?? null,
    lastReplyId: row.last_reply_id ?? null,
    hiddenBy: row.hidden_by ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenReason: row.hidden_reason ?? null,
    author: null,
    category: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
