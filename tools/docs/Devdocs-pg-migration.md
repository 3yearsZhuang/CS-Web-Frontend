# PostgreSQL 迁移进度文档

> 最后更新：2026-07-31（Phase 0 + Phase 1 完成 - Drizzle 双引擎 schema 全量补齐）
> 验证 cadence：每个 Phase 结束时 | stale 信号：schema 与 initSchema DDL 不一致、Repository 未同步迁移

---

## 一、迁移目标

将现有 SQLite 单数据库架构升级为 SQLite ↔ PostgreSQL 双引擎可切换架构，为生产环境部署到飞牛 NAS 提供更可靠的关系型数据库支持。

### 核心原则

1. 渐进式迁移 - 分阶段推进，每个 Phase 可独立验收，不破坏现有功能
2. 双引擎并行 - 同一份 schema 代码同时支持 SQLite 和 PG，由 `DATABASE_PROVIDER` 环境变量切换
3. 零数据丢失 - 迁移过程保留 SQLite fallback，数据迁移通过 SQL 脚本完成
4. 类型安全 - 全程 TypeScript 类型检查，Repository 层抽象数据库操作

---

## 二、整体架构

### 数据库抽象层

```
┌─────────────────────────────────────────────────────────┐
│  Repository 层（audit.repo.ts 等）                       │
│  ↓ 调用 DbEngine 接口                                    │
├─────────────────────────────────────────────────────────┤
│  DbEngine 接口（src/shared/db/drivers/index.ts）         │
│  - execute(sql, params): Promise<number>                │
│  - query<T>(sql, params): Promise<T[]>                  │
│  - queryOne<T>(sql, params): Promise<T | null>          │
│  - transaction<T>(fn): Promise<T>                       │
├──────────────────────┬──────────────────────────────────┤
│  SQLite Driver       │  PG Driver                       │
│  (better-sqlite3)    │  (postgres.js)                   │
│  - 同步 API 包装     │  - 原生异步                       │
│  - ? 占位符          │  - $1/$2 占位符转换               │
│  - BEGIN/COMMIT      │  - client.begin()                │
└──────────────────────┴──────────────────────────────────┘
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_PROVIDER` | `sqlite` | 数据库引擎（`sqlite` \| `pg`） |
| `DATABASE_URL` | - | PostgreSQL 连接字符串（provider=pg 时必填） |
| `SQLITE_DB_PATH` | `data/app.db` | SQLite 数据库文件路径 |
| `MULTI_TENANT_ENABLED` | `false` | 多租户开关（预留） |

---

## 三、Phase 0 - 基础设施搭建（已完成）

### 交付物

| 文件 | 说明 |
|------|------|
| `src/shared/db/drivers/index.ts` | DbEngine 接口 + getDbEngine() 工厂 |
| `src/shared/db/drivers/sqlite-driver.ts` | SQLite 驱动实现（better-sqlite3） |
| `src/shared/db/drivers/pg-driver.ts` | PostgreSQL 驱动实现（postgres.js） |
| `src/shared/db/schema/audit.schema.ts` | admin_actions 表 Drizzle schema（首个示例） |
| `src/shared/db/repositories/audit.repo.ts` | AuditRepository（首个 Repository 示例） |
| `src/shared/security/tenant-context.ts` | 多租户上下文（预留接口） |
| `drizzle.config.ts` | Drizzle Kit 双引擎配置 |

### 关键设计

#### DbEngine 接口

```typescript
export interface DbEngine {
  readonly provider: 'sqlite' | 'pg';
  execute(sql: string, params?: QueryParams): Promise<number>;
  query<T extends QueryRow = QueryRow>(sql: string, params?: QueryParams): Promise<T[]>;
  queryOne<T extends QueryRow = QueryRow>(sql: string, params?: QueryParams): Promise<T | null>;
  transaction<T>(fn: (tx: DbEngine) => Promise<T>): Promise<T>;
}
```

#### 占位符转换

SQLite 使用 `?` 占位符，PG 使用 `$1, $2, ...` 占位符。PG Driver 内部通过 `convertPlaceholders()` 自动转换，Repository 层统一写 `?` 占位符即可。

#### 事务实现

- SQLite：手动 `BEGIN` / `COMMIT` / `ROLLBACK`
- PG：使用 `client.begin()` 自动管理

---

## 四、Phase 1 - Drizzle schema 全量补齐（已完成）

### 交付物

8 个 schema 文件，覆盖全部业务模块的 30+ 张表：

