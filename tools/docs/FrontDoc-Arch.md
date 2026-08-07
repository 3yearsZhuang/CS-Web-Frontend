# FZTBUCS-Arch-架构与 API 文档

> **当前进度 / 真实状态（2026-08-07）**：前端 `src/app/api/**` 已为**纯薄转发**（B1 验收闭环，2026-08-06 完成），不再含有业务数据存储；`src/modules/*/server/` 与 `src/shared/db/`（含 `src/shared/db.ts`）已于 2026-08-06 整体删除，2026-08-07 又移除遗留脚本（`create-user`/`seed-exam-data`/`migrate-sqlite-to-pg`）与 `better-sqlite3` 依赖，前端零 SQLite。`src/shared/events/event-bus.ts`（appBus）已无 `emit` 调用，属死代码（站内通知由后端产生）。后端事件总线已于 2026-08-06 支持跨实例（ADR-014 落地，arq/Redis 广播）。本文下述「方案 B 目标态 / 规划中」段落以 `⚠️ 规划中` 标记，与已落地内容区分。

> 文档定位：**前端 BFF 层**的架构与 API 契约权威文档（reference）
> 受众：开发工程师 / 架构评审 / API 接入方 / 新人
> Source of truth：**BFF 层**的项目结构、模块化分析、代码质量、BFF API 端点与转发契约、状态码、事件总线、依赖矩阵
> 关联：**后端架构/RBAC/Alembic/OTel 权威见 [CS-Web-Backend/docs/BackDoc-Arch.md](../../CS-Web-Backend/docs/BackDoc-Arch.md)**；安全与权限设计见 [FrontDoc-Sec.md](FrontDoc-Sec.md)；运维/SLO/Runbook 见 [FrontDoc-Ops.md](FrontDoc-Ops.md)；演进路线 ADR 见 [FrontDoc-Evo.md](FrontDoc-Evo.md)；工程规则见根级 [docs/Onboarding.md](../../../docs/Onboarding.md#附录-a前端工程规则)；全栈编排见根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md)
> 最后更新：2026-08-05（BFF 视角重写，区分 BFF/后端/遗留三层责任）
> 更新人：3yearsZ
> 变更触发：BFF 目录结构调整 / 新增模块 / 依赖矩阵变更 / 新增或修改 BFF API / 后端转发契约变更
> Stale 信号：依赖矩阵与实际 import 不一致 / 端点签名与路由 handler 不一致 / 状态码与代码不符 / 仍把后端职责（业务数据存储/RBAC enforce/Alembic 迁移）写成前端职责

> **范围声明（BFF 视角）**：前端为 BFF（Backend-for-Frontend）薄转发层，基于 Next.js 16 App Router。业务数据、认证、邮件、OAuth、RBAC enforce 均由后端 FastAPI + PostgreSQL 承载。BFF API 路由（`src/app/api/**/route.ts`）统一通过 [`shared/backend-client.ts`](../../src/shared/backend-client.ts) 代理到后端（注入 JWT、401 静默刷新、snake_case→camelCase 翻译）。
> - **BFF 层（本文档覆盖）**：页面路由、UI 组件、API 路由薄转发、Origin/Content-Type 校验、JWT Cookie 托管、UI 层角色兜底
> - **后端层（见后端 `docs/BackDoc-Arch.md`）**：业务数据存储、RBAC enforce、Alembic 迁移、密码哈希、2FA、限流、审计日志
> - **遗留代码层（迁移前单体，运行时不被任何 API 路由引用）**：`src/shared/utils/mail.ts`、`src/shared/events/`（event-bus.ts / event-types.ts）。`src/shared/db.ts`、`src/shared/db/`、`src/modules/*/server/` 已于 2026-08-06/07 删除（含遗留脚本与 `better-sqlite3` 依赖）；其余遗留文件仍存在但运行时不被引用，待清理；其历史结构保留在本文作为审计证据。

## 文档结构

- **[Part A: 项目架构](#part-a-项目架构)**
  - [一、项目结构](#一项目结构) · [二、模块化分析](#二模块化分析) · [三、代码质量](#三代码质量)
- **[Part B: BFF API 接口参考](#part-b-bff-api-接口参考)**
  - 通用约定 · 认证 · 个人资料 · 活动 · 论坛 · 通知 · 管理后台 · 博客 · 工具集 · 成员与入社 · 会话 · 速率限制 · 状态码 · 错误响应 · 事件总线 · 版本化策略 · 健康检查

---

# Part A: 项目架构

## 一、项目结构

### 顶层目录

```
fztbucs-projects/
├── tools/                   # 工具集（docs / tests / scripts / deploy / data）
├── public/                  # 静态资源（头像预设、logo）
├── src/                     # 源代码
│   ├── app/                 # Next.js App Router（页面 + BFF API 路由）
│   ├── components/          # 全局 React 组件（primitives/layout/effects/feedback）
│   ├── modules/             # 业务模块（server/types/ui 三层自洽）
│   ├── shared/              # 全局共享基础设施（含 BFF 客户端 backend-client.ts）
│   └── server.ts            # 自定义 Node.js 服务器入口
├── .env.example
├── next.config.ts  tsconfig.json  eslint.config.mjs
├── vitest.config.ts  playwright.config.ts  postcss.config.mjs
└── package.json
```

> 全栈 monorepo 结构（含 `CS-Web-Backend` / `CS-Web-Frontend` submodule + 根级 compose 编排）见根 [README.md](../../../README.md) 与根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md)。

### 源代码结构（`src/`）

**app/ — 页面路由 + BFF API 路由**

| 路由 | 说明 |
|------|------|
| `/` | 首页（Hero + 粒子莫比乌斯环） |
| `/about` `/events` `/events/[id]` | 关于 / 活动列表 / 活动详情 |
| `/login` `/profile` `/users/[id]` | 登录注册 / 个人资料 / 用户主页 |
| `/admin` `/notifications` | 管理后台 / 消息通知 |
| `/community` `/community/forum` `/community/forum/[category]` `/community/forum/[category]/[topicId]` `/community/forum/new` | 社区聚合 / 论坛首页 / 版块 / 主题详情 / 发帖 |
| `/community/blog/[slug]` | 博客详情（Markdown 渲染） |
| `/tools` `/tools/exam` `/tools/exam/[id]` `/tools/resource` `/tools/task` `/tools/auxilio` | 工具集首页 / 题库 / 考试详情 / 资源库 / 任务板 / Auxilio |
| `/community/members` | 成员名录 |

> BFF API 路由位于 `src/app/api/**/route.ts`，全部为薄转发（见 Part B）。

全局文件：`layout.tsx`、`globals.css`、`robots.ts`、`error.tsx`、`loading.tsx`。

**components/ — 全局组件**（子目录：`primitives` 通用原子 / `layout` 布局 / `effects` 视觉特效 / `feedback` 反馈类；顶层含 `avatar`、`user-menu`、`notification-bell`、`tech-tag-selector`、`theme-provider`、`theme-toggle`）。

**shared/ — 共享基础设施**

```
shared/
├── backend-client.ts     # ★ BFF → FastAPI 后端代理客户端（运行时 API 路由统一入口）
├── app-error.ts          # 应用错误基类 + assertOwnership
├── logger.ts             # pino 结构化日志（Q4，dev pino-pretty / 生产 NDJSON）
├── server-only.ts        # server-only 本地空实现（M11，自定义 dev server 兼容）
├── events/               # ⚠️ 遗留：进程内事件总线 event-bus.ts + event-types.ts（db.ts / db/ 双引擎层已于 2026-08-06/07 删除）
├── config/               # avatar-presets / admin-avatars / header-images / auth-constants
├── hooks/                # 客户端 hooks（全 'use client'，M11）：use-auth / use-collapsing-hero / use-debounce / use-focus-trap / use-topic-detail / use-topic-actions(Q1) / use-reply-actions(Q1)
├── types/                # role-types / user-types / audit-types（M11 下沉斩断依赖）
├── security/             # 已模块化：security.ts / rate-limiter.ts / origin-guard.ts / request-utils.ts / http-helpers.ts / password.ts / permissions.ts / permission-points.ts / builtin-roles.ts / audit.ts / proxy-headers.ts / tenant-context.ts（PG Phase 1）/ schemas/（zod 按模块）/ index.ts
└── utils/                # utils / pagination / image-utils / tech-tags / ui-constants / mail(⚠️遗留) / mask / monitoring（基于 pino，可选 Sentry）
```

> ★ = BFF 运行时核心 · ⚠️ = 迁移前单体遗留代码，运行时不被任何 API 路由引用，待清理

**modules/ — 业务模块（9 个，UI + types；`server/` 遗留直连层已于 2026-08-06 B1 收口删除）**

> 迁移前单体遗留的 `server/` 子目录（直连 SQLite 的业务逻辑）已随 B1 收口整体删除；业务逻辑 100% 由后端承载，运行时 API 路由通过 `shared/backend-client.ts` 转发后端。

| 模块 | 说明 | 后端数据表（BFF 不直连） |
|------|------|------|
| `admin/` | 用户/角色/审计/权限/密码重置（UI + BFF 兜底） | users, sessions, admin_actions（后端 PG） |
| `auth/` | 登录/注册/2FA/OAuth/密码重置（BFF 转发） | users, sessions, login_history, verification_codes, password_reset_requests（后端 PG） |
| `community/` | 论坛+博客+成员名录+Feed（BFF 转发 + UI） | forum_categories, forum_topics, forum_replies, forum_likes, forum_favorites, forum_topic_views, forum_mentions, forum_images, blog_posts, blog_series, blog_likes（后端 PG） |
| `events/` | 活动 CRUD/报名/签到/归档（BFF 转发 + UI） | events, event_registrations, event_checkins（后端 PG） |
| `join/` | 入社申请（BFF 转发） | join_applications（后端 PG） |
| `notification/` | 通知（BFF 转发 + 遗留事件总线） | notifications（后端 PG） |
| `announcement/` | 公告（BFF 转发） | announcements（后端 PG） |
| `tools/` | 考试/资源/任务/组件注册表/Auxilio（BFF 转发 + UI） | exams, exam_questions, exam_question_options, exam_attempts, tasks, task_claims, resources, points_transactions（后端 PG） |
| `user/` | 用户资料（BFF 转发） | users, activity_participations（后端 PG） |

> community 是 forum/blog/members 扁平合并产物（详见 [§2.2](#22-community-模块内部结构)）。

**BFF API 前缀映射**

| 业务域 | BFF API 前缀 | 后端转发目标 |
|--------|---------|---------|
| 认证 | `/api/auth/*`、`/api/auth/2fa/*`、`/api/auth/oauth/*` | `/api/v1/auth/*` |
| 个人资料 | `/api/profile/*`、`/api/avatars/*` | `/api/v1/profile/*` |
| 活动 | `/api/events/*` | `/api/v1/events/*` |
| 社区 | `/api/community/{forum,blog,members,feed,tags}/*` | `/api/v1/community/*` |
| 通知 | `/api/notifications/*` | `/api/v1/notifications/*` |
| 管理后台 | `/api/admin/{users,password-resets,events,notifications,actions,community,join,tools,announcements}/*` | `/api/v1/admin/*` |
| 工具集 | `/api/tools/{exam,resource,task,points,auxilio,component-registry}/*` | `/api/v1/tools/*` |
| 入社 / 会话 / 开发文档 / 健康检查 | `/api/join`、`/api/sessions`、`/api/dev-docs/*`、`/api/health` | `/api/v1/join`、`/api/v1/sessions`、(dev-docs 为前端本地)、`/api/v1/health` |

> `dev-docs` 路由为前端本地实现（读写 `tools/docs/` 下 .md 文件），不转发后端。

**server.ts** — 自定义 Node.js 入口（`tsx watch` 开发 / tsup 打包生产）。

### 测试（`tools/tests/`）

单元测试 437+，E2E 25+（2026-07-31）。按模块分组：

| 文件 | 框架 | 说明 |
|------|------|------|
| `announcement.test.ts` | Vitest | 公告（56） |
| `events.test.ts` | Vitest | 活动（51） |
| `exam.test.ts` | Vitest | 考试（58） |
| `join.test.ts` | Vitest | 入社（38） |
| `resource.test.ts` | Vitest | 资源（48） |
| `task.test.ts` | Vitest | 任务（63） |
| `backend-client.test.ts` | Vitest | BFF 转发客户端（迁移后新增） |
| `blog-points.test.ts` `mask.test.ts` `password-policy.test.ts` `permissions-hunt.test.ts` `proxy-headers.test.ts` `security.test.ts` `totp.test.ts` `audit-repo.test.ts` `tenant-context.test.ts` `error-rate-monitor.test.ts` | Vitest | 各模块单测（部分为遗留代码测试） |
| `e2e/{auth,core-flows,events,exam,forum}.spec.ts` `e2e/global-setup.ts` | Playwright | 认证/核心流程/活动/考试/论坛 E2E |

### 脚本与部署

`tools/scripts/`：`build-app.mjs`、`dev-server.mjs`(端口 2333)、`start-server.mjs`、`install-deps.sh`、`cloudflare-tunnel.mjs`、`restart-frontend.mjs`。

> ⚠️ 已删除：`setup-litestream.sh`、`restore-drill.sh`（BFF 无本地业务数据库，备份/恢复由后端 PG 负责，见 [FrontDoc-Ops.md](FrontDoc-Ops.md)）；`create-user.mjs`、`seed-exam-data.mjs`、`migrate-sqlite-to-pg.mjs`（SQLite 迁移已 100% 完成，遗留脚本已清理；创建管理员走后端 rbac_init seed / 管理 API）。

部署：全栈编排（db + backend + frontend + caddy）见根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md)；前端独立部署见 [FrontDoc-Ops.md](FrontDoc-Ops.md) Part A。容器编排见 `tools/deploy/docker-compose.yml`（应用 + Caddy，BFF 通过 `cs-net` 内网转发到后端）。

`tools/data/`：运行时数据占位目录（上传文件实际落于仓库根 `data/`）。

### 数据库与部署模型

> **BFF 无本地业务数据库**。业务数据由后端 PostgreSQL 承载（见后端 `docs/BackDoc-Infra.md` §二）。下方"单进程依赖"表仅描述 BFF 自身进程级状态。

DB 文件 `data/app.db`（gitignored）为**迁移前遗留**（旧 SQLite 单体库，2026-08-05 迁移完成后已无任何引用，可安全删除）。用户头像/论坛图片存 `data/avatars/`、`data/forum-images/`（上传文件由后端处理，BFF 薄转发 FormData）。

> 重要约束：当前为**单进程部署模型**，多个机制依赖此前提。

| 组件 | 位置 | 单进程依赖 | 责任层 |
|------|------|:---:|:---:|
| BFF 速率限制 `RateLimiter` | [src/shared/security/rate-limiter.ts](../../src/shared/security/rate-limiter.ts) | ✅ 内存 Map | **[BFF]**（仅 BFF 自身用） |
| JWT Cookie 托管 | [src/shared/backend-client.ts](../../src/shared/backend-client.ts) | ❌ 无状态 | **[BFF]** |
| 2FA 预认证 token（`consumed jti` 集合） | [src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts) | ✅ 进程内 Set | **[遗留]**（运行时由后端处理） |
| 事件总线 `appBus` | [src/shared/events/event-bus.ts](../../src/shared/events/event-bus.ts) | ✅ Node.js EventEmitter | **[遗留]**（业务通知由后端承载） |

多实例迁移清单（完成前禁止横向扩展）：

> ℹ️ 多实例迁移清单（BFF 速率限制迁 Redis、后端 RBAC/限流多实例一致性）等待办条目已迁移至根目录 `项目待办事项.md`。

---

## 二、模块化分析

### 2.1 模块层级关系

```
BFF 共享层（shared/）- 被所有模块依赖
  ├── backend-client.ts（★ BFF 代理客户端）   security.ts（Origin/CSRF）   logger.ts
  ├── events/event-bus.ts（⚠️ 遗留，运行时不引用；db.ts / db/ 已于 2026-08-06/07 删除）
        ↓
BFF 业务模块（UI + types，server/ 遗留层已随 B1 删除）
  ├── auth      user      community(论坛+博客+成员+Feed)
  ├── events    tools(考试/任务/资源/Auxilio)   notification   announcement   join
        ↓
跨模块聚合层
  └── admin（聚合所有模块管理操作 BFF 转发 + UI 兜底鉴权；审计日志由后端写）
```

### 2.2 community 模块内部结构

```
community/
├── ui/                  # 论坛/博客/成员/Feed UI 组件（运行时）
├── types/               # ForumTopic/BlogPost/MemberItem/FeedItem 等统一类型
└── index.ts             # 统一 barrel
```

> `server/` 遗留直连层（forum/blog/members/feed.ts）已随 B1 收口删除（2026-08-06）；运行时论坛/博客/成员 API 请求由 `src/app/api/community/**/route.ts` 通过 `backend-client.ts` 转发后端。

### 2.3 直接导入依赖矩阵

> 反映 BFF 运行时实际依赖（★ backend-client 为核心）。`db`（SQLite 双引擎）遗留依赖已于 2026-08-06/07 删除，矩阵不再包含该列。

| 模块 \ 被依赖 | backend-client | admin | notification | community | auth | events | pagination | shared |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `auth/` | ✓ | - | - | - | - | - | - | ✓ |
| `user/` | ✓ | - | - | - | - | - | - | ✓ |
| `community/` | ✓ | ✓ | ✓ | - | - | - | ✓ | ✓ |
| `events/` | ✓ | ✓ | ✓ | - | - | - | ✓ | - |
| `tools/` | ✓ | ✓ | - | - | - | - | - | - |
| `notification/` | ✓ | - | - | - | - | - | ✓ | - |
| `join/` | ✓ | ✓ | - | - | - | - | - | - |
| `announcement/` | ✓ | - | - | - | - | - | - | - |
| `admin/` | ✓ | ✓ | - | - | - | - | ✓ | ✓ |

---

## 三、代码质量

### 3.1 历史问题收敛

> ℹ️ 历史问题收敛记录（Q1/Q2/Q3）已迁移至根目录 `项目演变历史.md`。

### 3.2 已完成优化

> ℹ️ 已完成优化记录已迁移至根目录 `项目演变历史.md`。

### 3.3 待处理优化

> ℹ️ 待处理优化（P1/P2 项）已迁移至根目录 `项目待办事项.md`。剩余项详见 [FrontDoc-Evo.md](FrontDoc-Evo.md)。

---

# Part B: BFF API 接口参考

> 验证 cadence：BFF API 契约变更时 | Stale 信号：端点清单与实际路由不一致
> **范围说明**：本部分描述 **BFF 路由层**的端点与转发契约。所有端点（除 `/api/dev-docs` 与 `/api/health` 外）均通过 `shared/backend-client.ts` 转发到后端 FastAPI。后端真实业务逻辑、数据校验、RBAC enforce 见后端 `docs/BackDoc-Arch.md`。

## 一、通用约定

**基础 URL**：开发 `http://localhost:2333`；生产 `https://<your-domain>`。

**BFF 转发契约**（[backend-client.ts](../../src/shared/backend-client.ts)）

| 行为 | 说明 |
|------|------|
| JWT 注入 | 从 HttpOnly Cookie 读取 `__Host-fztbu_access`（生产）/ `fztbu_access`（开发），注入 `Authorization: Bearer <token>` |
| 401 静默刷新 | 收到 401 且有 refresh token 时，调用后端 `/auth/refresh` 轮换令牌并重试一次；失败则清除 Cookie |
| 响应翻译 | 后端 snake_case → 前端 camelCase（`toAnnouncement`/`toNotification`/`toEventItem`/`toCommunityPost` 等翻译函数） |
| 错误规范化 | 后端 `{ message, errorCode, statusCode }` → 前端 `{ error, code? }`（`normalizeError`） |
| Cookie 写回 | 登录/刷新成功后 `setAuthCookies` 写入 access/refresh 对；登出/刷新失败 `clearAuthCookies` |
| `skipAuth` | 认证端点（login/register/send-code/oauth）不注入 Authorization |

**鉴权级别**（BFF UI 层兜底，真实 enforce 在后端）

| 级别 | 标识 | 说明 |
|------|------|------|
| 公开 | - | 无需登录 |
| 登录 | 有效 JWT Cookie | BFF 转发时注入 Authorization |
| 管理员 | `requireAdmin` | BFF 读 `/auth/me` roles 兜底；后端 `require_permission` 二次 enforce |
| 超级管理员 | `requireRoot` | BFF 读 `/auth/me` roles 兜底；后端 `require_permission` 二次 enforce |

**请求/响应**：`Content-Type: application/json`；成功响应形状由各端点 `toXxx` 翻译函数决定（通常 `{ data?, total?, page?, pageSize? }`）；错误 `{ error, code?, details? }`。

**BFF 层安全措施**（所有写操作）：Origin 白名单校验 `assertAllowedOrigin`；Content-Type 校验；Zod body 校验。速率限制、RBAC enforce、审计日志由后端统一处理。

## 二、认证模块（/api/auth/）

> BFF 薄转发到后端 `/api/v1/auth/*`。JWT 由后端签发（access 15min / refresh 7day），BFF 以 HttpOnly Cookie 托管。

**2.1 基础认证**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 公开 | 注册（邮箱+密码+验证码） |
| POST | `/api/auth/login` | 公开 | 登录（邮箱+密码） |
| POST | `/api/auth/logout` | 登录 | 登出 |
| GET | `/api/auth/me` | 登录 | 当前用户信息（含 roles 数组） |
| POST | `/api/auth/send-code` | 公开 | 发送邮箱验证码 |
| POST | `/api/auth/forgot-password` | 公开 | 申请密码重置 |
| GET | `/api/auth/oauth/github` | 公开 | GitHub OAuth 入口（302） |
| GET | `/api/auth/oauth/github/callback` | 公开 | OAuth 回调 |

**2.2 双因素认证（TOTP）**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/auth/2fa` | 登录 | 查询 2FA 状态 |
| POST | `/api/auth/2fa/setup` | 登录 | 初始化（secret+QR+backup，未确认不生效） |
| POST | `/api/auth/2fa/verify` | 登录 | 验证码（确认/二次验证） |
| POST | `/api/auth/2fa/disable` | 登录 | 禁用（需验证码） |
| POST | `/api/auth/2fa/backup-codes` | 登录 | 重生成备用码 |

> TOTP 加密、验证、限流、token 签发均由后端实现（见后端 `docs/BackDoc-Sec.md`）。BFF 转发时 `assertAllowedOrigin` + login 模式从 `__Host-oauth_2fa` cookie 读 `twoFactorToken`。

## 三、个人资料模块（/api/profile/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/profile` | 登录 | 完整资料 |
| PUT | `/api/profile` | 登录 | 更新资料 |
| POST | `/api/profile/password` | 登录 | 改密码（需旧密码） |
| POST | `/api/profile/avatar/upload` | 登录 | 上传头像（2MB / JPEG·PNG·WebP） |
| POST | `/api/profile/avatar/preset` | 登录 | 预设头像 |
| GET | `/api/avatars/[filename]` | 公开 | 头像静态服务 |

## 四、活动模块（/api/events/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/events` | 公开 | 活动列表（status/type/page） |
| GET | `/api/events/[id]` | 公开 | 详情 |
| POST | `/api/events/[id]/register` | 登录 | 报名 |
| GET | `/api/events/[id]/registration` | 登录 | 我的报名状态 |
| GET | `/api/events/me/registered` | 登录 | 已报名列表 |

## 五、论坛模块（/api/community/forum/）

**5.1 版块**：`GET /categories`（公开）

**5.2 主题**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/topics` | 公开 | 主题列表（category/search/page/sort） |
| GET | `/topics/[id]` | 公开 | 详情（含点赞/收藏状态） |
| POST | `/topics` | 登录 | 创建 |
| PUT | `/topics/[id]` | 作者/管理员 | 编辑 |
| DELETE | `/topics/[id]` | 作者/管理员 | 软删除 |

**5.3 回复**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/topics/[id]/replies` | 公开 | 主回复分页 |
| POST | `/topics/[id]/replies` | 登录 | 创建（含楼中楼） |
| GET | `/replies/[id]/nested` | 公开 | 楼中楼 |
| PUT | `/replies/[id]` | 作者/管理员 | 编辑 |
| DELETE | `/replies/[id]` | 作者/管理员 | 软删除 |

**5.4 互动**：`POST /like`（登录，target_type+target_id）；`POST /favorite`（登录，topic_id）；`GET /favorites`（登录）

**5.5 用户内容**：`GET /users/[id]/topics`、`GET /users/[id]/replies`（均公开）

**5.6 上传**：`POST /upload`（登录，5MB / JPEG·PNG·WebP·GIF）；`GET /images/[filename]`（公开）

## 六、通知模块（/api/notifications/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/notifications` | 登录 | 列表（分页） |
| GET | `/api/notifications/unread-count` | 登录 | 未读数 |
| POST | `/api/notifications/[id]/read` | 登录 | 标记已读 |
| POST | `/api/notifications/read-all` | 登录 | 全部已读 |

## 七、管理后台（/api/admin/）

> BFF 路由层 `requireAdmin`/`requireRoot` 做 UI 兜底；后端 `require_permission(resource, action)` 为权威 enforce。审计日志由后端写入 `admin_actions` 表。

**7.1 用户管理（管理员+超级管理员）**：`GET /users`、`GET /users/[id]`（管理员）；`PUT /users/[id]`（超级管理员）；`POST /users/[id]/disable`、`/enable`、`/reset-password-default`（管理员，仅普通用户）

**7.2 用户管理（仅超级管理员）**：`POST /users/[id]/reset-password`（自定义）、`DELETE /users/[id]`（硬删除）

**7.3 密码重置审批**：`GET /password-resets`、`POST /password-resets/[id]/approve`、`POST /password-resets/[id]/reject`（管理员）

**7.4 活动管理**：`GET/POST /events`、`PUT/DELETE /events/[id]`（管理员）

**7.5 通知管理**：`GET /notifications`、`POST /notifications`（管理员，全站群发）

**7.6 审计日志（仅超级管理员）**：`GET /actions`、`DELETE /actions/[id]`

**7.7 论坛管理**

> 编辑/删除任意主题与回复复用 §5.2/§5.3 端点（`PUT`/`DELETE topics/[id]`、`PUT`/`DELETE replies/[id]`），管理员具备越权权限，此处不再重复列出。

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/community/forum/topics` | 管理员 | 主题列表（管理视图） |
| POST | `/community/forum/topics/[id]/hide` | 管理员 | 隐藏主题 |
| POST | `/community/forum/topics/[id]/restore` | 管理员 | 恢复主题 |
| POST | `/community/forum/topics/[id]/pin` | 管理员 | 置顶 |
| POST | `/community/forum/topics/[id]/feature` | 管理员 | 精华 |
| POST | `/community/forum/replies/[id]/hide` | 管理员 | 隐藏回复 |
| POST | `/community/forum/replies/[id]/restore` | 管理员 | 恢复回复 |
| GET | `/community/forum/categories` | 管理员 | 版块列表（管理视图） |
| POST | `/community/forum/categories` | 管理员 | 创建版块 |
| PUT | `/community/forum/categories/[id]` | 管理员 | 编辑版块 |
| DELETE | `/community/forum/categories/[id]` | 管理员 | 删除版块 |

**7.8 博客管理**：`POST /community/blog`（管理员，publish/archive/delete）

**7.9 入社审批**：`GET /join`、`PATCH /join`（管理员，通过/拒绝）

**7.10 工具集管理**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET/POST | `/tools/exam` | exam_admin | 考试列表/创建 |
| PUT/DELETE | `/tools/exam/[id]` | exam_admin | 编辑/删除 |
| POST | `/tools/exam/[id]/publish` `/end` | exam_admin | 发布/结束 |
| GET/POST/PUT/DELETE | `/tools/exam/[id]/questions[/[qid]]` | exam_admin | 题目管理 |
| GET | `/tools/exam/[id]/ranking` | exam_admin | 排名 |
| POST | `/tools/resource` | 管理员 | 资源审核 |
| POST | `/tools/task` | task_publisher | 任务管理 |

**7.11 活动签到与统计**：`POST /events/[id]/checkin`、`POST /events/[id]/registrations/manage`、`POST /events/batch`、`GET /events/stats`（管理员）

**7.12 公告管理**：`GET /announcements`、`POST /announcements`、`GET/PUT/DELETE /announcements/[id]`（管理员）

## 八、博客模块（/api/community/blog/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/blog` | 公开 | 已发布列表（分类/搜索/分页） |
| POST | `/api/community/blog` | 登录 | 创建草稿 |
| GET | `/api/community/blog/[slug]` | 公开 | 详情（目录/点赞状态） |
| PUT | `/api/community/blog/[slug]` | 作者/管理员 | 编辑 |
| DELETE | `/api/community/blog/[slug]` | 作者/管理员 | 删除 |
| POST | `/api/community/blog/[slug]/like` | 登录 | 点赞 |
| GET | `/api/community/blog/series` | 公开 | 系列列表 |
| POST | `/api/community/blog/series` | 登录 | 创建系列 |

## 九、工具集模块（/api/tools/）

**9.1 考试**：`GET /exam`（公开，标签筛选）、`GET /exam/[id]`（登录）、`POST /exam/[id]/submit`（登录，自动判分）、`GET /exam/[id]/my-results`（登录）

**9.2 资源**：`GET /resource`（公开）、`POST /resource/upload`（登录，审核后公开）

**9.3 任务**：`GET /task`、`GET /task/[id]`（公开）；`POST/DELETE /task/[id]/claim`（登录）；`GET /task/[id]/claims`（公开）；`GET /task/claims`（登录，我的认领）

**9.4 积分**：`GET /points`（登录，个人）、`GET /points/leaderboard`（公开）

**9.5 Auxilio**：`GET /auxilio`（登录，薄弱点画像 + 资源推荐）

**9.6 开发文档（/api/dev-docs/）** — 前端本地实现，不转发后端

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/dev-docs` | admin+ | 列出 `tools/docs` 下 .md（slug/标题/大小/修改时间） |
| GET | `/api/dev-docs/[slug]` | admin+ | 读取内容（readOnly 标识） |
| PUT | `/api/dev-docs/[slug]` | root | 写入（1MB 限制，审计） |
| DELETE | `/api/dev-docs/[slug]` | root | 删除（审计） |

安全：路径穿越防护（禁 `/` `..` `\`）+ `assertAllowedOrigin` + `adminActionsLimiter`。

## 十、成员与入社模块

- **10.1 成员名录**：`GET /api/community/members`（公开，按技术方向筛选）
- **10.2 入社申请**：`POST /api/join`（公开，姓名/学号/专业/方向/联系方式）

## 十一、会话管理模块（/api/sessions/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/sessions` | 登录 | 活跃会话（设备/IP/最后活跃） |
| DELETE | `/api/sessions` | 登录 | 远程登出指定会话 |

## 十二、速率限制参考

> **责任划分**：BFF 仍保留单进程内存限流器（`src/shared/security/rate-limiter.ts`），但**业务限流权威在后端**（Redis 实现，见后端 `docs/BackDoc-Sec.md` §三）。下表为 BFF 层遗留限流器配置，运行时多为后端二次限流。

限制器集中于 [src/shared/security/rate-limiter.ts](../../src/shared/security/rate-limiter.ts) 的 `RATE_LIMIT_CONFIG`，环境变量覆盖：`RATE_LIMIT_<NAME>_MAX`（次数）/`RATE_LIMIT_<NAME>_WINDOW_MS`（毫秒），`<NAME>` 为大写限制器名（如 `RATE_LIMIT_LOGIN_MAX=20`）。

| 限制器 | 默认 | 窗口 | key | 主要路由 | 责任层 |
|--------|:---:|:----:|-----|---------|:---:|
| `login` | 10 | 60s | IP+邮箱 | `POST /api/auth/login` | **[BFF]+[后端]** |
| `register` | 5 | 60s | IP | `POST /api/auth/register` | **[BFF]+[后端]** |
| `sendCode` | 3 | 60s | IP+email | `POST /api/auth/send-code` | **[BFF]+[后端]** |
| `forgotPassword` | 3 | 60s | IP | `POST /api/auth/forgot-password` | **[BFF]+[后端]** |
| `twoFactor` | 5 | 60s | IP+用户 | `2fa/verify` `/disable` `/backup-codes` | **[后端]** |
| `twoFactorSetup` | 3 | 60s | IP+用户 | `2fa/setup` | **[后端]** |
| `auth` | 20 | 60s | IP | `/api/auth/oauth/*` | **[BFF]+[后端]** |
| `profileUpdate` | 10 | 60s | IP | `PATCH /api/profile`、密码、`/sessions` | **[后端]** |
| `avatarPreset` | 10 | 60s | IP | `POST /api/profile/avatar/preset` | **[后端]** |
| `avatarUpload` | 5 | 60s | IP | `POST /api/profile/avatar/upload` | **[后端]** |
| `adminActions` | 30 | 60s | IP | `/api/admin/*`、`/api/tools/component-registry/*` | **[后端]** |
| `forumPost` | 5 | 60s | IP | `POST .../forum/topics` | **[后端]** |
| `forumReply` | 10 | 60s | IP | `POST .../forum/.../replies`、`POST .../exam/[id]/submit` | **[后端]** |
| `forumLike` | 30 | 60s | IP | `POST .../forum/like`、`/favorite` | **[后端]** |
| `forumUpload` | 10 | 60s | IP | `POST .../forum/upload`、`POST .../resource/upload` | **[后端]** |
| `eventCheckin` | 10 | 60s | IP | `POST /api/admin/events/[id]/checkin` | **[后端]** |
| `resourceSubmit`/`resourceUpload`/`joinApplication` | — | — | — | 预留，复用 `forumUpload`/`forumReply`/`adminActions` | **[后端]** |
| 读操作 | - | - | - | 无硬限制 | - |

> BFF 单进程内存实现（`Map`）；多实例前须迁 Redis。响应头 `Retry-After` + `X-RateLimit-Remaining` 标识剩余配额。

## 十三、状态码约定

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 302 | 重定向（OAuth） |
| 400 | 请求参数错误 |
| 401 | 未登录 / JWT 过期（BFF 尝试静默刷新，失败则清 Cookie） |
| 403 | 权限不足（BFF UI 兜底或后端 `require_permission` 拒绝）|
| 404 | 资源不存在 |
| 409 | 冲突（重复注册/报名） |
| 413 | 上传文件过大 |
| 429 | 速率限制（BFF 或后端任一层触发） |
| 500 | 服务器内部错误 |
| 502/504 | BFF 转发后端失败（上游不可达/超时） |

## 十四、错误响应扩展

**14.1 标准格式**

```json
{ "error": "string", "code": "string", "details": {} }
```

| 字段 | 必填 | 说明 |
|------|:---:|------|
| `error` | ✅ | 人类可读消息（不泄露内部信息） |
| `code` | ✅ | 机器可读码（见 14.2） |
| `details` | ❌ | 字段级错误（仅 Zod 失败时） |

**14.2 错误码清单**（对应 [FrontDoc-Sec.md](FrontDoc-Sec.md) 发现 15）

| code | HTTP | 触发场景 | 责任层 |
|------|:----:|---------|:---:|
| `INVALID_ORIGIN` | 403 | Origin/Referer 不在白名单 | **[BFF]** |
| `INVALID_CONTENT_TYPE` | 400 | Content-Type 非 json | **[BFF]** |
| `VALIDATION_FAILED` | 400 | Zod 校验失败（含 `details`） | **[BFF]** |
| `UNAUTHORIZED` | 401 | 未登录/JWT 过期 | **[BFF]+[后端]** |
| `FORBIDDEN` | 403 | 权限不足/非作者 | **[后端]** |
| `NOT_FOUND` | 404 | 资源不存在 | **[后端]** |
| `CONFLICT` | 409 | 状态冲突 | **[后端]** |
| `RATE_LIMITED` | 429 | 触发限流（含 `retryAfter`） | **[BFF]+[后端]** |
| `FILE_TOO_LARGE` | 413 | 上传超限 | **[后端]** |
| `INVALID_FILE_TYPE` | 400 | 文件类型不在白名单 | **[后端]** |
| `ACCOUNT_DISABLED` | 403 | 用户已禁用 | **[后端]** |
| `2FA_REQUIRED` | 403 | 需完成 2FA | **[后端]** |
| `2FA_FAILED` | 403 | 2FA 验证码错误 | **[后端]** |
| `PASSWORD_CONFIRMATION_REQUIRED` | 403 | 高危操作需密码二次确认 | **[后端]** |
| `LAST_ADMIN_PROTECTED` | 403 | 降级/删除最后一个管理员 | **[后端]** |
| `INTERNAL_ERROR` | 500 | 未知错误（记日志，返通用消息） | **[BFF]+[后端]** |

**14.3 Zod 校验示例**

```json
{
  "error": "请求参数错误",
  "code": "VALIDATION_FAILED",
  "details": { "email": "请输入有效的邮箱地址", "password": "密码至少 8 位" }
}
```

## 十五、事件总线接口

> ⚠️ **遗留机制**：进程内通信（非 HTTP），迁移后业务通知由后端承载。新增通知场景应直接走 BFF→后端转发，不再新增前端事件监听器。
> 对应根级 [docs/Onboarding.md](../../../docs/Onboarding.md#a3-模块化开发规范) 模块协作规范、[FrontDoc-Evo.md](FrontDoc-Evo.md) ADR-013/014。

**15.1 API**

```typescript
import { appBus } from '@/shared/events';
appBus.emit('event.created', { eventId, title, description, adminId });
appBus.on('reply.created', (data) => { /* try-catch */ });
appBus.off('reply.created', handler);
```

运行时：同步 emit（Node.js EventEmitter）；类型安全（`AppEventMap`）；单例 `appBus`。

**15.2 事件清单**（定义于 [event-types.ts](../../src/shared/events/event-types.ts)）

| 事件 | 发布方 | 订阅方 | Payload |
|------|--------|--------|---------|
| `event.created` | events | notification | `{ eventId, title, description, adminId }` |
| `event.registered` | events | notification | `{ userId, eventId, eventTitle }` |
| `event.cancelled` | events | notification | `{ userId, eventId, eventTitle }` |
| `event.checkin.generated` | admin | notification | `{ eventId, adminId, generated }` |
| `reply.created` | community | notification | `{ replyId, topicId, authorId, contentMarkdown, mentionedUserIds }` |
| `user.registered` | auth | notification | `{ userId }` |
| `task.claim.approved` | tools | notification | `{ userId, taskId, taskTitle, points }` |
| `exam.passed` | tools | notification | `{ userId, examId, examTitle, score, points }` |

**15.3 新增事件流程**：① 在 `AppEventMap` 加类型 ② `emit` 发布 ③ `on` 订阅（handler try-catch）④ 更新本表 ⑤ 更新 §2.3 依赖矩阵。

> ⚠️ 迁移后：新增通知场景应直接走 BFF→后端转发，不再新增前端事件监听器。

**15.4 监听器初始化**（[ADR-013](FrontDoc-Evo.md#adr-013-事件监听器显式初始化)，2026-07-29 实施）

通知监听器迁至 `src/instrumentation.ts` 显式初始化（委托 `instrumentation-node.ts`，server-only，pino logger），不再依赖加载副作用：

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('@/instrumentation-node');
}
```

`initNotificationEvents()` 幂等（`initialized` 标志）；并注册 `unhandledRejection`/`uncaughtException` 全局处理写 pino 日志（ADR-13+15）。

## 十六、版本化与兼容性策略

**16.1 版本策略**：BFF 无版本前缀，向后兼容演进。后端 API 有 `/api/v1` 前缀，版本策略见后端 `docs/BackDoc-Arch.md`。

| 变更 | 策略 |
|------|------|
| 新增端点 / 可选请求字段 / 响应字段 | ✅ 允许（客户端容错未知字段） |
| 修改字段语义 | 🚫 禁止，新增字段替代 |
| 移除字段 | 🚫 先标记 `@deprecated`，下个大版本移除 |
| 改变鉴权 | 须在 [FrontDoc-Sec.md](FrontDoc-Sec.md) 记录并通告 |

**16.2 破坏性变更处理**：① 评估能否新增字段避免（[FrontDoc-Evo.md](FrontDoc-Evo.md) FF2）② 记 ADR ③ 双写过渡（旧字段 `@deprecated`）④ 客户端迁移窗口 ⑤ 移除旧字段。

**16.3 稳定契约字段**：`error`、`code`、`details`（错误）；分页 `items`/`total`/`page`/`pageSize`。其他业务字段可能演进，客户端须容错。

## 十七、健康检查端点

**17.1 BFF 公开** `GET /api/health`（公开）— BFF 转发后端 `/health`

返回 `{"ok": true/false}`（BFF 仅判断后端 `/health` 是否 200，不泄露细节）。

```typescript
// src/app/api/health/route.ts
const res = await fetch(`${BACKEND_URL}/health`, { cache: 'no-store' });
return NextResponse.json({ ok: res.status === 200 });
```

> 对应 [FrontDoc-Evo.md](FrontDoc-Evo.md) Q5（2026-07-29）。后端运维端点（`/readyz` `/metrics/json` `/status`）不在 BFF 暴露，见后端 `docs/BackDoc-Infra.md` §1.2。

**17.2 安全健康检查（规划）**

> ℹ️ 安全健康检查（`/api/health/events`、`/api/health/security`）规划等待办条目已迁移至根目录 `项目待办事项.md`。

---
