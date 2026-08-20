# 前端架构与业务模块（FrontDoc-Arch）

> 更新人：3yearsZ
> 最后更新：2026-08-09（新增 §2.5.7 社区 Markdown 编辑器 UI 组件契约，下沉自 UID §14；其余同 2026-08-08 重构：业务模块契约统一模板、前后端联动映射、2.5/2.8 标题消歧、api-usage-stats 部分就绪标注）
> 关联：后端架构/RBAC/Alembic/OTel 权威见 [BackDoc-01-Arch.md](../../../CS-Web-Backend/tools/docs/BackDoc-01-Arch.md)；安全与权限设计见 [FrontDoc-02-Sec.md](FrontDoc-02-Sec.md)；运维见 FrontDoc-Ops、演进见 RootDoc-ADR、工程规则见 Onboarding 附录 A、全栈编排见 RootDoc-Deploy

> **文档定位**：前端 BFF 层架构与业务模块契约权威文档（reference）。Source of truth：BFF 层的项目结构、模块化分析、代码质量、BFF API 端点与转发契约、**业务模块契约（Part B：认证 / 个人资料 / 活动 / 社区论坛 / 社区文章 / 通知 / 管理后台 / 工具集 / 成员与入社 / 会话管理 / 工作台 / 学习助手）与前后端联动**、状态码、事件总线、依赖矩阵。

> **约定类文档边界**：前端专项约定以本文件（架构/工程）、`FrontDoc-03-Conv.md`（编码规范）与 `FrontDoc-UID.md`（UI 规范）为权威；通用（两端共用）规范见根 `docs/RootDoc-EngConv.md`；`docs/Onboarding.md` 附录 A 为新人聚合摘要（非权威），细则指回权威文件。

> **当前进度 / 真实状态（2026-08-08）**：前端 `src/app/api/**` 为**纯薄转发**（B1 闭环），不含业务数据存储；`src/modules/*/server/`、`src/shared/db/` 与 SQLite 依赖已整体删除，前端零 SQLite。`src/shared/events/event-bus.ts`（appBus）已无 `emit` 调用，属死代码（站内通知由后端产生）；后端事件总线支持跨实例（ADR-014，arq/Redis 广播）。本文「规划中」段落以 `⚠️ 规划中` 标记，与已落地内容区分。

> **范围声明（BFF 视角）**：前端为 BFF（Backend-for-Frontend）薄转发层，基于 Next.js 16 App Router。业务数据、认证、邮件、OAuth、RBAC enforce 均由后端 FastAPI + PostgreSQL 承载。BFF API 路由（`src/app/api/**/route.ts`）统一通过 [`shared/backend-client.ts`](../../src/shared/backend-client.ts) 代理到后端（注入 JWT、401 静默刷新、snake_case→camelCase 翻译）。
> - **BFF 层（本文档覆盖）**：页面路由、UI 组件、API 路由薄转发、Origin/Content-Type 校验、JWT Cookie 托管、UI 层角色兜底
> - **后端层（见后端 `CS-Web-Backend/tools/docs/BackDoc-01-Arch.md`）**：业务数据存储、RBAC enforce、Alembic 迁移、密码哈希、2FA、限流、审计日志
> - **遗留代码层（迁移前单体，运行时不被任何 API 路由引用）**：`src/shared/utils/mail.ts`、`src/shared/events/`（event-bus.ts / event-types.ts）。`src/shared/db.ts`、`src/shared/db/`、`src/modules/*/server/` 已于 2026-08-06/07 删除（含遗留脚本与 `better-sqlite3` 依赖）；其余遗留文件仍存在但运行时不被引用，待清理；其历史结构保留在本文作为审计证据。

---




## 章节速查（导航）