| 模块 | 文件 | 覆盖表 |
|------|------|--------|
| 用户 | `user.schema.ts` | users / sessions / login_history |
| 系统 | `system.schema.ts` | verification_codes / password_reset_requests / component_registry_items / variants / guides / resources / join_applications / settings |
| 活动 | `event.schema.ts` | activity_participations / events / event_registrations / event_checkins |
| 论坛 | `forum.schema.ts` | forum_categories / forum_topics / forum_replies / forum_likes / forum_favorites / forum_topic_views / forum_mentions |
| 通知 | `notification.schema.ts` | notifications / announcements |
| 考试 | `exam.schema.ts` | exams / exam_questions / exam_question_options / exam_attempts |
| 任务 | `task.schema.ts` | tasks / task_claims / points_transactions |
| 博客 | `blog.schema.ts` | blog_posts / blog_series / blog_likes |

聚合 barrel：[src/shared/db/schema/index.ts](../../src/shared/db/schema/index.ts)

### Schema 设计模式

每个 schema 文件统一遵循以下模式：

1. 双 provider 并行 - 同一表结构同时定义 SQLite 和 PG 两套 schema
2. 类型映射策略：
   - SQLite：`text()` + `datetime('now')` 默认值
   - PG：`text()` + `timestamp with time zone` + `defaultNow()`
3. Provider 工厂 - 每个模块导出 `getXxxSchema()` 工厂函数
4. 约束完整保留 - UNIQUE 约束、partial unique index 全部通过 Drizzle API 表达

### 字段类型映射

| SQLite 类型 | PG 类型 | 说明 |
|-------------|---------|------|
| `text()` | `text()` | PG 官方推荐 text 而非 varchar |
| `integer()` | `integer()` | 保持 0/1 语义一致 |
| `text('created_at').default(sql\`datetime('now')\`)` | `timestamp('created_at', { withTimezone: true }).defaultNow()` | 时间戳 |

### 特殊约束处理

#### Partial Unique Index

- `idx_users_root_unique` - root 角色全局唯一（`WHERE role = 'root'`）
- `idx_forum_topic_views_unique_user` - 登录用户浏览去重（`WHERE user_id IS NOT NULL`）
- `idx_forum_topic_views_unique_ip` - 匿名用户浏览去重（`WHERE user_id IS NULL`）

```typescript
// Drizzle 表达方式
rootUniqueIdx: uniqueIndex('idx_users_root_unique')
  .on(table.id)
  .where(sql`role = 'root'`),
```

#### 复合唯一约束

- `component_registry_variants` UNIQUE(item_id, size, color, state)
- `forum_likes` UNIQUE(user_id, target_type, target_id)
- `event_registrations` UNIQUE(user_id, event_id)
- `exam_attempts` UNIQUE(user_id, question_id)
- `task_claims` UNIQUE(task_id, user_id)
- `blog_likes` UNIQUE(post_id, user_id)
- `settings` UNIQUE(module, key)

### 未在 Drizzle schema 中定义的内容

#### FTS5 全文索引（SQLite 专有）

`forum_topics_fts` 虚拟表与同步触发器为 SQLite 专有特性，PG 使用 GIN 索引 + tsvector 实现。这部分不在 Drizzle schema 中定义，留给迁移 SQL 各自处理：

- SQLite：保留现有 `initForumSchema` 中的 FTS5 DDL
- PG：在迁移 SQL 中单独创建 GIN 索引

#### 外键约束

Drizzle schema 不直接声明外键 ON DELETE 行为（CASCADE / SET NULL），由迁移 SQL 显式声明。这是因为：
1. Drizzle pg-core 不直接支持 ON DELETE SET NULL
2. 外键约束在两个 provider 间语义一致，统一在迁移层处理

### 验证结果

- `tsc --noEmit` 类型检查通过（exit code 0，无错误）
- 所有 schema 文件遵循统一的代码风格与注释规范

---

## 五、待办清单（TODO）

> 以下为未完成项，按优先级排序，后续逐项处理。每完成一项请勾选并补充完成日期与验证记录。

### 🔴 Phase 2 - 迁移 SQL 生成与比对

状态：待处理 | 优先级：高 | 前置依赖：Phase 1（已完成）

