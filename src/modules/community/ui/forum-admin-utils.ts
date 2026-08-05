/**
 * @file 管理员论坛面板 — 共享工具函数与类型（从 forum-admin-panel 拆出，GENERAL 2.4）
 */

import type { CommunityCategory } from '@/modules/community/types';

export type TopicStatus = 'published' | 'hidden';

export type SubView =
  | 'categories'
  | 'topics'
  | 'users'
  | 'dashboard'
  | 'announcements'
  | 'reports';

export interface CategoryInput {
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

export interface CategoriesResponse {
  items: CommunityCategory[];
}

export const TOPICS_PAGE_SIZE = 15;

export const STATUS_OPTIONS: { value: TopicStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部 / All' },
  { value: 'published', label: '已发布 / Published' },
  { value: 'hidden', label: '已隐藏 / Hidden' },
];

export const SORT_OPTIONS = [
  { value: 'latest', label: '最新 / Latest' },
  { value: 'hot', label: '热门 / Hot' },
  { value: 'top', label: '顶 / Top' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

/** 统一错误提取 */
export function getError(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === 'string') return err;
  }
  return fallback;
}
