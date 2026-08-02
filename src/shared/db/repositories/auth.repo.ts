/**
 * @file AuthRepository — 认证相关表数据访问层（ADR-009）
 *
 * 覆盖 users / password_history / sessions / login_history / two_factor_auth。
 * SQL 使用 ? 占位符（SQLite 风格），由 pg-driver 自动转换为 $1/$2。
 * 方法签名统一以可选 engine 参数收尾，事务内由调用方传入 tx。
 */
import 'server-only';
import crypto from 'node:crypto';
import { getDbEngine, type DbEngine, type QueryRow } from '@/shared/db/drivers';
import { resolveEngine } from './base';

// ============ 行类型 ============

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_type: string | null;
  github_url: string | null;
  website_url: string | null;
  tech_tags: string | null;
  role: string;
  is_active: number;
  points: number;
  level: number;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface LoginHistoryRow {
  id: string;
  user_id: string | null;
  ip: string | null;
  user_agent: string | null;
  success: number;
  attempted_email: string | null;
  created_at: string;
}

export interface TwoFactorRow {
  user_id: string;
  secret_encrypted: string;
  backup_codes: string;
  enabled: number;
  enabled_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============ Repository 接口 ============

export interface AuthRepository {
  // users
  findUserByEmail(email: string): Promise<UserRow | null>;
  findUserById(id: string): Promise<UserRow | null>;
  insertUser(id: string, email: string, passwordHash: string): Promise<void>;
  getUserActiveFlagById(id: string): Promise<{ is_active: number } | null>;
  deleteSessionsByUser(userId: string, exceptSessionId?: string): Promise<void>;

  // password_history
  listPasswordHistory(userId: string, limit: number): Promise<{ password_hash: string }[]>;
  insertPasswordHistory(userId: string, passwordHash: string): Promise<void>;
  prunePasswordHistory(userId: string, keepCount: number): Promise<void>;

  // sessions
  insertSession(id: string, userId: string, expiresAt: string, ip: string | null, userAgent: string | null): Promise<void>;
  findSessionById(id: string): Promise<SessionRow | null>;
  deleteSessionById(id: string): Promise<void>;
  deleteSessionByIdAndUser(sessionId: string, userId: string): Promise<void>;
  listActiveSessions(userId: string): Promise<SessionRow[]>;

  // login_history
  insertLoginHistory(params: {
    id: string;
    userId: string | null;
    ip: string | null;
    userAgent: string | null;
    success: number;
    attemptedEmail: string | null;
  }): Promise<void>;
  listLoginHistory(userId: string, limit: number): Promise<LoginHistoryRow[]>;

