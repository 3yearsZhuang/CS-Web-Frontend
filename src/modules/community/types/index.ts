/**
 * @file 社区模块 — 统一共享类型（合并原 community + community）
 *
 * 统一内容模型：CommunityPost（kind='topic'|'post'）判别联合。
 * FeedItem 仍保留 kind 区分（topic/post/member）以兼容聚合展示。
 */

// ============= 统一内容类型 =============

/** 内容类型（判别字段） */
export type PostKind = 'topic' | 'post';

/** 统一内容状态 */
export type PostStatus = 'published' | 'draft' | 'hidden' | 'deleted' | 'archived';

/** 评论/点赞目标类型 */
export type TargetType = 'post' | 'comment';

/** @ 提及来源类型 */
export type MentionSourceType = 'post' | 'comment';

// 阶段一兼容别名（保留旧枚举值，阶段二移除）
export type LikeTargetType = 'topic' | 'reply';

/** 作者摘要（列表/详情均使用） */
export interface AuthorSummary {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarType: string;
}

/** 统一分类（公开对象） */
export interface CommunityCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  postCount: number;
  /** 兼容旧 CommunityCategory.topicCount（阶段二移除） */
  topicCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 分类摘要（列表/详情用） */
export type CategorySummary = Pick<CommunityCategory, 'id' | 'slug' | 'name'>;

/** 统一内容（公开对象） */
export interface CommunityPost {
  id: string;
  kind: PostKind;
  categoryId: string | null;
  authorId: string;
  title: string;
  contentMarkdown: string;
  status: PostStatus;
  // 社区独有
  isPinned: boolean;
  isFeatured: boolean;
  replyCount: number;
  favoriteCount: number;
  lastReplyAt: string | null;
  lastReplyId: string | null;
  hiddenBy: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  // 社区独有
  slug: string | null;
  excerpt: string | null;
  coverImage: string | null;
  tags: string[];
  seriesId: string | null;
  seriesOrder: number;
  publishedAt: string | null;
  // 共有
  viewCount: number;
  likeCount: number;
  author: AuthorSummary | null;
  /** 兼容旧 CommunityPost.authorName（阶段二移除） */
  authorName: string | null;
  category: CategorySummary | null;
  createdAt: string;
  updatedAt: string;
}

/** 内容详情（含当前用户的点赞/收藏状态） */
export interface CommunityPostDetail extends CommunityPost {
  isLikedByMe: boolean;
  isFavoritedByMe: boolean;
}

/** 创建/更新内容输入 */
export interface PostInput {
  kind: PostKind;
  title: string;
  contentMarkdown: string;
  categoryId?: string | null;
  excerpt?: string;
  coverImage?: string;
  tags?: string[];
  seriesId?: string;
  seriesOrder?: number;
  status?: PostStatus;
  isPinned?: boolean;
  isFeatured?: boolean;
}

/** 统一评论（公开对象） */
export interface CommunityComment {
  id: string;
  postId: string;
  /** 兼容旧 CommunityComment.topicId（阶段二移除） */
  topicId: string | null;
  authorId: string;
  parentCommentId: string | null;
  /** 兼容旧 CommunityComment.parentReplyId（阶段二移除） */
  parentReplyId: string | null;
  contentMarkdown: string;
  status: PostStatus;
  likeCount: number;
  replyCount: number;
  hiddenBy: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  author: AuthorSummary | null;
  createdAt: string;
  updatedAt: string;
}

/** 评论详情（含当前用户点赞状态） */
export interface CommunityCommentDetail extends CommunityComment {
  isLikedByMe: boolean;
  /** 所属内容摘要 — 仅 listUserComments 返回 */
  post?: {
    id: string;
    title: string;
    kind: PostKind;
    category: CategorySummary | null;
  } | null;
  /** 兼容旧 CommunityCommentDetail.topic（阶段二移除） */
  topic?: {
    id: string;
    title: string;
    category: { slug: string; name: string } | null;
  } | null;
}

