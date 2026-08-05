# FZTBUCS-Evolution-演进路线图与迁移文档

> **当前进度 / 真实状态（2026-08-06）**：前后端分离已完成（前端为 BFF 薄转发，运行时不复读 SQLite）；后端 FastAPI + PostgreSQL 承载全部业务。事件总线跨实例（ADR-014）于 2026-08-06 落地（arq/Redis 广播）。论坛 + 成员搜索已升级为 GIN + tsvector（替代原 ILIKE 降级）。本文中标注 `⚠️ 规划中` 的段落为远期目标态，尚未落地。

> 文档定位：演进规划与迁移实施权威文档（reference + how-to）
> 受众：架构师 / 技术负责人 / 后端迁移实施者 / oncall / 发布决策者
> Source of truth：功能规划、架构决策（ADR）、迁移路径的唯一权威位置
> 关联：架构与 API 见 [FrontDoc-Arch.md](FrontDoc-Arch.md)；安全见 [FrontDoc-Sec.md](FrontDoc-Sec.md)；运维/SLO/Runbook 见 [FrontDoc-Ops.md](FrontDoc-Ops.md)；工程规则见 [FrontDoc-Onboard.md](FrontDoc-Onboard.md#八项目规则)
> 最后更新：2026-08-05（精简空桩节、修正与 BFF 现状矛盾的单体架构描述；合并原 Devdocs-roadmap.md + Devdocs-migration-guide.md；内联 ADR-009-impl.md 实施手册，同步 ADR-009 全量迁移收官状态。迁移脚本 `migrate-sqlite-to-pg.mjs` 的用法权威仍为独立的 [FrontDoc-PGMig.md](FrontDoc-PGMig.md)，本文 Part B 只承载高层演进叙事）
> 更新人：3yearsZ

## 文档结构

- **Part A: 迭代路线图** - 架构决策（ADR）索引、健壮函数、边界上下文、交互风格、数据流图
- **Part B: PostgreSQL 迁移** - SQLite↔PG 双引擎演进（Phase 0~5、风险、文件索引）

> 演进叙事主线：**已完成前后端分离**——前端降级为 BFF（Next.js 薄转发），后端 FastAPI + PostgreSQL 承载全部业务数据/认证/邮件（ADR-009 全量迁移收官，前端运行时不再读写 SQLite）；远期按语言优势拆分为 Python/Java 微服务，共享 PostgreSQL。Part B 的 SQLite↔PG 双引擎演进仅作为迁移历史痕迹保留。
> 变更触发：新增 ADR / 新增迁移 Phase / 新增语言服务 / 数据库切换 / 通信契约变更
> Stale 信号：ADR 状态与实施记录不一致、风险等级未随修复更新、迁移 Phase 清单与代码目录不一致

> ℹ️ 已完成/已实施项见 [`项目演变历史.md`](../../../项目演变历史.md)，待办/待评估项见 [`项目待办事项.md`](../../../项目待办事项.md)。
>
> 本文档仅保留**仍具参考价值**的索引性章节（ADR 索引、健壮函数、边界上下文、交互风格、数据流图、Part B 风险与文件索引）。

---

<!-- PART_A_START -->

# Part A: 迭代路线图

> 最后更新：2026-07-31（0.9.1 预发布：SLO + alerting + load test + restore drill + runbook + rollback + CI 加固 + EX-1 风险接受 + ADR-018）
> 验证 cadence：里程碑结束时 | stale 信号：ADR 状态与实施记录不一致、风险等级未随修复更新、SLO 月度 review 未执行

---

## 一、架构决策记录（ADR）索引

> ADR-001 ~ ADR-019 的完整决策记录已迁移至根目录 `项目演变历史.md`（已实施项）与 `项目待办事项.md`（待评估项）。本节仅保留索引速查。

| ADR | 主题 | 状态 | 摘要 |
|-----|------|------|------|
| ADR-001 | 模块化目录结构 | ✅ 已实施 | 按业务域拆分 `modules/`，每域自包含 server/types/ui |
| ADR-002 | 数据库双引擎抽象 | ✅ 已实施 | Drizzle ORM + `DATABASE_DIALECT` 切换 SQLite/PG |
| ADR-005 | Repository 抽象层 | ✅ 已实施 | `getRepositories()` 屏蔽方言差异 |
| ADR-009 | 前后端分离 + 全量迁移至后端 PG | ✅ 已收官 | 前端降级为 BFF，运行时不再读写 SQLite；后端承载全部业务/认证/邮件 |
| ADR-018 | 0.9.1 预发布就绪包 | ✅ 已实施 | SLO + alerting + load test + restore drill + runbook + rollback + CI 加固 |
| ADR-019 | 前端重建适配 community v2 | ✅ 已实施 | 2026-08-03 前端重建 |

> 完整 ADR 表（含 ADR-003/004/006-008/010-017）见根目录 `项目演变历史.md`。

---

## 二、健壮函数（Resilience）清单

> ⚠️ 以下函数位置多为**迁移前单体遗留代码**，运行时不被 BFF API 路由引用（BFF 薄转发到后端，由后端承载业务逻辑）。保留此清单作为历史审计证据，新增韧性逻辑应在后端实现。

| 函数 | 位置 | 防护 | 运行时状态 |
|------|------|------|:---:|
| `assertOwnership` | `modules/auth/server/permission.ts` | 对象级权限（IDOR） | ⚠️ 遗留 |
| `withTransaction` | `shared/db.ts` | 写操作原子性 | ⚠️ 遗留 |
| `rateLimit` | `shared/security/security.ts` | 接口防刷（BFF 自身用） | ✅ 运行时 |
| `sanitizeMarkdown` | `shared/utils/markdown.ts` | XSS 防护 | ⚠️ 遗留 |
| `requireModuleAdmin` | `modules/admin/server/require.ts` | 细粒度模块级守卫（UI 兜底） | ✅ 运行时 |

> ★ = BFF 运行时核心 · ⚠️ = 迁移前单体遗留，运行时不被 API 路由引用，待清理

---

## 三、边界上下文（Bounded Context）

> 当前 BFF 视角的权威架构图见 [FrontDoc-Arch.md](FrontDoc-Arch.md) Part A。下方为**迁移前单体架构**的历史快照，仅作演进对照保留。

**当前（BFF 视角）**：

```
                 ┌─────────────────────────────────────┐
                 │        Next.js BFF（薄转发）          │
                 │  ┌──────────┐  ┌──────────────────┐  │
                 │  │  Auth    │  │  Community       │  │
                 │  │ (Cookie) │  │ (forum/blog/members)│
                 │  └────┬─────┘  └────────┬─────────┘  │
                 │       │ backend-client.ts  │          │
                 │  ┌────┴─────┐  ┌────────┴─────────┐  │
                 │  │ Notification│  │  Events          │  │
                 │  └──────────┘  └──────────────────┘  │
                 │  ┌──────────┐  ┌──────────────────┐  │
                 │  │  Tools   │  │  Admin (UI 兜底)  │  │
                 │  │(exam/...)│  │                  │  │
                 │  └──────────┘  └──────────────────┘  │
                 └──────────────────────┬──────────────┘
                                        │ JWT + snake_case→camelCase
                                 ┌──────┴──────┐
                                 │ FastAPI + PG │ （后端承载业务/认证/邮件/RBAC enforce）
                                 └─────────────┘
```

**迁移前（单体，历史对照）**：

```
                 ┌─────────────────────────────────────┐
                 │           Next.js Monolith           │
                 │  ┌──────────┐  ┌──────────────────┐  │
                 │  │  Auth    │  │  Community       │  │
                 │  │ (session)│  │ (forum/blog/members)│
                 │  └────┬─────┘  └────────┬─────────┘  │
                 │       │ event bus       │            │
                 │  ┌────┴─────┐  ┌────────┴─────────┐  │
                 │  │ Notification│  │  Events          │  │
                 │  └──────────┘  └──────────────────┘  │
                 │  ┌──────────┐  ┌──────────────────┐  │
                 │  │  Tools   │  │  Admin           │  │
                 │  │(exam/...)│  │ (audit/ops)      │  │
                 │  └──────────┘  └──────────────────┘  │
                 └──────────────────────┬──────────────┘
                                        │ DbEngine / getDb()
                                 ┌──────┴──────┐
                                 │   SQLite    │ (-> PostgreSQL, see Part B；ADR-009 收官多数模块经 Repository 抽象)
                                 └─────────────┘
```

---

## 四、交互风格约定

> ⚠️ 标注项为迁移前单体遗留机制，BFF 运行时不再使用。

- **页面导航**：Next.js Link / `useRouter`
- **API 调用（BFF → 后端）**：`shared/backend-client.ts` 统一代理（注入 JWT、401 静默刷新、snake_case→camelCase 翻译）
- ~~**API 调用（前端 → BFF）**：`fetch` + 统一错误拦截（`src/lib/api-client.ts`）~~ ⚠️ 遗留路径，已不存在
- ~~**事件通知**：`appBus.emit/on`（进程内）~~ ⚠️ 遗留事件总线，业务通知由后端承载
- **跨服务（未来）**：REST + JSON

---

## 五、数据流图

**当前（BFF 视角）**：

```
用户请求
  -> Next.js Route Handler（src/app/api/**/route.ts）
  -> assertAllowedOrigin + Zod body 校验
  -> proxyBackend（shared/backend-client.ts）
       ├── 注入 Authorization: Bearer <JWT>（从 HttpOnly Cookie）
       ├── 401 静默刷新（调用后端 /auth/refresh 轮换令牌）
       └── snake_case → camelCase 响应翻译
  -> 后端 FastAPI（require_permission enforce + 业务逻辑 + PostgreSQL）
  -> 响应（normalizeError 错误规范化 + setAuthCookies/clearAuthCookies）
```

**迁移前（单体，历史对照）**：

```
用户请求
  -> proxy.ts（安全头/限流/requestId）
  -> Next.js Route Handler
  -> requireAuth/requirePermission
  -> Service（业务规则）
  -> DbEngine / getDb()（ADR-009 收官：多数模块经 Repository，少量 auth 子模块仍直连 getDb()）
  -> SQLite（WAL）
  -> 响应（结构化日志 + requestId）
事件分支：
  Service -> appBus.emit -> Notification listener -> DB
```

<!-- PART_A_END -->

---

# Part B: PostgreSQL 迁移（历史痕迹）

> 最后更新：2026-08-02（Phase 0 + Phase 1 完成；dialect 切换、db 单例、迁移系统改造均落地；**ADR-009 全量迁移收官：auth/user/community/events/tools/notification/admin/announcement 已移除 getDb() 直连、统一经 Repository**，详见 ADR-009；CI 集成 pending）
> 验证 cadence：每个 Phase 完成时 | Stale 信号：Phase 清单与代码目录不一致 / 待办项状态未更新
> 关联：[Part A](#part-a-迭代路线图) ADR-002/005/009（数据库演进决策）；[FrontDoc-Sec.md](FrontDoc-Sec.md) 密钥管理

> ℹ️ **本 Part 为迁移历史痕迹保留**。ADR-009 收官后，前端运行时不再读写 SQLite，`DATABASE_DIALECT` 双引擎切换在 BFF 运行时已无意义（仅遗留脚本使用）。各 Phase 状态表、待办清单详见根目录 `项目演变历史.md` / `项目待办事项.md`。

---

## 一、迁移概述

将数据库从 `better-sqlite3`（SQLite）迁移到 `postgres`（PostgreSQL），通过 **Drizzle ORM** 实现双引擎可切换。核心目标：

1. **解除 SQLite 写瓶颈**（详见 [Part A](#part-a-迭代路线图) R1/R20）
2. **支持并发写入**（PostgreSQL 原生支持）
3. **为多语言微服务做准备**（共享 PG 实例）

> 设计原则：**平滑过渡、可逆、不中断服务**。通过环境变量 `DATABASE_DIALECT` 控制实际使用的数据库，开发期仍可回退 SQLite。

> ⚠️ ADR-009 收官后，此双引擎机制仅遗留脚本（`create-user`/`seed`）使用，BFF 运行时 API 路由不引用。

---

## 二、架构决策（与 Part A ADR 对齐）

| 决策点 | 选择 | 理由 |
|--------|------|------|
| ORM | Drizzle ORM | 类型安全、轻量、支持多 dialect |
| 切换方式 | 环境变量 `DATABASE_DIALECT` | 无需改代码，运维可控 |
| Repository 抽象 | 复用 ADR-009 `getRepositories()` | 服务层零改动切换底层 |
| 迁移系统 | 统一 schema 同步 + 双 dialect 迁移 | 见 Phase 1 |

> 注：双引擎不共用同一份迁移 SQL，而是各 dialect 独立迁移文件（见 Phase 1 迁移系统改造）。

---

## 三、风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| 事务异步化波及服务层（大量 `async` 改造） | 高 | 分阶段，先 Repository 内部异步，服务层逐步适配 |
| 数据迁移丢失/不一致 | 高 | 双写验证期 + 校验和比对 |
| PG 连接池耗尽 | 中 | `postgres` 连接池配置 + 监控 |
| Drizzle schema 双 dialect 漂移 | 中 | CI 校验 `drizzle-kit check` 双 dialect |
| 回滚困难（PG 专属类型无法回 SQLite） | 中 | 保留 SQLite 实例 + 增量同步 |

> ℹ️ ADR-009 收官后，前四项风险已随前端降级为 BFF 而消解（BFF 不再持有业务数据）；第五项保留 SQLite 实例的缓解措施仍适用于遗留脚本。

---

## 四、关键文件索引

| 文件 | 职责 | 运行时状态 |
|------|------|:---:|
| `src/shared/db/db.ts` | db 单例，按 dialect 初始化 | ⚠️ 遗留 |
| `src/shared/db/drizzle.ts` | 双 dialect Drizzle 实例 | ⚠️ 遗留 |
| `src/shared/db/repositories/*.repo.ts` | 各模块 DbEngine 抽象 Repository（ADR-009；audit 为首个模板，已扩展至 auth/user/community/events/tools/notification/admin/announcement） | ⚠️ 遗留 |
| `src/shared/db/migrations.ts` | 双 dialect 迁移执行 | ⚠️ 遗留 |
| `drizzle.config.ts` | Drizzle 配置（dialect 切换） | ⚠️ 遗留 |
| `src/shared/db/drizzle/` | 各模块 Drizzle/PG schema 定义（getXxxSchema 工厂） | ⚠️ 遗留 |
| `src/shared/db/sqlite/` | 各模块 SQLite 建表脚本（initXxxSchema） | ⚠️ 遗留 |
| `tools/scripts/migrate-sqlite-to-pg.mjs` | SQLite -> PG 数据迁移脚本（UUID->Integer 重映射 + 依赖序导入 + 类型转换 + setval + 幂等）；用法见 [FrontDoc-PGMig.md](FrontDoc-PGMig.md) | ✅ 迁移工具 |

> ⚠️ = 迁移前单体遗留代码，BFF 运行时不被任何 API 路由引用，待清理（见根目录 `项目待办事项.md` "多库支持-待办"）

---

## 五、与多语言微服务迁移的关系

完成 Part B 后，PostgreSQL 作为共享数据库，未来 Python/Java 服务通过同一 PG 实例访问数据，经 Repository 抽象层（ADR-009）屏蔽方言差异。

> ℹ️ 多语言微服务迁移的详细规划已迁移至根目录 `项目待办事项.md`。

<!-- PART_B_END -->
