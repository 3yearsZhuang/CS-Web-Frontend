/**
 * @file SQLite 数据库连接与 schema 初始化入口
 *
 * better-sqlite3 单例，启动时自动初始化 schema；schema/种子/清理逻辑拆分到 db/ 子模块。
 * SQLITE_DB_PATH 环境变量指定文件路径（默认 data/app.db）。
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import 'server-only';
import { runMigrations } from './db/migrations';
import { initSchema } from './db/schema';

// re-export 子模块公开 API，保持 `import { ... } from '@/shared/db'` 不变
export { cleanupExpiredData } from './db/cleanup';
export { seedEventsIfEmpty, seedForumCategoriesIfEmpty } from './db/seeds';
export { initSchema } from './db/schema';

/** SQLite 数据库实例类型 */
export type DB = Database.Database;

/** 数据库文件路径，优先读取 SQLITE_DB_PATH 环境变量，默认 data/app.db */
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(process.cwd(), 'data', 'app.db');

let dbInstance: DB | null = null;

/** 获取 SQLite 数据库单例（首次调用建目录、打开文件、初始化 schema、启用 WAL 与外键约束） */
export function getDb(): DB {
  if (dbInstance) {
    return dbInstance;
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);

  // 版本化迁移（在 initSchema 之后执行）
  runMigrations(db);

  dbInstance = db;
  return db;
}
