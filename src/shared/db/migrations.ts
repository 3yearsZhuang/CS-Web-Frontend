/**
 * @file 轻量数据库迁移系统
 *
 * 在 initSchema 之上叠加版本化迁移，每个迁移有唯一版本号 + 描述，幂等执行，记录存储在 _migrations 表。
 * 新迁移在 MIGRATIONS 数组追加，runner 自动按序执行未应用的。
 */

import type { Database as DB } from 'better-sqlite3';
import { logger } from '@/shared/logger';
import { BUILTIN_ROLES, isRootOnlyPermission } from '@/shared/security/permissions';
import { COMPONENT_SEEDS } from '@/shared/db/component-seeds';

/** 迁移定义 */
interface Migration {
  version: number;
  description: string;
  up: (db: DB) => void;
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
      // 仅在表为空时种子（幂等）
      const count = db.prepare('SELECT COUNT(*) as cnt FROM component_registry_items').get() as { cnt: number };
      if (count.cnt > 0) return;

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

      const SIZES = ['sm', 'md', 'lg'];
      const COLORS = ['primary', 'muted', 'danger'];
      const STATES = ['default', 'hover', 'disabled'];

      const seeds = COMPONENT_SEEDS;

      for (const s of seeds) {
        insertItem.run(s.id, s.name, s.slug, s.category, s.description, s.status, s.sortOrder);

        // 生成全量变体网格（3×3×3=27），全部启用
        for (const size of SIZES) {
          for (const color of COLORS) {
            for (const state of STATES) {
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
    },
  },
  {
    version: 4,
    description: '组件注册表：清空旧种子（6 个），用完整盘点数据（54 个）重新种子',
    up: (db: DB) => {
      db.prepare('DELETE FROM component_registry_guides').run();
      db.prepare('DELETE FROM component_registry_variants').run();
      db.prepare('DELETE FROM component_registry_items').run();

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

      const SIZES = ['sm', 'md', 'lg'];
      const COLORS = ['primary', 'muted', 'danger'];
      const STATES = ['default', 'hover', 'disabled'];

      for (const s of COMPONENT_SEEDS) {
        insertItem.run(s.id, s.name, s.slug, s.category, s.description, s.status, s.sortOrder);

        for (const size of SIZES) {
          for (const color of COLORS) {
            for (const state of STATES) {
              insertVariant.run(`${s.id}:${size}:${color}:${state}`, s.id, size, color, state);
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
      const tableExists = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='login_history'")
        .get() as { name: string } | undefined;

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
    (db.prepare('SELECT version FROM _migrations').all() as Array<{ version: number }>).map(
      (r) => r.version,
    ),
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
  return (db
    .prepare('SELECT version, description, applied_at FROM _migrations ORDER BY version ASC')
    .all() as Array<{ version: number; description: string; applied_at: string }>).map((r) => ({
    version: r.version,
    description: r.description,
    appliedAt: r.applied_at,
  }));
}
