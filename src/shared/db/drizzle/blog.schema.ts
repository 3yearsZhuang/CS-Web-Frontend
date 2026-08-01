/**
 * @file blog.schema.ts — 博客模块 Drizzle schema 定义（posts / series / likes）
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

export const blogPostsSqlite = sqliteTable(
  'blog_posts',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    slug: text('slug').unique().notNull(),
    excerpt: text('excerpt'),
    contentMarkdown: text('content_markdown').notNull(),
    coverImage: text('cover_image'),
    category: text('category').notNull().default('general'),
    tags: text('tags').default('[]'),
    status: text('status').notNull().default('draft'),
    authorId: text('author_id').notNull(),
    seriesId: text('series_id'),
    seriesOrder: integer('series_order').default(0),
    viewCount: integer('view_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    publishedAt: text('published_at'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    statusIdx: index('idx_blog_posts_status').on(table.status),
    categoryIdx: index('idx_blog_posts_category').on(table.category),
    authorIdx: index('idx_blog_posts_author').on(table.authorId),
    publishedIdx: index('idx_blog_posts_published').on(table.publishedAt),
  }),
);

export const blogPostsPg = pgTable(
  'blog_posts',
  {
    id: pgText('id').primaryKey(),
    title: pgText('title').notNull(),
    slug: pgText('slug').unique().notNull(),
    excerpt: pgText('excerpt'),
    contentMarkdown: pgText('content_markdown').notNull(),
    coverImage: pgText('cover_image'),
    category: pgText('category').notNull().default('general'),
    tags: pgText('tags').default('[]'),
    status: pgText('status').notNull().default('draft'),
    authorId: pgText('author_id').notNull(),
    seriesId: pgText('series_id'),
    seriesOrder: pgInteger('series_order').default(0),
    viewCount: pgInteger('view_count').notNull().default(0),
    likeCount: pgInteger('like_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    statusIdx: pgIndex('idx_blog_posts_status').on(table.status),
    categoryIdx: pgIndex('idx_blog_posts_category').on(table.category),
    authorIdx: pgIndex('idx_blog_posts_author').on(table.authorId),
    publishedIdx: pgIndex('idx_blog_posts_published').on(table.publishedAt),
  }),
);

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

export const blogLikesSqlite = sqliteTable(
  'blog_likes',
  {
    id: text('id').primaryKey(),
    postId: text('post_id').notNull(),
    userId: text('user_id').notNull(),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    postIdx: index('idx_blog_likes_post').on(table.postId),
    userIdx: index('idx_blog_likes_user').on(table.userId),
    // UNIQUE(post_id, user_id) — 防止重复点赞
    postUserUniqueIdx: uniqueIndex('idx_blog_likes_unique').on(table.postId, table.userId),
  }),
);

export const blogLikesPg = pgTable(
  'blog_likes',
  {
    id: pgText('id').primaryKey(),
    postId: pgText('post_id').notNull(),
    userId: pgText('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    postIdx: pgIndex('idx_blog_likes_post').on(table.postId),
    userIdx: pgIndex('idx_blog_likes_user').on(table.userId),
    postUserUniqueIdx: pgUniqueIndex('idx_blog_likes_unique').on(table.postId, table.userId),
  }),
);

export interface BlogSchemaSet {
  blogPosts: typeof blogPostsSqlite | typeof blogPostsPg;
  blogSeries: typeof blogSeriesSqlite | typeof blogSeriesPg;
  blogLikes: typeof blogLikesSqlite | typeof blogLikesPg;
}

export function getBlogSchema(): BlogSchemaSet {
  if (process.env.DATABASE_PROVIDER === 'pg') {
    return {
      blogPosts: blogPostsPg,
      blogSeries: blogSeriesPg,
      blogLikes: blogLikesPg,
    };
  }
  return {
    blogPosts: blogPostsSqlite,
    blogSeries: blogSeriesSqlite,
    blogLikes: blogLikesSqlite,
  };
}
