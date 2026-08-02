/**
 * @file 管理后台模块 Repository（ADR-009）
 *
 * 覆盖表：users / sessions / activity_participations / admin_actions /
 *        roles / role_permissions
 * SQLite 专属函数（datetime('now')）保留在 SQL 文本中。
 */
import type { DbEngine, QueryParams } from '@/shared/db/drivers';
import { resolveEngine } from './base';

export interface RoleRow {
  [key: string]: unknown;
  key: string;
  display_name: string;
  description: string | null;
  is_system: number;
  is_protected: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RolePermissionRow {
  [key: string]: unknown;
  id: string;
  role_id: string;
  module: string;
  can_view: number;
  can_edit: number;
  can_delete: number;
}

export interface AdminActionRow {
  [key: string]: unknown;
  id: string;
  admin_id: string | null;
  action: string;
  target_user_id: string | null;
  details: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

type QueryParam = string | number | null;

export interface AdminRepository {
  // ----- users -----
  countActiveAdmins(eng?: DbEngine): Promise<number>;
  getUserById(userId: string, eng?: DbEngine): Promise<UserRow | null>;
  getUserRole(userId: string, eng?: DbEngine): Promise<{ role: string } | null>;
  getUserActiveState(userId: string, eng?: DbEngine): Promise<{ id: string; role: string; is_active: number } | null>;
  getUserPasswordHash(userId: string, eng?: DbEngine): Promise<{ password_hash: string } | null>;
  countUsers(where: string, params: QueryParams, eng?: DbEngine): Promise<number>;
  listUsers(where: string, params: QueryParams, eng?: DbEngine): Promise<UserRow[]>;
  updateUser(userId: string, fields: Record<string, QueryParam>, eng?: DbEngine): Promise<void>;
  setUserActive(userId: string, active: number, eng?: DbEngine): Promise<void>;
  deleteUser(userId: string, eng?: DbEngine): Promise<void>;
  deleteSessionsByUserId(userId: string, eng?: DbEngine): Promise<void>;
  deleteParticipationsByUserId(userId: string, eng?: DbEngine): Promise<void>;

  // ----- admin_actions -----
  insertAdminAction(
    tx: DbEngine,
    id: string,
    adminId: string | null,
    action: string,
    targetUserId: string | null,
    details: string | null,
    ip: string | null,
    userAgent: string | null,
  ): Promise<void>;
  getAdminActionById(id: string, eng?: DbEngine): Promise<AdminActionRow | null>;
  countAdminActions(where: string, params: QueryParams, eng?: DbEngine): Promise<number>;
  listAdminActions(where: string, params: QueryParams, eng?: DbEngine): Promise<AdminActionWithAdmin[]>;
  deleteAdminAction(id: string, eng?: DbEngine): Promise<void>;
  deleteAdminActionsBefore(beforeISO: string, eng?: DbEngine): Promise<number>;

