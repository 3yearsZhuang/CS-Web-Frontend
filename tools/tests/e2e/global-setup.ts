/**
 * @file Playwright globalSetup — E2E 测试前置环境准备
 *
 * 职责：
 *   1. 确保 SQLite 数据库中存在测试用户（普通成员 + 管理员）
 *   2. 通过 API 登录获取 session cookie，保存 storageState 供测试复用
 *
 * 测试账号凭据（仅 E2E 使用，密码弱但足够测试）：
 *   - 普通成员：e2e-member@test.local / e2e-member-123
 *   - 管理员：  e2e-admin@test.local  / e2e-admin-123
 *
 * 幂等设计：每次运行先删除旧测试账号再重建，避免脏数据干扰。
 */
import { request } from '@playwright/test';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

/** 测试账号类型 */
interface TestAccount {
  email: string;
  password: string;
  displayName: string;
  role: 'user' | 'admin';
}

/** 测试账号配置 */
export const TEST_ACCOUNTS: Record<'member' | 'admin', TestAccount> = {
  member: {
    email: 'e2e-member@test.local',
    password: 'E2e-Member-2026!',
    displayName: 'E2E Member',
    role: 'user',
  },
  admin: {
    email: 'e2e-admin@test.local',
    password: 'E2e-Admin-2026!',
    displayName: 'E2E Admin',
    role: 'admin',
  },
};

/** storageState 文件路径 */
export const STORAGE_STATE_PATH = path.join(__dirname, '.storage-state.json');

/** 数据库路径（与 dev server 一致） */
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'app.db');

const BASE_URL = 'http://localhost:2333';

/**
 * scryptSync 密码哈希 — 与 src/modules/auth/server/identity.ts 保持一致
 * 存储格式：salt_hex:hash_hex
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * 在数据库中创建或重置测试用户
 *
 * 策略：先按邮箱删除旧记录，再插入新记录，确保密码与状态可控。
 */
function ensureTestUser(db: Database.Database, account: TestAccount) {
  db.prepare('DELETE FROM users WHERE email = ?').run(account.email);

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(account.password);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, display_name, role, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
  ).run(id, account.email, passwordHash, account.displayName, account.role);

  return id;
}

/**
 * 通过 API 登录并返回 storageState（含 auth_session cookie）
 *
 * 登录 API：POST /api/auth/login
 * 成功后 Set-Cookie: auth_session=...
 */
async function loginAndSaveStorage(
  account: TestAccount,
  storagePath: string,
): Promise<void> {
  const context = await request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });

  const res = await context.post('/api/auth/login', {
    data: { email: account.email, password: account.password },
    headers: {
      // 不设置 Origin/Referer — assertAllowedOrigin 在两者均缺失时放行
      // （同源浏览器请求依赖 SameSite cookie 兜底）
    },
  });

  if (!res.ok()) {
    const body = await res.text().catch(() => '<no body>');
    throw new Error(
      `登录失败 [${account.email}]: ${res.status()} ${res.statusText()} — ${body}`,
    );
  }

  // 验证登录成功 — 应返回 user 对象而非 requires2FA
  const data = await res.json().catch(() => null);
  if (data?.requires2FA) {
    throw new Error(
      `测试账号 ${account.email} 启用了 2FA，E2E 无法自动登录。请确保测试账号未开启 TOTP。`,
    );
  }

  await context.storageState({ path: storagePath });
  await context.dispose();
}

/**
 * globalSetup 主函数
 *
 * 执行顺序：
 *   1. 连接数据库
 *   2. 创建/重置测试账号（member + admin）
 *   3. 分别登录两个账号，保存 storageState
 */
export default async function globalSetup() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(
      `数据库文件不存在: ${DB_PATH}\n请先运行 dev server 初始化数据库：pnpm dev`,
    );
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  try {
    ensureTestUser(db, TEST_ACCOUNTS.member);
    ensureTestUser(db, TEST_ACCOUNTS.admin);

    // 清除测试用户残留的考试提交记录，避免 duration_minutes 超时检查拦截
    // （旧 user_id 已被删除，但 exam_attempts 可能无 CASCADE 约束而残留）
    db.exec('DELETE FROM exam_attempts');
  } finally {
    db.close();
  }

  // 登录 member 账号，保存 storageState
  await loginAndSaveStorage(TEST_ACCOUNTS.member, STORAGE_STATE_PATH);
}
