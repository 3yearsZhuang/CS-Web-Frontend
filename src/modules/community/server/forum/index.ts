/**
 * @file 论坛服务层 — 统一导出 barrel
 */

// ============= 共享基础 =============
export {
  FORUM_LIMITS,
  SLUG_PATTERN,
  MENTION_PATTERN,
  VIEW_DEDUP_WINDOW_HOURS,
  hashIpForView,
  type PostStatus,
  type LikeTargetType,
  type MentionSourceType,
  type CommunityCategory,
  type AuthorSummary,
  type CommunityPost,
  type CommunityPostDetail,
  type CommunityComment,
  type CommunityCommentDetail,
} from './shared';

// ============= 版块 =============
export {
  listCategories,
  getCategoryBySlug,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryInput,
} from './categories';

// ============= 主题 =============
export {
  listTopics,
  getTopicById,
  createTopic,
  updateTopic,
  deleteTopic,
  recordTopicView,
  type ListTopicsFilters,
  type PaginatedPosts,
  type PostInput,
} from './topics';

// ============= 回复 =============
export {
  listReplies,
  listNestedReplies,
  createReply,
  updateReply,
  deleteReply,
  type ListRepliesFilters,
  type NestedCommentsResult,
  type ReplyInput,
} from './replies';

// ============= 点赞与收藏 =============
export {
  toggleLike,
  toggleFavorite,
  listUserFavorites,
} from './reactions';

// ============= 管理员审核 =============
export {
  hideTopic,
  restoreTopic,
  setTopicPinned,
  setTopicFeatured,
  hardDeleteTopic,
  hideReply,
  restoreReply,
  hardDeleteReply,
} from './moderation';

// ============= @ 提及 =============
export { scanMentions } from './mentions';

// ============= 用户主页论坛数据 =============
export { listUserTopics, listUserReplies } from './user-data';

// ============= 图片上传 =============
export {
  FORUM_IMAGE_LIMITS,
  saveForumImage,
  readForumImage,
} from './uploads';
