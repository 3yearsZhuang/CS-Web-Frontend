/**
 * @file 博客服务层 — 统一导出 barrel
 */

// ============= 文章 =============
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
  incrementViewCount,
} from './posts';

// ============= 系列 =============
export {
  createSeries,
  getSeriesById,
  listSeries,
  deleteSeries,
} from './series';

// ============= 点赞 =============
export {
  toggleLike,
  hasLiked,
} from './likes';

// ============= 工具函数 =============
export {
  extractTableOfContents,
} from './utils';
