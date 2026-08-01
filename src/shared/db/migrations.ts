/**
 * @file 轻量数据库迁移系统
 *
 * 在 initSchema 之上叠加版本化迁移，每个迁移有唯一版本号 + 描述，幂等执行，记录存储在 _migrations 表。
 * 新迁移在 MIGRATIONS 数组追加，runner 自动按序执行未应用的。
 */

import type { Database as DB } from 'better-sqlite3';
import { logger } from '@/shared/logger';
import { BUILTIN_ROLES, isRootOnlyPermission } from '@/shared/security/permissions';
import { COMPONENT_SEEDS } from '@/shared/db/seeds/component-seeds';

/** better-sqlite3 查询结果的行类型，集中封装 unknown[] 断言，避免散落的 as Array<{...}> */
type Row<T extends Record<string, unknown>> = T;

/** 执行查询并将结果按统一行类型返回（替代各处重复的 .all() as Array<{...}> 断言） */
function queryRows<T extends Record<string, unknown>>(
  db: DB,
  sql: string,
  params: unknown[] = [],
): Row<T>[] {
  const stmt = db.prepare(sql);
  const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
  return rows as Row<T>[];
}

/** 执行查询并返回单行（替代各处重复的 .get() as { name: string } | undefined 断言） */
function queryOne<T extends Record<string, unknown>>(
  db: DB,
  sql: string,
  params: unknown[] = [],
): Row<T> | undefined {
  const stmt = db.prepare(sql);
  const row = params.length > 0 ? stmt.get(...params) : stmt.get();
  return row as Row<T> | undefined;
}

/** 迁移定义 */
interface Migration {
  version: number;
  description: string;
  up: (db: DB) => void;
}

/** 变体网格维度：size × color × state = 27 种组合，全部启用 */
const VARIANT_SIZES = ['sm', 'md', 'lg'] as const;
const VARIANT_COLORS = ['primary', 'muted', 'danger'] as const;
const VARIANT_STATES = ['default', 'hover', 'disabled'] as const;

/**
 * 幂等种子组件注册表：写入 component_registry_items / _variants / _guides。
 * 仅在 items 表为空时执行，供 v3、v4 复用（避免两段近乎相同的代码散落）。
 */