  // two_factor_auth
  findTwoFactor(userId: string): Promise<TwoFactorRow | null>;
  upsertTwoFactor(params: {
    userId: string;
    secretEncrypted: string;
    backupCodes: string;
  }): Promise<void>;
  enableTwoFactor(userId: string): Promise<void>;
  updateTwoFactorBackupCodes(userId: string, backupCodes: string): Promise<void>;
  deleteTwoFactor(userId: string): Promise<void>;
}

// ============ 工厂 ============

export function createAuthRepository(engine: DbEngine): AuthRepository {
  return {
    async findUserByEmail(email: string, eng?: DbEngine): Promise<UserRow | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
    },

    async findUserById(id: string, eng?: DbEngine): Promise<UserRow | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [id]);
    },

    async insertUser(id: string, email: string, passwordHash: string, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', [id, email, passwordHash]);
    },

    async getUserActiveFlagById(id: string, eng?: DbEngine): Promise<{ is_active: number } | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<{ is_active: number }>('SELECT is_active FROM users WHERE id = ?', [id]);
    },

    async deleteSessionsByUser(userId: string, exceptSessionId?: string, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      if (exceptSessionId) {
        await e.execute('DELETE FROM sessions WHERE user_id = ? AND id != ?', [userId, exceptSessionId]);
      } else {
        await e.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
      }
    },

    async listPasswordHistory(userId: string, limit: number, eng?: DbEngine): Promise<{ password_hash: string }[]> {
      const e = await resolveEngine(eng ?? engine);
      return e.query<{ password_hash: string }>(
        'SELECT password_hash FROM password_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit],
      );
    },

    async insertPasswordHistory(userId: string, passwordHash: string, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      const id = crypto.randomUUID();
      await e.execute('INSERT INTO password_history (id, user_id, password_hash) VALUES (?, ?, ?)', [
        id,
        userId,
        passwordHash,
      ]);
    },

    async prunePasswordHistory(userId: string, keepCount: number, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute(
        `DELETE FROM password_history
         WHERE user_id = ?
           AND id NOT IN (
             SELECT id FROM password_history
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT ?
           )`,
        [userId, userId, keepCount],
      );
    },

    async insertSession(
      id: string,
      userId: string,
      expiresAt: string,
      ip: string | null,
      userAgent: string | null,
      eng?: DbEngine,
    ): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute('INSERT INTO sessions (id, user_id, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?)', [
        id,
        userId,
        expiresAt,
        ip ?? null,
        userAgent ?? null,
      ]);
    },

    async findSessionById(id: string, eng?: DbEngine): Promise<SessionRow | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<SessionRow>('SELECT * FROM sessions WHERE id = ?', [id]);
    },

    async deleteSessionById(id: string, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute('DELETE FROM sessions WHERE id = ?', [id]);
    },

    async deleteSessionByIdAndUser(sessionId: string, userId: string, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute('DELETE FROM sessions WHERE id = ? AND user_id = ?', [sessionId, userId]);
    },

    async listActiveSessions(userId: string, eng?: DbEngine): Promise<SessionRow[]> {
      const e = await resolveEngine(eng ?? engine);
      return e.query<SessionRow>(
        "SELECT id, ip, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? AND datetime(expires_at) > datetime('now') ORDER BY created_at DESC",
        [userId],
      );
    },

    async insertLoginHistory(params: {
      id: string;
      userId: string | null;
      ip: string | null;
      userAgent: string | null;
      success: number;
      attemptedEmail: string | null;
    }, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute(
        'INSERT INTO login_history (id, user_id, ip, user_agent, success, attempted_email) VALUES (?, ?, ?, ?, ?, ?)',
        [params.id, params.userId ?? null, params.ip ?? null, params.userAgent ?? null, params.success, params.attemptedEmail ?? null],
      );
    },

    async listLoginHistory(userId: string, limit: number, eng?: DbEngine): Promise<LoginHistoryRow[]> {
      const e = await resolveEngine(eng ?? engine);
      return e.query<LoginHistoryRow>(
        'SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        [userId, limit],
      );
    },

    async findTwoFactor(userId: string, eng?: DbEngine): Promise<TwoFactorRow | null> {
      const e = await resolveEngine(eng ?? engine);
      return e.queryOne<TwoFactorRow>('SELECT * FROM two_factor_auth WHERE user_id = ?', [userId]);
    },

    async upsertTwoFactor(params: {
      userId: string;
      secretEncrypted: string;
      backupCodes: string;
    }, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute(
        `INSERT INTO two_factor_auth (user_id, secret_encrypted, backup_codes, enabled)
         VALUES (?, ?, ?, 0)
         ON CONFLICT(user_id) DO UPDATE SET
           secret_encrypted = excluded.secret_encrypted,
           backup_codes = excluded.backup_codes,
           enabled = 0,
           enabled_at = NULL,
           updated_at = datetime('now')`,
        [params.userId, params.secretEncrypted, params.backupCodes],
      );
    },

    async enableTwoFactor(userId: string, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute(
        "UPDATE two_factor_auth SET enabled = 1, enabled_at = datetime('now'), updated_at = datetime('now') WHERE user_id = ?",
        [userId],
      );
    },

    async updateTwoFactorBackupCodes(userId: string, backupCodes: string, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute('UPDATE two_factor_auth SET backup_codes = ?, updated_at = datetime(\'now\') WHERE user_id = ?', [
        backupCodes,
        userId,
      ]);
    },

    async deleteTwoFactor(userId: string, eng?: DbEngine): Promise<void> {
      const e = await resolveEngine(eng ?? engine);
      await e.execute('DELETE FROM two_factor_auth WHERE user_id = ?', [userId]);
    },
  };
}

// ============ 单例 ============

let authRepo: AuthRepository | null = null;

export async function getAuthRepository(): Promise<AuthRepository> {
  if (authRepo) return authRepo;
  const engine = await getDbEngine();
  authRepo = createAuthRepository(engine);
  return authRepo;
}

/** 测试专用：注入 mock repository */
export function _setAuthRepositoryForTest(repo: AuthRepository | null): void {
  authRepo = repo;
}
