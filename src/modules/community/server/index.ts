/**
 * @file 社区模块 — 统一服务层 barrel（forum + blog + members + feed）
 */

import 'server-only';

// ============= 论坛 =============
export * from './forum';

// ============= 博客 =============
// 注意：blog 的 toggleLike 重命名为 toggleBlogLike，避免与 forum 的 toggleLike 冲突
export {
  createPost,
  updatePost,
  publishPost,
  archivePost,
  deletePost,
  getPostById,
  getPostBySlug,
  listPosts,
  getUserPosts,
} from './blog';
export {
  createSeries,
  getSeriesById,
  listSeries,
  deleteSeries,
} from './blog';
export {
  incrementViewCount,
  toggleLike as toggleBlogLike,
  hasLiked,
} from './blog';
export {
  extractTableOfContents,
} from './blog';

// ============= 成员名录 =============
export {
  listMembers,
  listAllTechTags,
  type MemberItem,
} from './members';

// ============= Feed 聚合查询 =============
export { getFeed, getFeedTags, getFeedStats } from './feed';

// ============= 类型 re-export =============
export type { PaginatedReplies } from '../types';
export type {
  BlogPostStatus,
  BlogPostInput,
  BlogPost,
  BlogSeries,
  BlogSeriesInput,
  BlogListOptions,
} from '../types';
