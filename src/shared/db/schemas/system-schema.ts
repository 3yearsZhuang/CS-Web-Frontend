/**
 * @file 系统/审计/资源模块 schema 初始化
 *
 * 包含管理员审计日志、验证码、密码重置申请、组件注册表、系统设置、学习资源、
 * 入社申请表，以及 admin_actions 表的审计完整性迁移。
 *
 * 拆分自 src/shared/db/schema.ts 的 initSchema 中系统模块部分。
 */
import type { Database as DB } from 'better-sqlite3';

/**
 * 迁移 admin_actions 表：将旧 schema（admin_id NOT NULL + FK ON DELETE CASCADE）
 * 重建为 admin_id 可空 + FK ON DELETE SET NULL
 *
 * 安全目的：管理员被删除时审计记录不被级联删除，防止销毁证据。
 *
 * 检测方式：查询 admin_id 列的 notnull 标志。旧 schema 为 1（NOT NULL），新 schema 为 0。
 * 仅在检测到旧 schema 时执行重建，保证幂等。
 */
function migrateAdminActionsForAuditIntegrity(db: DB): void {
  const cols = db.prepare('PRAGMA table_info(admin_actions)').all() as Array<{
    name: string;
    notnull: number;
  }>;
  const adminIdCol = cols.find((c) => c.name === 'admin_id');
  // 新表或已迁移：admin_id 可空（notnull=0），无需迁移
  if (!adminIdCol || adminIdCol.notnull === 0) return;

  // 旧 schema 检测到 — 重建表
  db.exec('PRAGMA foreign_keys = OFF');
  try {
    db.exec('BEGIN');
    db.exec('ALTER TABLE admin_actions RENAME TO admin_actions_old');
    db.exec(`
      CREATE TABLE admin_actions (
        id TEXT PRIMARY KEY,
        admin_id TEXT,
        action TEXT NOT NULL,
        target_user_id TEXT,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    db.exec('INSERT INTO admin_actions SELECT * FROM admin_actions_old');
    db.exec('DROP TABLE admin_actions_old');
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    db.exec('PRAGMA foreign_keys = ON');
  }
}

/**
 * 初始化系统/审计/资源模块表结构（幂等，使用 CREATE TABLE IF NOT EXISTS）
 *
 * - admin_actions：管理员操作审计日志（admin_id 可空，FK ON DELETE SET NULL，
 *                  确保 admin 被删除后审计记录仍保留，防销毁证据）
 * - verification_codes：注册验证码（哈希存储，10 分钟有效期）
 * - password_reset_requests：忘记密码申请（管理员审批制）
 * - component_registry_items：组件条目（名称、分类、迁移状态等）
 * - component_registry_variants：变体记录（size × color × state 组合，可启用/禁用）
 * - component_registry_guides：使用规范（适用场景与反模式，1:1 与 items）
 * - settings：系统设置（key-value 配置，module + key 唯一）
 * - resources：学习资源站（复用论坛审核状态机 draft → published / hidden）
 * - join_applications：入社申请（pending | approved | rejected）
 */
export function initSystemSchema(db: DB): void {
  db.exec(`
    -- 审计日志表：admin_id 可空 + FK ON DELETE SET NULL
    -- 当管理员被删除时，审计记录保留（admin_id 置 NULL），防止销毁证据
    CREATE TABLE IF NOT EXISTS admin_actions (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      action TEXT NOT NULL,
      target_user_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_id TEXT,
      admin_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id ON admin_actions(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_actions_target_user_id ON admin_actions(target_user_id);
    CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
    CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
    CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON password_reset_requests(status);

    -- ============= 组件注册表（组件可视化管理平台） =============
    -- component_registry_items：组件条目（名称、分类、迁移状态等）
    -- component_registry_variants：变体记录（size × color × state 组合，可启用/禁用）
    -- component_registry_guides：使用规范（适用场景与反模式，1:1 与 items）
    CREATE TABLE IF NOT EXISTS component_registry_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      description TEXT,
      migration_status TEXT NOT NULL DEFAULT 'legacy',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS component_registry_variants (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      size TEXT NOT NULL,
      color TEXT NOT NULL,
      state TEXT NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (item_id) REFERENCES component_registry_items(id) ON DELETE CASCADE,
      UNIQUE(item_id, size, color, state)
    );

    CREATE TABLE IF NOT EXISTS component_registry_guides (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL UNIQUE,
      use_cases TEXT NOT NULL DEFAULT '[]',
      anti_patterns TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES component_registry_items(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_component_registry_items_category ON component_registry_items(category);
    CREATE INDEX IF NOT EXISTS idx_component_registry_items_migration_status ON component_registry_items(migration_status);
    CREATE INDEX IF NOT EXISTS idx_component_registry_variants_item_id ON component_registry_variants(item_id);
    CREATE INDEX IF NOT EXISTS idx_component_registry_guides_item_id ON component_registry_guides(item_id);

    -- ============= 学习资源站 =============
    -- 复用论坛审核状态机（draft → published / hidden）
    -- resource_type: article | video | course | tool | book | other
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      resource_type TEXT NOT NULL DEFAULT 'article',
      tech_tags TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      submitted_by TEXT NOT NULL,
      reviewed_by TEXT,
      review_note TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);
    CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON resources(resource_type);
    CREATE INDEX IF NOT EXISTS idx_resources_submitted_by ON resources(submitted_by);
    CREATE INDEX IF NOT EXISTS idx_resources_created_at ON resources(created_at);

    -- ============= 入社申请 =============
    -- status: pending | approved | rejected
    CREATE TABLE IF NOT EXISTS join_applications (
      id TEXT PRIMARY KEY,
      applicant_name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      major TEXT NOT NULL,
      tech_tags TEXT,
      reason TEXT NOT NULL,
      contact_qq TEXT,
      contact_phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      review_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_join_applications_status ON join_applications(status);
    CREATE INDEX IF NOT EXISTS idx_join_applications_created_at ON join_applications(created_at);

    -- ============= 系统设置（key-value 配置） =============
    -- module: 模块标识（如 events、forum、users 等）
    -- key: 设置项 key（如 title_max、capacity_limit 等）
    -- value: 设置值（JSON 序列化）
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(module, key)
    );

    CREATE INDEX IF NOT EXISTS idx_settings_module ON settings(module);
  `);

  // 增量迁移：若 admin_actions 表使用旧 schema（admin_id NOT NULL + CASCADE），
  // 重建为 admin_id 可空 + SET NULL，保留审计记录不被级联删除
  migrateAdminActionsForAuditIntegrity(db);

  // 增量迁移：为已存在的 admin_actions 表添加 ip / user_agent 列
  const existingActionCols = new Set(
    (db.prepare('PRAGMA table_info(admin_actions)').all() as Array<{ name: string }>).map(
      (row) => row.name,
    ),
  );
  if (!existingActionCols.has('ip')) {
    db.exec('ALTER TABLE admin_actions ADD COLUMN ip TEXT;');
  }
  if (!existingActionCols.has('user_agent')) {
    db.exec('ALTER TABLE admin_actions ADD COLUMN user_agent TEXT;');
  }

  // 增量迁移：为已存在的 resources 表添加 file_url 列
  const existingResourceCols = new Set(
    (db.prepare('PRAGMA table_info(resources)').all() as Array<{ name: string }>).map(
      (row) => row.name,
    ),
  );
  if (!existingResourceCols.has('file_url')) {
    db.exec('ALTER TABLE resources ADD COLUMN file_url TEXT;');
  }
}
