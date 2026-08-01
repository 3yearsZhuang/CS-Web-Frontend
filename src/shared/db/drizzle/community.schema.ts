/**
 * @file community.schema.ts — 社区模块统一 Drizzle schema
 *
 * 将论坛(forum_*)与博客(blog_*)合并为统一的社区系统：
 * - community_categories：统一分类表（FK 引用，取代 forum FK 表 + blog 字符串字段）
 * - community_posts：统一内容表（kind='topic'|'post' 判别联表，合并 forum_topics + blog_posts）
 * - community_comments：统一评论表（取代 forum_replies）
 * - community_reactions：统一多态点赞（取代 forum_likes + blog_likes）
 * - community_favorites：统一收藏（取代 forum_favorites）
 * - community_post_views：浏览去重（取代 forum_topic_views）
 * - community_mentions：@提及（source_type 扩展 post/comment）
 * - blog_series 保留（系列仅博客使用，挂在 community_posts.series_id）
 */
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import {
  pgTable,
  text as pgText,
  integer as pgInteger,
  timestamp,
  index as pgIndex,
  uniqueIndex as pgUniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============= 统一分类表 =============

export const communityCategoriesSqlite = sqliteTable(
  'community_categories',
  {
    id: text('id').primaryKey(),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    postCount: integer('post_count').notNull().default(0),
    createdBy: text('created_by'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    sortOrderIdx: index('idx_community_categories_sort_order').on(table.sortOrder),
  }),
);

export const communityCategoriesPg = pgTable(
  'community_categories',
  {
    id: pgText('id').primaryKey(),
    slug: pgText('slug').unique().notNull(),
    name: pgText('name').notNull(),
    description: pgText('description'),
    icon: pgText('icon'),
    sortOrder: pgInteger('sort_order').notNull().default(0),
    postCount: pgInteger('post_count').notNull().default(0),
    createdBy: pgText('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    sortOrderIdx: pgIndex('idx_community_categories_sort_order').on(table.sortOrder),
  }),
);

// ============= 统一内容表（判别联表） =============

export const communityPostsSqlite = sqliteTable(
  'community_posts',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(), // 'topic' | 'post'
    categoryId: text('category_id'), // topic 必填，post 可空
    authorId: text('author_id').notNull(),
    title: text('title').notNull(),
    contentMarkdown: text('content_markdown').notNull(),
    status: text('status').notNull().default('published'),
    // 论坛独有（topic）
    isPinned: integer('is_pinned').notNull().default(0),
    isFeatured: integer('is_featured').notNull().default(0),
    replyCount: integer('reply_count').notNull().default(0),
    favoriteCount: integer('favorite_count').notNull().default(0),
    lastReplyAt: text('last_reply_at'),
    lastReplyId: text('last_reply_id'),
    hiddenBy: text('hidden_by'),
    hiddenAt: text('hidden_at'),
    hiddenReason: text('hidden_reason'),
    // 博客独有（post）
    slug: text('slug').unique(),
    excerpt: text('excerpt'),
    coverImage: text('cover_image'),
    tags: text('tags').default('[]'),
    seriesId: text('series_id'),
    seriesOrder: integer('series_order').default(0),
    publishedAt: text('published_at'),
    // 共有
    viewCount: integer('view_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    kindIdx: index('idx_community_posts_kind').on(table.kind),
    categoryIdIdx: index('idx_community_posts_category_id').on(table.categoryId),
    statusIdx: index('idx_community_posts_status').on(table.status),
    authorIdIdx: index('idx_community_posts_author_id').on(table.authorId),
    lastReplyAtIdx: index('idx_community_posts_last_reply_at').on(table.lastReplyAt),
    isPinnedIdx: index('idx_community_posts_is_pinned').on(table.isPinned),
    publishedAtIdx: index('idx_community_posts_published_at').on(table.publishedAt),
    seriesIdIdx: index('idx_community_posts_series_id').on(table.seriesId),
  }),
);