/** 分页结果 — 内容列表 */
export interface PaginatedPosts {
  items: CommunityPost[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 分页结果 — 评论列表 */
export interface PaginatedComments {
  items: CommunityCommentDetail[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 楼中楼列表结果 */
export interface NestedCommentsResult {
  items: CommunityCommentDetail[];
  total: number;
}

/** 当前登录用户摘要（前端缓存） */
export interface CurrentUser {
  id: string;
  role: 'user' | 'admin';
}

// ============= 社区系列（保留） =============

export interface CommunitySeries {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  createdBy: string;
  createdAt: string;
  postCount: number;
}

export interface CommunitySeriesInput {
  title: string;
  description?: string;
}

// ============= 成员类型（原 members/types） =============

export interface MemberItem {
  id: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarType: string;
  githubUrl: string | null;
  websiteUrl: string | null;
  techTags: string[];
  role: string;
  joinedAt: string;
}

// ============= 常量 =============

/** 字段长度限制 */
export const POST_LIMITS = {
  TITLE_MAX: 200,
  POST_CONTENT_MAX: 20000,
  COMMENT_CONTENT_MAX: 5000,
  CATEGORY_NAME_MAX: 32,
  CATEGORY_DESC_MAX: 200,
  CATEGORY_SLUG_MAX: 32,
  MENTIONS_MAX: 10,
  POSTS_PAGE_SIZE: 50,
  COMMENTS_PAGE_SIZE: 30,
} as const;

/** 版块 slug 正则：小写字母/数字/短横线，1-32 字符 */
export const SLUG_PATTERN = /^[a-z0-9-]{1,32}$/;

/** @ 提及正则：@后跟非空白字符，捕获用户名 */
export const MENTION_PATTERN = /@([^\s@<>]+)/g;

/** 浏览去重窗口：24 小时 */
export const VIEW_DEDUP_WINDOW_HOURS = 24;

/** 标签正则：匹配标签 token */
export const TAG_PATTERN = /^[a-z0-9-]{1,32}$/;

// ============= Feed 聚合类型 =============

export type FeedKind = 'topic' | 'post' | 'member';

export interface FeedTopicItem {
  kind: 'topic';
  sortAt: string;
  data: CommunityPost;
}

export interface FeedPostItem {
  kind: 'post';
  sortAt: string;
  data: CommunityPost;
}

export interface FeedMemberItem {
  kind: 'member';
  sortAt: string;
  data: MemberItem;
}

export type FeedItem = FeedTopicItem | FeedPostItem | FeedMemberItem;

export interface FeedQuery {
  kind?: FeedKind;
  tag?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  excludeMembers?: boolean;
  /** 关注流维度：仅返回当前用户关注的人发布的内容（需 currentUserId） */
  feed?: 'following' | 'all';
  /** 当前登录用户 id（feed=following 时用于过滤） */
  currentUserId?: string;
}

export interface PaginatedFeed {
  items: FeedItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FeedTag {
  tag: string;
  topicCount: number;
  postCount: number;
  memberCount: number;
}

// ============= 阶段一兼容别名（保留有语义差异的部分，纯别名已合并到规范名） =============
export type CommunityPostStatus = PostStatus;
export type CommunityPostInput = PostInput;
export type CommunityListOptions = {
  status?: PostStatus;
  category?: string;
  authorId?: string;
  seriesId?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
};
export type ReplyInput = { contentMarkdown: string; parentReplyId?: string | null };
export type CategoryInput = { name: string; slug: string; description?: string; icon?: string };
export type ListTopicsFilters = {
  categoryId?: string;
  search?: string;
  status?: PostStatus;
  authorId?: string;
  sort?: 'latest' | 'hot' | 'top';
  page?: number;
  pageSize?: number;
  includeHidden?: boolean;
};
export type ListRepliesFilters = {
  topicId: string;
  page?: number;
  pageSize?: number;
  includeHidden?: boolean;
  currentUserId?: string;
};