  // ----- roles -----
  listRoles(eng?: DbEngine): Promise<RoleRow[]>;
  getRoleByKey(roleKey: string, eng?: DbEngine): Promise<RoleRow | null>;
  insertRole(
    tx: DbEngine,
    key: string,
    displayName: string,
    description: string,
    isSystem: number,
    isProtected: number,
    sortOrder: number,
  ): Promise<void>;
  updateRole(roleKey: string, fields: Record<string, QueryParam>, eng?: DbEngine): Promise<void>;
  deleteRole(roleKey: string, eng?: DbEngine): Promise<void>;
  countRoleUsers(roleKey: string, eng?: DbEngine): Promise<number>;
  listRolePermissions(roleKey: string, eng?: DbEngine): Promise<Array<{ permission: string }>>;
  deleteRolePermissions(roleKey: string, eng?: DbEngine): Promise<void>;
  insertRolePermission(tx: DbEngine, id: string, roleKey: string, permission: string): Promise<void>;
  getMaxCustomSortOrder(eng?: DbEngine): Promise<number>;
}

export interface UserRow {
  [key: string]: unknown;
  id: string;
  email: string;
  display_name: string | null;
  password_hash: string;
  role: string;
  is_active: number;
  bio: string | null;
  avatar_url: string | null;
  avatar_type: string | null;
  github_url: string | null;
  website_url: string | null;
  tech_tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminActionWithAdmin extends AdminActionRow {
  admin_display_name: string | null;
  admin_email: string | null;
  target_email: string | null;
  target_display_name: string | null;
}

function createAdminRepository(): AdminRepository {
  return {
    // ----- users -----
    async countActiveAdmins(eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ cnt: number }>(
        "SELECT COUNT(*) as cnt FROM users WHERE role IN ('admin', 'content_moderator', 'exam_admin', 'task_publisher') AND is_active = 1",
      );
      return row?.cnt ?? 0;
    },
    async getUserById(userId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    },
    async getUserRole(userId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ role: string }>('SELECT role FROM users WHERE id = ?', [userId]);
    },
    async getUserActiveState(userId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string; role: string; is_active: number }>(
        'SELECT id, role, is_active FROM users WHERE id = ?',
        [userId],
      );
    },
    async getUserPasswordHash(userId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [userId]);
    },
    async countUsers(where, params, eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM users ${where}`, params);
      return row?.cnt ?? 0;
    },
    async listUsers(where, params, eng) {
      const e = await resolveEngine(eng);
      return e.query<UserRow>(
        `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params,
      );
    },
    async updateUser(userId, fields, eng) {
      const e = await resolveEngine(eng);
      const sets: string[] = [];
      const params: QueryParams = [];
      for (const [k, v] of Object.entries(fields)) {
        sets.push(`${k} = ?`);
        params.push(v);
      }
      if (sets.length === 0) return;
      sets.push("updated_at = datetime('now')");
      params.push(userId);
      await e.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
    },
    async setUserActive(userId, active, eng) {
      const e = await resolveEngine(eng);
      await e.execute("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?", [active, userId]);
    },
    async deleteUser(userId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM users WHERE id = ?', [userId]);
    },
    async deleteSessionsByUserId(userId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
    },
    async deleteParticipationsByUserId(userId, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM activity_participations WHERE user_id = ?', [userId]);
    },

    // ----- admin_actions -----
    async insertAdminAction(tx, id, adminId, action, targetUserId, details, ip, userAgent) {
      await tx.execute(
        `INSERT INTO admin_actions (id, admin_id, action, target_user_id, details, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, adminId, action, targetUserId, details, ip, userAgent],
      );
    },
    async getAdminActionById(id, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<AdminActionRow>('SELECT * FROM admin_actions WHERE id = ?', [id]);
    },
    async countAdminActions(where, params, eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM admin_actions ${where}`, params);
      return row?.cnt ?? 0;
    },
    async listAdminActions(where, params, eng) {
      const e = await resolveEngine(eng);
      return e.query<AdminActionWithAdmin>(
        `SELECT aa.*,
                ua.display_name AS admin_display_name,
                ua.email AS admin_email,
                ut.email AS target_email,
                ut.display_name AS target_display_name
         FROM admin_actions aa
         LEFT JOIN users ua ON aa.admin_id = ua.id
         LEFT JOIN users ut ON aa.target_user_id = ut.id
         ${where}
         ORDER BY aa.created_at DESC
         LIMIT ? OFFSET ?`,
        params,
      );
    },
    async deleteAdminAction(id, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM admin_actions WHERE id = ?', [id]);
    },
    async deleteAdminActionsBefore(beforeISO, eng) {
      const e = await resolveEngine(eng);
      return e.execute('DELETE FROM admin_actions WHERE created_at < ?', [beforeISO]);
    },

    // ----- roles -----
    async listRoles(eng) {
      const e = await resolveEngine(eng);
      return e.query<RoleRow>('SELECT * FROM roles ORDER BY sort_order ASC, key ASC');
    },
    async getRoleByKey(roleKey, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<RoleRow>('SELECT * FROM roles WHERE key = ?', [roleKey]);
    },
    async insertRole(tx, key, displayName, description, isSystem, isProtected, sortOrder) {
      await tx.execute(
        `INSERT INTO roles (key, display_name, description, is_system, is_protected, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [key, displayName, description, isSystem, isProtected, sortOrder],
      );
    },
    async updateRole(roleKey, fields, eng) {
      const e = await resolveEngine(eng);
      const sets: string[] = [];
      const params: QueryParams = [];
      for (const [k, v] of Object.entries(fields)) {
        sets.push(`${k} = ?`);
        params.push(v);
      }
      if (sets.length === 0) return;
      sets.push("updated_at = datetime('now')");
      params.push(roleKey);
      await e.execute(`UPDATE roles SET ${sets.join(', ')} WHERE key = ?`, params);
    },
    async deleteRole(roleKey, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM roles WHERE key = ?', [roleKey]);
    },
    async countRoleUsers(roleKey, eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM users WHERE role = ?', [roleKey]);
      return row?.cnt ?? 0;
    },
    async listRolePermissions(roleKey, eng) {
      const e = await resolveEngine(eng);
      return e.query<{ permission: string }>(
        'SELECT permission FROM role_permissions WHERE role_key = ? AND granted = 1',
        [roleKey],
      );
    },
    async deleteRolePermissions(roleKey, eng) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM role_permissions WHERE role_key = ?', [roleKey]);
    },
    async insertRolePermission(tx, id, roleKey, permission) {
      await tx.execute(
        `INSERT OR IGNORE INTO role_permissions (id, role_key, permission, granted)
         VALUES (?, ?, ?, 1)`,
        [id, roleKey, permission],
      );
    },
    async getMaxCustomSortOrder(eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ max_sort: number | null }>(
        'SELECT MAX(sort_order) as max_sort FROM roles WHERE is_system = 0',
      );
      return row?.max_sort ?? 50;
    },
  };
}

let adminRepo: AdminRepository | null = null;

/** 同步返回 AdminRepository 单例 */
export function getAdminRepository(): AdminRepository {
  if (!adminRepo) adminRepo = createAdminRepository();
  return adminRepo;
}