- [1. Part A：项目架构](#1-part-a项目架构)
  - [1.1 项目结构](#11-项目结构)
  - [顶层目录](#顶层目录)
  - [源代码结构（`src/`）](#源代码结构src)
  - [测试（`tools/tests/`）](#测试toolstests)
  - [脚本与部署](#脚本与部署)
  - [数据库与部署模型](#数据库与部署模型)
  - [1.2 模块化分析](#12-模块化分析)
  - [1.2.1 模块层级关系](#121-模块层级关系)
  - [1.2.2 community 模块内部结构](#122-community-模块内部结构)
  - [1.2.3 直接导入依赖矩阵](#123-直接导入依赖矩阵)
  - [1.2.4 工作台模块内部结构](#124-工作台模块内部结构)
  - [1.3 代码质量](#13-代码质量)
  - [1.3.1 历史问题收敛](#131-历史问题收敛)
  - [1.3.2 已完成优化](#132-已完成优化)
  - [1.3.3 待处理优化](#133-待处理优化)
  - [1.4 BFF 通用约定（架构层，内容见 Part B §2.1 / §2.12–2.17）](#14-bff-通用约定架构层内容见-part-b-21-212217)
  - [1.5 关键不变量（BFF 视角，贯穿全项目，勿打破）](#15-关键不变量bff-视角贯穿全项目勿打破)
- [2. Part B · 业务模块契约与 BFF 通用约定](#2-part-b-业务模块契约与-bff-通用约定)
  - [2.1 通用约定](#21-通用约定)
  - [2.2 认证模块（/api/auth/）](#22-认证模块apiauth)
  - [概述](#概述)
  - [配置](#配置)
  - [安全要点](#安全要点)
  - [测试](#测试)
  - [前后端联动](#前后端联动)
  - [2.3 个人资料模块（/api/profile/）](#23-个人资料模块apiprofile)
  - [概述](#概述-1)
  - [配置](#配置-1)
  - [安全要点](#安全要点-1)
  - [测试](#测试-1)
  - [前后端联动](#前后端联动-1)
  - [2.4 活动模块（/api/events/）](#24-活动模块apievents)
  - [概述](#概述-2)
  - [配置](#配置-2)
  - [安全要点](#安全要点-2)
  - [测试](#测试-2)
  - [前后端联动](#前后端联动-2)
  - [2.5 社区论坛模块（/api/community/ — 主题 / 回复 / 互动）](#25-社区论坛模块apicommunity-主题-回复-互动)
  - [概述](#概述-3)
  - [配置](#配置-3)
  - [安全要点](#安全要点-3)
  - [测试](#测试-3)
  - [前后端联动](#前后端联动-3)
  - [2.5.7 社区 Markdown 编辑器（UI 组件）](#257-社区-markdown-编辑器ui-组件)
  - [2.6 通知模块（/api/notifications/）](#26-通知模块apinotifications)
  - [概述](#概述-4)
  - [配置](#配置-4)
  - [安全要点](#安全要点-4)
  - [测试](#测试-4)
  - [前后端联动](#前后端联动-4)
  - [2.7 管理后台（/api/admin/）](#27-管理后台apiadmin)
  - [概述](#概述-5)
  - [配置](#配置-5)
  - [安全要点](#安全要点-5)
  - [测试](#测试-5)
  - [前后端联动](#前后端联动-5)
  - [2.8 社区文章模块（/api/community/community/ — 长文 / 系列）](#28-社区文章模块apicommunitycommunity-长文-系列)
  - [概述](#概述-6)
  - [配置](#配置-6)
  - [安全要点](#安全要点-6)
  - [测试](#测试-6)
  - [前后端联动](#前后端联动-6)
  - [2.9 工具集模块（/api/tools/）](#29-工具集模块apitools)
  - [概述](#概述-7)
  - [配置](#配置-7)
  - [安全要点](#安全要点-7)
  - [测试](#测试-7)
  - [前后端联动](#前后端联动-7)
  - [2.10 成员与入社模块](#210-成员与入社模块)
  - [概述](#概述-8)
  - [配置](#配置-8)
  - [安全要点](#安全要点-8)
  - [测试](#测试-8)
  - [前后端联动](#前后端联动-8)
  - [2.11 会话管理模块（/api/sessions/）](#211-会话管理模块apisessions)
  - [概述](#概述-9)
  - [配置](#配置-9)
  - [安全要点](#安全要点-9)
  - [测试](#测试-9)
  - [前后端联动](#前后端联动-9)
  - [2.12 速率限制参考](#212-速率限制参考)
  - [2.13 状态码约定](#213-状态码约定)
  - [2.14 错误响应扩展](#214-错误响应扩展)
  - [2.15 事件总线接口](#215-事件总线接口)
  - [2.16 版本化与兼容性策略](#216-版本化与兼容性策略)
  - [2.17 健康检查端点](#217-健康检查端点)
  - [2.18 工作台模块（/api/workbench/）](#218-工作台模块apiworkbench)
  - [概述](#概述-10)
  - [配置](#配置-10)
  - [安全要点](#安全要点-10)
  - [测试](#测试-10)
  - [前后端联动](#前后端联动-10)
  - [2.19 学习助手模块（/api/tools/auxilio/）](#219-学习助手模块apitoolsauxilio)
  - [概述](#概述-11)
  - [配置](#配置-11)
  - [安全要点](#安全要点-11)
  - [测试](#测试-11)
  - [前后端联动](#前后端联动-11)

## 1. Part A：项目架构

### 1.1 项目结构

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

> 全栈 monorepo 结构（含 `CS-Web-Backend` / `CS-Web-Frontend` 子仓库(submodule) + 根级 compose 编排）见根 [README.md](../../../README.md) 与根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md)。

### 源代码结构（`src/`）

**app/ — 页面路由 + BFF API 路由**

| 路由 | 说明 |
|------|------|
| `/` | 首页（Hero + 粒子莫比乌斯环） |
| `/about` `/events` `/events/[id]` | 关于 / 活动列表 / 活动详情 |
| `/login` `/profile` `/users/[id]` | 登录注册 / 个人资料 / 用户主页 |
| `/admin` `/notifications` | 管理后台 / 消息通知 |
| `/community` `/community/community` `/community/community/[category]` `/community/community/[category]/[topicId]` `/community/community/new` | 社区聚合 / 社区首页 / 版块 / 主题详情 / 发帖 |
| `/community/community/[slug]` | 社区详情（Markdown 渲染） |
| `/tools` `/tools/exam` `/tools/exam/[id]` `/tools/resource` `/tools/task` `/tools/auxilio` `/tools/dev-center` | **工作台入口**（个人工作台挂于页顶，社区已收编进工具网格）/ 题库 / 考试详情 / 资源库 / 任务板 / Auxilio / 开发者中心 |
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

**modules/ — 业务模块（10 个，UI + types；`server/` 遗留直连层已于 2026-08-06 B1 收口删除；工作台 `workbench/` 为 0.9.8 新增）**

> 迁移前单体遗留的 `server/` 子目录（直连 SQLite 的业务逻辑）已随 B1 收口整体删除；业务逻辑 100% 由后端承载，运行时 API 路由通过 `shared/backend-client.ts` 转发后端。

| 模块 | 说明 | 后端数据表（BFF 不直连） |
|------|------|------|
| `admin/` | 用户/角色/审计/权限/密码重置（UI + BFF 兜底） | users, sessions, admin_actions（后端 PG） |
| `auth/` | 登录/注册/2FA/OAuth/密码重置（BFF 转发） | users, sessions, login_history, verification_codes, password_reset_requests（后端 PG） |
| `community/` | 社区+社区+成员名录+Feed（BFF 转发 + UI） | community_categories, community_topics, community_replies, community_likes, community_favorites, community_topic_views, community_mentions, community_images, community_posts, community_series, community_likes（后端 PG） |
| `events/` | 活动 CRUD/报名/签到/归档（BFF 转发 + UI） | events, event_registrations, event_checkins（后端 PG） |
| `join/` | 入社申请（BFF 转发） | join_applications（后端 PG） |
| `notification/` | 通知（BFF 转发 + 遗留事件总线） | notifications（后端 PG） |
| `announcement/` | 公告（BFF 转发） | announcements（后端 PG） |
| `tools/` | 考试/资源/任务/组件注册表/Auxilio（BFF 转发 + UI） | exams, exam_questions, exam_question_options, exam_attempts, tasks, task_claims, resources, points_transactions（后端 PG） |
| `workbench/` | 个人工作台（widget 注册表驱动 + 视图切换 + 数据备份；widget：greeting/tasks/notes/pomodoro/heatmap/llm-usage/exam-countdown/assistant-chat） | 无独立业务表（GitHub 贡献/考试/LLM 用量/专注会话/LLM 配置经 BFF 转发后端 PG） |
| `user/` | 用户资料（BFF 转发） | users, activity_participations（后端 PG） |

> community 是 community/community/members 扁平合并产物（详见 [§1.2.2](#122-community-模块内部结构)）。

**BFF API 前缀映射**

| 业务域 | BFF API 前缀 | 后端转发目标 |
|--------|---------|---------|
| 认证 | `/api/auth/*`、`/api/auth/2fa/*`、`/api/auth/oauth/*` | `/api/v1/auth/*` |
| 个人资料 | `/api/profile/*`、`/api/avatars/*` | `/api/v1/profile/*` |
| 活动 | `/api/events/*` | `/api/v1/events/*` |
| 社区 | `/api/community/{community,community,members,feed,tags}/*` | `/api/v1/community/*` |
| 通知 | `/api/notifications/*` | `/api/v1/notifications/*` |
| 管理后台 | `/api/admin/{users,password-resets,events,notifications,actions,community,join,tools,announcements}/*` | `/api/v1/admin/*` |
| 工具集 | `/api/tools/{exam,resource,task,points,auxilio,component-registry}/*` | `/api/v1/tools/*` |
| 入社 / 会话 / 开发文档 / 健康检查 | `/api/join`、`/api/sessions`、`/api/dev-docs/*`、`/api/health` | `/api/v1/join`、`/api/v1/sessions`、(dev-docs 为前端本地)、`/api/v1/health` |
| 工作台 | `/api/workbench/*` | `/api/v1/workbench/*` |
| 学习助手 | `/api/tools/auxilio/*` | `/api/v1/tools/auxilio/*` |

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
| `community-points.test.ts` `mask.test.ts` `password-policy.test.ts` `permissions-hunt.test.ts` `proxy-headers.test.ts` `security.test.ts` `totp.test.ts` `audit-repo.test.ts` `tenant-context.test.ts` `error-rate-monitor.test.ts` | Vitest | 各模块单测（部分为遗留代码测试） |
| `e2e/{auth,core-flows,events,exam,community}.spec.ts` `e2e/global-setup.ts` | Playwright | 认证/核心流程/活动/考试/社区 E2E |

### 脚本与部署

`tools/scripts/`：`build-app.mjs`、`dev-server.mjs`(端口 2333)、`start-server.mjs`、`install-deps.sh`、`cloudflare-tunnel.mjs`、`restart-frontend.mjs`。

> ⚠️ 已删除：`setup-litestream.sh`、`restore-drill.sh`（BFF 无本地业务数据库，备份/恢复由后端 PG 负责，见 [FrontDoc-Ops.md](FrontDoc-Ops.md)）；`create-user.mjs`、`seed-exam-data.mjs`、`migrate-sqlite-to-pg.mjs`（SQLite 迁移已 100% 完成，遗留脚本已清理；创建管理员走后端 rbac_init seed / 管理 API）。

部署：全栈编排（db + backend + frontend + caddy）见根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md)；前端独立部署见 [FrontDoc-Ops.md](FrontDoc-Ops.md) Part A。容器编排见 `tools/deploy/docker-compose.yml`（应用 + Caddy，BFF 通过 `cs-net` 内网转发到后端）。

`tools/data/`：运行时数据占位目录（上传文件实际落于仓库根 `data/`）。

### 数据库与部署模型

> **BFF 无本地业务数据库**。业务数据由后端 PostgreSQL 承载（见后端 `CS-Web-Backend/tools/docs/BackDoc-Infra.md` §二）。下方"单进程依赖"表仅描述 BFF 自身进程级状态。

DB 文件 `data/app.db`（gitignored）为**迁移前遗留**（旧 SQLite 单体库，2026-08-05 迁移完成后已无任何引用，可安全删除）。用户头像/社区图片存 `data/avatars/`、`data/community-images/`（上传文件由后端处理，BFF 薄转发 FormData）。

> 重要约束：当前为**单进程部署模型**，多个机制依赖此前提。

| 组件 | 位置 | 单进程依赖 | 责任层 |
|------|------|:---:|:---:|
| BFF 速率限制 `RateLimiter` | [src/shared/security/rate-limiter.ts](../../src/shared/security/rate-limiter.ts) | ✅ 内存 Map | **[BFF]**（仅 BFF 自身用） |
| JWT Cookie 托管 | [src/shared/backend-client.ts](../../src/shared/backend-client.ts) | ❌ 无状态 | **[BFF]** |
| 2FA 预认证 token（`consumed jti` 集合） | [src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts) | ✅ 进程内 Set | **[遗留]**（运行时由后端处理） |
| 事件总线 `appBus` | [src/shared/events/event-bus.ts](../../src/shared/events/event-bus.ts) | ✅ Node.js EventEmitter | **[遗留]**（业务通知由后端承载） |

多实例迁移清单（完成前禁止横向扩展）：

> ℹ️ 多实例迁移清单（BFF 速率限制迁 Redis、后端 RBAC/限流多实例一致性）等待办条目已迁移至 `docs/项目待办事项-优先级重排.md`。

---

### 1.2 模块化分析

### 1.2.1 模块层级关系

```
BFF 共享层（shared/）- 被所有模块依赖
  ├── backend-client.ts（★ BFF 代理客户端）   security.ts（Origin/CSRF）   logger.ts
  ├── events/event-bus.ts（⚠️ 遗留，运行时不引用；db.ts / db/ 已于 2026-08-06/07 删除）
        ↓
BFF 业务模块（UI + types，server/ 遗留层已随 B1 删除）
  ├── auth      user      community(社区+社区+成员+Feed)
  ├── events    tools(考试/任务/资源/Auxilio)   notification   announcement   join
        ↓
跨模块聚合层
  └── admin（聚合所有模块管理操作 BFF 转发 + UI 兜底鉴权；审计日志由后端写）
```

### 1.2.2 community 模块内部结构

```
community/
├── ui/                  # 社区/社区/成员/Feed UI 组件（运行时）
├── types/               # CommunityTopic/CommunityPost/MemberItem/FeedItem 等统一类型
└── index.ts             # 统一 barrel
```

> `server/` 遗留直连层（community/community/members/feed.ts）已随 B1 收口删除（2026-08-06）；运行时社区/社区/成员 API 请求由 `src/app/api/community/**/route.ts` 通过 `backend-client.ts` 转发后端。

### 1.2.3 直接导入依赖矩阵

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

### 1.2.4 工作台模块内部结构

> 新增模块（0.9.8）。`src/modules/workbench/` 为个人化信息聚合工作中心，挂在 `/tools` 页顶部（Hero 之后），社区已收编进工具网格。设计目标：配置即内容、用户可控布局、纯前端个人数据 + 必要的后端聚合。

```
workbench/
├── workbench.tsx          # 工作台主体（registry 配置驱动渲染 + 视图切换 + 数据备份）
├── widget-registry.ts     # widget 声明 → 配置 → 注册（slot 分组：full/main/side）
├── index.ts               # 桶导出（目录即模块）
├── types.ts               # 共享类型（PomodoroPhase / PomodoroSettings / PomodoroState / WorkTask / WorkNote / MediaItem）
├── hooks/
│   ├── use-clock.ts        # 时钟 + 本次会话在线时长
│   ├── use-local-storage.ts # localStorage 持久化 state（useLocalStorage）
│   └── use-idb-media.ts    # IndexedDB 上传音乐库
├── lib/
│   └── ambient-audio.ts    # WebAudio 环境音合成（雨/海浪/篝火/白噪音/提示音）
└── widgets/
    ├── greeting-bar.tsx        # 问候条：当前时间/日期/会话在线时长
    ├── today-tasks.tsx         # 今日任务（localStorage，逾期标红置顶）
    ├── quick-notes.tsx         # 快捷便签（localStorage）
    ├── exam-countdown.tsx      # 考试倒计时（后端 exams 数据）
    ├── github-heatmap.tsx      # GitHub 贡献热力图（53×7 CSS Grid，后端缓存 6h）
    ├── llm-usage-stats.tsx     # LLM 用量统计（SVG 折线）+ 模型接入设置（API Key 加密存储）
    ├── assistant-chat.tsx      # 学习助手对话（SSE 流式 + react-markdown + 工具状态卡 + 历史会话）
    └── pomodoro/               # 番茄钟×播放器（目录即模块）
        ├── pomodoro-player.tsx  # 组合件：番茄钟 + 播放器二合一
        ├── use-pomodoro.ts       # 状态机（focus/shortBreak/longBreak，localStorage 持久化）
        ├── music-panel.tsx       # 上传音乐（IndexedDB）
        ├── settings-panel.tsx    # 番茄钟配置面板
        └── constants.ts          # SVG stroke 色板（集中收口，注释来源）
```

**配置驱动（registry）**：`widget-registry.ts` 以声明数组 `WIDGETS` 描述每个 widget 的 `id` / `slot`（`full` 全宽 / `main` 左主列 / `side` 右栏）/ `titleKey`（i18n key）/ `component`。`workbench.tsx` 按 slot 分组 + 依据 `wb_widget_prefs`（localStorage）显隐过滤后自动渲染。**新增 widget 三步**：① 在 `WIDGETS` 声明（id/slot/titleKey）② 组装组件 ③（可选）加入布局设置显隐开关——无需改动骨架。

**视图切换**：复用项目 `InlineTabs` 在「工作台（`workbench`）/ 学习助手（`assistant`）」间切换；`assistant` 视图渲染 `assistant-chat`，其余 widget 在 `workbench` 视图按 `full/main/side` 三栏网格布局。

**数据备份**：`workbench.tsx` 顶部提供「导出 JSON / 导入恢复 / 清空」。`collectBackup()` 收集 `wb_tasks` `wb_notes` `wb_pomodoro_settings` `wb_pomodoro_state` 等 localStorage 键，输出 `{ app: 'fztbu-workbench', version: 1, exportedAt, data }`；导入校验 `data` 中 `wb_` 前缀键后写回并刷新；清空带二次确认。数据积累 ≥ 30 条提示导出。

**设计约定（React Compiler 兼容）**：颜色仅用项目令牌 `var(--primary/--muted-foreground/--destructive/--chart-*)` 与 Tailwind 语义色板（emerald/amber/red/blue），无散落硬编码 hex；输入框/按钮复用项目原子件 `@/components/primitives/{Input,Button}` 与 `InlineTabs`；状态逻辑抽 hook（如 `use-pomodoro`），组件 < 500 行；hook 返回值不混入 ref、参数 ref 须进 `useCallback` deps（React Compiler 要求）。

**widget 清单与职责**

| widget | slot | 数据来源 | 职责 |
|--------|------|----------|------|
| greeting-bar | full | 本地时钟 / sessionStorage（`wb_session_started_at`） | 问候条：时间 / 日期 / 本次会话在线时长 |
| today-tasks | main | localStorage `wb_tasks` | 个人待办；排序：逾期(红,`--destructive`) > 今天 > 明天 > 其他 > 已完成置底 |
| github-heatmap | main | BFF `/api/workbench/contributions/github` | GitHub 贡献热力图（53×7 CSS Grid，后端缓存 6h，绑定 `wb_github_username`） |
| llm-usage-stats | main | BFF `/api/workbench/stats/llm-usage` | LLM 调用次数 / token / 模型分布（SVG 折线）+ 模型接入设置（API Key 加密） |
| quick-notes | main | localStorage `wb_notes` | 快捷便签 |
| pomodoro | side | IndexedDB + localStorage（`wb_pomodoro_*`） | 番茄钟×播放器二合一：WebAudio 合成环境音 + IndexedDB 上传音乐 + 阶段自动切音 + 标题闪烁 |
| exam-countdown | side | 后端 exams（`/api/tools/exam`，BFF 转发） | 考试倒计时 |
| assistant-chat | assistant 视图 | BFF `/api/tools/auxilio/chat`（SSE）等 | 学习助手对话：SSE 流式打字机 + react-markdown 渲染 + 工具调用状态卡 + 历史会话 |
| api-usage-stats | main（规划占位） | BFF `/api/workbench/stats/api-usage` | API 调用统计（近 N 天调用次数/趋势）⚠️ 部分就绪：后端路由与 i18n 已就绪，前端卡片尚未在 `widget-registry.ts` 注册，未渲染 |

> 注：`assistant-chat` 不在 `WIDGETS` 注册表内，由 `workbench.tsx` 在 `assistant` 视图单独渲染（详见 Part B §2.19 学习助手模块）。
> ⚠️ **部分就绪（api-usage-stats）**：后端路由 `src/app/api/workbench/stats/api-usage/route.ts` 已落地，i18n 词条 `workbench.apiUsageTitle`（中 `API 调用 · 近 {days} 天` / 英 `API calls · last {days} days`）已定义；但 `src/modules/workbench/widgets/` 下尚无对应组件，`widget-registry.ts` 的 `WIDGETS` 数组也未注册 `api-usage-stats`，故该卡片当前**不会渲染**。接入前端卡片须：① 在 `widgets/` 新增组件 ② 在 `WIDGETS` 声明（见上方「新增 widget 三步」）。

### 1.3 代码质量

### 1.3.1 历史问题收敛

> ℹ️ 历史问题收敛记录（Q1/Q2/Q3）已迁移至根仓 [`CHANGELOG.md`](../../../CHANGELOG.md)。

### 1.3.2 已完成优化

> ℹ️ 已完成优化记录已迁移至根仓 [`CHANGELOG.md`](../../../CHANGELOG.md)。

### 1.3.3 待处理优化

> ℹ️ 待处理优化（P1/P2 项）已迁移至 `docs/项目待办事项-优先级重排.md`。剩余项详见 [RootDoc-ADR.md](../../../docs/RootDoc-ADR.md)（ADR 索引）。

### 1.4 BFF 通用约定（架构层，内容见 Part B §2.1 / §2.12–2.17）

> 以下约定属**架构层**事实，为减少章节重排对既有内部引用的破坏，正文保留在 Part B（§2.1 转发契约、§2.12 速率限制、§2.13 状态码、§2.14 错误响应、§2.15 事件总线、§2.16 版本化、§2.17 健康检查），此处仅作索引：

| 约定 | 位置 | 一句话 |
|---|---|---|
| BFF 转发契约（proxyBackend / proxyStream） | Part B §2.1 | JWT 注入 · 401 静默刷新 · snake→camel 翻译 · Cookie 写回 |
| 速率限制 | Part B §2.12 | BFF 单进程内存限流 + 后端 Redis 二次限流（权威在后端） |
| 状态码约定 | Part B §2.13 | 200/201/302/400/401/403/404/409/413/429/500/502/504 |
| 错误响应扩展 | Part B §2.14 | `{error, code, details}` + 错误码清单（BFF/后端责任层） |
| 事件总线接口 | Part B §2.15 | ⚠️ 遗留机制：进程内通信，新增通知场景走 BFF→后端 |
| 版本化与兼容性策略 | Part B §2.16 | BFF 无版本前缀，向后兼容演进 |
| 健康检查端点 | Part B §2.17 | `GET /api/health` → 后端 `/health`（不泄露细节） |

### 1.5 关键不变量（BFF 视角，贯穿全项目，勿打破）

1. **纯薄转发**：`src/app/api/**/route.ts` 只做代理，**不含业务数据存储**；禁止重建 `src/modules/*/server/` 或 `shared/db`。
2. **数据只走后端**：业务数据 / 认证 / 邮件 / OAuth / RBAC enforce 均由后端 FastAPI + PostgreSQL 承载（见后端 `BackDoc-01-Arch.md`）。
3. **密钥不落地前端**：API Key 等敏感值由后端加密存储（`llm_configs` 等），前端只拿脱敏值（如 `apiKeyMasked`）。
4. **BFF 鉴权是兜底**：UI 层 `requireAdmin`/`requireRoot` 仅做展示兜底，真实 enforce 在后端 `require_permission`。
5. **跨模块引用**：业务模块间不直接 import server 代码；BFF 层经 `shared/backend-client.ts` 转发。
6. **新增 BFF 路由须登记**：Part B 对应模块「接口」表 + 联动表同步更新（以 `openapi.baseline.json` 为契约权威）。

---

## 2. Part B · 业务模块契约与 BFF 通用约定

> **范围说明**：本部分描述 **BFF 路由层**的端点与转发契约，并按统一模板组织业务模块。所有端点（除 `/api/dev-docs` 与 `/api/health` 外）均通过 `shared/backend-client.ts` 转发到后端 FastAPI。后端真实业务逻辑、数据校验、RBAC enforce 见后端 `CS-Web-Backend/tools/docs/BackDoc-01-Arch.md`（Part A 架构 + Part B 模块契约）。
>
> **模块契约统一模板**（与后端 `BackDoc-01-Arch.md` Part B 对齐）：**概述（职责/边界）→ 接口（路由表）→ 配置 → 安全要点（或降级）→ 测试 → 前后端联动**。其中「前后端联动」给出：前端页面 / BFF 路由 → 后端 API → 后端模块归属（见后端 Part B 对应节），用于双向影响面排查。
> **契约 SSOT 边界**：**原始端点契约（方法/路径/参数/响应 Schema）的权威为根 [`docs/api-reference.md`](../../../docs/api-reference.md)**（由 `openapi.baseline.json` 自动生成、请勿手改）；本节**按业务模块组织契约视图并提供 BFF 翻译层说明（JWT 注入、错误码映射、`toXxx` 响应整形等），不重复罗列原始参数**。两端点不一致时以 `api-reference.md` 为准。
> §2.1 / §2.12–2.17 为 **BFF 通用约定**（架构层，索引见 Part A §1.4）。

### 2.1 通用约定

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

### 2.2 认证模块（/api/auth/）

> BFF 薄转发到后端 `/api/v1/auth/*`。JWT 由后端签发（access 15min / refresh 7day），BFF 以 HttpOnly Cookie 托管。

### 概述
登录 / 注册 / 验证码 / 密码重置 / 2FA / GitHub OAuth / 会话管理（前端 `/login`、`/register`、`/profile`）。

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

> TOTP 加密、验证、限流、token 签发均由后端实现（见后端 `CS-Web-Backend/tools/docs/BackDoc-02-Sec.md`）。BFF 转发时 `assertAllowedOrigin` + login 模式从 `__Host-oauth_2fa` cookie 读 `twoFactorToken`。

### 配置
- JWT Cookie 托管：`__Host-fztbu_access`（生产）/ `fztbu_access`（开发），见 `shared/backend-client.ts`；i18n `auth` namespace（见 `FrontDoc-03-Conv.md §9`）。
- 无独立业务表；令牌 / 验证码 / 重置申请由后端承载（见后端 `BackDoc-01-Arch.md` Part B「一、认证」配置节）。

### 安全要点
- BFF 仅做 Origin / Content-Type / Zod 校验 + JWT Cookie 托管（UI 兜底）；密码策略、防枚举、2FA、OAuth state、限流均由后端 enforce（见 `FrontDoc-02-Sec.md`）。

### 测试
`tools/tests/e2e/auth.spec.ts`（认证 E2E）；后端侧见 `BackDoc-01-Arch.md` Part B「一、认证」测试节。

### 前后端联动
- 前端页面：`/login`、`/register`、`/profile`
- BFF 路由：`/api/auth/*`（含 `/api/auth/2fa/*`、`/api/auth/oauth/*`）
- 后端 API：`/api/v1/auth/*` → 后端模块归属：**「一、认证」**（`BackDoc-01-Arch.md` Part B）

### 2.3 个人资料模块（/api/profile/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/profile` | 登录 | 完整资料 |
| PUT | `/api/profile` | 登录 | 更新资料 |
| POST | `/api/profile/password` | 登录 | 改密码（需旧密码） |
| POST | `/api/profile/avatar/upload` | 登录 | 上传头像（2MB / JPEG·PNG·WebP） |
| POST | `/api/profile/avatar/preset` | 登录 | 预设头像 |
| GET | `/api/avatars/[filename]` | 公开 | 头像静态服务 |

### 概述
用户资料展示与自助维护（前端 `/profile` 页；公开主页 `/users/[id]`）。

### 配置
i18n `profile` namespace；头像预设常量 `shared/config/avatar-presets`。

### 安全要点
上传四重校验（大小 / MIME / 扩展名 / 文件头魔数）由后端 enforce；BFF 仅薄转发 FormData。

### 测试
`tools/tests/`（profile 相关并入各模块单测）；E2E 见 `e2e/core-flows.spec.ts`。

### 前后端联动
- 前端页面：`/profile`、`/users/[id]`
- BFF 路由：`/api/profile/*`、`/api/avatars/*`
- 后端 API：`/api/v1/profile/*`、`/api/v1/avatars/*` → 后端模块归属：**「二、用户管理」**（`BackDoc-01-Arch.md` Part B）

### 2.4 活动模块（/api/events/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/events` | 公开 | 活动列表（status/type/page） |
| GET | `/api/events/[id]` | 公开 | 详情 |
| POST | `/api/events/[id]/register` | 登录 | 报名 |
| GET | `/api/events/[id]/registration` | 登录 | 我的报名状态 |
| GET | `/api/events/me/registered` | 登录 | 已报名列表 |

### 概述
活动浏览 / 详情 / 报名 / 我的报名（前端 `/events`、`/events/[id]`）。

### 配置
i18n `events` namespace。

### 安全要点
报名幂等与冲突处理由后端 enforce（见后端 `BackDoc-01-Arch.md` Part B「活动」）。

### 测试
`events.test.ts`（51）、`e2e/events.spec.ts`。

### 前后端联动
- 前端页面：`/events`、`/events/[id]`
- BFF 路由：`/api/events/*`
- 后端 API：`/api/v1/events/*`（`app/api/v1/events.py`；后端模块契约未在 `BackDoc-01-Arch.md` Part B 单列，以 `openapi.baseline.json` 为准）

### 2.5 社区论坛模块（/api/community/ — 主题 / 回复 / 互动）

### 概述
社区论坛：版块 / 主题 / 回复（含楼中楼）/ 点赞收藏（前端 `/community/community` 系列页）。

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

### 配置
i18n `community` namespace。

### 安全要点
作者 / 管理员编辑权限、内容审核由后端 enforce（见后端 `BackDoc-02-Sec.md` 与 `openapi.baseline.json`）。

### 测试
`community-points.test.ts`、`e2e/community.spec.ts`。

### 前后端联动
- 前端页面：`/community/community`、`/community/community/[category]`、`/community/community/[category]/[topicId]`
- BFF 路由：`/api/community/**`（topics / replies / like / favorite / upload）
- 后端 API：`/api/v1/community/*`（`app/api/v1/community.py`；后端模块契约未在 Part B 单列，以 `openapi.baseline.json` 为准）

### 2.5.7 社区 Markdown 编辑器（UI 组件）

> 社区全文 Markdown 编辑/渲染统一组件，位于 `src/modules/community/ui/`（文件名 `community-` 前缀）。本组件为**前端 UI 关注点**，API 转发仍走 §2.5 社区论坛端点与 §2.8 社区文章端点；其指南已下沉至本模块契约以避免 UID 膨胀。

**概述**

三层架构统一全文 Markdown 编辑与渲染：

```
MarkdownRenderer              - 只读渲染（react-markdown + 插件链）
    ↑
    ├── MarkdownEditorBase    - 基础编辑器（编辑/预览 Tab 切换）
    │       ↑
    │       └── MarkdownEditor - 完整编辑器（工具栏 + 图片上传）
    │
    └── CommunityReplyItem        - 回复项渲染（主回复 + 楼中楼）
```

**组件详情**

- **MarkdownRenderer（只读渲染）** — `src/modules/community/ui/community-markdown-renderer.tsx`。用于展示主题正文、回复内容等。依赖 `react-markdown` + `remark-gfm`（GFM）+ `rehype-sanitize`（安全过滤，白名单机制，禁止 `on*` 事件与 `javascript:` 协议）+ `rehype-highlight`（代码高亮）。支持标题/段落/强调/列表/链接/图片/表格/代码块等语法。Props：`content: string`、`className?: string`。
- **MarkdownEditorBase（基础编辑器）** — `src/modules/community/ui/community-markdown-editor-base.tsx`。纯编辑/预览切换，无工具栏和图片上传；支持 `Cmd/Ctrl+B` 加粗、`Cmd/Ctrl+I` 斜体、字数统计；预览复用 `MarkdownRenderer`。适用不需要工具栏的场景（如管理后台活动详情编辑）。Props：`value`、`onChange`、`placeholder?`、`rows?`（默认 12）、`textareaClassName?`、`className?`。
- **MarkdownEditor（完整编辑器）** — `src/modules/community/ui/community-markdown-editor.tsx`。基于 `MarkdownEditorBase`，额外提供工具栏（B/I/S/H/链接/代码/引用/列表）与图片上传（调用 `/api/community/upload`，JPEG·PNG·WebP·GIF，5MB）。Props：`value`、`onChange`、`placeholder?`、`minHeight?`（默认 `280px`）、`className?`。

**使用场景**

| 场景 | 页面 / 组件 | 使用组件 |
|------|-----------|---------|
| 社区发帖 | `/community/community/new` | `MarkdownEditor` |
| 编辑主题 | `/community/community/[category]/[topicId]` | `MarkdownEditor` |
| 撰写回复 | `/community/community/[category]/[topicId]` | `MarkdownEditor` |
| 活动详情编辑 | `/admin`（活动创建 / 编辑弹窗） | `MarkdownEditorBase` |
| 主题正文渲染 | `/community/community/[category]/[topicId]` | `MarkdownRenderer` |
| 回复内容渲染 | `reply-item.tsx` | `MarkdownRenderer` |

> 待统一项：`/events/[id]` 活动详情页当前直接使用原始 `ReactMarkdown` + `remarkGfm`，未复用 `MarkdownRenderer` 也未配置 `rehype-sanitize`，后续迭代应统一替换（见 `docs/项目待办事项-优先级重排.md`）。

**配置**

内容长度限制统一在 `src/shared/utils/ui-constants.ts` 的 `FORM_LIMITS`：`COMMUNITY_MARKDOWN_MIN=10`、`COMMUNITY_MARKDOWN_MAX=20000`（主题/回复）、`EVENT_MARKDOWN_MAX=10000`（活动详情）。

**安全要点**

渲染层强制 `rehype-sanitize` 安全过滤（白名单，禁止 `on*` 事件与 `javascript:` 协议）；图片上传经 `/api/community/upload`（后端 enforce 大小/MIME/扩展名/魔数）。新增接入须复用 `MarkdownRenderer`，禁止裸 `ReactMarkdown`。

**测试**

`e2e/community.spec.ts` 覆盖发帖/回复渲染；组件单测见 `tools/tests/`（community 相关）。

**前后端联动**

- 前端组件：`src/modules/community/ui/community-*`、`reply-item.tsx`
- BFF 路由：`/api/community/**`（topics / replies / upload）
- 后端 API：`/api/v1/community/*`（以 `openapi.baseline.json` 为准）

### 2.6 通知模块（/api/notifications/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/notifications` | 登录 | 列表（分页） |
| GET | `/api/notifications/unread-count` | 登录 | 未读数 |
| POST | `/api/notifications/[id]/read` | 登录 | 标记已读 |
| POST | `/api/notifications/read-all` | 登录 | 全部已读 |

### 概述
站内通知：列表 / 未读数 / 已读标记（前端 `/notifications`）。

### 配置
i18n `notifications` namespace；⚠️ 遗留进程内事件总线（Part A §1.4.5）仅历史参考，新增通知场景走 BFF→后端。

### 安全要点
通知归属校验（只能读自己）由后端 enforce。

### 测试
[待填写]（前端通知模块未见专属测试文件；后端侧见 `openapi.baseline.json`）。

### 前后端联动
- 前端页面：`/notifications`
- BFF 路由：`/api/notifications/*`
- 后端 API：`/api/v1/notifications/*`（`app/api/v1/notifications.py`；后端模块契约未在 Part B 单列，以 `openapi.baseline.json` 为准）

### 2.7 管理后台（/api/admin/）

> BFF 路由层 `requireAdmin`/`requireRoot` 做 UI 兜底；后端 `require_permission(resource, action)` 为权威 enforce。审计日志由后端写入 `admin_actions` 表。

**7.1 用户管理（管理员+超级管理员）**：`GET /users`、`GET /users/[id]`（管理员）；`PUT /users/[id]`（超级管理员）；`POST /users/[id]/disable`、`/enable`、`/reset-password-default`（管理员，仅普通用户）

**7.2 用户管理（仅超级管理员）**：`POST /users/[id]/reset-password`（自定义）、`DELETE /users/[id]`（硬删除）

**7.3 密码重置审批**：`GET /password-resets`、`POST /password-resets/[id]/approve`、`POST /password-resets/[id]/reject`（管理员）

**7.4 活动管理**：`GET/POST /events`、`PUT/DELETE /events/[id]`（管理员）

**7.5 通知管理**：`GET /notifications`、`POST /notifications`（管理员，全站群发）

**7.6 审计日志（仅超级管理员）**：`GET /actions`、`DELETE /actions/[id]`

**7.7 社区管理**

> 编辑/删除任意主题与回复复用 §5.2/§5.3 端点（`PUT`/`DELETE topics/[id]`、`PUT`/`DELETE replies/[id]`），管理员具备越权权限，此处不再重复列出。

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/community/community/topics` | 管理员 | 主题列表（管理视图） |
| POST | `/community/community/topics/[id]/hide` | 管理员 | 隐藏主题 |
| POST | `/community/community/topics/[id]/restore` | 管理员 | 恢复主题 |
| POST | `/community/community/topics/[id]/pin` | 管理员 | 置顶 |
| POST | `/community/community/topics/[id]/feature` | 管理员 | 精华 |
| POST | `/community/community/replies/[id]/hide` | 管理员 | 隐藏回复 |
| POST | `/community/community/replies/[id]/restore` | 管理员 | 恢复回复 |
| GET | `/community/community/categories` | 管理员 | 版块列表（管理视图） |
| POST | `/community/community/categories` | 管理员 | 创建版块 |
| PUT | `/community/community/categories/[id]` | 管理员 | 编辑版块 |
| DELETE | `/community/community/categories/[id]` | 管理员 | 删除版块 |

**7.8 社区管理**：`POST /community/community`（管理员，publish/archive/delete）

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

### 概述
管理后台聚合层：用户 / 角色 / 权限 / 审计 / 活动 / 通知 / 社区 / 入社 / 工具集管理（前端 `/admin`）。各子域管理端点为对应业务模块的越权复用（如社区管理复用 §2.5 端点）。

### 配置
i18n `admin` namespace。

### 安全要点
BFF `requireAdmin` / `requireRoot` 仅 UI 兜底；**后端 `require_permission` 为权威 enforce**（见 `FrontDoc-02-Sec.md`）；审计由后端写入 `admin_actions` 表。

### 测试
`permissions-hunt.test.ts`（权限兜底）；后端 RBAC 测试见 `BackDoc-01-Arch.md` Part B「三、RBAC」。

### 前后端联动
- 前端页面：`/admin/**`
- BFF 路由：`/api/admin/*`
- 后端 API：`/api/v1/admin/*`（`app/api/v1/admin_roles.py` 等；后端模块契约未在 Part B 单列，底层 RBAC / 用户 / 审计见 Part B「三、RBAC」「二、用户管理」「四、审计日志」）

### 2.8 社区文章模块（/api/community/community/ — 长文 / 系列）

### 概述
社区长文发布 / 浏览 / 点赞 / 系列（前端 `/community/community/[slug]`、`/community/community/new`）。与 §2.5 社区论坛（主题/回复）为**两个不同资源**，均挂在 `/api/community/community` 下，注意区分。

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/community` | 公开 | 已发布列表（分类/搜索/分页） |
| POST | `/api/community/community` | 登录 | 创建草稿 |
| GET | `/api/community/community/[slug]` | 公开 | 详情（目录/点赞状态） |
| PUT | `/api/community/community/[slug]` | 作者/管理员 | 编辑 |
| DELETE | `/api/community/community/[slug]` | 作者/管理员 | 删除 |
| POST | `/api/community/community/[slug]/like` | 登录 | 点赞 |
| GET | `/api/community/community/series` | 公开 | 系列列表 |
| POST | `/api/community/community/series` | 登录 | 创建系列 |

### 配置
i18n `community` namespace（与论坛共用）。

### 安全要点
作者 / 管理员编辑权限由后端 enforce；Markdown 渲染在前端（`[slug]` 页），编辑器组件见 §2.5.7。

### 测试
`e2e/community.spec.ts`。

### 前后端联动
- 前端页面：`/community/community/[slug]`、`/community/community/new`
- BFF 路由：`/api/community/community*`（长文）
- 后端 API：`/api/v1/community/*`（`app/api/v1/community.py`；后端模块契约未在 Part B 单列，以 `openapi.baseline.json` 为准）

### 2.9 工具集模块（/api/tools/）

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

### 概述
工具集：考试 / 资源 / 任务 / 积分 / 组件注册表 + 开发文档（前端 `/tools/*`、`/tools/dev-center`）。`/api/dev-docs` 为**前端本地实现**（读写 `tools/docs/` 下 .md），不转发后端。

### 配置
i18n `tools` namespace（含 exam / resource / task）；组件注册表（`component-registry`）。

### 安全要点
dev-docs：路径穿越防护 + `assertAllowedOrigin` + `adminActionsLimiter`（BFF 本地）；考试判分 / 积分 / 资源审核由后端 enforce。

### 测试
`exam.test.ts`（58）、`resource.test.ts`（48）、`task.test.ts`（63）、`e2e/exam.spec.ts`。

### 前后端联动
- 前端页面：`/tools/exam`、`/tools/exam/[id]`、`/tools/resource`、`/tools/task`、`/tools/dev-center`
- BFF 路由：`/api/tools/{exam,resource,task,points,component-registry}/*`
- 后端 API：`/api/v1/tools/*`（`app/api/v1/tools.py`；后端模块契约未在 Part B 单列，以 `openapi.baseline.json` 为准；Auxilio 画像 `/api/v1/tools/auxilio` 见「学习助手」联动）

### 2.10 成员与入社模块

- **10.1 成员名录**：`GET /api/community/members`（公开，按技术方向筛选）
- **10.2 入社申请**：`POST /api/join`（公开，姓名/学号/专业/方向/联系方式）

### 概述
成员名录展示 + 入社申请（前端 `/community/members`、入社表单）。审批走管理后台（§2.7 7.9）。

### 配置
i18n `join` namespace。

### 安全要点
入社申请防刷与审批权限由后端 enforce。

### 测试
`join.test.ts`（38）。

### 前后端联动
- 前端页面：`/community/members`、入社表单页
- BFF 路由：`/api/community/members`、`/api/join`
- 后端 API：`/api/v1/community/members`、`/api/v1/join`（`app/api/v1/community.py`、`join.py`；后端模块契约未在 Part B 单列，以 `openapi.baseline.json` 为准）

### 2.11 会话管理模块（/api/sessions/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/sessions` | 登录 | 活跃会话（设备/IP/最后活跃） |
| DELETE | `/api/sessions` | 登录 | 远程登出指定会话 |

### 概述
活跃会话查看 / 远程登出（前端用户安全设置）。

### 配置
i18n `auth` namespace（sessions 词条）。

### 安全要点
远程登出归属校验（只能登出自己的会话）与 refresh token family 管理由后端 enforce。

### 测试
后端侧见 `BackDoc-01-Arch.md` Part B「一、认证」测试节。

### 前后端联动
- BFF 路由：`/api/sessions/*`
- 后端 API：`/api/v1/sessions/*` → 后端模块归属：**「一、认证」**（会话管理小节，`BackDoc-01-Arch.md` Part B）

### 2.12 速率限制参考

> **责任划分**：BFF 仍保留单进程内存限流器（`src/shared/security/rate-limiter.ts`），但**业务限流权威在后端**（Redis 实现，见后端 `CS-Web-Backend/tools/docs/BackDoc-02-Sec.md` §3）。下表为 BFF 层遗留限流器配置，运行时多为后端二次限流。

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
| `communityPost` | 5 | 60s | IP | `POST .../community/topics` | **[后端]** |
| `communityReply` | 10 | 60s | IP | `POST .../community/.../replies`、`POST .../exam/[id]/submit` | **[后端]** |
| `communityLike` | 30 | 60s | IP | `POST .../community/like`、`/favorite` | **[后端]** |
| `communityUpload` | 10 | 60s | IP | `POST .../community/upload`、`POST .../resource/upload` | **[后端]** |
| `eventCheckin` | 10 | 60s | IP | `POST /api/admin/events/[id]/checkin` | **[后端]** |
| `resourceSubmit`/`resourceUpload`/`joinApplication` | — | — | — | 预留，复用 `communityUpload`/`communityReply`/`adminActions` | **[后端]** |
| 读操作 | - | - | - | 无硬限制 | - |

> BFF 单进程内存实现（`Map`）；多实例前须迁 Redis。响应头 `Retry-After` + `X-RateLimit-Remaining` 标识剩余配额。

### 2.13 状态码约定

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

### 2.14 错误响应扩展

**14.1 标准格式**

```json
{ "error": "string", "code": "string", "details": {} }
```

| 字段 | 必填 | 说明 |
|------|:---:|------|
| `error` | ✅ | 人类可读消息（不泄露内部信息） |
| `code` | ✅ | 机器可读码（见 14.2） |
| `details` | ❌ | 字段级错误（仅 Zod 失败时） |

**14.2 错误码清单**（对应 [FrontDoc-02-Sec.md](FrontDoc-02-Sec.md) 发现 15）

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

### 2.15 事件总线接口

> ⚠️ **遗留机制**：进程内通信（非 HTTP），迁移后业务通知由后端承载。新增通知场景应直接走 BFF→后端转发，不再新增前端事件监听器。
> 对应根级 [docs/Onboarding.md](../../../docs/Onboarding.md#a3-模块化开发规范) 模块协作规范、[RootDoc-ADR.md](../../../docs/RootDoc-ADR.md) ADR-013/014。

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

**15.3 新增事件流程**：① 在 `AppEventMap` 加类型 ② `emit` 发布 ③ `on` 订阅（handler try-catch）④ 更新本表 ⑤ 更新 §1.2.3 依赖矩阵。

> ⚠️ 迁移后：新增通知场景应直接走 BFF→后端转发，不再新增前端事件监听器。

**15.4 监听器初始化**（[ADR-013](../../../docs/RootDoc-ADR.md)，2026-07-29 实施）

通知监听器迁至 `src/instrumentation.ts` 显式初始化（委托 `instrumentation-node.ts`，server-only，pino logger），不再依赖加载副作用：

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('@/instrumentation-node');
}
```

`initNotificationEvents()` 幂等（`initialized` 标志）；并注册 `unhandledRejection`/`uncaughtException` 全局处理写 pino 日志（ADR-13+15）。

### 2.16 版本化与兼容性策略

**16.1 版本策略**：BFF 无版本前缀，向后兼容演进。后端 API 有 `/api/v1` 前缀，版本策略见后端 `CS-Web-Backend/tools/docs/BackDoc-01-Arch.md`。

| 变更 | 策略 |
|------|------|
| 新增端点 / 可选请求字段 / 响应字段 | ✅ 允许（客户端容错未知字段） |
| 修改字段语义 | 🚫 禁止，新增字段替代 |
| 移除字段 | 🚫 先标记 `@deprecated`，下个大版本移除 |
| 改变鉴权 | 须在 [FrontDoc-02-Sec.md](FrontDoc-02-Sec.md) 记录并通告 |

**16.2 破坏性变更处理**：① 评估能否新增字段避免（[RootDoc-ADR.md](../../../docs/RootDoc-ADR.md) FF2）② 记 ADR ③ 双写过渡（旧字段 `@deprecated`）④ 客户端迁移窗口 ⑤ 移除旧字段。

**16.3 稳定契约字段**：`error`、`code`、`details`（错误）；分页 `items`/`total`/`page`/`pageSize`。其他业务字段可能演进，客户端须容错。

### 2.17 健康检查端点

**17.1 BFF 公开** `GET /api/health`（公开）— BFF 转发后端 `/health`

返回 `{"ok": true/false}`（BFF 仅判断后端 `/health` 是否 200，不泄露细节）。

```typescript
// src/app/api/health/route.ts
const res = await fetch(`${BACKEND_URL}/health`, { cache: 'no-store' });
return NextResponse.json({ ok: res.status === 200 });
```

> 对应 [RootDoc-ADR.md](../../../docs/RootDoc-ADR.md) Q5（2026-07-29）。后端运维端点（`/readyz` `/metrics/json` `/status`）不在 BFF 暴露，见后端 `CS-Web-Backend/tools/docs/BackDoc-Infra.md` §1.2。

**17.2 安全健康检查（规划）**

> ℹ️ 安全健康检查（`/api/health/events`、`/api/health/security`）规划等待办条目已迁移至 `docs/项目待办事项-优先级重排.md`。

### 2.18 工作台模块（/api/workbench/）

> 工作台前端为纯个人化聚合层，无独立业务库；需后端数据的 widget 经 BFF 统一转发（`proxyBackend`：注入 JWT、401 静默刷新、写回 Cookie）。widget 结构与注册机制见 Part A §1.2.4。

| 方法 | 路径 | 鉴权 | 说明 | 后端转发目标 |
|------|------|------|------|--------------|
| GET | `/api/workbench/contributions/github` | 登录 | GitHub 贡献热力图（绑定 username，后端缓存 6h） | `/api/v1/workbench/contributions/github` |
| GET | `/api/workbench/stats/api-usage` | 登录 | API 调用统计 | `/api/v1/workbench/stats/api-usage` |
| GET | `/api/workbench/stats/pomodoro` | 登录 | 番茄钟专注会话统计 | `/api/v1/workbench/stats/pomodoro` |
| GET | `/api/workbench/stats/llm-usage` | 登录 | LLM 用量统计 | `/api/v1/workbench/stats/llm-usage` |
| POST | `/api/workbench/focus-sessions` | 登录 | 专注会话记录 | `/api/v1/workbench/focus-sessions` |
| GET/PUT | `/api/workbench/llm-config` | 登录 | LLM 模型接入配置（API Key 加密存储） | `/api/v1/workbench/llm-config` |

### 概述
个人工作台：widget 注册表驱动渲染 + 「工作台 / 学习助手」视图切换 + 数据备份（导出 / 导入 / 清空，前端本地完成）。

### 配置
widget 注册 `widget-registry.ts`（`WIDGETS` 声明：id / slot / titleKey / component）；i18n `workbench` namespace（interface / zhCN / en 三处，均在 `src/i18n/messages/tools.ts`）；`api-usage-stats` 前端卡片**部分就绪**（后端路由与 i18n 已就绪、未注册，见 Part A §1.2.4）。

### 安全要点
无独立业务库；需后端数据的 widget 经 BFF 转发；API Key 不落前端（`llm-config` 脱敏回显，后端 AES-256-GCM 加密存储）。

### 测试
[待填写]（工作台新模块，未见专属测试文件；后端侧见 `BackDoc-01-Arch.md` Part B「五、工作台」测试节）。

### 前后端联动
- 前端页面：`/tools`（工作台视图）
- BFF 路由：`/api/workbench/*`
- 后端 API：`/api/v1/workbench/*` → 后端模块归属：**「五、工作台」**（`BackDoc-01-Arch.md` Part B）

### 2.19 学习助手模块（/api/tools/auxilio/）

> `assistant-chat` 对话走 SSE 流式透传（`proxyStream`）；其余走 `proxyBackend`。

| 方法 | 路径 | 鉴权 | 说明 | 后端转发目标 |
|------|------|------|------|--------------|
| GET | `/api/tools/auxilio` | 登录 | Auxilio 薄弱点画像 + 资源推荐（401 时返回安全空结果） | `/api/v1/tools/auxilio` |
| GET | `/api/tools/auxilio/conversations` | 登录 | 学习助手历史会话列表 | `/api/v1/auxilio/conversations` |
| GET | `/api/tools/auxilio/conversations/[id]/messages` | 登录 | 会话消息 | `/api/v1/auxilio/conversations/[id]/messages` |
| POST | `/api/tools/auxilio/chat` | 登录 | 学习助手对话（SSE 流式透传） | `/api/v1/auxilio/chat` |

> 上表为**摘要**，方法 / 转发目标以实际 BFF 代码（`src/app/api/tools/auxilio/*`、`src/app/api/workbench/*`）与后端 `openapi.baseline.json` 为准；新增 BFF 路由须同步本表。

### 概述
Auxilio 学习助手：SSE 对话 + 薄弱点画像 + 资源推荐 + 会话历史（前端 `/tools/auxilio`、工作台 assistant 视图）。会话与消息落库后端 PG（`conversations` / `chat_messages`）。

### 配置
i18n `workbench` namespace（assistant-chat 词条）；LLM Key 由用户在前端「LLM 设置」填写，经 BFF `/api/workbench/llm-config` 转发后端加密存储（脱敏回显，不落前端）。

### 安全要点
- `/api/tools/auxilio` 在 401 时返回安全空结果（`weakTags: []` / `recommendedResources: []`，status 401），不直接透传后端错误。
- `/api/tools/auxilio/chat` 为 SSE 流：BFF 仅注入 Authorization 后原样 pipe 后端 `text/event-stream`，不做 JSON 解析与 401 自动刷新（由前端处理）。
- 会话归属校验（非本人 404）由后端 enforce（`_own_conversation`）。

### 测试
[待填写]（前端学习助手新模块未见专属测试；后端侧见 `BackDoc-01-Arch.md` Part B「六、学习助手」测试节：`test_phase5_tools.py::test_auxilio`）。

### 前后端联动
- 前端页面：`/tools/auxilio`、工作台 assistant 视图
- BFF 路由：`/api/tools/auxilio/*`（含 chat SSE）
- 后端 API：`/api/v1/auxilio/*`（chat / conversations）与 `/api/v1/tools/auxilio`（画像）→ 后端模块归属：**「六、学习助手」** + **「五、工作台」**（llm-config，`BackDoc-01-Arch.md` Part B）

---
