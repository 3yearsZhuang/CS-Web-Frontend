/**
 * @file SQLite Driver — better-sqlite3 包装为 DbEngine 接口
 *
 * 复用 getDb() 单例；better-sqlite3 同步 API 用 await 包装为 Promise 统一接口；事务通过 BEGIN/COMMIT 手动控制以支持 async fn。
 * 新 Repository 层走 DbEngine 接口，未来切 PG 不改 Repository 代码。
 */
import 'server-only';
import { getDb, type DB } from '@/shared/db';
import type { DbEngine, QueryParams, QueryRow } from './index';

/** SQLite engine 实现 */
export interface SqliteEngine extends DbEngine {
  readonly provider: 'sqlite';
  /** 暴露底层 better-sqlite3 实例，供存量代码兼容调用 */
  readonly raw: DB;
}

/** 创建 SQLite engine 实例（内部调用 getDb() 复用单例，schema 初始化由 getDb() 负责） */
export function createSqliteEngine(): SqliteEngine {
  const db = getDb();

  const engine: SqliteEngine = {
    provider: 'sqlite',
    raw: db,

    async execute(sql: string, params: QueryParams = []): Promise<number> {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return result.changes;
    },

    async query<T extends QueryRow = QueryRow>(
      sql: string,
      params: QueryParams = [],
    ): Promise<T[]> {
      const stmt = db.prepare(sql);
      return stmt.all(...params) as T[];
    },

    async queryOne<T extends QueryRow = QueryRow>(
      sql: string,
      params: QueryParams = [],
    ): Promise<T | null> {
      const stmt = db.prepare(sql);
      const row = stmt.get(...params) as T | undefined;
      return row ?? null;
    },

    async transaction<T>(fn: (tx: DbEngine) => Promise<T>): Promise<T> {
      // better-sqlite3 的 transaction 是同步的，用 BEGIN/COMMIT 手动控制以便在 async fn 中工作
      const txEngine: DbEngine = {
        provider: 'sqlite',
        execute: (s, p = []) => engine.execute(s, p),
        query: <T extends QueryRow>(s: string, p: QueryParams = []) =>
          engine.query<T>(s, p) as Promise<T[]>,
        queryOne: <T extends QueryRow>(s: string, p: QueryParams = []) =>
          engine.queryOne<T>(s, p) as Promise<T | null>,
        transaction: <U>(inner: (t: DbEngine) => Promise<U>) => engine.transaction(inner),
      };

      db.exec('BEGIN');
      try {
        const result = await fn(txEngine);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };

  return engine;
}
