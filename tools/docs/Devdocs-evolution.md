# FZTBUCS-Evolution-演进路线图与迁移文档

> 文档定位：演进规划与迁移实施权威文档（reference + how-to）
> 受众：架构师 / 技术负责人 / 后端迁移实施者 / oncall / 发布决策者
> Source of truth：功能规划、架构决策（ADR）、迁移路径的唯一权威位置
> 关联：架构与 API 见 [Devdocs-Arch.md](Devdocs-Arch.md)；安全见 [Devdocs-Sec.md](Devdocs-Sec.md)；运维/SLO/Runbook 见 [Devdocs-Ops.md](Devdocs-Ops.md)；工程规则见 [Devdocs-onboarding-guide.md](Devdocs-onboarding-guide.md#八项目规则)
> 最后更新：2026-08-01（合并原 Devdocs-roadmap.md + Devdocs-pg-migration.md + Devdocs-migration-guide.md）

## 文档结构

- **Part A: 迭代路线图** — 已完成功能、P0 收敛、P1/P2 规划、架构决策（ADR-001~019）、健壮函数、风险登记、边界上下文、依赖责任、交互风格、数据流图、里程碑
- **Part B: PostgreSQL 迁移** — SQLite↔PG 双引擎演进（Phase 0~5、待办、风险、文件索引）
- **Part C: 多语言微服务迁移** — Python/Java 组件划分、优先级、技术栈、通信契约、迁移 SOP
- **附录：已完成条目归档** — Part A 已完成功能/P0 收敛/P1 已完成项、Part B 已完成 Phase 的历史归档

> 演进叙事主线（三篇串联）：当前单实例 SQLite 单体（Part A R1/R20）→ 数据库双引擎可切换（Part B，落地 ADR-009 Repository 抽象）→ 按语言优势拆分为 Python/Java 微服务，共享 PostgreSQL（Part C）。
> 变更触发：新增 ADR / 新增迁移 Phase / 新增语言服务 / 数据库切换 / 通信契约变更
> Stale 信号：ADR 状态与实施记录不一致、风险等级未随修复更新、迁移 Phase 清单与代码目录不一致

---

<!-- PART_A_START -->

# Part A: 迭代路线图

> 最后更新：2026-07-31（0.9.1 预发布：SLO + alerting + load test + restore drill + runbook + rollback + CI 加固 + EX-1 风险接受 + ADR-018）
> 验证 cadence：里程碑结束时 | stale 信号：ADR 状态与实施记录不一致、风险等级未随修复更新、SLO 月度 review 未执行

---

## 一、已完成（2026-07）

> 本节所有条目已迁移至文末 [附录：已完成条目归档](#附录已完成条目归档)。本处保留章节锚点以维持文档结构稳定。

---

## 二、P0 收敛记录（2026-07 已清零）

> P0 = 阻塞可靠发布或运维盲区。所有 P0 项已于 2026-07 全部收敛，新增 P0 问题将重新开章。
> 收敛时间线：Q1-Q3（代码质量）-> Q4-Q6（可观测性）-> F1-F3（安全收紧）-> ADR-015 ~ ADR-017
> 本节所有条目（Q1-Q6、F1-F3）已迁移至文末 [附录：已完成条目归档](#附录已完成条目归档)。本处保留章节锚点以维持文档结构稳定。

---

## 三、中期规划（P1）

> P1 = 6-12 个月，提升用户体验与系统可维护性。

### 用户体验

| # | 方向 | 说明 | 风险/约束 |
|---|------|------|----------|
| M1 | 关注/好友系统 | 互相关注、动态流、私信（关注后才可私信） | 动态流需评估 SQLite 读负载 |
| M2 | Wiki/知识库 | 规章制度/FAQ/新人指南，多人协同编辑 | 复用社区 Markdown 编辑器 |
| M4 | 活动评价与反馈 | 活动结束后评分 + 文字评价 | 防刷分：限参与者一次评价 |
| M5 | 相册/活动回顾 | 活动照片上传、瀑布流展示 | 图片存储需评估磁盘容量 |

> M3（活动日历视图，2026-07-31 完成）已迁移至文末 [附录：已完成条目归档](#附录已完成条目归档)。

### 安全与合规

| # | 方向 | 说明 | 风险/约束 |
|---|------|------|----------|
| - | （当前无未完成的 P1 安全项） | ADR-015 已收敛全部 P0 安全漏洞，P1 安全项待 M10 Repository 抽象后评估 | - |

### 工程质量

| # | 方向 | 说明 | 风险/约束 |
|---|------|------|---------|
| M10 | Repository 抽象层 | 服务层直接持 better-sqlite3 | 抽象后便于未来换库与单测 mock；详见 ADR-009，落地路径见 [本文档 Part B](#part-b-postgresql-迁移) |

> M11（客户端/服务端边界澄清，2026-07-31 完成）已迁移至文末 [附录：已完成条目归档](#附录已完成条目归档)。

---

## 四、远期探索（P2）

> P2 = 12+ 个月，需先解决前置依赖。

| # | 方向 | 说明 | 前置依赖 |
|---|------|------|---------|
| L1 | 内网聊天工具 | 站内实时消息 | 需评估用户量 + SQLite 写瓶颈，详见 ADR-005 |
| L2 | RSS/邮件订阅 | 活动更新、文章发布 RSS + 邮件通知 | 复用 `shared/utils/mail`，需队列防突发 |
| L3 | 多区域灾备 | 单节点 Docker，无区域容灾 | 需先完成 L4 Repository 抽象 |
| L4 | 外部监控接入 | Sentry/GlitchTip 接入 `monitoring.ts` | `isMonitoringEnabled` 已预留开关 |
| L5 | 性能埋点 | Web Vitals + API P95 上报 | 需先完成 Q4 结构化日志 |
| L6 | PWA 离线增强 | Service Worker 已注册，补离线缓存策略 | `sw.js` 已就绪，补缓存清单 |
| L7 | 数据归档冷存储 | 历史活动/日志归档 | 需先完成 M10 Repository 抽象 |
| L8 | 未读通知 SSE 推送 | 替代轮询 | 需评估并发连接数 |
| L9 | 定时任务系统 | 数据保留清理（登录历史 90 天/审计 365 天） | 需评估单实例 cron vs 分布式调度 |
| L10 | GraphQL 网关 | 聚合多模块查询 | 需评估与现有 REST 共存成本 |

---

## 五、架构决策记录（ADR）

### ADR-001：采用 Next.js 全栈框架

- **状态**：已实施（2026-06-01）
- **背景**：需统一前后端技术栈，降低部署复杂度
- **决策**：采用 Next.js 14（现 16）App Router 全栈方案，前端 React + 后端 API Routes
- **后果**：单体应用，部署简单；牺牲了部分后端灵活性

### ADR-002：better-sqlite3 作为主数据库

- **状态**：已实施（2026-06-01）
- **背景**：校园协会网站，用户量小（< 200），无需分布式数据库
- **决策**：采用 better-sqlite3 同步数据库，零外部依赖，WAL 模式
- **后果**：部署极简；单写入串行，写 QPS 受限（见 R1）；PG 双引擎演进见 [Part B](#part-b-postgresql-迁移)

### ADR-003：模块化分层架构

- **状态**：已实施（2026-06-15）
- **背景**：代码组织混乱，模块边界模糊
- **决策**：采用 `modules/{ module }/{ server, ui, types }` 三层自洽结构
- **后果**：模块内聚，跨模块依赖清晰；需遵守模块协作规范（见 [Devdocs-onboarding-guide.md](Devdocs-onboarding-guide.md#八项目规则)）

### ADR-004：权限模型采用 RBAC

- **状态**：已实施（2026-06-20）
- **背景**：需细粒度控制不同角色的操作权限
- **决策**：基于角色的访问控制（RBAC），角色含 user/admin/root/content_moderator/exam_admin/task_publisher
- **后果**：权限管理清晰；需维护权限矩阵（见 [Devdocs-Sec.md](Devdocs-Sec.md) Part 2）

### ADR-005：SQLite 写瓶颈应对

- **状态**：已实施（2026-06-20）
- **背景**：better-sqlite3 写入串行，高频写场景受限
- **决策**：通过 WAL 模式 + 批量写入 + 读从内存缓存；关键写路径 （考试提交 / 签到）优先保障
- **后果**：当前用户量下无瓶颈；> 500 用户需评估 PG（见 R1 + [Part B](#part-b-postgresql-迁移)）

### ADR-006：事件驱动通知系统

- **状态**：已实施（2026-06-25）
- **背景**：通知散落在各业务模块，耦合度高
- **决策**：采用进程内事件总线 `appBus`，业务事件触发通知
- **后果**：解耦；事件监听器需显式初始化（见 ADR-013）；多实例需跨实例广播（见 ADR-014）

### ADR-007：Markdown 渲染安全策略

- **状态**：已实施（2026-06-28）
- **背景**：用户可提交 Markdown，需防 XSS
- **决策**：rehype-sanitize 白名单净化 + react-markdown + rehype-highlight
- **后果**：安全渲染；牺牲部分自定义 HTML 能力

### ADR-008：API 无版本前缀 + 向后兼容

- **状态**：已实施（2026-06-30）
- **背景**：API 迭代频繁，版本前缀增加复杂度
- **决策**：无 `/api/v1` 前缀，采用向后兼容演进（新增字段不删字段）
- **后果**：客户端简单；破坏性变更需走 ADR + 双写过渡（见 [Devdocs-Arch.md](Devdocs-Arch.md) Part B 十六章）

### ADR-009：Repository 抽象层

- **状态**：部分实施（模板已落地，2026-07-30）
- **背景**：服务层直接持 `better-sqlite3` 实例，换库成本高、单测难 mock
- **决策**：在 `db.ts` 上抽象 `Repository` 接口，服务层通过 Repository 访问数据，不感知底层 DB
- **后果**：换库只需替换 Repository 实现；为 [Part B](#part-b-postgresql-迁移) Phase 4 双引擎切换铺路；单测可 mock Repository
- **实施**：
  - `DbEngine` 抽象（`src/shared/db/drivers/`，sqlite/pg 双驱动）已落地，`audit.repo.ts` 是首个迁移到该抽象的模板（经 `getDbEngine()` 访问）
  - **当前仅 `audit` 模块使用 Repository 抽象**；其余 ~50 个 server 文件仍直连 `getDb()`（legacy SQLite 路径），未迁移
  - ⚠️ 文档早期表述的 `src/shared/db/repository.ts` 导出 `getRepositories()` 工厂 **尚未实现**——该文件不存在，仅 `src/shared/db/repositories/audit.repo.ts` 落地。请勿在代码中引用 `getRepositories()`

### ADR-010：客户端/服务端边界澄清

- **状态**：已实施（2026-07-31）
- **背景**：`shared/` 混 server-only 与同构代码，hooks 误放 shared 下
- **决策**：明确 `shared/` 仅放同构代码；server-only 逻辑沉到 `modules/*/server`；UI hooks 归 `src/hooks`
- **后果**：构建边界清晰；消除 `server-only` 误引入客户端的隐患

### ADR-011：模块化权限检查

- **状态**：已实施（2026-07-15）
- **背景**：权限检查散落在路由，易遗漏
- **决策**：在 `modules/auth/server/permission.ts` 提供 `requirePermission(req, point)` 统一入口
- **后果**：权限点集中管理；新增权限需同步权限矩阵（见 [Devdocs-Sec.md](Devdocs-Sec.md)）

<!-- PART_A_ADR_MID -->

### ADR-012：单节点部署架构

- **状态**：已实施（2026-07-22）
- **背景**：校园协会网站，流量低，多节点成本高
- **决策**：采用单节点 Docker 部署，不引入多实例
- **后果**：运维简单；速率限制/2FA 防重放/事件总线为单进程内存实现（见 [Devdocs-Sec.md](Devdocs-Sec.md) Part 4 例外 1）；多实例前须迁移 Redis（见 [Devdocs-Arch.md](Devdocs-Arch.md) 部署模型）

### ADR-013：事件监听器显式初始化

- **状态**：已实施（2026-07-29）
- **背景**：事件监听器依赖模块加载副作用，初始化时机不可控，生产偶发漏注册
- **决策**：监听器集中在 `src/instrumentation-node.ts` 显式 `initNotificationEvents()` 注册，幂等保护；`src/instrumentation.ts` 委托
- **后果**：监听器注册可预期；需随新增事件同步（见 [Devdocs-Arch.md](Devdocs-Arch.md) Part B 十五章）

### ADR-014：事件总线异步化评估

- **状态**：待评估（2026-07-29）
- **背景**：Node.js EventEmitter 默认同步执行监听器，重监听器阻塞请求线程
- **决策**：当前用户量下保持同步；当活跃用户 > 500 或某监听器 P95 > 500ms 时，重负载事件改用 `setImmediate` 队列或迁移 BullMQ（见 [Part C](#part-c-多语言微服务迁移) 事件总线→MQ）
- **后果**：短期无改动；异步化需配套事务一致性设计

### ADR-015：2FA 与安全加固收敛

- **状态**：已实施（2026-07-31）
- **背景**：安全审计（[Devdocs-Sec.md](Devdocs-Sec.md) Part 1）发现 4 高 + 7 中 + 5 低 + 4 严重
- **决策**：统一加固——2FA 写端点 Origin 校验 + 速率限制、预认证 token 防重放、GitHub OAuth 强制 2FA、生产密钥缺失 `process.exit(1)`、HKDF 派生 TOTP 密钥、细粒度角色模块级 enforce、CSP 去 unsafe-eval、Cookie `__Host-` 前缀、失败登录记录、论坛图片 session 校验、依赖漏洞 CI 阻断、pino 结构化日志
- **后果**：安全水位达标；详细变更证据见 [Devdocs-Sec.md](Devdocs-Sec.md) Part 4

### ADR-016：活动日历视图

- **状态**：已实施（2026-07-31）
- **背景**：活动无可视化时间视图，用户难规划参与
- **决策**：新增月历/周日历组件，纯前端聚合 `/api/events`
- **后果**：无后端风险；复用现有活动 API

### ADR-017：CI 安全加固

- **状态**：已实施（2026-07-31）
- **背景**：依赖漏洞无 CI 阻断，密钥缺失无启动校验
- **决策**：新增 `.github/workflows/audit.yml`（`pnpm audit --audit-level=high` 阻断）；`AUTH_SESSION_SECRET`/`ALLOWED_ORIGINS`/`TOTP_ENCRYPTION_KEY` 缺失即 `process.exit(1)`
- **后果**：供应链与配置安全左移；详见 [Devdocs-Sec.md](Devdocs-Sec.md) Part 4

### ADR-018：0.9.1 SLO 与单实例风险接受

- **状态**：已实施（2026-07-31）
- **背景**：发布前缺 SLO 与运维手册，单实例风险未正式登记
- **决策**：定义 0.9.1 最小集 SLO（可用性 99% / 错误率 < 1% / P95 < 500ms / 考试提交 99.9%），见 [Devdocs-Ops.md](Devdocs-Ops.md) Part B；登记 EX-1 单实例风险接受（用户量 < 200）
- **后果**：可度量可靠性；外部探针未接入前可用性 SLI 降级为应用层统计（R18）
- **创建记录**：本 ADR 于 2026-07-31 由 0.9.1 预发布收尾创建，配套生成 `Devdocs-slo.md`、`Devdocs-runbook.md`、`Devdocs-deployment-guide.md`（后三者已于 2026-08-01 合并为 [Devdocs-Ops.md](Devdocs-Ops.md)）

### ADR-019：内容审核工作流抽象

- **状态**：已实施（2026-07-31）
- **背景**：资源/博客/任务审核逻辑重复
- **决策**：提取 `shared/workflow` 审核状态机（pending/approved/rejected/archived），各模块复用
- **后果**：审核逻辑统一；状态流转可测试

---

## 六、健壮函数（Resilience）清单

| 函数 | 位置 | 防护 |
|------|------|------|
| `assertOwnership` | `modules/auth/server/permission.ts` | 对象级权限（IDOR）|
| `withTransaction` | `shared/db.ts` | 写操作原子性 |
| `rateLimit` | `shared/security/security.ts` | 接口防刷 |
| `sanitizeMarkdown` | `shared/utils/markdown.ts` | XSS 防护 |
| `requireModuleAdmin` | `modules/admin/server/require.ts` | 细粒度模块级守卫 |

---

## 七、风险登记表

| 编号 | 风险 | 等级 | 状态 | 缓解 |
|------|------|------|------|------|
| R1 | SQLite 写瓶颈（> 500 用户） | 高 | 接受（当前 < 200） | WAL + 批量；> 500 用户评估 PG（见 [Part B](#part-b-postgresql-迁移)） |
| R2 | 单实例无灾备 | 高 | 接受（EX-1） | Litestream 备份 + 手动恢复；多区域见 L3 |
| R3 | 密钥泄露 | 中 | 已缓解（ADR-017） | 生产密钥缺失即退出 |
| R4 | CSP 配置不当 | 中 | 已缓解（ADR-015） | 生产去 unsafe-eval |
| R5 | 依赖漏洞 | 中 | 已缓解（ADR-017） | CI 阻断 high+ |
| R6 | 事件监听器漏注册 | 中 | 已缓解（ADR-013） | 显式初始化 + 幂等 |
| R7 | 2FA 绕过 | 高 | 已缓解（ADR-015） | 预认证 token 防重放 + OAuth 强制 2FA |
| R8 | 细粒度角色越权 | 中 | 已缓解（ADR-015） | 模块级 enforce |
| R9 | Markdown XSS | 中 | 已缓解（ADR-007） | rehype-sanitize |
| R10 | 速率限制单进程 | 中 | 接受（单实例） | 多实例前迁 Redis（ADR-012） |
| R11 | 登录爆破 | 中 | 已缓解 | 登录限流 + 失败历史 |
| R12 | 会话固定 | 低 | 已缓解 | `__Host-` Cookie + 重登录换 ID |
| R13 | 数据库锁定 | 中 | 已缓解（[Devdocs-Ops.md](Devdocs-Ops.md) Part C 场景 1） | checkpoint 脚本 |
| R14 | 备份中断 | 中 | 监测中 | Litestream + restore drill |
| R15 | 证书过期 | 低 | 已缓解 | Caddy 自动续期 |
| R16 | 磁盘满 | 中 | 已缓解 | health 检查 disk |
| R17 | 审计日志丢失 | 低 | 接受 | SQLite 存储 |
| R18 | SLO 外部探针未接入 | 中 | 接受（降级） | 应用层统计；接入后消除 |
| R19 | 多语言迁移复杂度 | 高 | 待评估 | 见 [Part C](#part-c-多语言微服务迁移) |
| R20 | 单实例扩展上限 | 高 | 接受（< 200 用户） | PG + 微服务（[Part B](#part-b-postgresql-迁移)/[Part C](#part-c-多语言微服务迁移)） |

---

## 八、边界上下文（Bounded Context）

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
                                 │   SQLite    │ (→ PostgreSQL, see Part B；仅 audit 经 Repository 抽象)
                                 └─────────────┘
```

---

## 九、依赖与责任矩阵

| 依赖方向 | 依赖方 | 被依赖方 | 责任 |
|---------|--------|---------|------|
| 通知 | community/events/tools | notification | 发布 `*.created` 事件 |
| 权限 | 所有模块 | auth | 调用 `requirePermission` |
| 数据 | 所有 server | db（`getDb()` / `DbEngine`） | 当前仅 `audit` 经 Repository 抽象；其余直连 `getDb()`（见 ADR-009） |
| 审核 | resource/blog/task | shared/workflow | 状态机复用 |
| 配置 | 所有 | shared/config | 读取 env 常量 |

---

## 十、交互风格约定

- **页面导航**：Next.js Link / `useRouter`
- **API 调用**：前端 `fetch` + 统一错误拦截（`src/lib/api-client.ts`）
- **事件通知**：`appBus.emit/on`（进程内）
- **跨服务（未来）**：REST + JSON（见 [Part C](#part-c-多语言微服务迁移) 通信契约）

---

## 十一、数据流图

```
用户请求
  → proxy.ts（安全头/限流/requestId）
  → Next.js Route Handler
  → requireAuth/requirePermission
  → Service（业务规则）
  → DbEngine / getDb()（仅 audit 经 Repository，ADR-009）
  → SQLite（WAL）
  → 响应（结构化日志 + requestId）
事件分支：
  Service → appBus.emit → Notification listener → DB
```

---

## 十二、里程碑

| 里程碑 | 时间 | 交付 |
|--------|------|------|
| M0 架构奠基 | 2026-06 | Next.js + SQLite + 模块化 |
| M1 核心功能 | 2026-06 | 论坛/博客/考试/活动 |
| M6 安全升级 | 2026-07 | 密码策略 + RBAC 细化 |
| M8 测试覆盖 | 2026-07 | 308 单元测试 |
| M9 E2E 断言 | 2026-07 | 25 Playwright 测试 |
| M10 Repository 抽象 | 2026-07 | ADR-009（落地 [Part B](#part-b-postgresql-迁移) 基础） |
| 0.9.1 预发布 | 2026-07 | SLO + Runbook + 安全加固（ADR-015~019） |
| 1.0 候选 | 待定 | PG 双引擎（[Part B](#part-b-postgresql-迁移) Phase 2-5） |
| 2.0 微服务 | 待定 | Python/Java 拆分（[Part C](#part-c-多语言微服务迁移)） |

<!-- PART_A_END -->

---

# Part B: PostgreSQL 迁移

> 最后更新：2026-07-31（Phase 0 + Phase 1 完成；dialect 切换、db 单例、迁移系统改造均落地；**Repository 工厂未落地，仅 audit 模块经 DbEngine 抽象**，详见 ADR-009；CI 集成 pending）
> 验证 cadence：每个 Phase 完成时 | Stale 信号：Phase 清单与代码目录不一致 / 待办项状态未更新
> 关联：[Part A](#part-a-迭代路线图) ADR-002/005/009（数据库演进决策）；[Part C](#part-c-多语言微服务迁移) 共享 PG 通信契约；[Devdocs-Sec.md](Devdocs-Sec.md) 密钥管理

---

## 一、迁移概述

将数据库从 `better-sqlite3`（SQLite）迁移到 `postgres`（PostgreSQL），通过 **Drizzle ORM** 实现双引擎可切换。核心目标：

1. **解除 SQLite 写瓶颈**（详见 [Part A](#part-a-迭代路线图) R1/R20）
2. **支持并发写入**（PostgreSQL 原生支持）
3. **为 [Part C](#part-c-多语言微服务迁移) 多语言微服务做准备**（共享 PG 实例）

> 设计原则：**平滑过渡、可逆、不中断服务**。通过环境变量 `DATABASE_DIALECT` 控制实际使用的数据库，开发期仍可回退 SQLite。

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

## 三、迁移阶段（Phase）

### Phase 0：环境准备 ✅（已完成 2026-07-31）

> 本节所有条目已迁移至文末 [附录：已完成条目归档](#附录已完成条目归档)。

### Phase 1：数据库抽象层 ✅（已完成 2026-07-31）

> 本节所有条目已迁移至文末 [附录：已完成条目归档](#附录已完成条目归档)。

### Phase 2：数据模型同步 ⬜（待办）

| 项 | 状态 | 说明 |
|----|------|------|
| 梳理所有 Drizzle schema，移除 SQLite 专属类型 | ⬜ | 如 `integer('x').default(0)` 在 PG 需确认 |
| 处理自增主键差异（SQLite `integer` vs PG `serial`/`identity`） | ⬜ | 用 Drizzle `$defaultFn` 兼容 |
| 处理日期类型（SQLite `text` ISO vs PG `timestamp`） | ⬜ | 统一用 ISO 字符串存储 |
| 处理 JSON 字段（SQLite 存 text vs PG `jsonb`） | ⬜ | 用 Drizzle `jsonb` + 序列化兼容 |
| 唯一约束 / 索引差异校验 | ⬜ | 自动迁移生成后人工 review |

### Phase 3：查询层适配 ⬜（待办）

| 项 | 状态 | 说明 |
|----|------|------|
| 全量扫描 `src/**/*.ts` 中的 raw SQL（`db.prepare(...)`） | ⬜ | 改为 Repository 方法或 Drizzle query builder |
| 替换 SQLite 函数（`datetime()`、`strftime()`）为 PG 等价 | ⬜ | 用 Drizzle `sql` 模板或 JS 计算 |
| 事务 API 差异（`better-sqlite3` 同步 vs Drizzle 异步） | ⬜ | 服务层改为 `async/await`（影响面大，需评估） |
| 批量插入差异（SQLite `insert many` vs PG `insert().values([...])`） | ⬜ | Drizzle 统一 API |

### Phase 4：Repository 实现切换 ⬜（待办，落地 ADR-009）

| 项 | 状态 | 说明 |
|----|------|------|
| 实现 `PostgresRepository` 全套（对应 SQLite 版） | ⬜ | 复用 ADR-009 `DbEngine` 接口（当前仅 `audit.repo` 落地，需先补 `getRepositories()` 工厂） |
| 双 Repository 共存，按 dialect 返回 | ⬜ | `getRepositories()` 分支（待工厂实现后）|
| 单元测试双 dialect 覆盖 | ⬜ | vitest 注入 `DATABASE_DIALECT=mock-pg` 或用 `pg-mem` |
| 集成测试 PG 真实连接 | ⬜ | CI 起 PG 容器 |

### Phase 5：生产切换与回滚 ⬜（待办）

| 项 | 状态 | 说明 |
|----|------|------|
| 数据迁移脚本（SQLite → PG 全量导出导入） | ⬜ | `tools/scripts/migrate-sqlite-to-pg.ts` |
| 双写验证期（同时写 SQLite + PG，比对一致性） | ⬜ | 灰度期 |
| 切换 `DATABASE_DIALECT=postgres`（停机窗口） | ⬜ | 见 [Devdocs-Ops.md](Devdocs-Ops.md) 回滚流程 |
| 回滚预案（PG 故障切回 SQLite） | ⬜ | 保留 SQLite 实例 + 增量同步 |

---

## 四、待办清单（TODO）

- [ ] Phase 2：移除所有 SQLite 专属类型（自增/日期/JSON）
- [ ] Phase 3：替换全部 raw SQL 为 Drizzle query builder
- [ ] Phase 3：事务 API 异步化（服务层 `async/await`）
- [ ] Phase 4：`PostgresRepository` 实现 + 双 dialect 单测
- [ ] Phase 5：SQLite → PG 数据迁移脚本
- [ ] Phase 5：双写验证期 + 回滚预案
- [ ] CI 集成：PG 容器跑集成测试（当前仅 SQLite 单测）

---

## 五、风险与缓解

| 风险 | 等级 | 缓解 |
|------|------|------|
| 事务异步化波及服务层（大量 `async` 改造） | 高 | 分阶段，先 Repository 内部异步，服务层逐步适配 |
| 数据迁移丢失/不一致 | 高 | 双写验证期 + 校验和比对 |
| PG 连接池耗尽 | 中 | `postgres` 连接池配置 + 监控 |
| Drizzle schema 双 dialect 漂移 | 中 | CI 校验 `drizzle-kit check` 双 dialect |
| 回滚困难（PG 专属类型无法回 SQLite） | 中 | 保留 SQLite 实例 + 增量同步 |

---

## 六、关键文件索引

| 文件 | 职责 |
|------|------|
| `src/shared/db/db.ts` | db 单例，按 dialect 初始化 |
| `src/shared/db/drizzle.ts` | 双 dialect Drizzle 实例 |
| `src/shared/db/repositories/audit.repo.ts` | 首个 DbEngine 抽象 Repository 模板（ADR-009；`getRepositories()` 工厂尚未实现）|
| `src/shared/db/migrations.ts` | 双 dialect 迁移执行 |
| `drizzle.config.ts` | Drizzle 配置（dialect 切换）|
| `src/shared/db/drizzle/` | 各模块 Drizzle/PG schema 定义（getXxxSchema 工厂） |
| `src/shared/db/sqlite/` | 各模块 SQLite 建表脚本（initXxxSchema） |

---

## 七、与 Part C 的关系

完成 Part B 后，PostgreSQL 作为共享数据库，[Part C](#part-c-多语言微服务迁移) 的 Python/Java 服务通过同一 PG 实例访问数据，经 Repository 抽象层（ADR-009）屏蔽方言差异。事件总线跨语言部分见 Part C 通信契约。

<!-- PART_B_END -->

---

# Part C: 多语言微服务迁移

> 最后更新：2026-07-29
> Source of truth：多语言微服务迁移的权威指南（本文件）
> 关联：数据库演进见 [Part B](#part-b-postgresql-迁移)；架构决策见 [Part A](#part-a-迭代路线图) ADR-002/005/009/014；SLO/Runbook 见 [Devdocs-Ops.md](Devdocs-Ops.md)

---

## 一、核心原则（三问决策法）

任何"是否需要多语言/微服务"的争议，用以下三问顺序裁决：

1. **第一问（性能峰值）**：当前接口 P95 延迟是否触顶？CPU/内存是否持续高位？→ 否，则不迁移（单体足够）
2. **第二问（数据规模）**：数据量是否达到 DB 单机上限？写 QPS 是否触顶？→ 否，则不迁移（无需拆库）
3. **第三问（开发效率）**：是否有功能用某语言实现显著更快/更稳/更安全？→ 否，则不迁移（无语言收益）

**只有三问全为"是"才启动拆分**。当前状态（< 200 用户，单实例）三问皆否，维持单体。

---

## 二、需要迁移到 Python 的组件

> 评估依据：Python 在数值计算、AI/ML、数据处理上的生态优势。

| 组件 | 现状（TS） | Python 优势 | 优先级 |
|------|-----------|------------|--------|
| Auxilio 学习成长 Agent | 规则引擎（TS） | pandas/numpy/scikit-learn 做薄弱点聚类、推荐排序 | 高（P1） |
| 考试题库难度分析 | 手动标注 | 用 Python 做题目区分度/难度 IRT 模型 | 中（P2） |
| 学习数据批量处理 | 脚本 | pandas 批处理成绩/活动参与 | 中（P2） |
| 资源标签自动分类 | 人工 | NLP（jieba/transformers）自动打标 | 低（P3） |

---

## 三、需要迁移到 Java 的组件

> 评估依据：Java 在强类型、JVM 生态、高并发服务上的成熟度。

| 组件 | 现状（TS） | Java 优势 | 优先级 |
|------|-----------|----------|--------|
| 高并发签到服务 | Next.js API | Java + Spring Boot 横向扩展，支撑大型活动签到峰值 | 中（P2） |
| 支付/积分结算（未来） | 无 | Java 事务一致性 + 审计成熟 | 低（P3，依赖 L1/L9） |
| 定时任务调度（未来） | 无 | Java Quartz/Spring Scheduler 分布式调度 | 低（P3，依赖 L9） |

---

## 四、不建议迁移的组件（维持 TS 单体）

| 组件 | 理由 |
|------|------|
| 论坛/博客/活动/用户/通知 | 标准 CRUD，TS 足够，无语言收益 |
| 认证/权限 | 安全关键，已在 TS 单体收敛（ADR-015），迁移风险高 |
| 管理后台 | 低频管理操作，无性能压力 |

---

## 五、目标架构（拆分后）

```
                    ┌─────────────────────────────┐
                    │   Next.js (TS) Monolith      │
                    │  论坛/博客/活动/用户/通知/管理 │
                    │  + API Gateway (BFF)          │
                    └──────────┬──────────────────┘
              REST/JSON + MQ   │
        ┌──────────────────────┼───────────────────────┐
        │                      │                        │
┌───────┴──────┐      ┌────────┴────────┐      ┌────────┴────────┐
│ Python 服务   │      │  Java 服务        │      │  Shared         │
│ Auxilio/分析  │      │  签到/结算/调度    │      │  PostgreSQL     │
│ (FastAPI)     │      │  (Spring Boot)    │      │  (Part B)       │
└───────────────┘      └─────────────────┘      └─────────────────┘
        │                      │                        │
        └────────── MQ (事件总线跨语言) ────────────────┘
```

---

## 六、通信契约

| 场景 | 方式 | 说明 |
|------|------|------|
| 服务间同步调用 | REST + JSON | BFF 聚合，统一错误码（见 [Devdocs-Arch.md](Devdocs-Arch.md) Part B 十四章） |
| 异步事件 | 消息队列（RabbitMQ/Kafka） | 替代进程内 `appBus`（ADR-014 评估项），事件名/载荷对齐 `AppEventMap` |
| 数据共享 | 共享 PostgreSQL（Part B） | 各服务经 Repository（ADR-009）访问，不直连对方 DB |
| 跨语言会话 | JWT 或共享 Session 存储 | 认证保持 TS 单体，发 JWT 给 Python/Java 校验 |

<!-- PART_C_MID -->

## 七、迁移路线图（分阶段）

| 阶段 | 目标 | 前置条件 |
|------|------|---------|
| 0. 单体巩固 | 完成 [Part A](#part-a-迭代路线图) M10 + [Part B](#part-b-postgresql-迁移) | Repository 抽象 + PG 双引擎 |
| 1. Python 试点 | Auxilio 迁 FastAPI，TS 调用 | PG 就绪 + 通信契约 v1 |
| 2. Java 试点 | 签到服务迁 Spring Boot | PG 就绪 + 高并发验证 |
| 3. 事件总线跨语言 | `appBus` → MQ | ADR-014 评估通过 |
| 4. 全面拆分 | 按二/三章清单迁移 | 阶段 1-3 稳定 |

---

## 八、迁移 SOP（标准操作流程）

```
1. 三问决策法确认需迁移（Part C 一）
2. 在 Part B 完成后，目标服务连共享 PG
3. 用 Repository（ADR-009）访问数据，不直接写 SQL
4. 新服务暴露 REST/JSON，BFF 聚合
5. 事件改用 MQ（替代 appBus，ADR-014）对齐 AppEventMap 事件名/载荷
6. 灰度发布：新服务与 TS 单体双跑，流量比对
7. 切流完成，下线 TS 侧对应逻辑
8. 更新本文档依赖矩阵与风险登记（R19）
```

---

## 九、风险与回退

| 风险 | 等级 | 回退策略 |
|------|------|---------|
| 跨语言事务一致性 | 高 | 共享 PG + saga/补偿事务；回退到 TS 单体 |
| 事件丢失（MQ 故障） | 中 | MQ 持久化 + 死信队列；回退进程内 appBus |
| 网络延迟（服务间调用） | 中 | BFF 聚合 + 缓存；回退单体内部调用 |
| 运维复杂度陡增 | 高 | 容器编排（K8s）+ 监控（[Devdocs-Ops.md](Devdocs-Ops.md) Part B）；回退单体 |

---

# 附录：已完成条目归档

> 归档来源：本文档各章节中状态为「已完成 / ✅」的条目，统一迁移至此便于历史追溯，正文保留章节锚点以维持结构稳定。
> 归档时间：2026-08-01
> 说明：以下条目均为已交付内容，不再纳入规划排期；若后续发生回退/重构，请在对应 Part 正文章节更新并在此处标注。

---

## 一、迭代路线图 · 已完成功能（Part A 一）

### 功能

- [x] 论坛系统（版块 -> 主题 -> 回复 -> 楼中楼、Markdown 编辑、点赞/收藏、@提及、搜索）
- [x] 博客/技术文章系统（Markdown 发布、系列管理、目录导航）
- [x] 内网考试系统（选择题 + 自动判分 + 排名、管理员组卷）
- [x] 学习资源站（分类浏览、提交审核、文件上传）
- [x] 协会任务发布页（任务领取、审核、积分联动）
- [x] Auxilio 学习成长 Agent（规则引擎，考试数据 -> 薄弱标签 -> 资源推荐）
- [x] 活动系统（CRUD、报名表单定制、签到码核销、自动归档、分类标签）
- [x] 用户公开主页 + 技术档案（技术方向标签、活动参与记录、论坛/博客统计）
- [x] 成员名录/技术墙（按技术方向筛选）
- [x] 入社申请线上化（提交 -> 审批 -> 自动开通账号）
- [x] 全站公告/置顶（横幅展示、有效期、角色定向）
- [x] 站内通知系统（事件驱动、已读/未读管理）

### 安全

- [x] SQL 注入全面审计（100% prepared statement）
- [x] 统一输入验证框架（zod）
- [x] Markdown 渲染白名单净化（rehype-sanitize）
- [x] 对象级权限（IDOR 防护）
- [x] 登录历史与异常告警
- [x] 会话管理增强（设备列表、远程登出）
- [x] 高危操作二次确认
- [x] 安全审计日志增强
- [x] 依赖漏洞扫描命令可用（`pnpm audit` 可执行，CI 集成见 Q4 里程碑）
- [x] 细粒度 RBAC 权限模型（content_moderator / exam_admin / task_publisher）
- [x] 速率限制精细化（考试提交 / 资源上传 / 论坛操作）
- [x] TOTP 双因素认证（管理员强制）
- [x] 全站安全响应头（CSP / HSTS / X-Frame-Options / Referrer-Policy / Permissions-Policy）

### 架构与工程质量

- [x] Litestream 流式备份
- [x] 数据库迁移工具（自定义 migration 系统）
- [x] 模块化架构（9 个模块，server/types/ui 三层自洽）
- [x] 社区模块扁平合并（forum + blog + members -> community）
- [x] E2E 测试覆盖（Playwright 页面加载级）
- [x] API 集成测试（安全/权限/积分核心链路）
- [x] Git hooks + CI 流水线
- [x] 用户等级/积分系统（联动任务 + 考试 + 活动）
- [x] 共享审核工作流提取
- [x] 组件扁平化（`components/ui/` -> `components/`）
- [x] 组件子目录拆分（primitives/layout/effects/feedback）
- [x] shared 子目录 barrel 统一导出（types/security/events/config/hooks/utils/db）
- [x] 业务模块单元测试全覆盖（M8：events 45 + exam 58 + resource 48 + task 63 + join 38 + announcement 56 = 308 测试）
- [x] E2E 业务流程断言（M9：25 个 Playwright 测试 + globalSetup 自动建号登录 + storageState 复用）
- [x] 密码策略升级（M6：PASSWORD_MIN_LENGTH 6->8 + 复杂度校验 + 弱密码黑名单 + password_history 表 v5 迁移 + 历史密码复用检测 + 15 个单元测试）

---

## 二、迭代路线图 · P0 收敛记录（Part A 二）

### 代码质量

| # | 方向 | 说明 | 验收标准 |
|---|------|------|---------|
| Q1 | 拆分 TopicDetail 页面组件 ✅ | `app/community/forum/[category]/[topicId]/page.tsx` 过长 | ✅ 主组件 191 行 < 200；拆出 `TopicHero`/`TopicContent`/`TopicReplySection` + `useTopicActions`/`useReplyActions`/`useTopicDetail` |
| Q2 | 统一错误处理模式 ✅ | community/events/user/admin/auth/join/tools 模块统一 | ✅ 全站 ~89 处旧模式替换为 `AppError`；路由层 `errorResponse` 按 `ERROR_STATUS_MAP` 映射；补充 3 个缺失错误码 |
| Q3 | 提取 `EASE` 常量 ✅ | 19 个页面/组件 className 硬编码 cubic-bezier | ✅ 统一 `.hero-reveal` / `ease-[var(--ease-ark)]`；`globals.css` 8 处同步；功能代码零硬编码 |

### 可观测性（运维盲区，最高优先）

| # | 方向 | 说明 | 验收标准 |
|---|------|------|---------|
| Q4 | 结构化日志 ✅ | pino 统一日志，每条附 `requestId`；`server.ts` / 19 API 路由 / 服务层 `console.*` 全替换 | ✅ `shared/logger.ts` 封装，dev 用 pino-pretty，生产 NDJSON；`createRequestLogger(req)` 绑定 requestId |
| Q5 | 健康检查端点 ✅ | 无 `/api/health`，容器编排无法探活 | ✅ `/api/health` 返回 DB/磁盘/版本号；Caddy 健康检查接入 |
| Q6 | 请求 ID 注入 ✅ | `server.ts` 生成/复用 `X-Request-Id`，`proxy.ts` 写入响应头 | ✅ 客户端传入 ID 可复用于跨服务追踪 |

### 安全收紧

| # | 方向 | 说明 | 验收标准 |
|---|------|------|---------|
| F1 | 统一使用 CollapsingHero ✅ | 17 个页面逐步替换 | ✅ 19 个页面统一使用 `CollapsingHero`；首页（莫比乌斯环特殊布局）与 `/login`（居中卡片式）经评估不适用 |
| F2 | 生产 CSP 收紧 ✅ | `script-src` 含 `unsafe-inline`/`unsafe-eval` | ✅ `proxy.ts` 每请求生成 base64 nonce，`script-src` 改为 `'nonce-<random>'`，移除 `'unsafe-inline'`；`layout.tsx` 注入 nonce 到内联脚本 |
| F3 | proxy.ts 统一入口 ✅ | 安全头/限流/请求 ID 缺统一入口 | ✅ `proxy.ts` 统一安全头，`next.config` 仅兜底 `_next/static`；图片路由移除冗余头 |

---

## 三、迭代路线图 · P1 已完成项（Part A 三）

| # | 方向 | 说明 | 风险/约束 |
|---|------|------|----------|
| M3 ✅ | 活动日历视图（2026-07-31 完成） | 月历/周日历展示活动 | 纯前端，无后端风险；详见 ADR-016 |
| M11 ✅ | 客户端/服务端边界澄清（2026-07-31 完成） | `shared/` 混 server-only 与同构；hooks 在 shared 下 | 详见 ADR-010 |

---

## 四、PostgreSQL 迁移 · 已完成 Phase（Part B 三）

### Phase 0：环境准备 ✅（已完成 2026-07-31）

| 项 | 状态 | 说明 |
|----|------|------|
| 安装 `drizzle-orm` + `postgres` | ✅ | `pnpm add drizzle-orm postgres` |
| 配置 `DATABASE_DIALECT` 环境变量 | ✅ | 默认 `sqlite`，可选 `postgres` |
| 双 dialect Drizzle 实例 | ✅ | `src/shared/db/drizzle.ts` 按 dialect 返回不同实例 |
| 连接工厂 `createDb()` | ✅ | 根据 dialect 返回 SQLite 或 PostgreSQL 连接 |

### Phase 1：数据库抽象层 ✅（已完成 2026-07-31）

| 项 | 状态 | 说明 |
|----|------|------|
| db 单例（`db.ts`）按 dialect 返回 | ✅ | `src/shared/db/db.ts` 启动时初始化，根据 `DATABASE_DIALECT` 选择连接 |
| Repository 工厂（`getRepositories()`） | ⬜ | **未落地**：`repository.ts` 不存在，仅 `repositories/audit.repo.ts` 经 `DbEngine` 抽象实现；其余模块仍直连 `getDb()`（详见 ADR-009） |
| 迁移系统改造（双 dialect 迁移） | ✅ | `src/shared/db/migrations.ts` 支持按 dialect 执行对应迁移文件 |
| schema 定义双 dialect 兼容 | ✅ | Drizzle schema 用通用类型，避免 SQLite 专属语法 |

---

