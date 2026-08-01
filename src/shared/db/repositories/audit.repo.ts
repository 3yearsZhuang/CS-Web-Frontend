/**
 * @file AuditRepository — 审计日志数据访问层
 *
 * 第一个迁移到 DbEngine 抽象的 Repository，作为后续模块迁移模板。
 * SQL 使用 ? 占位符（SQLite 风格），由 pg-driver 自动转换为 $1/$2。
 */
import 'server-only';
import crypto from 'node:crypto';
import { getDbEngine, type QueryRow } from '@/shared/db/drivers';

/** admin_actions 表行类型 */
export interface AdminActionRow {
  id: string;
  adminId: string | null;
  action: string;
  targetUserId: string | null;
  details: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

/** insert 参数 */
export interface InsertAuditParams {
  adminId: string;
  action: string;
  targetUserId?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/** list 查询参数 */
export interface ListAuditParams {
  limit?: number;
  offset?: number;
  /** 按操作类型过滤（模糊匹配） */
  actionLike?: string;
}

/** Repository 实例接口（便于测试 mock） */
export interface AuditRepository {
  /** 记录审计日志 — details 自动 JSON.stringify */
  insert(params: InsertAuditParams): Promise<string>;

  /** 按管理员 ID 查询审计日志 */
  listByAdmin(adminId: string, params?: ListAuditParams): Promise<AdminActionRow[]>;

  /** 按 ID 删除审计日志 — 返回是否删除成功 */
  delete(id: string): Promise<boolean>;

  /** 统计指定管理员的审计日志数 */
  countByAdmin(adminId: string): Promise<number>;
}

/** 内部行 → 类型化行的映射 */
function rowToAdminAction(row: QueryRow): AdminActionRow {
  return {
    id: String(row.id),
    adminId: row.admin_id != null ? String(row.admin_id) : null,
    action: String(row.action),
    targetUserId: row.target_user_id != null ? String(row.target_user_id) : null,
    details: row.details != null ? String(row.details) : null,
    ip: row.ip != null ? String(row.ip) : null,
    userAgent: row.user_agent != null ? String(row.user_agent) : null,
    createdAt: String(row.created_at),
  };
}

/** 创建 AuditRepository 实例（绑定到传入 engine，便于事务中复用同一 engine） */
export function createAuditRepository(engine: Awaited<ReturnType<typeof getDbEngine>>): AuditRepository {
  return {
    async insert(params: InsertAuditParams): Promise<string> {
      const id = crypto.randomUUID();
      const detailsStr = params.details ? JSON.stringify(params.details) : null;
      await engine.execute(
        `INSERT INTO admin_actions (id, admin_id, action, target_user_id, details, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          params.adminId,
          params.action,
          params.targetUserId ?? null,
          detailsStr,
          params.ip ?? null,
          params.userAgent ?? null,
        ],
      );
      return id;
    },

    async listByAdmin(adminId: string, params: ListAuditParams = {}): Promise<AdminActionRow[]> {
      const limit = Math.min(params.limit ?? 50, 200);
      const offset = Math.max(params.offset ?? 0, 0);
      const actionFilter = params.actionLike
        ? ' AND action LIKE ?'
        : '';
      const queryParams: (string | number | null)[] = [adminId];
      if (params.actionLike) queryParams.push(`%${params.actionLike}%`);
      queryParams.push(limit, offset);

      const rows = await engine.query<QueryRow>(
        `SELECT id, admin_id, action, target_user_id, details, ip, user_agent, created_at
         FROM admin_actions
         WHERE admin_id = ?${actionFilter}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        queryParams,
      );
      return rows.map(rowToAdminAction);
    },

    async delete(id: string): Promise<boolean> {
      const changes = await engine.execute('DELETE FROM admin_actions WHERE id = ?', [id]);
      return changes > 0;
    },

    async countByAdmin(adminId: string): Promise<number> {
      const row = await engine.queryOne<{ c: number }>(
        'SELECT COUNT(*) AS c FROM admin_actions WHERE admin_id = ?',
        [adminId],
      );
      return row?.c ?? 0;
    },
  };
}

/** 单例缓存 */
let auditRepo: AuditRepository | null = null;

/** 获取 AuditRepository 单例（首次调用初始化 DbEngine 并创建 Repository） */
export async function getAuditRepository(): Promise<AuditRepository> {
  if (auditRepo) return auditRepo;
  const engine = await getDbEngine();
  auditRepo = createAuditRepository(engine);
  return auditRepo;
}

/** 测试专用：注入 mock repository */
export function _setAuditRepositoryForTest(repo: AuditRepository | null): void {
  auditRepo = repo;
}
