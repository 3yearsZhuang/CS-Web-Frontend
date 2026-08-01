/**
 * @file 社区模块 schema 初始化（统一）
 *
 * 合并原论坛与博客表为统一社区系统。包含：
 * - community_categories / community_posts / community_comments
 * - community_reactions / community_favorites / community_post_views
 * - community_mentions / blog_series
 * - community_posts_fts：FTS5 全文索引（content=community_posts）
 */
import type { Database as DB } from 'better-sqlite3';

export function initCommunitySchema(db: DB): void {
  db.exec(`
    -- ============= 社区统一模块 =============

    -- 统一分类表（论坛版块 + 博客分类合并）
    CREATE TABLE IF NOT EXISTS community_categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      post_count INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 统一内容表：kind='topic'|'post'
    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      category_id TEXT,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      reply_count INTEGER NOT NULL DEFAULT 0,
      favorite_count INTEGER NOT NULL DEFAULT 0,
      last_reply_at TEXT,
      last_reply_id TEXT,
      hidden_by TEXT,
      hidden_at TEXT,
      hidden_reason TEXT,
      slug TEXT UNIQUE,
      excerpt TEXT,
      cover_image TEXT,
      tags TEXT DEFAULT '[]',
      series_id TEXT,
      series_order INTEGER DEFAULT 0,
      published_at TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES community_categories(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (series_id) REFERENCES blog_series(id) ON DELETE SET NULL,
      FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 统一评论表
    CREATE TABLE IF NOT EXISTS community_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      parent_comment_id TEXT,
      content_markdown TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      like_count INTEGER NOT NULL DEFAULT 0,
      reply_count INTEGER NOT NULL DEFAULT 0,
      hidden_by TEXT,
      hidden_at TEXT,
      hidden_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_comment_id) REFERENCES community_comments(id) ON DELETE CASCADE,
      FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 统一多态点赞
    CREATE TABLE IF NOT EXISTS community_reactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, target_type, target_id)
    );

    -- 统一收藏（多态，目前仅 post）
    CREATE TABLE IF NOT EXISTS community_favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, target_type, target_id)
    );

    -- 浏览去重
    CREATE TABLE IF NOT EXISTS community_post_views (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      user_id TEXT,
      ip_hash TEXT,
      viewed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- @提及
    CREATE TABLE IF NOT EXISTS community_mentions (
      id TEXT PRIMARY KEY,
      mentioned_user_id TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_author_id TEXT,
      is_notified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (source_author_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_community_categories_sort_order ON community_categories(sort_order);
    CREATE INDEX IF NOT EXISTS idx_community_posts_kind ON community_posts(kind);
    CREATE INDEX IF NOT EXISTS idx_community_posts_category_id ON community_posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status);
    CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON community_posts(author_id);
    CREATE INDEX IF NOT EXISTS idx_community_posts_last_reply_at ON community_posts(last_reply_at);
    CREATE INDEX IF NOT EXISTS idx_community_posts_is_pinned ON community_posts(is_pinned);
    CREATE INDEX IF NOT EXISTS idx_community_posts_published_at ON community_posts(published_at);
    CREATE INDEX IF NOT EXISTS idx_community_posts_series_id ON community_posts(series_id);
    CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
    CREATE INDEX IF NOT EXISTS idx_community_comments_parent_comment_id ON community_comments(parent_comment_id);
    CREATE INDEX IF NOT EXISTS idx_community_comments_author_id ON community_comments(author_id);
    CREATE INDEX IF NOT EXISTS idx_community_comments_status ON community_comments(status);
    CREATE INDEX IF NOT EXISTS idx_community_reactions_target ON community_reactions(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_community_reactions_user_id ON community_reactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_community_favorites_user_id ON community_favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_community_favorites_target ON community_favorites(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_community_post_views_post_id ON community_post_views(post_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_community_post_views_unique_user
      ON community_post_views(post_id, user_id) WHERE user_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_community_post_views_unique_ip
      ON community_post_views(post_id, ip_hash) WHERE user_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_community_mentions_mentioned_user_id ON community_mentions(mentioned_user_id);
    CREATE INDEX IF NOT EXISTS idx_community_mentions_is_notified ON community_mentions(is_notified);

    -- 博客系列（保留，作为社区内容组织的可选归属）
    CREATE TABLE IF NOT EXISTS blog_series (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      slug TEXT UNIQUE NOT NULL,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_blog_series_slug ON blog_series(slug);
    CREATE INDEX IF NOT EXISTS idx_blog_series_created_by ON blog_series(created_by);

    -- ============= 全文搜索（FTS5） =============
    CREATE VIRTUAL TABLE IF NOT EXISTS community_posts_fts USING fts5(
      title,
      content_markdown,
      content=community_posts,
      content_rowid=rowid,
      tokenize="porter unicode61"
    );
  `);

  // FTS5 触发器
  const ftsExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='community_posts_fts'")
    .get();
  if (ftsExists) {
    const triggerExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='community_posts_fts_ai'")
      .get();
    if (!triggerExists) {
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS community_posts_fts_ai AFTER INSERT ON community_posts BEGIN
          INSERT INTO community_posts_fts(rowid, title, content_markdown)
          VALUES (new.rowid, new.title, new.content_markdown);
        END;

        CREATE TRIGGER IF NOT EXISTS community_posts_fts_ad AFTER DELETE ON community_posts BEGIN
          INSERT INTO community_posts_fts(community_posts_fts, rowid, title, content_markdown)
          VALUES ('delete', old.rowid, old.title, old.content_markdown);
        END;

        CREATE TRIGGER IF NOT EXISTS community_posts_fts_au AFTER UPDATE ON community_posts BEGIN
          INSERT INTO community_posts_fts(community_posts_fts, rowid, title, content_markdown)
          VALUES ('delete', old.rowid, old.title, old.content_markdown);
          INSERT INTO community_posts_fts(rowid, title, content_markdown)
          VALUES (new.rowid, new.title, new.content_markdown);
        END;
      `);
    }

    const ftsCount = db.prepare('SELECT COUNT(*) as cnt FROM community_posts_fts').get() as { cnt: number };
    if (ftsCount.cnt === 0) {
      db.exec(`
        INSERT INTO community_posts_fts(rowid, title, content_markdown)
        SELECT rowid, title, content_markdown FROM community_posts;
      `);
    }
  }
}
