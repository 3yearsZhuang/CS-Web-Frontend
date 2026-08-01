/**
 * @file 统一数据库接口抽象 — engine-agnostic DbEngine，屏蔽 SQLite/PG 差异
 *
 * getDb() 仍返回 better-sqlite3 实例（兼容存量调用）；新代码用 getDbEngine() 获取统一接口。
 * 双引擎过渡期由 DATABASE_PROVIDER=sqlite|pg 切换。
 */
import 'server-only';

/** 统一查询参数类型 — 兼容 SQLite (?) 与 PG ($1) 占位符，driver 内部转换 */
export type QueryParam = string | number | boolean | null | Uint8Array;
export type QueryParams = QueryParam[];

/** 统一查询结果行 — driver 内部把 Row 转为 plain object */
export type QueryRow = Record<string, unknown>;

/** 数据库引擎接口 — 所有 Repository 通过此接口操作数据库 */
export interface DbEngine {
  /** 当前 provider 标识，用于条件分支（如 SQLite 不支持 RETURNING） */
  readonly provider: 'sqlite' | 'pg';

  /** 执行写操作（INSERT/UPDATE/DELETE），返回受影响行数 */
  execute(sql: string, params?: QueryParams): Promise<number>;

  /** 查询多行 */
  query<T extends QueryRow = QueryRow>(sql: string, params?: QueryParams): Promise<T[]>;

  /** 查询单行，无结果返回 null */
  queryOne<T extends QueryRow = QueryRow>(sql: string, params?: QueryParams): Promise<T | null>;

  /** 事务执行（嵌套通过 SAVEPOINT 支持，抛错 ROLLBACK，正常 COMMIT） */
  transaction<T>(fn: (tx: DbEngine) => Promise<T>): Promise<T>;
}

/** 单例缓存 — 全进程共享一个 engine 实例 */
let engineInstance: DbEngine | null = null;

/** 获取数据库引擎单例（按 DATABASE_PROVIDER 选择 driver，首次调用初始化 schema 与迁移） */
export async function getDbEngine(): Promise<DbEngine> {
  if (engineInstance) return engineInstance;

  const provider = process.env.DATABASE_PROVIDER ?? 'sqlite';
  if (provider === 'pg') {
    const { createPgEngine } = await import('./pg-driver');
    engineInstance = await createPgEngine();
  } else {
    const { createSqliteEngine } = await import('./sqlite-driver');
    engineInstance = createSqliteEngine();
  }

  return engineInstance;
}

/** 测试专用：注入 mock engine（仅 vitest 使用） */
export function _setDbEngineForTest(engine: DbEngine | null): void {
  engineInstance = engine;
}
