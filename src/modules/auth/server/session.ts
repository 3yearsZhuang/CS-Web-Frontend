/**
 * @file Session 管理 — 创建/校验/注销 + 2FA 预认证 token
 *
 * DB 存 HMAC-SHA256，原始 token 仅放 Cookie；2FA token 含一次性 jti 防重放。
 */

import crypto from 'node:crypto';
import { AppError } from '@/shared/app-error';
import { getDb } from '@/shared/db';
import { type SafeUser, type UserRow, toSafeUser } from '@/shared/types';
import { recordLoginHistory } from './login-history';

/** Session 有效期（毫秒）— 7 天 */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 2FA 预认证 token 有效期（毫秒）— 5 分钟 */
const TWO_FACTOR_TOKEN_TTL_MS = 5 * 60 * 1000;

/**
 * Session 签名密钥 — 优先 AUTH_SESSION_SECRET；开发环境回退到 globalThis 缓存的随机密钥，
 * 避免 Next.js dev 热重载导致密钥不一致。生产环境必须独立设置（≥32 字节）。
 */
const SESSION_SECRET = process.env.AUTH_SESSION_SECRET || (() => {
  const key = '__FZTBU_SESSION_SECRET__';
  const g = globalThis as Record<string, unknown>;
  if (typeof g[key] === 'string') return g[key] as string;
  const secret = crypto.randomBytes(32).toString('hex');
  g[key] = secret;
  return secret;
})();

if (!process.env.AUTH_SESSION_SECRET && process.env.NODE_ENV === 'production') {
  console.error(
    '[FATAL] AUTH_SESSION_SECRET 环境变量未设置。生产环境必须设置此变量作为 session 签名密钥。\n' +
    '  缺失将导致：进程重启后所有 session 失效，且密钥来源不稳定。\n' +
    '  示例: AUTH_SESSION_SECRET=<32+ 字节随机字符串>'
  );
  process.exit(1);
}

/** 使用 HMAC-SHA256 对 session token 签名 — DB 仅存 HMAC 值，泄露也无法复用 */
function hashSessionToken(token: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
}

/** 数据库 sessions 行结构 */
interface SessionRow {
  id: string;
  user_id: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

/** 创建 session，返回原始 token（写入 Cookie）— DB 存 HMAC 非原始 token；统一校验 is_active 兜底拦截禁用账号；抛 USER_NOT_FOUND / ACCOUNT_DISABLED */
export function createSession(userId: string, ip?: string, userAgent?: string): string {
  const db = getDb();

  const userRow = db.prepare('SELECT is_active FROM users WHERE id = ?').get(userId) as
    | { is_active: number }
    | undefined;
  if (!userRow) {
    throw new AppError('用户不存在', 'USER_NOT_FOUND');
  }
  if (userRow.is_active === 0) {
    throw new AppError('账号已被禁用', 'ACCOUNT_DISABLED');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const sessionId = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?)',
  ).run(sessionId, userId, expiresAt, ip ?? null, userAgent ?? null);

  recordLoginHistory(userId, ip, userAgent, true);

  return rawToken;
}

/** 已消费的 2FA 预认证 token jti 集合 — 验证成功后加入，封堵重放攻击；单进程内存实现 */
const consumed2FAJtis = new Set<string>();

/** 上次清理 consumed2FAJtis 的时间戳（每小时清理一次） */
let lastConsumed2FAJtiPruneAt = 0;

/** 清理过期的已消费 jti（每小时调用一次，惰性触发） */
function pruneConsumed2FAJtis(): void {
  const now = Date.now();
  if (now - lastConsumed2FAJtiPruneAt < 60 * 60 * 1000) return;
  lastConsumed2FAJtiPruneAt = now;
  // Set 无法按值删除过期项，直接清空整个集合更简单且安全
  // （所有 token 5 分钟过期，1 小时后集合内所有 jti 必然已失效）
  consumed2FAJtis.clear();
}

/** 创建 2FA 预认证短期 token（5 分钟）— 含一次性 jti 防重放，格式 base64url(payload).base64url(hmac) 不可伪造；2FA 验证无需再次传密码 */
export function create2FAToken(userId: string): string {
  const expiresAt = Date.now() + TWO_FACTOR_TOKEN_TTL_MS;
  const jti = crypto.randomBytes(16).toString('hex');
  const payload = `${userId}:${expiresAt}:${jti}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const payloadEncoded = Buffer.from(payload).toString('base64url');
  return `${payloadEncoded}.${hmac}`;
}

/** 验证 2FA 预认证 token — 校验签名/有效期/消费状态，成功返回 userId 并标记 jti 已消费；失败返回 null */
export function verify2FAToken(token: string): string | null {
  try {
    const [payloadEncoded, hmac] = token.split('.');
    if (!payloadEncoded || !hmac) return null;

    const payload = Buffer.from(payloadEncoded, 'base64url').toString('utf8');
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return null;
    }

    const [userId, expiresAtStr, jti] = payload.split(':');
    const expiresAt = parseInt(expiresAtStr, 10);
    if (!userId || !jti || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      return null;
    }

    // 重放防护：同一 jti 只能消费一次
    pruneConsumed2FAJtis();
    if (consumed2FAJtis.has(jti)) {
      return null;
    }
    consumed2FAJtis.add(jti);

    return userId;
  } catch {
    return null;
  }
}

/** 获取 session — 对 token 求 HMAC 查库，原始 token 不落库；过期或禁用账号的 session 自动失效返回 null */
export function getSession(token: string): { session: { id: string; userId: string; expiresAt: string; ip: string | null; userAgent: string | null; createdAt: string; }; user: SafeUser; } | null {
  const db = getDb();
  const sessionId = hashSessionToken(token);
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as
    | SessionRow
    | undefined;
  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id) as
    | UserRow
    | undefined;
  if (!userRow) return null;

  if (userRow.is_active === 0) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userRow.id);
    return null;
  }

  return {
    session: {
      id: session.id,
      userId: session.user_id,
      expiresAt: session.expires_at,
      ip: session.ip,
      userAgent: session.user_agent,
      createdAt: session.created_at,
    },
    user: toSafeUser(userRow),
  };
}

/** 获取用户所有活跃 session — 用于会话管理页面展示登录设备 */
export function listUserSessions(userId: string): Array<{
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}> {
  const db = getDb();
  // R17 / ADR-016 同类修复：expires_at 以 ISO 8601（T 分隔符）存储，
  // 与 datetime('now')（空格分隔符）直接字符串比较时 T(0x54) > 空格(0x20)，
  // 过期当天的 session 仍会显示。用 datetime(expires_at) 归一化。
  const rows = db.prepare(
    'SELECT id, ip, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? AND datetime(expires_at) > datetime(\'now\') ORDER BY created_at DESC',
  ).all(userId) as Array<{
    id: string;
    ip: string | null;
    user_agent: string | null;
    created_at: string;
    expires_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    ip: r.ip,
    userAgent: r.user_agent,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
}

/** 删除 session（登出）— 对 token 求 HMAC 后删除对应 DB 行 */
export function deleteSession(token: string): void {
  const db = getDb();
  const sessionId = hashSessionToken(token);
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

/** 删除指定 session（远程登出）— 必须先验证 session 属于该用户 */
export function deleteSessionById(userId: string, sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').run(sessionId, userId);
}
