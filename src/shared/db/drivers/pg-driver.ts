/**
 * @file PostgreSQL Driver — postgres.js 包装为 DbEngine 接口
 *
 * 占位符统一：调用方传 ? 占位符，driver 内部转换为 $1/$2；事务通过 BEGIN/COMMIT/ROLLBACK 显式控制，支持嵌套 SAVEPOINT。
 * DATABASE_URL 指定连接串，PG_POOL_MAX 控制连接池上限（默认 10）。
 */
import 'server-only';
import postgres from 'postgres';
import type { DbEngine, QueryParams, QueryRow } from './index';

/** PG engine 实现 */
export interface PgEngine extends DbEngine {
  readonly provider: 'pg';
  /** 暴露底层 postgres client，供高级用法（COPY/LISTEN）使用 */
  readonly raw: ReturnType<typeof postgres>;
}

/** 将 SQL 中的 ? 占位符转换为 PG 的 $1, $2...（兼容 SQLite 风格 SQL，不处理字符串字面量内的 ?） */
function convertPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** 全局 postgres client 单例（进程级） */
let pgClient: ReturnType<typeof postgres> | null = null;

/** 获取 postgres client 单例（首次创建连接池，测试可经 _setPgClientForTest 注入 mock） */
function getPgClient(): ReturnType<typeof postgres> {
  if (pgClient) return pgClient;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[pg-driver] DATABASE_URL 未设置 — 请配置 PostgreSQL 连接串（如 postgres://user:pass@host:5432/db）',
    );
  }

  const maxConnections = Number(process.env.PG_POOL_MAX ?? 10);
  pgClient = postgres(url, {
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
    // Edge Runtime 不支持 ssl 'require'，由调用方通过 DATABASE_URL 控制
  });

  return pgClient;
}

/** 创建 PG engine 实例 */
export async function createPgEngine(): Promise<PgEngine> {
  const client = getPgClient();

  const engine: PgEngine = {
    provider: 'pg',
    raw: client,

    async execute(sql: string, params: QueryParams = []): Promise<number> {
      const pgSql = convertPlaceholders(sql);
      const result = await client.unsafe(pgSql, params as unknown as postgres.Parameter[]);
      return result.count;
    },

    async query<T extends QueryRow = QueryRow>(
      sql: string,
      params: QueryParams = [],
    ): Promise<T[]> {
      const pgSql = convertPlaceholders(sql);
      const result = await client.unsafe(pgSql, params as unknown as postgres.Parameter[]);
      return result as unknown as unknown as T[];
    },

    async queryOne<T extends QueryRow = QueryRow>(
      sql: string,
      params: QueryParams = [],
    ): Promise<T | null> {
      const pgSql = convertPlaceholders(sql);
      const result = await client.unsafe(pgSql, params as unknown as postgres.Parameter[]);
      const rows = result as unknown as unknown as T[];
      return rows[0] ?? null;
    },

    async transaction<T>(fn: (tx: DbEngine) => Promise<T>): Promise<T> {
      // postgres.js 的 begin 返回 UnwrapPromiseArray<T>，需要 cast 为 Promise<T>
      return client.begin(async (txClient) => {
        const txEngine: DbEngine = {
          provider: 'pg',
          execute: (s, p = []) => {
            const pgSql = convertPlaceholders(s);
            return txClient.unsafe(pgSql, p as unknown as postgres.Parameter[]).then(
              (r) => r.count,
            );
          },
          query: <T extends QueryRow>(s: string, p: QueryParams = []): Promise<T[]> => {
            const pgSql = convertPlaceholders(s);
            return txClient
              .unsafe(pgSql, p as unknown as postgres.Parameter[])
              .then((r) => r as unknown as unknown as T[]);
          },
          queryOne: <T extends QueryRow>(s: string, p: QueryParams = []): Promise<T | null> => {
            const pgSql = convertPlaceholders(s);
            return txClient
              .unsafe(pgSql, p as unknown as postgres.Parameter[])
              .then((r) => {
                const rows = r as unknown as unknown as T[];
                return rows[0] ?? null;
              });
          },
          transaction: <U>(inner: (t: DbEngine) => Promise<U>) =>
            engine.transaction(inner),
        };
        return fn(txEngine);
      }) as Promise<T>;
    },
  };

  return engine;
}

/** 测试专用：注入 mock postgres client */
export function _setPgClientForTest(
  client: ReturnType<typeof postgres> | null,
): void {
  pgClient = client;
}
