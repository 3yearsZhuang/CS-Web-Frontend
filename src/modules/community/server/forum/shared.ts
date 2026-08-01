/**
 * @file 论坛共享兼容层 — re-export 统一服务层 shared
 *
 * 统一重构后，forum/* 子模块原依赖的 PostRow / CategoryRow 等类型与工具
 * 已迁移至 ../shared（统一类型 CommunityPost 等）。本文件保留旧别名，避免大规模改动
 * forum/* 实现文件，使阶段一（仅底层表切换）可编译通过。
 */
export {
  POST_LIMITS,
  SLUG_PATTERN,
  MENTION_PATTERN,
  VIEW_DEDUP_WINDOW_HOURS,
  computePagination,
  computeTotalPages,
  hashIpForView,
  toCategory,
  toAuthorSummary,
  toStatus,
  parseTagsJson,
  generateSlug,
  loadAuthorSummaries,
  loadCategorySummaries,
  postRowToBase,
  commentRowToBase,
  FORUM_LIMITS,
  type AuthorSummary,
} from '../shared';

// 兼容旧 forum/topics.ts 使用 topicRowToBase
import { postRowToBase as _postRowToBase } from '../shared';
export const topicRowToBase = _postRowToBase;

export type {
  CategorySummary,
  CommunityCategory,
  CommunityPost,
  CommunityPostDetail,
  CommunityComment,
  CommunityCommentDetail,
  PostStatus,
  PostKind,
  CategoryRow,
  PostRow,
  CommentRow,
  UserSummaryRow,
} from '../shared';

export type { LikeTargetType, MentionSourceType } from '../../types';
export type { ListTopicsFilters } from '../../types';
