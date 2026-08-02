/**
 * @file 测试用 DbEngine 适配器 — 将 better-sqlite3 实例包装为 DbEngine 接口
 *
 * 供 service 级集成测试使用：测试内部持有 in-memory better-sqlite3 DB，
 * 通过此适配器构造 DbEngine，再用 _setDbEngineForTest 注入为全局单例，
 * 使 Repository 层（getXRepository → getDbEngine()）读写同一内存库。
 */
import type { Database } from 'better-sqlite3';
import type { DbEngine, QueryParams, QueryRow } from '../../src/shared/db/drivers';

export function createSqliteTestEngine(db: Database): DbEngine {
  let inTx = false;
  // better-sqlite3 只能绑定 number/string/bigint/buffer/null，无法绑定 boolean。
  // 生产驱动（如 Drizzle）会将 boolean 落库到 INTEGER 列，这里做等价转换。
  const coerce = (params: QueryParams): unknown[] =>
    (params as unknown[]).map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v));

  const txEngine: DbEngine = {
    provider: 'sqlite',
    execute: (s, p = []) => engine.execute(s, p),
    query: <U = QueryRow>(s: string, p: QueryParams = []) => engine.query<U>(s, p),
    queryOne: <U = QueryRow>(s: string, p: QueryParams = []) => engine.queryOne<U>(s, p),
    transaction: <U>(inner: (t: DbEngine) => Promise<U>) => inner(txEngine),
  };

  const engine: DbEngine = {
    provider: 'sqlite',

    async execute(sql: string, params: QueryParams = []): Promise<number> {
      const stmt = db.prepare(sql);
      const result = stmt.run(...coerce(params));
      return result.changes;
    },

    async query<T = QueryRow>(
      sql: string,
      params: QueryParams = [],
    ): Promise<T[]> {
      const stmt = db.prepare(sql);
      return stmt.all(...coerce(params)) as T[];
    },

    async queryOne<T = QueryRow>(
      sql: string,
      params: QueryParams = [],
    ): Promise<T | null> {
      const stmt = db.prepare(sql);
      const row = stmt.get(...coerce(params)) as T | undefined;
      return row ?? null;
    },

    async transaction<T>(fn: (tx: DbEngine) => Promise<T>): Promise<T> {
      // 嵌套事务：仅最外层执行 BEGIN/COMMIT，内层直接运行（等价于 SAVEPOINT 语义）
      if (inTx) return fn(txEngine);
      inTx = true;
      db.exec('BEGIN');
      try {
        const result = await fn(txEngine);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      } finally {
        inTx = false;
      }
    },
  };

  return engine;
}