- [ ] 执行 `drizzle-kit generate` 生成 SQLite 迁移 SQL（输出到 `drizzle/sqlite/`）
- [ ] 执行 `drizzle-kit generate` 生成 PG 迁移 SQL（输出到 `drizzle/pg/`，需切换 `DATABASE_PROVIDER=pg`）
- [ ] 与现有 `src/shared/db/schemas/*.ts` 的 `initSchema` DDL 逐表比对
  - [ ] users / sessions / login_history
  - [ ] verification_codes / password_reset_requests
  - [ ] component_registry_items / variants / guides
  - [ ] resources / join_applications / settings
  - [ ] activity_participations / events / event_registrations / event_checkins
  - [ ] forum_categories / topics / replies / likes / favorites / topic_views / mentions
  - [ ] notifications / announcements
  - [ ] exams / exam_questions / exam_question_options / exam_attempts
  - [ ] tasks / task_claims / points_transactions
  - [ ] blog_posts / blog_series / blog_likes
  - [ ] admin_actions（Phase 0 已完成比对）
- [ ] 确认字段类型、默认值、NOT NULL 约束完全对齐
- [ ] 确认所有 INDEX 名称与现有迁移脚本一致（避免重复创建）
- [ ] 确认所有 UNIQUE INDEX / 复合唯一约束对齐
- [ ] FTS5 全文索引单独处理（SQLite 保留 initSchema 中的 DDL，PG 在迁移 SQL 中新增 GIN tsvector）
- [ ] 外键 ON DELETE 行为（CASCADE / SET NULL）在迁移 SQL 中显式声明

### 🟡 Phase 3 - 集成测试

状态：待处理 | 优先级：中 | 前置依赖：Phase 2

- [ ] 调研 `testcontainers` 在 Node.js 环境的可用性（或选替代方案如 docker-compose 临时 PG）
- [ ] 编写集成测试脚本启动临时 PG 实例
- [ ] 验证 PG schema 建表无错误
- [ ] 验证所有 UNIQUE 约束生效（插入重复数据应报错）
- [ ] 验证 partial unique index（root 唯一、登录/匿名浏览去重）
- [ ] 验证事务回滚行为
- [ ] 验证占位符转换（`?` -> `$1`）正确性
- [ ] 编写 Repository 层集成测试（audit.repo 已有单元测试作为模板）
- [ ] 跨数据库一致性测试（同一数据在 SQLite 与 PG 上行为一致）

### 🟡 Phase 4 - Repository 层迁移

状态：待处理 | 优先级：中 | 前置依赖：Phase 3

按 `audit.repo.ts` 模式，逐步为各模块创建 Repository（每个 Repository 含接口定义 + 实现 + 单元测试）：

- [ ] UserRepository（users / sessions / login_history）
  - [ ] 接口定义与实现
  - [ ] 单元测试
  - [ ] 替换现有 `src/modules/user/server/*.ts` 中的直接 SQL 调用
- [ ] SystemRepository（verification_codes / settings / resources / join_applications）
  - [ ] 接口定义与实现
  - [ ] 单元测试
  - [ ] 替换现有 `src/modules/system/server/*.ts` 中的直接 SQL 调用
- [ ] EventRepository（events / registrations / checkins）
  - [ ] 接口定义与实现
  - [ ] 单元测试
  - [ ] 替换现有 `src/modules/event/server/*.ts` 中的直接 SQL 调用
- [ ] ForumRepository（categories / topics / replies / likes / favorites / topic_views / mentions）
  - [ ] 接口定义与实现
  - [ ] 单元测试
  - [ ] 替换现有 `src/modules/forum/server/*.ts` 中的直接 SQL 调用
  - [ ] FTS5 查询语句适配 PG tsvector
- [ ] NotificationRepository（notifications / announcements）
  - [ ] 接口定义与实现
  - [ ] 单元测试
  - [ ] 替换现有 `src/modules/notification/server/*.ts` 中的直接 SQL 调用
- [ ] ExamRepository（exams / questions / attempts）
  - [ ] 接口定义与实现
  - [ ] 单元测试
  - [ ] 替换现有 `src/modules/exam/server/*.ts` 中的直接 SQL 调用
- [ ] TaskRepository（tasks / claims / points）
  - [ ] 接口定义与实现
  - [ ] 单元测试
  - [ ] 替换现有 `src/modules/task/server/*.ts` 中的直接 SQL 调用
- [ ] BlogRepository（posts / series / likes）
  - [ ] 接口定义与实现
  - [ ] 单元测试
  - [ ] 替换现有 `src/modules/blog/server/*.ts` 中的直接 SQL 调用

### 🟢 Phase 5 - 数据迁移与生产切换

状态：待处理 | 优先级：低（依赖飞牛 NAS 部署进度）| 前置依赖：Phase 4

