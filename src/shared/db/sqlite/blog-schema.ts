/**
 * @file 博客模块 schema 初始化
 *
 * 包含博客文章、系列、点赞表。
 *
 * 拆分自 src/shared/db/schema.ts 的 initSchema 中博客模块部分。
 */
import type { Database as DB } from 'better-sqlite3';

/**
 * 初始化博客模块表结构（幂等，使用 CREATE TABLE IF NOT EXISTS）
 *
 * - blog_posts：博客文章（支持系列归档与 slug 唯一）
 * - blog_series：博客系列（一篇文章可归属于一个系列，按 series_order 排序）
 * - blog_likes：博客点赞（post × user 唯一，防重复点赞）
 */
export function initBlogSchema(db: DB): void {
  db.exec(`
    -- ============= 博客系统 =============
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      excerpt TEXT,
      content_markdown TEXT NOT NULL,
      cover_image TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft',
      author_id TEXT NOT NULL,
      series_id TEXT,
      series_order INTEGER DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (series_id) REFERENCES blog_series(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at);

    -- 博客系列
    CREATE TABLE IF NOT EXISTS blog_series (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      slug TEXT UNIQUE NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 博客点赞
    CREATE TABLE IF NOT EXISTS blog_likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(post_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_blog_likes_post ON blog_likes(post_id);
    CREATE INDEX IF NOT EXISTS idx_blog_likes_user ON blog_likes(user_id);
  `);
}
