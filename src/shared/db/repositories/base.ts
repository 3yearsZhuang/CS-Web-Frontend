/**
 * @file Repository 层共享基础设施 — ADR-009 迁移规范基础
 *
 * 设计要点（与 repositories/audit.repo.ts 模板一致）：
 * 1. 每个模块一个 Repository 文件，导出 create<Module>Repository(engine) 工厂 + get<Module>Repository() 单例。
 * 2. Repository 方法统一以「可选 engine 参数」收尾：`method(args, engine?: DbEngine)`，
 *    内部用 resolveEngine(engine) 取实际执行引擎——事务内由调用方传入 tx，默认取全局单例引擎。
 * 3. Service 层全部 async；需要多表原子性时：
 *      const engine = await getDbEngine();
 *      await engine.transaction(async (tx) => { await repoA.x(tx); await repoB.y(tx); });
 * 4. SQL 统一使用 ? 占位符（pg-driver 自动转 $1）；SQLite 专属函数（datetime('now') 等）
 *    当前保留在 SQL 中（sqlite driver 原生支持），PG 实现阶段（Part B Phase 4）再统一替换。
 */
import 'server-only';
import { getDbEngine, type DbEngine } from '@/shared/db/drivers';

/** 解析 Repository 方法实际使用的引擎：传入 tx 时优先使用，否则取全局单例 */
export async function resolveEngine(engine?: DbEngine): Promise<DbEngine> {
  return engine ?? (await getDbEngine());
}

/** 统一行类型别名（与 DbEngine.QueryRow 一致） */
export type RepoRow = Record<string, unknown>;

/** 将可能为 null/undefined 的值安全转为字符串（行映射常用） */
export function strOrNull(v: unknown): string | null {
  return v == null ? null : String(v);
}

/** 将可能为 null/undefined 的值安全转为数字（行映射常用） */
export function numOrNull(v: unknown): number | null {
  return v == null ? null : Number(v);
}
