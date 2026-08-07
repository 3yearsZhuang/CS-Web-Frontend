/**
 * @file Playwright globalSetup — E2E 测试前置环境准备
 *
 * 职责：
 *   1. 通过后端 API（管理员登录 → 创建用户 → 分配角色）确保测试账号存在
 *   2. 通过 BFF 登录获取 session cookie，保存 storageState 供测试复用
 *
 * 测试账号凭据（仅 E2E 使用，密码弱但足够测试）：
 *   - 普通成员：e2e-member@test.local / E2e-Member-2026!
 *   - 管理员：  e2e-admin@test.local  / E2e-Admin-2026!
 *
 * 幂等设计：每次运行先删除旧测试账号再重建，避免脏数据干扰。
 *
 * 环境要求（E2E 需完整环境，见 .github/workflows/ci.yml e2e job）：
 *   - 后端 FastAPI 运行中：E2E_BACKEND_URL（默认 http://localhost:8000）
 *   - 后端默认管理员（rbac_init seed）：E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD
 *     （缺省回退 ADMIN_USERNAME / ADMIN_PASSWORD 环境变量；两者均缺则报错）
 *   - 前端 BFF dev server 运行中：http://localhost:2333（由 playwright webServer 拉起）
 */
import { request } from '@playwright/test';
import path from 'node:path';

/** 后端 API 基地址（E2E 环境需提供后端；默认本地端口 8000） */
const BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8000';

/** 后端管理员凭据（rbac_init 创建） */
const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME || process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';

/** BFF 基地址（与 playwright.config.ts baseURL 一致） */
const BASE_URL = 'http://localhost:2333';

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

/** 登录后端获取管理员 access token */
async function loginAdminToken(): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login-json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `管理员登录失败 [${ADMIN_USERNAME}]: ${res.status} ${body}\n` +
        `请确认后端已启动（${BACKEND_URL}）且 ADMIN_USERNAME/ADMIN_PASSWORD 正确（rbac_init seed 创建）。`,
    );
  }
  const data = (await res.json()) as { accessToken?: string };
  if (!data.accessToken) {
    throw new Error(`管理员登录响应缺少 accessToken: ${JSON.stringify(data)}`);
  }
  return data.accessToken;
}

/** 按邮箱查后端用户 id；不存在返回 null */
async function findUserId(token: string, email: string): Promise<number | null> {
  const res = await fetch(
    `${BACKEND_URL}/api/v1/admin/users?search=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { users?: Array<{ id: number; email?: string }> };
  return data.users?.find((u) => u.email === email)?.id ?? null;
}

/** 删除用户（软删，管理员接口） */
async function deleteUser(token: string, userId: number): Promise<void> {
  await fetch(`${BACKEND_URL}/api/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** 创建用户（管理员接口），返回新用户 id */
async function createUser(token: string, account: TestAccount): Promise<number> {
  const res = await fetch(`${BACKEND_URL}/api/v1/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      username: account.email.split('@')[0],
      email: account.email,
      password: account.password,
      fullName: account.displayName,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`创建测试账号失败 [${account.email}]: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { id: number };
  return data.id;
}

/** 查询 admin 角色 id（供管理员测试账号分配角色） */
async function findAdminRoleId(token: string): Promise<number | null> {
  const res = await fetch(`${BACKEND_URL}/api/v1/admin/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const roles = (await res.json()) as Array<{ id: number; name: string }>;
  return roles.find((r) => r.name === 'admin')?.id ?? null;
}

/** 为用户分配角色（管理员测试账号需 admin 角色） */
async function assignRole(token: string, userId: number, roleId: number): Promise<void> {
  await fetch(`${BACKEND_URL}/api/v1/rbac/users/${userId}/roles/${roleId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * 通过 BFF 登录并返回 storageState（含 auth_session cookie）
 *
 * 登录 API：POST /api/auth/login（BFF 薄转发 → 后端 /auth/login-email）
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
 *   1. 管理员登录后端获取 access token
 *   2. 删除旧测试账号（幂等）→ 创建新账号
 *   3. 为 admin 测试账号分配 admin 角色
 *   4. 通过 BFF 登录 member 账号，保存 storageState
 */
export default async function globalSetup() {
  if (!ADMIN_PASSWORD) {
    throw new Error(
      '缺少管理员凭据：请设置 E2E_ADMIN_PASSWORD（或 ADMIN_PASSWORD），' +
        '对应后端 rbac_init seed 创建的管理员账号。',
    );
  }

  const token = await loginAdminToken();

  for (const account of [TEST_ACCOUNTS.member, TEST_ACCOUNTS.admin]) {
    // 幂等：先删旧账号再重建（软删用户后同 email 可重新注册）
    const existingId = await findUserId(token, account.email);
    if (existingId !== null) {
      await deleteUser(token, existingId);
    }

    const userId = await createUser(token, account);

    // 管理员测试账号需 admin 角色（普通成员保持默认 user 角色）
    if (account.role === 'admin') {
      const adminRoleId = await findAdminRoleId(token);
      if (adminRoleId === null) {
        throw new Error('后端未找到 admin 角色，请确认 RBAC seed 已执行');
      }
      await assignRole(token, userId, adminRoleId);
    }
  }

  // 登录 member 账号，保存 storageState
  await loginAndSaveStorage(TEST_ACCOUNTS.member, STORAGE_STATE_PATH);
}
