/**
 * @file forum.schema.ts — 论坛模块 Drizzle schema 定义（categories / topics / replies / likes / favorites / views / mentions）
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

export const forumCategoriesSqlite = sqliteTable(
  'forum_categories',
  {
    id: text('id').primaryKey(),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    topicCount: integer('topic_count').notNull().default(0),
    postCount: integer('post_count').notNull().default(0),
    createdBy: text('created_by'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    sortOrderIdx: index('idx_forum_categories_sort_order').on(table.sortOrder),
  }),
);

export const forumCategoriesPg = pgTable(
  'forum_categories',
  {
    id: pgText('id').primaryKey(),
    slug: pgText('slug').unique().notNull(),
    name: pgText('name').notNull(),
    description: pgText('description'),
    icon: pgText('icon'),
    sortOrder: pgInteger('sort_order').notNull().default(0),
    topicCount: pgInteger('topic_count').notNull().default(0),
    postCount: pgInteger('post_count').notNull().default(0),
    createdBy: pgText('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    sortOrderIdx: pgIndex('idx_forum_categories_sort_order').on(table.sortOrder),
  }),
);

export const forumTopicsSqlite = sqliteTable(
  'forum_topics',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id').notNull(),
    authorId: text('author_id').notNull(),
    title: text('title').notNull(),
    contentMarkdown: text('content_markdown').notNull(),
    status: text('status').notNull().default('published'),
    isPinned: integer('is_pinned').notNull().default(0),
    isFeatured: integer('is_featured').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    replyCount: integer('reply_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    favoriteCount: integer('favorite_count').notNull().default(0),
    lastReplyAt: text('last_reply_at'),
    lastReplyId: text('last_reply_id'),
    hiddenBy: text('hidden_by'),
    hiddenAt: text('hidden_at'),
    hiddenReason: text('hidden_reason'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    categoryIdIdx: index('idx_forum_topics_category_id').on(table.categoryId),
    statusIdx: index('idx_forum_topics_status').on(table.status),
    authorIdIdx: index('idx_forum_topics_author_id').on(table.authorId),
    lastReplyAtIdx: index('idx_forum_topics_last_reply_at').on(table.lastReplyAt),
    isPinnedIdx: index('idx_forum_topics_is_pinned').on(table.isPinned),
  }),
);

export const forumTopicsPg = pgTable(
  'forum_topics',
  {
    id: pgText('id').primaryKey(),
    categoryId: pgText('category_id').notNull(),
    authorId: pgText('author_id').notNull(),
    title: pgText('title').notNull(),
    contentMarkdown: pgText('content_markdown').notNull(),
    status: pgText('status').notNull().default('published'),
    isPinned: pgInteger('is_pinned').notNull().default(0),
    isFeatured: pgInteger('is_featured').notNull().default(0),
    viewCount: pgInteger('view_count').notNull().default(0),
    replyCount: pgInteger('reply_count').notNull().default(0),
    likeCount: pgInteger('like_count').notNull().default(0),
    favoriteCount: pgInteger('favorite_count').notNull().default(0),
    lastReplyAt: timestamp('last_reply_at', { withTimezone: true }),
    lastReplyId: pgText('last_reply_id'),
    hiddenBy: pgText('hidden_by'),
    hiddenAt: timestamp('hidden_at', { withTimezone: true }),
    hiddenReason: pgText('hidden_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    categoryIdIdx: pgIndex('idx_forum_topics_category_id').on(table.categoryId),
    statusIdx: pgIndex('idx_forum_topics_status').on(table.status),
    authorIdIdx: pgIndex('idx_forum_topics_author_id').on(table.authorId),
    lastReplyAtIdx: pgIndex('idx_forum_topics_last_reply_at').on(table.lastReplyAt),
    isPinnedIdx: pgIndex('idx_forum_topics_is_pinned').on(table.isPinned),
  }),
);

export const forumRepliesSqlite = sqliteTable(
  'forum_replies',
  {
    id: text('id').primaryKey(),
    topicId: text('topic_id').notNull(),
    authorId: text('author_id').notNull(),
    parentReplyId: text('parent_reply_id'),
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
    topicIdIdx: index('idx_forum_replies_topic_id').on(table.topicId),
    parentReplyIdIdx: index('idx_forum_replies_parent_reply_id').on(table.parentReplyId),
    authorIdIdx: index('idx_forum_replies_author_id').on(table.authorId),
    statusIdx: index('idx_forum_replies_status').on(table.status),
  }),
);

export const forumRepliesPg = pgTable(
  'forum_replies',
  {
    id: pgText('id').primaryKey(),
    topicId: pgText('topic_id').notNull(),
    authorId: pgText('author_id').notNull(),
    parentReplyId: pgText('parent_reply_id'),
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
    topicIdIdx: pgIndex('idx_forum_replies_topic_id').on(table.topicId),
    parentReplyIdIdx: pgIndex('idx_forum_replies_parent_reply_id').on(table.parentReplyId),
    authorIdIdx: pgIndex('idx_forum_replies_author_id').on(table.authorId),
    statusIdx: pgIndex('idx_forum_replies_status').on(table.status),
  }),
);

export const forumLikesSqlite = sqliteTable(
  'forum_likes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    targetIdx: index('idx_forum_likes_target').on(table.targetType, table.targetId),
    userIdIdx: index('idx_forum_likes_user_id').on(table.userId),
    // UNIQUE(user_id, target_type, target_id) — 防止重复点赞
    userTargetUniqueIdx: uniqueIndex('idx_forum_likes_unique').on(
      table.userId,
      table.targetType,
      table.targetId,
    ),
  }),
);

export const forumLikesPg = pgTable(
  'forum_likes',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id').notNull(),
    targetType: pgText('target_type').notNull(),
    targetId: pgText('target_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    targetIdx: pgIndex('idx_forum_likes_target').on(table.targetType, table.targetId),
    userIdIdx: pgIndex('idx_forum_likes_user_id').on(table.userId),
    userTargetUniqueIdx: pgUniqueIndex('idx_forum_likes_unique').on(
      table.userId,
      table.targetType,
      table.targetId,
    ),
  }),
);

export const forumFavoritesSqlite = sqliteTable(
  'forum_favorites',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    topicId: text('topic_id').notNull(),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    userIdIdx: index('idx_forum_favorites_user_id').on(table.userId),
    topicIdIdx: index('idx_forum_favorites_topic_id').on(table.topicId),
    // UNIQUE(user_id, topic_id) — 防止重复收藏
    userTopicUniqueIdx: uniqueIndex('idx_forum_favorites_unique').on(
      table.userId,
      table.topicId,
    ),
  }),
);

export const forumFavoritesPg = pgTable(
  'forum_favorites',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id').notNull(),
    topicId: pgText('topic_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: pgIndex('idx_forum_favorites_user_id').on(table.userId),
    topicIdIdx: pgIndex('idx_forum_favorites_topic_id').on(table.topicId),
    userTopicUniqueIdx: pgUniqueIndex('idx_forum_favorites_unique').on(
      table.userId,
      table.topicId,
    ),
  }),
);

// 浏览去重：登录用户按 user_id 去重，匿名用户按 ip_hash 去重，通过两个 partial unique index 实现
export const forumTopicViewsSqlite = sqliteTable(
  'forum_topic_views',
  {
    id: text('id').primaryKey(),
    topicId: text('topic_id').notNull(),
    userId: text('user_id'),
    ipHash: text('ip_hash'),
    viewedAt: text('viewed_at').default(sql`datetime('now')`),
  },
  (table) => ({
    topicIdIdx: index('idx_forum_topic_views_topic_id').on(table.topicId),
    userUniqueIdx: uniqueIndex('idx_forum_topic_views_unique_user')
      .on(table.topicId, table.userId)
      .where(sql`user_id IS NOT NULL`),
    ipUniqueIdx: uniqueIndex('idx_forum_topic_views_unique_ip')
      .on(table.topicId, table.ipHash)
      .where(sql`user_id IS NULL`),
  }),
);

export const forumTopicViewsPg = pgTable(
  'forum_topic_views',
  {
    id: pgText('id').primaryKey(),
    topicId: pgText('topic_id').notNull(),
    userId: pgText('user_id'),
    ipHash: pgText('ip_hash'),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    topicIdIdx: pgIndex('idx_forum_topic_views_topic_id').on(table.topicId),
    userUniqueIdx: pgUniqueIndex('idx_forum_topic_views_unique_user')
      .on(table.topicId, table.userId)
      .where(sql`user_id IS NOT NULL`),
    ipUniqueIdx: pgUniqueIndex('idx_forum_topic_views_unique_ip')
      .on(table.topicId, table.ipHash)
      .where(sql`user_id IS NULL`),
  }),
);

export const forumMentionsSqlite = sqliteTable(
  'forum_mentions',
  {
    id: text('id').primaryKey(),
    mentionedUserId: text('mentioned_user_id').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    sourceAuthorId: text('source_author_id'),
    isNotified: integer('is_notified').notNull().default(0),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    mentionedUserIdIdx: index('idx_forum_mentions_mentioned_user_id').on(
      table.mentionedUserId,
    ),
    isNotifiedIdx: index('idx_forum_mentions_is_notified').on(table.isNotified),
  }),
);

export const forumMentionsPg = pgTable(
  'forum_mentions',
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
    mentionedUserIdIdx: pgIndex('idx_forum_mentions_mentioned_user_id').on(
      table.mentionedUserId,
    ),
    isNotifiedIdx: pgIndex('idx_forum_mentions_is_notified').on(table.isNotified),
  }),
);

export interface ForumSchemaSet {
  forumCategories: typeof forumCategoriesSqlite | typeof forumCategoriesPg;
  forumTopics: typeof forumTopicsSqlite | typeof forumTopicsPg;
  forumReplies: typeof forumRepliesSqlite | typeof forumRepliesPg;
  forumLikes: typeof forumLikesSqlite | typeof forumLikesPg;
  forumFavorites: typeof forumFavoritesSqlite | typeof forumFavoritesPg;
  forumTopicViews: typeof forumTopicViewsSqlite | typeof forumTopicViewsPg;
  forumMentions: typeof forumMentionsSqlite | typeof forumMentionsPg;
}

export function getForumSchema(): ForumSchemaSet {
  if (process.env.DATABASE_PROVIDER === 'pg') {
    return {
      forumCategories: forumCategoriesPg,
      forumTopics: forumTopicsPg,
      forumReplies: forumRepliesPg,
      forumLikes: forumLikesPg,
      forumFavorites: forumFavoritesPg,
      forumTopicViews: forumTopicViewsPg,
      forumMentions: forumMentionsPg,
    };
  }
  return {
    forumCategories: forumCategoriesSqlite,
    forumTopics: forumTopicsSqlite,
    forumReplies: forumRepliesSqlite,
    forumLikes: forumLikesSqlite,
    forumFavorites: forumFavoritesSqlite,
    forumTopicViews: forumTopicViewsSqlite,
    forumMentions: forumMentionsSqlite,
  };
}
