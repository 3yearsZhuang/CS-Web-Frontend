/**
 * @file AuditRepository 单元测试
 *
 * 验证：
 *   1. Repository 与 DbEngine 接口契约正确
 *   2. insert / listByAdmin / delete / countByAdmin 四个方法行为符合预期
 *   3. SQL 占位符使用 ? 风格（与 pg-driver 的 ? → $N 转换兼容）
 *
 * 测试策略：
 *   使用 in-memory mock DbEngine，不依赖真实数据库
 *   验证 Repository 调用 engine 的 SQL 与参数是否正确
 *   真实 SQLite/PG 集成测试在 Phase 1 通过 testcontainers 覆盖
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAuditRepository,
  type AuditRepository,
} from '../../src/shared/db/repositories/audit.repo';
import type { DbEngine, QueryRow } from '../../src/shared/db/drivers';

/** 内存 mock engine — 记录所有调用便于断言 */
function createMockEngine(): DbEngine & {
  _store: Map<string, QueryRow>;
  _executedSql: string[];
} {
  const store = new Map<string, QueryRow>();
  const executedSql: string[] = [];

  const engine: DbEngine & { _store: Map<string, QueryRow>; _executedSql: string[] } = {
    provider: 'sqlite',
    _store: store,
    _executedSql: executedSql,

    async execute(sql: string, params: import('../../src/shared/db/drivers').QueryParams = []) {
      executedSql.push(sql);
      // 简化：只支持 INSERT 与 DELETE
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        // INSERT INTO admin_actions (...) VALUES (?, ?, ...)
        const id = String(params[0]);
        const row: QueryRow = {
          id,
          admin_id: params[1],
          action: params[2],
          target_user_id: params[3],
          details: params[4],
          ip: params[5],
          user_agent: params[6],
          created_at: new Date().toISOString(),
        };
        store.set(id, row);
        return 1;
      }
      if (sql.trim().toUpperCase().startsWith('DELETE')) {
        // DELETE FROM admin_actions WHERE id = ?
        const id = String(params[0]);
        return store.delete(id) ? 1 : 0;
      }
      return 0;
    },

    async query<T = QueryRow>(
      sql: string,
      params: import('../../src/shared/db/drivers').QueryParams = [],
    ) {
      executedSql.push(sql);
      // SELECT ... WHERE admin_id = ? [AND action LIKE ?] LIMIT ? OFFSET ?
      if (sql.includes('FROM admin_actions')) {
        const adminId = String(params[0]);
        const hasActionFilter = sql.includes('action LIKE');
        const actionPattern = hasActionFilter
          ? String(params[1]).replace(/%/g, '') // 去掉 % 通配符做 includes 匹配
          : null;
        const results: T[] = [];
        for (const row of store.values()) {
          if (row.admin_id !== adminId) continue;
          if (actionPattern !== null && !String(row.action).includes(actionPattern)) continue;
          results.push(row as T);
        }
        // 解析 LIMIT/OFFSET（参数最后两位）
        const limitIdx = sql.toUpperCase().indexOf('LIMIT');
        if (limitIdx > -1) {
          const offsetParamIdx = hasActionFilter ? 3 : 2;
          const limitParam = Number(params[offsetParamIdx - 1]);
          const offsetParam = Number(params[offsetParamIdx]);
          return results.slice(offsetParam, offsetParam + limitParam) as T[];
        }
        return results;
      }
      return [];
    },

    async queryOne<T = QueryRow>(
      sql: string,
      params: import('../../src/shared/db/drivers').QueryParams = [],
    ) {
      executedSql.push(sql);
      if (sql.includes('COUNT(*)')) {
        const adminId = String(params[0]);
        let count = 0;
        for (const row of store.values()) {
          if (row.admin_id === adminId) count++;
        }
        return { c: count } as unknown as T;
      }
      return null;
    },

    async transaction<T>(fn: (tx: DbEngine) => Promise<T>): Promise<T> {
      // mock：直接执行，不开真实事务
      return fn(engine);
    },
  };

  return engine;
}