- [ ] 编写 SQLite -> PG 数据迁移脚本（`tools/scripts/migrate-sqlite-to-pg.mjs`）
  - [ ] 按表导出 SQLite 数据
  - [ ] 处理日期格式转换（ISO 字符串 -> timestamp）
  - [ ] 处理自增 ID 冲突
  - [ ] 验证记录数一致性
- [ ] 在飞牛 NAS 部署 PostgreSQL（Docker 或系统包）
- [ ] 执行数据迁移并在 PG 上运行全量集成测试
- [ ] 配置生产环境变量（`DATABASE_PROVIDER=pg` + `DATABASE_URL=...`）
- [ ] 部署应用到飞牛 NAS
- [ ] 灰度验证（功能 / 性能 / 数据一致性）
- [ ] 验收并归档 SQLite 数据库文件（`data/app.db` -> 备份存储）

### ⚙️ 横向待办（贯穿各阶段）

- [ ] 文档同步：每个 Phase 完成后更新本文档对应章节，勾选完成项并补充验证记录
- [ ] 架构文档同步：Phase 4 完成后更新 `Devdocs-architecture.md` 的数据库章节
- [ ] README 更新：Phase 5 完成后更新 `README.md` 的部署章节，补充 PG 配置说明
- [ ] 环境变量模板：`.env.example` 增加 `DATABASE_PROVIDER` / `DATABASE_URL` 示例
- [ ] drizzle-kit 命令文档化：在 `package.json` 增加 `db:generate:sqlite` / `db:generate:pg` / `db:migrate` 脚本
- [ ] CI 集成：GitHub Actions 增加 PG 集成测试 job（Phase 3 完成后）

---

## 六、风险与注意事项

### 已知风险

1. FTS5 -> GIN 迁移 - 全文搜索语法不同，需要重写查询语句
2. 日期格式差异 - SQLite 存储为 ISO 字符串，PG 使用 timestamp，Repository 层需处理
3. 事务隔离级别 - SQLite 默认 SERIALIZABLE，PG 默认 READ COMMITTED，需确认业务一致性

### 注意事项

1. 不要删除 `src/shared/db/schemas/` - 保留作为 SQLite fallback，`initSchema` 继续生效
2. DATABASE_PROVIDER 切换需重启 - 进程级缓存（globalThis）在首次调用后固化
3. 密码哈希兼容性 - scrypt 哈希与 provider 无关，可直接迁移

---

## 七、相关文件索引

### Drizzle schema（新增）

```
src/shared/db/schema/
├── index.ts                    # 聚合 barrel
├── audit.schema.ts             # admin_actions（Phase 0）
├── user.schema.ts              # users / sessions / login_history（Phase 1）
├── system.schema.ts            # verification_codes / resources / settings 等（Phase 1）
├── event.schema.ts             # events / registrations / checkins（Phase 1）
├── forum.schema.ts             # forum_* 7 张表（Phase 1）
├── notification.schema.ts      # notifications / announcements（Phase 1）
├── exam.schema.ts              # exams / questions / attempts（Phase 1）
├── task.schema.ts              # tasks / claims / points（Phase 1）
└── blog.schema.ts              # blog_posts / series / likes（Phase 1）
```

### 驱动与 Repository（Phase 0）

```
src/shared/db/
├── drivers/
│   ├── index.ts                # DbEngine 接口 + getDbEngine()
│   ├── sqlite-driver.ts        # SQLite 驱动
│   └── pg-driver.ts            # PostgreSQL 驱动
└── repositories/
    ├── index.ts                # Repository barrel
    └── audit.repo.ts           # AuditRepository（示例）
```

### SQLite fallback（保留）

```
src/shared/db/
├── schemas/                    # better-sqlite3 手写 DDL（initSchema）
│   ├── index.ts
│   ├── user-schema.ts
│   ├── system-schema.ts
│   ├── event-schema.ts
│   ├── forum-schema.ts
│   ├── notification-schema.ts
│   ├── exam-schema.ts
│   ├── task-schema.ts
│   └── blog-schema.ts
├── schema.ts                   # initSchema 聚合
├── migrations.ts               # 增量迁移
└── db.ts                       # SQLite 连接
```

### 配置

- [drizzle.config.ts](../../drizzle.config.ts) - Drizzle Kit 双引擎配置
- [src/shared/security/tenant-context.ts](../../src/shared/security/tenant-context.ts) - 多租户上下文（预留）
