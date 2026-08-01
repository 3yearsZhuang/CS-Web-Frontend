/**
 * @file 社区模块 — 统一共享类型（forum + blog + members + Feed 聚合）
 *
 * FeedItem 是判别联合，kind 字段区分来源（topic/post/member）。
 */

// ============= 论坛类型（原 forum/types） =============

/** 主题/回复状态 */
export type ForumStatus = 'published' | 'hidden' | 'deleted';

/** 点赞目标类型 */
export type LikeTargetType = 'topic' | 'reply';

/** @ 提及来源类型 */
export type MentionSourceType = 'topic' | 'reply';

/** 版块（公开对象） */
export interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  topicCount: number;
  postCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 主题作者摘要（列表/详情均使用） */
export interface ForumAuthorSummary {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  avatarType: string;
}

/** 主题（公开对象） */
export interface ForumTopic {
  id: string;
  categoryId: string;
  authorId: string;
  title: string;
  contentMarkdown: string;
  status: ForumStatus;
  isPinned: boolean;
  isFeatured: boolean;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  favoriteCount: number;
  lastReplyAt: string | null;
  lastReplyId: string | null;
  hiddenBy: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  author: ForumAuthorSummary | null;
  category: Pick<ForumCategory, 'id' | 'slug' | 'name'> | null;
  createdAt: string;
  updatedAt: string;
}

/** 主题详情（含当前用户的点赞/收藏状态） */
export interface ForumTopicDetail extends ForumTopic {
  isLikedByMe: boolean;
  isFavoritedByMe: boolean;
}

/** 回复（公开对象） */
export interface ForumReply {
  id: string;
  topicId: string;
  authorId: string;
  parentReplyId: string | null;
  contentMarkdown: string;
  status: ForumStatus;
  likeCount: number;
  replyCount: number;
  hiddenBy: string | null;
  hiddenAt: string | null;
  hiddenReason: string | null;
  author: ForumAuthorSummary | null;
  createdAt: string;
  updatedAt: string;
}

/** 回复详情（含当前用户的点赞状态） */
export interface ForumReplyDetail extends ForumReply {
  isLikedByMe: boolean;
  /**
   * 所属主题摘要 — 仅 listUserReplies 返回（用于个人主页展示回复所属主题）。
   * 其他端点（如主题详情下的回复列表）不返回此字段。
   */
  topic?: {
    id: string;
    title: string;
    category: { slug: string; name: string } | null;
  } | null;
}

/** 分页结果 — 回复列表 */
export interface PaginatedReplies {
  items: ForumReplyDetail[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 版块摘要（主题列表用） */
export type ForumCategorySummary = Pick<ForumCategory, 'id' | 'slug' | 'name'>;

/** 分页结果 — 主题列表 */
export interface PaginatedTopics {
  items: ForumTopic[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 楼中楼列表结果 */
export interface NestedRepliesResult {
  items: ForumReplyDetail[];
  total: number;
}

/** 当前登录用户摘要（前端缓存） */
export interface CurrentUser {
  id: string;
  role: 'user' | 'admin';
}

// ============= 论坛常量 =============

/** 字段长度限制 */
export const FORUM_LIMITS = {
  TITLE_MAX: 120,
  TOPIC_CONTENT_MAX: 20000,
  REPLY_CONTENT_MAX: 5000,
  CATEGORY_NAME_MAX: 32,
  CATEGORY_DESC_MAX: 200,
  CATEGORY_SLUG_MAX: 32,
  MENTIONS_MAX: 10,
  TOPICS_PAGE_SIZE: 50,
  REPLIES_PAGE_SIZE: 30,
} as const;

/** 版块 slug 正则：小写字母/数字/短横线，1-32 字符 */
export const SLUG_PATTERN = /^[a-z0-9-]{1,32}$/;

/** @ 提及正则：@后跟非空白字符，捕获用户名 */
export const MENTION_PATTERN = /@([^\s@<>]+)/g;

/** 浏览去重窗口：24 小时 */
export const VIEW_DEDUP_WINDOW_HOURS = 24;

// ============= 博客类型（原 blog/types） =============

export type BlogPostStatus = 'draft' | 'published' | 'archived';

export interface BlogPostInput {
  title: string;
  excerpt?: string;
  contentMarkdown: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  seriesId?: string;
  seriesOrder?: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentMarkdown: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  status: BlogPostStatus;
  authorId: string;
  authorName: string | null;
  seriesId: string | null;
  seriesOrder: number;
  viewCount: number;
  likeCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogSeries {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  createdBy: string;
  createdAt: string;
  postCount: number;
}

export interface BlogSeriesInput {
  title: string;
  description?: string;
}

export interface BlogListOptions {
  status?: BlogPostStatus;
  category?: string;
  authorId?: string;
  seriesId?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

export const VALID_CATEGORIES = ['general', 'frontend', 'backend', 'devops', 'algorithm', 'design', 'tutorial', 'essay'];
export const VALID_STATUSES: BlogPostStatus[] = ['draft', 'published', 'archived'];

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

// ============= Feed 聚合类型（community 原有） =============

/** Feed 项类型标识 */
export type FeedKind = 'topic' | 'post' | 'member';

/** 论坛主题 Feed 项 */
export interface FeedTopicItem {
  kind: 'topic';
  /** 排序时间戳（取 lastReplyAt ?? createdAt） */
  sortAt: string;
  data: ForumTopic;
}

/** 博客文章 Feed 项 */
export interface FeedPostItem {
  kind: 'post';
  /** 排序时间戳（取 publishedAt ?? createdAt） */
  sortAt: string;
  data: BlogPost;
}

/** 成员加入 Feed 项 */
export interface FeedMemberItem {
  kind: 'member';
  /** 排序时间戳（取 joinedAt） */
  sortAt: string;
  data: MemberItem;
}

/** 聚合 Feed 项 — 判别联合 */
export type FeedItem = FeedTopicItem | FeedPostItem | FeedMemberItem;

/** Feed 查询参数 */
export interface FeedQuery {
  /** 类型筛选：未指定 = 全部 */
  kind?: FeedKind;
  /** 标签筛选（跨类型匹配 tech_tags / tags / 版块） */
  tag?: string;
  /** 搜索关键词（跨类型匹配标题/摘要/正文） */
  search?: string;
  /** 页码（1-based） */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 排除成员类型（"全部" tab 不含成员，仅展示话题+博客） */
  excludeMembers?: boolean;
}

/** Feed 分页结果 */
export interface PaginatedFeed {
  items: FeedItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 聚合标签（用于筛选器） */
export interface FeedTag {
  tag: string;
  /** 该标签下各类型的计数 */
  topicCount: number;
  postCount: number;
  memberCount: number;
}