describe('AuditRepository', () => {
  let repo: AuditRepository;
  let engine: ReturnType<typeof createMockEngine>;

  beforeEach(() => {
    engine = createMockEngine();
    repo = createAuditRepository(engine);
  });

  describe('insert', () => {
    it('生成 UUID 并插入一行', async () => {
      const id = await repo.insert({
        adminId: 'admin-1',
        action: 'user.disable',
        targetUserId: 'user-1',
        details: { reason: 'violation' },
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(engine._store.size).toBe(1);

      const row = engine._store.get(id);
      expect(row?.admin_id).toBe('admin-1');
      expect(row?.action).toBe('user.disable');
      expect(row?.target_user_id).toBe('user-1');
      expect(row?.details).toBe(JSON.stringify({ reason: 'violation' }));
      expect(row?.ip).toBe('127.0.0.1');
      expect(row?.user_agent).toBe('Mozilla/5.0');
    });

    it('details 为 null 时不报错', async () => {
      const id = await repo.insert({
        adminId: 'admin-1',
        action: 'event.create',
      });

      const row = engine._store.get(id);
      expect(row?.details).toBeNull();
      expect(row?.target_user_id).toBeNull();
    });

    it('使用 ? 占位符（兼容 pg-driver 的 $N 转换）', async () => {
      await repo.insert({ adminId: 'a', action: 'x' });
      const sql = engine._executedSql[0];
      // 验证 SQL 用 ? 而非 $1（pg-driver 会转换）
      expect(sql).toMatch(/VALUES\s*\(\?,\s*\?,\s*\?,\s*\?,\s*\?,\s*\?,\s*\?\)/);
    });
  });

  describe('listByAdmin', () => {
    beforeEach(async () => {
      // 准备 3 条数据
      await repo.insert({ adminId: 'admin-1', action: 'user.disable' });
      await repo.insert({ adminId: 'admin-1', action: 'user.enable' });
      await repo.insert({ adminId: 'admin-2', action: 'user.disable' });
    });

    it('按 adminId 过滤', async () => {
      const rows = await repo.listByAdmin('admin-1');
      expect(rows).toHaveLength(2);
      expect(rows.every((r) => r.adminId === 'admin-1')).toBe(true);
    });

    it('limit 限制返回数量', async () => {
      const rows = await repo.listByAdmin('admin-1', { limit: 1 });
      expect(rows).toHaveLength(1);
    });

    it('offset 偏移', async () => {
      const rows = await repo.listByAdmin('admin-1', { limit: 10, offset: 1 });
      expect(rows).toHaveLength(1);
    });

    it('actionLike 过滤', async () => {
      const rows = await repo.listByAdmin('admin-1', { actionLike: 'disable' });
      expect(rows).toHaveLength(1);
      expect(rows[0].action).toBe('user.disable');
    });

    it('返回行字段映射正确（snake_case → camelCase）', async () => {
      const rows = await repo.listByAdmin('admin-1', { limit: 1 });
      const row = rows[0];
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('adminId');
      expect(row).toHaveProperty('targetUserId');
      expect(row).toHaveProperty('userAgent');
      expect(row).toHaveProperty('createdAt');
      // 不应暴露 snake_case 字段
      expect(row).not.toHaveProperty('admin_id');
      expect(row).not.toHaveProperty('target_user_id');
    });
  });

  describe('delete', () => {
    it('存在则删除并返回 true', async () => {
      const id = await repo.insert({ adminId: 'a', action: 'x' });
      const result = await repo.delete(id);
      expect(result).toBe(true);
      expect(engine._store.size).toBe(0);
    });

    it('不存在返回 false', async () => {
      const result = await repo.delete('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('countByAdmin', () => {
    it('统计指定管理员的审计日志数', async () => {
      await repo.insert({ adminId: 'admin-1', action: 'a' });
      await repo.insert({ adminId: 'admin-1', action: 'b' });
      await repo.insert({ adminId: 'admin-2', action: 'c' });

      expect(await repo.countByAdmin('admin-1')).toBe(2);
      expect(await repo.countByAdmin('admin-2')).toBe(1);
      expect(await repo.countByAdmin('admin-x')).toBe(0);
    });
  });
});