export const communityPostsPg = pgTable(
  'community_posts',
  {
    id: pgText('id').primaryKey(),
    kind: pgText('kind').notNull(),
    categoryId: pgText('category_id'),
    authorId: pgText('author_id').notNull(),
    title: pgText('title').notNull(),
    contentMarkdown: pgText('content_markdown').notNull(),
    status: pgText('status').notNull().default('published'),
    isPinned: pgInteger('is_pinned').notNull().default(0),
    isFeatured: pgInteger('is_featured').notNull().default(0),
    replyCount: pgInteger('reply_count').notNull().default(0),
    favoriteCount: pgInteger('favorite_count').notNull().default(0),
    lastReplyAt: timestamp('last_reply_at', { withTimezone: true }),
    lastReplyId: pgText('last_reply_id'),
    hiddenBy: pgText('hidden_by'),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenReason: pgText('hidden_reason'),
    slug: pgText('slug').unique(),
    excerpt: pgText('excerpt'),
    coverImage: pgText('cover_image'),
    tags: pgText('tags').default('[]'),
    seriesId: pgText('series_id'),
    seriesOrder: pgInteger('series_order').default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    viewCount: pgInteger('view_count').notNull().default(0),
    likeCount: pgInteger('like_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    kindIdx: pgIndex('idx_community_posts_kind').on(table.kind),
    categoryIdIdx: pgIndex('idx_community_posts_category_id').on(table.categoryId),
    statusIdx: pgIndex('idx_community_posts_status').on(table.status),
    authorIdIdx: pgIndex('idx_community_posts_author_id').on(table.authorId),
    lastReplyAtIdx: pgIndex('idx_community_posts_last_reply_at').on(table.lastReplyAt),
    isPinnedIdx: pgIndex('idx_community_posts_is_pinned').on(table.isPinned),
    publishedAtIdx: pgIndex('idx_community_posts_published_at').on(table.publishedAt),
    seriesIdIdx: pgIndex('idx_community_posts_series_id').on(table.seriesId),
  }),
);

// ============= 统一评论表 =============

export const communityCommentsSqlite = sqliteTable(
  'community_comments',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull(),
    authorId: text('author_id').notNull(),
    parentCommentId: text('parent_comment_id'),
    contentMarkdown: text('content_markdown').notNull(),
    status: text('status').notNull().default('published'),
    likeCount: integer('like_count').notNull().default(0),
    replyCount: integer('reply_count').notNull().default(0),
    hiddenBy: text('hidden_by'),
    hiddenAt: text('hidden_at'),
    hiddenReason: text('hidden_reason'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    postIdIdx: index('idx_community_comments_post_id').on(table.postId),
    parentCommentIdIdx: index('idx_community_comments_parent_comment_id').on(table.parentCommentId),
    authorIdIdx: index('idx_community_comments_author_id').on(table.authorId),
    statusIdx: index('idx_community_comments_status').on(table.status),
  }),
);

export const communityCommentsPg = pgTable(
  'community_comments',
  {
    id: pgText('id').primaryKey(),
    postId: pgText('post_id').notNull(),
    authorId: pgText('author_id').notNull(),
    parentCommentId: pgText('parent_comment_id'),
    contentMarkdown: pgText('content_markdown').notNull(),
    status: pgText('status').notNull().default('published'),
    likeCount: pgInteger('like_count').notNull().default(0),
    replyCount: pgInteger('reply_count').notNull().default(0),
    hiddenBy: pgText('hidden_by'),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenReason: pgText('hidden_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    postIdIdx: pgIndex('idx_community_comments_post_id').on(table.postId),
    parentCommentIdIdx: pgIndex('idx_community_comments_parent_comment_id').on(table.parentCommentId),
    authorIdIdx: pgIndex('idx_community_comments_author_id').on(table.authorId),
    statusIdx: pgIndex('idx_community_comments_status').on(table.status),
  }),
);

// ============= 统一多态点赞 =============

export const communityReactionsSqlite = sqliteTable(
  'community_reactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    targetType: text('target_type').notNull(), // 'post' | 'comment'
    targetId: text('target_id').notNull(),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    targetIdx: index('idx_community_reactions_target').on(table.targetType, table.targetId),
    userIdIdx: index('idx_community_reactions_user_id').on(table.userId),
    userTargetUniqueIdx: uniqueIndex('idx_community_reactions_unique').on(
      table.userId,
      table.targetType,
      table.targetId,
    ),
  }),
);

export const communityReactionsPg = pgTable(
  'community_reactions',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id').notNull(),
    targetType: pgText('target_type').notNull(),
    targetId: pgText('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    targetIdx: pgIndex('idx_community_reactions_target').on(table.targetType, table.targetId),
    userIdIdx: pgIndex('idx_community_reactions_user_id').on(table.userId),
    userTargetUniqueIdx: pgUniqueIndex('idx_community_reactions_unique').on(
      table.userId,
      table.targetType,
      table.targetId,
    ),
  }),
);

// ============= 统一收藏 =============

export const communityFavoritesSqlite = sqliteTable(
  'community_favorites',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    targetType: text('target_type').notNull(), // 'post'
    targetId: text('target_id').notNull(),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    userIdx: index('idx_community_favorites_user_id').on(table.userId),
    targetIdx: index('idx_community_favorites_target').on(table.targetType, table.targetId),
    userTargetUniqueIdx: uniqueIndex('idx_community_favorites_unique').on(
      table.userId,
      table.targetType,
      table.targetId,
    ),
  }),
);

export const communityFavoritesPg = pgTable(
  'community_favorites',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id').notNull(),
    targetType: pgText('target_type').notNull(),
    targetId: pgText('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdx: pgIndex('idx_community_favorites_user_id').on(table.userId),
    targetIdx: pgIndex('idx_community_favorites_target').on(table.targetType, table.targetId),
    userTargetUniqueIdx: pgUniqueIndex('idx_community_favorites_unique').on(
      table.userId,
      table.targetType,
      table.targetId,
    ),
  }),
);