function seedComponentRegistry(db: DB): void {
  const count = queryOne<{ cnt: number }>(
    db,
    'SELECT COUNT(*) AS cnt FROM component_registry_items',
  );
  if ((count?.cnt ?? 0) > 0) return;

  const insertItem = db.prepare(
    `INSERT INTO component_registry_items (id, name, slug, category, description, migration_status, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertVariant = db.prepare(
    `INSERT OR IGNORE INTO component_registry_variants (id, item_id, size, color, state, is_enabled)
     VALUES (?, ?, ?, ?, ?, 1)`,
  );
  const insertGuide = db.prepare(
    `INSERT INTO component_registry_guides (id, item_id, use_cases, anti_patterns)
     VALUES (?, ?, ?, ?)`,
  );

  for (const s of COMPONENT_SEEDS) {
    insertItem.run(s.id, s.name, s.slug, s.category, s.description, s.status, s.sortOrder);

    // 生成全量变体网格（3×3×3=27），全部启用
    for (const size of VARIANT_SIZES) {
      for (const color of VARIANT_COLORS) {
        for (const state of VARIANT_STATES) {
          const variantId = `${s.id}:${size}:${color}:${state}`;
          insertVariant.run(variantId, s.id, size, color, state);
        }
      }
    }

    insertGuide.run(
      `guide:${s.id}`,
      s.id,
      JSON.stringify(s.useCases),
      JSON.stringify(s.antiPatterns),
    );
  }
}

/**
 * 迁移注册表 — 新迁移在此追加
 *
 * 版本号递增整数不复用不跳过；已发布的迁移不可修改，只能新增补偿迁移。
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: '初始化迁移记录表',
    up: (db: DB) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
          version INTEGER PRIMARY KEY,
          description TEXT NOT NULL,
          applied_at TEXT DEFAULT (datetime('now'))
        );
      `);
    },
  },
  {
    version: 2,
    description: '角色权限管理：创建 roles + role_permissions 表并种子内置角色',
    up: (db: DB) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS roles (
          key TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          description TEXT,
          is_system INTEGER NOT NULL DEFAULT 0,
          is_protected INTEGER NOT NULL DEFAULT 0,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
      `);

      // granted=1 授权；granted=0 显式拒绝（覆盖默认）
      // root 永远全权限不存 DB，user 永远无管理权限
      db.exec(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id TEXT PRIMARY KEY,
          role_key TEXT NOT NULL,
          permission TEXT NOT NULL,
          granted INTEGER NOT NULL DEFAULT 1,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (role_key) REFERENCES roles(key) ON DELETE CASCADE,
          UNIQUE(role_key, permission)
        );
        CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_key);
      `);

      // 种子内置角色（INSERT OR IGNORE 保证幂等）
      const insertRole = db.prepare(
        `INSERT OR IGNORE INTO roles (key, display_name, description, is_system, is_protected, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      const insertPerm = db.prepare(
        `INSERT OR IGNORE INTO role_permissions (id, role_key, permission, granted)
         VALUES (?, ?, ?, 1)`,
      );

      for (const role of BUILTIN_ROLES) {
        insertRole.run(
          role.key,
          role.label,
          role.description,
          role.isSystem ? 1 : 0,
          role.isProtected ? 1 : 0,
          role.sortOrder,
        );
        // root 与 user 都不写权限：root 永远全权限（硬编码），user 永远无管理权限
        if (role.key === 'root' || role.key === 'user') continue;
        for (const perm of role.defaultPermissions) {
          // root_only 权限不写入 DB（仅 root 可用，硬编码在 hasPermission 中）
          if (isRootOnlyPermission(perm)) continue;
          insertPerm.run(
            // 确定性 ID 便于幂等：role_key:permission
            `${role.key}:${perm}`,
            role.key,
            perm,
          );
        }
      }
    },
  },
  {
    version: 3,
    description: '组件注册表：种子初始组件数据（54 个组件 + 变体 + 使用规范）',
    up: (db: DB) => {
      seedComponentRegistry(db);
    },
  },
  {
    version: 4,
    description: '组件注册表：清空旧种子（6 个），用完整盘点数据（54 个）重新种子',
    up: (db: DB) => {
      db.prepare('DELETE FROM component_registry_guides').run();
      db.prepare('DELETE FROM component_registry_variants').run();
      db.prepare('DELETE FROM component_registry_items').run();
      seedComponentRegistry(db);
    },
  },
  {
    version: 5,
    description: '密码策略升级：创建 password_history 表用于历史密码复用检测',
    up: (db: DB) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS password_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_password_history_user
          ON password_history(user_id, created_at DESC);
      `);
    },
  },
  {
    version: 6,
    description: '安全监控：login_history 支持 user_id 可空 + attempted_email 列（记录失败登录）',
    up: (db: DB) => {
      // SQLite 不支持 ALTER TABLE 修改列约束，通过重建表实现
      // user_id 改为可空：用户不存在的失败登录也要记录（用于暴力破解检测）
      // 新增 attempted_email 列：user_id 为空时用于关联用户
      db.exec(`
        CREATE TABLE IF NOT EXISTS login_history_new (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          ip TEXT,
          user_agent TEXT,
          success INTEGER NOT NULL DEFAULT 1,
          attempted_email TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);

      // 迁移现有数据（已存在的表才迁移，新建的库跳过）
      const tableExists = queryOne<{ name: string }>(
        db,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='login_history'",
      );

      if (tableExists) {
        // attempted_email 设为 NULL（旧记录无此信息）
        db.exec(`
          INSERT INTO login_history_new (id, user_id, ip, user_agent, success, attempted_email, created_at)
          SELECT id, user_id, ip, user_agent, success, NULL, created_at FROM login_history;
          DROP TABLE login_history;
        `);
      }

      db.exec(`
        ALTER TABLE login_history_new RENAME TO login_history;
        CREATE INDEX IF NOT EXISTS idx_login_history_user
          ON login_history(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_login_history_attempted_email
          ON login_history(attempted_email, created_at DESC);
      `);
    },
  },
  {
    version: 7,
    description: '入社申请关联用户：join_applications 新增 user_id 列（可空，关联 users 表）',
    up: (db: DB) => {
      // 幂等：检查列是否已存在
      const columns = queryRows<{ name: string }>(db, 'PRAGMA table_info(join_applications)');
      if (!columns.some((c) => c.name === 'user_id')) {
        db.exec(`
          ALTER TABLE join_applications ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
        `);
      }
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_join_applications_user_id ON join_applications(user_id);
      `);
    },
  },
  {
    version: 8,
    description: '社区统一重构：forum/blog 合并为 community_posts 体系，迁移数据并废弃旧表',
    up: (db: DB) => {
      // 1) 建新表（initCommunitySchema 已在 initSchema 中创建，此处确保存在）
      const hasNew = queryOne<{ name: string }>(
        db,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='community_posts'",
      );
      if (!hasNew) {
        // 兜底：直接建核心表（FTS 触发器由 initCommunitySchema 负责，此处仅建数据表）
        // 正常情况下不会走到这里，因为 initSchema 在 runMigrations 之前已执行
        throw new Error('community_posts 表未创建，请确认 initCommunitySchema 已执行');
      }

      // 2) 分类迁移：forum_categories → community_categories（slug 兼容）
      const forumCatExists = queryOne<{ name: string }>(
        db,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='forum_categories'",
      );
      if (forumCatExists) {
        db.exec(`
          INSERT INTO community_categories (id, slug, name, description, icon, sort_order, post_count, created_by, created_at, updated_at)
          SELECT id, slug, name, description, icon, sort_order, post_count, created_by, created_at, updated_at
          FROM forum_categories
          WHERE id NOT IN (SELECT id FROM community_categories);
        `);
      }

      // 3) 主题迁移：forum_topics → community_posts (kind='topic')
      const topicsExists = queryOne<{ name: string }>(
        db,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='forum_topics'",
      );
      if (topicsExists) {
        db.exec(`
          INSERT INTO community_posts (
            id, kind, category_id, author_id, title, content_markdown, status,
            is_pinned, is_featured, reply_count, favorite_count, last_reply_at, last_reply_id,
            hidden_by, hidden_at, hidden_reason, view_count, like_count, created_at, updated_at
          )
          SELECT
            id, 'topic', category_id, author_id, title, content_markdown, status,
            is_pinned, is_featured, reply_count, favorite_count, last_reply_at, last_reply_id,
            hidden_by, hidden_at, hidden_reason, view_count, like_count, created_at, updated_at
          FROM forum_topics
          WHERE id NOT IN (SELECT id FROM community_posts);
        `);

        // 回复迁移：forum_replies → community_comments
        db.exec(`
          INSERT INTO community_comments (
            id, post_id, author_id, parent_comment_id, content_markdown, status,
            like_count, reply_count, hidden_by, hidden_at, hidden_reason, created_at, updated_at
          )
          SELECT
            id, topic_id, author_id, parent_reply_id, content_markdown, status,
            like_count, reply_count, hidden_by, hidden_at, hidden_reason, created_at, updated_at
          FROM forum_replies
          WHERE id NOT IN (SELECT id FROM community_comments);
        `);

        // 点赞迁移：forum_likes (topic→post, reply→comment)
        db.exec(`
          INSERT INTO community_reactions (id, user_id, target_type, target_id, created_at)
          SELECT id, user_id,
            CASE target_type WHEN 'topic' THEN 'post' WHEN 'reply' THEN 'comment' ELSE target_type END,
            target_id, created_at
          FROM forum_likes
          WHERE id NOT IN (SELECT id FROM community_reactions);
        `);

        // 收藏迁移：forum_favorites → community_favorites (target_type='post')
        db.exec(`
          INSERT INTO community_favorites (id, user_id, target_type, target_id, created_at)
          SELECT id, user_id, 'post', topic_id, created_at
          FROM forum_favorites
          WHERE id NOT IN (SELECT id FROM community_favorites);
        `);

        // 浏览迁移：forum_topic_views → community_post_views
        db.exec(`
          INSERT INTO community_post_views (id, post_id, user_id, ip_hash, viewed_at)
          SELECT id, topic_id, user_id, ip_hash, viewed_at
          FROM forum_topic_views
          WHERE id NOT IN (SELECT id FROM community_post_views);
        `);

        // @提及迁移：forum_mentions (topic→post, reply→comment)
        db.exec(`
          INSERT INTO community_mentions (id, mentioned_user_id, source_type, source_id, source_author_id, is_notified, created_at)
          SELECT id, mentioned_user_id,
            CASE source_type WHEN 'topic' THEN 'post' WHEN 'reply' THEN 'comment' ELSE source_type END,
            source_id, source_author_id, is_notified, created_at
          FROM forum_mentions
          WHERE id NOT IN (SELECT id FROM community_mentions);
        `);
      }

      // 4) 博客迁移：blog_posts → community_posts (kind='post')
      const blogExists = queryOne<{ name: string }>(
        db,
        "SELECT name FROM sqlite_master WHERE type='table' AND name='blog_posts'",
      );
      if (blogExists) {
        db.exec(`
          INSERT INTO community_posts (
            id, kind, category_id, author_id, title, content_markdown, status,
            slug, excerpt, cover_image, tags, series_id, series_order, published_at,
            view_count, like_count, created_at, updated_at
          )
          SELECT
            id, 'post', NULL, author_id, title, content_markdown, status,
            slug, excerpt, cover_image, tags, series_id, series_order, published_at,
            view_count, like_count, created_at, updated_at
          FROM blog_posts
          WHERE id NOT IN (SELECT id FROM community_posts);
        `);

        // 博客点赞迁移：blog_likes → community_reactions (target_type='post')
        db.exec(`
          INSERT INTO community_reactions (id, user_id, target_type, target_id, created_at)
          SELECT id, user_id, 'post', post_id, created_at
          FROM blog_likes
          WHERE id NOT IN (SELECT id FROM community_reactions);
        `);

        // blog_series 已通过 initCommunitySchema 建表，但数据需迁移（若旧表存在）
        const seriesExists = queryOne<{ name: string }>(
          db,
          "SELECT name FROM sqlite_master WHERE type='table' AND name='blog_series'",
        );
        if (seriesExists) {
          db.exec(`
            INSERT INTO blog_series (id, title, description, slug, created_by, created_at)
            SELECT id, title, description, slug, created_by, created_at
            FROM blog_series
            WHERE id NOT IN (SELECT id FROM blog_series);
          `);
        }
      }
    },
  },
  {
    version: 9,
    description: '社区统一重构：删除已迁移的旧 forum_*/blog_* 表（不可回滚）',
    up: (db: DB) => {
      // 仅当新表已有数据时才删除旧表，避免误删
      const postCount = queryOne<{ cnt: number }>(
        db,
        'SELECT COUNT(*) as cnt FROM community_posts',
      );

      const dropIfExists = (table: string, deps: string[] = []) => {
        // 先删依赖对象（触发器/索引），再删表
        const triggers = queryRows<{ name: string }>(
          db,
          "SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name=?",
          [table],
        );
        for (const t of triggers) db.prepare(`DROP TRIGGER IF EXISTS ${t.name}`).run();
        const indexes = queryRows<{ name: string }>(
          db,
          "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL",
          [table],
        );
        for (const i of indexes) db.prepare(`DROP INDEX IF EXISTS ${i.name}`).run();
        db.prepare(`DROP TABLE IF EXISTS ${table}`).run();
      };

      // 删除旧 forum 表（forum_topics_fts 虚拟表 + 触发器先清理）
      dropIfExists('forum_topics_fts');
      dropIfExists('forum_mentions');
      dropIfExists('forum_topic_views');
      dropIfExists('forum_favorites');
      dropIfExists('forum_likes');
      dropIfExists('forum_replies');
      dropIfExists('forum_topics');
      dropIfExists('forum_categories');

      // 删除旧 blog 表（注意：blog_series 已并入社区体系并保留，不在此删除）
      dropIfExists('blog_likes');
      dropIfExists('blog_posts');
    },
  },
];

/** 执行所有未应用的迁移 */
export function runMigrations(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    queryRows<{ version: number }>(db, 'SELECT version FROM _migrations').map((r) => r.version),
  );

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;

    const tx = db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO _migrations (version, description) VALUES (?, ?)').run(
        migration.version,
        migration.description,
      );
    });

    try {
      tx();
    } catch (err) {
      logger.error({ err, version: migration.version, description: migration.description }, 'migration 失败');
      throw err;
    }
  }
}

/** 获取已应用的迁移列表（按版本号升序，供管理后台展示） */
export function getAppliedMigrations(db: DB): Array<{
  version: number;
  description: string;
  appliedAt: string;
}> {
  return queryRows<{ version: number; description: string; applied_at: string }>(
    db,
    'SELECT version, description, applied_at FROM _migrations ORDER BY version ASC',
  ).map((r) => ({
    version: r.version,
    description: r.description,
    appliedAt: r.applied_at,
  }));
}
