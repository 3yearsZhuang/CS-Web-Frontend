/**
 * @file drizzle-kit 配置
 *
 * 功能：drizzle-kit CLI 的配置入口，用于 generate / migrate / push / studio
 *
 * 环境变量：
 * - DATABASE_PROVIDER — sqlite | pg，决定使用哪个 dialect
 * - SQLITE_DB_PATH    — SQLite 文件路径（provider=sqlite 时使用）
 * - DATABASE_URL      — PostgreSQL 连接串（provider=pg 时使用）
 *
 * 前置条件：
 * - 已安装 drizzle-orm、drizzle-kit、better-sqlite3、postgres
 * - schema 文件位于 src/shared/db/schema/*.ts
 *
 * 用法：
 *   pnpm drizzle-kit generate      生成迁移 SQL
 *   pnpm drizzle-kit migrate       应用迁移
 *   pnpm drizzle-kit studio        可视化查看数据
 */
import { defineConfig } from 'drizzle-kit';
import path from 'node:path';

const provider = process.env.DATABASE_PROVIDER ?? 'sqlite';

export default defineConfig(
  provider === 'pg'
    ? {
        schema: './src/shared/db/schema/*.ts',
        out: './drizzle/pg',
        dialect: 'postgresql',
        dbCredentials: {
          url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/app',
        },
        strict: true,
        verbose: true,
      }
    : {
        schema: './src/shared/db/schema/*.ts',
        out: './drizzle/sqlite',
        dialect: 'sqlite',
        dbCredentials: {
          url: process.env.SQLITE_DB_PATH ?? path.join(process.cwd(), 'data', 'app.db'),
        },
        strict: true,
        verbose: true,
      },
);
