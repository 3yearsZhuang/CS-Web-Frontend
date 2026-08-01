#!/usr/bin/env node
/**
 * @file tools/scripts/create-user.mjs — 创建或升级特权账号（root / admin）
 *
 * root 系统唯一（partial unique index 保证）；凭据来源优先级：命令行 > 环境变量 > 交互式输入。
 */

import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

/** 与 dev/start 脚本保持一致的默认端口 */
const DEFAULT_PORT = 2333;

function parseArgs(argv) {
  const args = { role: null, email: null, password: null, force: false, resetPassword: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--role' || arg === '-r') {
      args.role = argv[++i];
    } else if (arg === '--email' || arg === '-e') {
      args.email = argv[++i];
    } else if (arg === '--password' || arg === '-p') {
      args.password = argv[++i];
    } else if (arg === '--force') {
      args.force = true;
    } else if (arg === '--reset-password') {
      args.resetPassword = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

/** 显示帮助信息 */
function printHelp() {
  console.log(`用法: pnpm create-user --role <root|admin> [选项]

选项:
  --role, -r <root|admin>     目标角色（必填）
  --email, -e <email>         账号邮箱
  --password, -p <password>   账号密码（不建议在命令行明文传入）
  --force                      [root 专用] 强制重建 root（危险）
  --reset-password             [admin 专用] 对已存在的用户强制重置密码
  --help, -h                   显示帮助

环境变量:
  BOOTSTRAP_EMAIL              通用账号邮箱
  BOOTSTRAP_PASSWORD           通用账号密码
  ROOT_BOOTSTRAP_EMAIL         root 邮箱（向后兼容，优先于 BOOTSTRAP_EMAIL）
  ROOT_BOOTSTRAP_PASSWORD      root 密码（向后兼容，优先于 BOOTSTRAP_PASSWORD）
  ADMIN_BOOTSTRAP_EMAIL        admin 邮箱（向后兼容，优先于 BOOTSTRAP_EMAIL）
  ADMIN_BOOTSTRAP_PASSWORD     admin 密码（向后兼容，优先于 BOOTSTRAP_PASSWORD）
  SQLITE_DB_PATH               自定义数据库路径（默认 data/app.db）

示例:
  pnpm create-user --role root                                 # 交互式创建 root
  pnpm create-user --role admin                                # 交互式创建 admin
  pnpm create-user --role root --email a@b.com --password xxx # 参数式创建 root
  pnpm create-user --role admin --email a@b.com               # 升级现有用户为 admin
  pnpm create-user --role admin --email a@b.com --reset-password  # 升级并重置密码

安全提示:
  - root 账号在整个系统中唯一，最多 1 个
  - 命令行参数会出现在 shell 历史与进程列表中，仅用于自动化场景
  - 交互式输入不会回显密码
  - 推荐生产环境使用环境变量或交互式输入`);
}

async function promptCredentials(fallbackEmail, roleLabel) {
  const rl = readline.createInstance({ input, output });
  try {
    let email = fallbackEmail;
    if (!email) {
      email = await rl.question(`${roleLabel}邮箱: `);
    }
    email = email.trim().toLowerCase();

    if (!email) {
      console.error('错误：邮箱不能为空');
      process.exit(1);
    }

    const password = await rl.question(`${roleLabel}密码（至少 6 位）: `, {
      hideEchoBack: true,
    });
    if (!password || password.length < 6) {
      console.error('错误：密码至少 6 位');
      process.exit(1);
    }
    if (password.length > 1024) {
      console.error('错误：密码过长（上限 1024 字符，防止 scryptDoS）');
      process.exit(1);
    }

    return { email, password };
  } finally {
    rl.close();
  }
}

// 与 src/shared/db.ts 保持一致：启用 WAL 与外键约束
async function loadDb() {
  const Database = (await import('better-sqlite3')).default;

  const dbPath = process.env.SQLITE_DB_PATH || path.join(projectRoot, 'data', 'app.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

// 与 src/modules/auth/server/identity.ts 保持一致：salt(16B) + scrypt(64B)，存为 salt_hex:hash_hex
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

// 增量补齐缺失列，兼容旧数据库
function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const cols = new Set(db.prepare('PRAGMA table_info(users)').all().map((r) => r.name));
  const needCols = [
    ['display_name', 'TEXT'],
    ['bio', 'TEXT'],
    ['avatar_url', 'TEXT'],
    ['avatar_type', "TEXT DEFAULT 'initial'"],
    ['github_url', 'TEXT'],
    ['website_url', 'TEXT'],
    ['role', "TEXT NOT NULL DEFAULT 'user'"],
    ['is_active', 'INTEGER NOT NULL DEFAULT 1'],
  ];
  for (const [name, def] of needCols) {
    if (!cols.has(name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${name} ${def};`);
    }
  }
}

// SQLite 不支持 ALTER TABLE ADD CONSTRAINT，用 partial unique index 保证 root 唯一
function ensureRootUniqueIndex(db) {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_root_unique ON users(id) WHERE role = 'root';
  `);
}

// 凭据来源优先级：命令行 > 角色专属环境变量 > 通用环境变量（向后兼容旧变量名）
function resolveCredentials(args, role) {
  const rolePrefix = role.toUpperCase();
  const email =
    args.email ||
    process.env[`${rolePrefix}_BOOTSTRAP_EMAIL`] ||
    process.env.BOOTSTRAP_EMAIL ||
    null;
  const password =
    args.password ||
    process.env[`${rolePrefix}_BOOTSTRAP_PASSWORD`] ||
    process.env.BOOTSTRAP_PASSWORD ||
    null;
  return { email, password };
}

async function createRoot(db, email, password, force) {
  const existingRoot = db
    .prepare("SELECT id, email FROM users WHERE role = 'root' LIMIT 1")
    .get();

  if (existingRoot) {
    if (!force) {
      console.error(
        `错误：系统已存在超级管理员账号（${existingRoot.email}）。root 账号唯一，不可创建第二个。`,
      );
      console.error('如需强制重建（不推荐），请使用 --force 参数。');
      process.exit(1);
    }
    console.warn(
      `[CreateUser] 警告：--force 模式，将删除现有 root（${existingRoot.email}）并创建新 root。`,
    );
    db.prepare('DELETE FROM users WHERE id = ?').run(existingRoot.id);
  }

  const existingUser = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(email);
  if (existingUser) {
    console.error(
      `错误：邮箱 ${email} 已被占用（当前角色：${existingUser.role}）。root 必须使用独立邮箱。`,
    );
    console.error('请先删除该用户或使用其他邮箱。');
    process.exit(1);
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, role, is_active) VALUES (?, ?, ?, 'root', 1)",
  ).run(id, email, passwordHash);
  console.log(`[CreateUser] 已创建超级管理员账号 ${email}（id: ${id}）`);

  const rootCount = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'root'").get().cnt;
  const adminCount = db
    .prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND is_active = 1")
    .get().cnt;
  console.log(`[CreateUser] 当前 root 数量: ${rootCount}（应为 1）`);
  console.log(`[CreateUser] 当前启用普通管理员数量: ${adminCount}`);
}

async function createAdmin(db, email, password, resetPassword) {
  const existing = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(email);

  // 新建用户必须密码；已存在用户仅在 --reset-password 或显式提供密码时重置
  const needPassword = !existing || resetPassword || !!password;

  if (needPassword && !password) {
    if (process.stdin.isTTY) {
      const rl = readline.createInstance({ input, output });
      try {
        const prompted = await rl.question('管理员密码（至少 6 位）: ', {
          hideEchoBack: true,
        });
        if (!prompted || prompted.length < 6) {
          console.error('错误：密码至少 6 位');
          process.exit(1);
        }
        if (prompted.length > 1024) {
          console.error('错误：密码过长（上限 1024 字符，防止 scryptDoS）');
          process.exit(1);
        }
        password = prompted;
      } finally {
        rl.close();
      }
    } else if (!existing) {
      console.error(
        '错误：新建用户必须提供密码。请使用 --password 或环境变量 ADMIN_BOOTSTRAP_PASSWORD',
      );
      process.exit(1);
    }
  }

  if (existing) {
    if (existing.role === 'admin') {
      console.log(`[CreateUser] 用户 ${email} 已经是管理员`);
      if (resetPassword && password) {
        const passwordHash = hashPassword(password);
        db.prepare(
          "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
        ).run(passwordHash, existing.id);
        console.log(`[CreateUser] 已重置密码`);
      }
    } else {
      if (password && (resetPassword || !!password)) {
        const passwordHash = hashPassword(password);
        db.prepare(
          "UPDATE users SET role = 'admin', is_active = 1, password_hash = ?, updated_at = datetime('now') WHERE id = ?",
        ).run(passwordHash, existing.id);
        console.log(`[CreateUser] 已将用户 ${email} 升级为管理员并重置密码`);
      } else {
        db.prepare(
          "UPDATE users SET role = 'admin', is_active = 1, updated_at = datetime('now') WHERE id = ?",
        ).run(existing.id);
        console.log(`[CreateUser] 已将用户 ${email} 升级为管理员（保留原密码）`);
      }
    }
  } else {
    if (!password) {
      console.error('错误：新建用户必须提供密码');
      process.exit(1);
    }
    const id = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    db.prepare(
      'INSERT INTO users (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
    ).run(id, email, passwordHash, 'admin');
    console.log(`[CreateUser] 已创建新管理员账号 ${email}（id: ${id}）`);
  }

  const adminCount = db
    .prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND is_active = 1")
    .get().cnt;
  console.log(`[CreateUser] 当前启用管理员数量: ${adminCount}`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.role || !['root', 'admin'].includes(args.role)) {
    console.error('错误：必须指定 --role <root|admin>');
    console.error('使用 --help 查看完整用法');
    process.exit(1);
  }

  const role = args.role;
  const roleLabel = role === 'root' ? '超级管理员' : '管理员';

  let { email, password } = resolveCredentials(args, role);

  if (role === 'root') {
    if (!email || !password) {
      if (process.stdin.isTTY) {
        const creds = await promptCredentials(email, roleLabel);
        email = creds.email;
        password = creds.password;
      } else {
        console.error(
          `错误：非交互式环境且未提供邮箱/密码。请使用 --email/--password 或环境变量 ROOT_BOOTSTRAP_EMAIL/ROOT_BOOTSTRAP_PASSWORD`,
        );
        process.exit(1);
      }
    }
  } else {
    if (!email) {
      if (process.stdin.isTTY) {
        const creds = await promptCredentials(null, roleLabel);
        email = creds.email;
        if (!password) password = creds.password;
      } else {
        console.error(
          '错误：非交互式环境且未提供邮箱。请使用 --email 或环境变量 ADMIN_BOOTSTRAP_EMAIL',
        );
        process.exit(1);
      }
    }
  }

  email = email.trim().toLowerCase();

  console.log(`\n[CreateUser] 正在操作数据库...`);
  const db = await loadDb();

  try {
    ensureSchema(db);

    if (role === 'root') {
      ensureRootUniqueIndex(db);
      await createRoot(db, email, password, args.force);
    } else {
      await createAdmin(db, email, password, args.resetPassword);
    }

    console.log(`\n[CreateUser] 完成。请使用 ${email} 登录管理后台 /admin`);
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error('[CreateUser] 失败:', err);
  process.exit(1);
});