// ============= 浏览去重 =============

export const communityPostViewsSqlite = sqliteTable(
  'community_post_views',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull(),
    userId: text('user_id'),
    ipHash: text('ip_hash'),
    viewedAt: text('viewed_at').default(sql`datetime('now')`),
  },
  (table) => ({
    postIdIdx: index('idx_community_post_views_post_id').on(table.postId),
    userUniqueIdx: uniqueIndex('idx_community_post_views_unique_user')
      .on(table.postId, table.userId)
      .where(sql`user_id IS NOT NULL`),
    ipUniqueIdx: uniqueIndex('idx_community_post_views_unique_ip')
      .on(table.postId, table.ipHash)
      .where(sql`user_id IS NULL`),
  }),
);

export const communityPostViewsPg = pgTable(
  'community_post_views',
  {
    id: pgText('id').primaryKey(),
    postId: pgText('post_id').notNull(),
    userId: pgText('user_id'),
    ipHash: pgText('ip_hash'),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    postIdIdx: pgIndex('idx_community_post_views_post_id').on(table.postId),
    userUniqueIdx: pgUniqueIndex('idx_community_post_views_unique_user')
      .on(table.postId, table.userId)
      .where(sql`user_id IS NOT NULL`),
    ipUniqueIdx: pgUniqueIndex('idx_community_post_views_unique_ip')
      .on(table.postId, table.ipHash)
      .where(sql`user_id IS NULL`),
  }),
);

// ============= @提及 =============

export const communityMentionsSqlite = sqliteTable(
  'community_mentions',
  {
    id: text('id').primaryKey(),
    mentionedUserId: text('mentioned_user_id').notNull(),
    sourceType: text('source_type').notNull(), // 'post' | 'comment'
    sourceId: text('source_id').notNull(),
    sourceAuthorId: text('source_author_id'),
    isNotified: integer('is_notified').notNull().default(0),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    mentionedUserIdIdx: index('idx_community_mentions_mentioned_user_id').on(table.mentionedUserId),
    isNotifiedIdx: index('idx_community_mentions_is_notified').on(table.isNotified),
  }),
);

export const communityMentionsPg = pgTable(
  'community_mentions',
  {
    id: pgText('id').primaryKey(),
    mentionedUserId: pgText('mentioned_user_id').notNull(),
    sourceType: pgText('source_type').notNull(),
    sourceId: pgText('source_id').notNull(),
    sourceAuthorId: pgText('source_author_id'),
    isNotified: pgInteger('is_notified').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    mentionedUserIdIdx: pgIndex('idx_community_mentions_mentioned_user_id').on(table.mentionedUserId),
    isNotifiedIdx: pgIndex('idx_community_mentions_is_notified').on(table.isNotified),
  }),
);

// ============= 博客系列（保留） =============

export const blogSeriesSqlite = sqliteTable(
  'blog_series',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    slug: text('slug').unique().notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
);

export const blogSeriesPg = pgTable(
  'blog_series',
  {
    id: pgText('id').primaryKey(),
    title: pgText('title').notNull(),
    description: pgText('description'),
    slug: pgText('slug').unique().notNull(),
    createdBy: pgText('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
);

// ============= Schema Set 工厂 =============

export interface CommunitySchemaSet {
  communityCategories: typeof communityCategoriesSqlite | typeof communityCategoriesPg;
  communityPosts: typeof communityPostsSqlite | typeof communityPostsPg;
  communityComments: typeof communityCommentsSqlite | typeof communityCommentsPg;
  communityReactions: typeof communityReactionsSqlite | typeof communityReactionsPg;
  communityFavorites: typeof communityFavoritesSqlite | typeof communityFavoritesPg;
  communityPostViews: typeof communityPostViewsSqlite | typeof communityPostViewsPg;
  communityMentions: typeof communityMentionsSqlite | typeof communityMentionsPg;
  blogSeries: typeof blogSeriesSqlite | typeof blogSeriesPg;
}

export function getCommunitySchema(): CommunitySchemaSet {
  if (process.env.DATABASE_PROVIDER === 'pg') {
    return {
      communityCategories: communityCategoriesPg,
      communityPosts: communityPostsPg,
      communityComments: communityCommentsPg,
      communityReactions: communityReactionsPg,
      communityFavorites: communityFavoritesPg,
      communityPostViews: communityPostViewsPg,
      communityMentions: communityMentionsPg,
      blogSeries: blogSeriesPg,
    };
  }
  return {
    communityCategories: communityCategoriesSqlite,
    communityPosts: communityPostsSqlite,
    communityComments: communityCommentsSqlite,
    communityReactions: communityReactionsSqlite,
    communityFavorites: communityFavoritesSqlite,
    communityPostViews: communityPostViewsSqlite,
    communityMentions: communityMentionsSqlite,
    blogSeries: blogSeriesSqlite,
  };
}
