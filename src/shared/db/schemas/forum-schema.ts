/**
 * @file 论坛模块 schema 初始化
 *
 * 包含论坛版块、主题、回复、点赞、收藏、浏览记录、@提及表，以及 FTS5 全文搜索
 * 虚拟表与同步触发器。
 *
 * 拆分自 src/shared/db/schema.ts 的 initSchema 中论坛模块部分。
 * 设计参见 docs/forum-plan.md
 */
import type { Database as DB } from 'better-sqlite3';

/**
 * 初始化论坛模块表结构（幂等，使用 CREATE TABLE IF NOT EXISTS）
 *
 * 7 张业务表 + 1 张 FTS5 虚拟表 + 3 个同步触发器：
 * - forum_categories：版块（管理员维护，主题的分类容器）
 * - forum_topics：主题（用户在版块下发布的讨论）
 * - forum_replies：回复（两层结构：主回复 + 楼中楼）
 * - forum_likes：点赞（主题与回复共用）
 * - forum_favorites：收藏（仅主题）
 * - forum_topic_views：浏览记录（登录按 user_id 去重，匿名按 ip_hash 去重）
 * - forum_mentions：@提及记录（触发站内通知）
 * - forum_topics_fts：FTS5 全文索引（外部内容模式，content=forum_topics）
 */
export function initForumSchema(db: DB): void {
  db.exec(`
    -- ============= 论坛模块（7 张表） =============
    -- 设计参见 docs/forum-plan.md

    -- 版块表：管理员维护，作为主题的分类容器
    CREATE TABLE IF NOT EXISTS forum_categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      topic_count INTEGER NOT NULL DEFAULT 0,
      post_count INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 主题表：用户在版块下发布的讨论
    CREATE TABLE IF NOT EXISTS forum_topics (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      reply_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      favorite_count INTEGER NOT NULL DEFAULT 0,
      last_reply_at TEXT,
      last_reply_id TEXT,
      hidden_by TEXT,
      hidden_at TEXT,
      hidden_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 回复表：两层结构（主回复 parent_reply_id=NULL，楼中楼指向主回复）
    CREATE TABLE IF NOT EXISTS forum_replies (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      parent_reply_id TEXT,
      content_markdown TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      like_count INTEGER NOT NULL DEFAULT 0,
      reply_count INTEGER NOT NULL DEFAULT 0,
      hidden_by TEXT,
      hidden_at TEXT,
      hidden_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_reply_id) REFERENCES forum_replies(id) ON DELETE CASCADE,
      FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 点赞表：主题与回复共用，UNIQUE 防重复
    CREATE TABLE IF NOT EXISTS forum_likes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, target_type, target_id)
    );

    -- 收藏表：仅主题
    CREATE TABLE IF NOT EXISTS forum_favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
      UNIQUE(user_id, topic_id)
    );

    -- 浏览记录表：登录用户按 user_id 去重，匿名按 ip_hash 去重
    CREATE TABLE IF NOT EXISTS forum_topic_views (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      user_id TEXT,
      ip_hash TEXT,
      viewed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- @ 提及记录表：触发站内通知
    CREATE TABLE IF NOT EXISTS forum_mentions (
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

    CREATE INDEX IF NOT EXISTS idx_forum_categories_sort_order ON forum_categories(sort_order);
    CREATE INDEX IF NOT EXISTS idx_forum_topics_category_id ON forum_topics(category_id);
    CREATE INDEX IF NOT EXISTS idx_forum_topics_status ON forum_topics(status);
    CREATE INDEX IF NOT EXISTS idx_forum_topics_author_id ON forum_topics(author_id);
    CREATE INDEX IF NOT EXISTS idx_forum_topics_last_reply_at ON forum_topics(last_reply_at);
    CREATE INDEX IF NOT EXISTS idx_forum_topics_is_pinned ON forum_topics(is_pinned);
    CREATE INDEX IF NOT EXISTS idx_forum_replies_topic_id ON forum_replies(topic_id);
    CREATE INDEX IF NOT EXISTS idx_forum_replies_parent_reply_id ON forum_replies(parent_reply_id);
    CREATE INDEX IF NOT EXISTS idx_forum_replies_author_id ON forum_replies(author_id);
    CREATE INDEX IF NOT EXISTS idx_forum_replies_status ON forum_replies(status);
    CREATE INDEX IF NOT EXISTS idx_forum_likes_target ON forum_likes(target_type, target_id);
    CREATE INDEX IF NOT EXISTS idx_forum_likes_user_id ON forum_likes(user_id);
    CREATE INDEX IF NOT EXISTS idx_forum_favorites_user_id ON forum_favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_forum_favorites_topic_id ON forum_favorites(topic_id);
    CREATE INDEX IF NOT EXISTS idx_forum_topic_views_topic_id ON forum_topic_views(topic_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_topic_views_unique_user
      ON forum_topic_views(topic_id, user_id) WHERE user_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_topic_views_unique_ip
      ON forum_topic_views(topic_id, ip_hash) WHERE user_id IS NULL;
    CREATE INDEX IF NOT EXISTS idx_forum_mentions_mentioned_user_id ON forum_mentions(mentioned_user_id);
    CREATE INDEX IF NOT EXISTS idx_forum_mentions_is_notified ON forum_mentions(is_notified);

    -- ============= 论坛全文搜索（FTS5） =============
    -- 使用 content=forum_topics 的外部内容模式，避免数据重复存储
    -- tokenize="porter unicode61"：支持英文词干提取 + Unicode 分词
    CREATE VIRTUAL TABLE IF NOT EXISTS forum_topics_fts USING fts5(
      title,
      content_markdown,
      content=forum_topics,
      content_rowid=rowid,
      tokenize="porter unicode61"
    );
  `);

  // ============= FTS5 触发器：自动同步 forum_topics ↔ forum_topics_fts =============
  // 检查 forum_topics_fts 表是否存在（避免重复创建触发器）
  const ftsExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='forum_topics_fts'")
    .get();
  if (ftsExists) {
    const triggerExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name='forum_topics_fts_ai'")
      .get();
    if (!triggerExists) {
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS forum_topics_fts_ai AFTER INSERT ON forum_topics BEGIN
          INSERT INTO forum_topics_fts(rowid, title, content_markdown)
          VALUES (new.rowid, new.title, new.content_markdown);
        END;

        CREATE TRIGGER IF NOT EXISTS forum_topics_fts_ad AFTER DELETE ON forum_topics BEGIN
          INSERT INTO forum_topics_fts(forum_topics_fts, rowid, title, content_markdown)
          VALUES ('delete', old.rowid, old.title, old.content_markdown);
        END;

        CREATE TRIGGER IF NOT EXISTS forum_topics_fts_au AFTER UPDATE ON forum_topics BEGIN
          INSERT INTO forum_topics_fts(forum_topics_fts, rowid, title, content_markdown)
          VALUES ('delete', old.rowid, old.title, old.content_markdown);
          INSERT INTO forum_topics_fts(rowid, title, content_markdown)
          VALUES (new.rowid, new.title, new.content_markdown);
        END;
      `);
    }

    // 增量迁移：若 FTS 表为空但 forum_topics 有数据，执行全量回填
    const ftsCount = db.prepare('SELECT COUNT(*) as cnt FROM forum_topics_fts').get() as { cnt: number };
    if (ftsCount.cnt === 0) {
      db.exec(`
        INSERT INTO forum_topics_fts(rowid, title, content_markdown)
        SELECT rowid, title, content_markdown FROM forum_topics;
      `);
    }
  }
}
