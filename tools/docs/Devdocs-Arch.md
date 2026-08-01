# FZTBUCS-Arch-架构与 API 文档

> 文档定位：架构与 API 契约权威文档（reference）
> 受众：开发工程师 / 架构评审 / API 接入方 / 新人
> Source of truth：项目结构、模块化分析、代码质量、API 端点与契约、状态码、事件总线、依赖矩阵的唯一权威位置
> 关联：安全与权限设计见 [Devdocs-Sec.md](Devdocs-Sec.md)；运维/SLO/Runbook 见 [Devdocs-Ops.md](Devdocs-Ops.md)；演进路线 ADR 见 [Devdocs-evolution.md](Devdocs-evolution.md)；工程规则见 [Devdocs-onboarding-guide.md](Devdocs-onboarding-guide.md#八项目规则)
> 最后更新：2026-08-01（合并原 Devdocs-architecture.md + Devdocs-api-reference.md）
> 变更触发：目录结构调整 / 新增模块 / 依赖矩阵变更 / 新增或修改 API / 安全措施变更
> Stale 信号：依赖矩阵与实际 import 不一致 / 端点签名与路由 handler 不一致 / 状态码与代码不符

## 文档结构

- **[Part A: 项目架构](#part-a-项目架构)**（原 Devdocs-architecture.md，已合并入本文件）
  - [一、项目结构](#一项目结构) · [二、模块化分析](#二模块化分析) · [三、代码质量](#三代码质量)
- **[Part B: API 接口参考](#part-b-api-接口参考)**（原 Devdocs-api-reference.md）
  - [一、通用约定](#一通用约定) · [二、认证](#二认证模块api-auth) · [三、个人资料](#三个人资料模块api-profile) · [四、活动](#四活动模块api-events) · [五、论坛](#五论坛模块api-communityforum) · [六、通知](#六通知模块api-notifications) · [七、管理后台](#七管理后台api-admin) · [八、博客](#八博客模块api-communityblog) · [九、工具集](#九工具集模块api-tools) · [十、成员与入社](#十成员与入社模块) · [十一、会话](#十一会话管理模块api-sessions) · [十二、速率限制](#十二速率限制参考) · [十三、状态码](#十三状态码约定) · [十四、错误响应](#十四错误响应扩展) · [十五、事件总线](#十五事件总线接口) · [十六、版本化策略](#十六版本化与兼容性策略) · [十七、健康检查](#十七健康检查端点)

---

# Part A: 项目架构

## 一、项目结构

### 顶层目录

```
fztbucs-projects/
├── tools/                   # 工具集（docs / tests / scripts / deploy）
├── public/                  # 静态资源（头像预设、logo）
├── src/                     # 源代码
│   ├── app/                 # Next.js App Router（页面 + API 路由）
│   ├── components/          # 全局 React 组件（primitives/layout/effects/feedback）
│   ├── modules/             # 业务模块（server/types/ui 三层自洽）
│   ├── shared/              # 全局共享基础设施
│   └── server.ts            # 自定义 Node.js 服务器入口
├── .env.example
├── next.config.ts  tsconfig.json  eslint.config.mjs
├── vitest.config.ts  playwright.config.ts  postcss.config.mjs
└── package.json
```

### 源代码结构（`src/`）

**app/ — 页面路由**

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

全局文件：`layout.tsx`、`globals.css`、`robots.ts`、`error.tsx`、`loading.tsx`。

**components/ — 全局组件**（子目录：`primitives` 通用原子 / `layout` 布局 / `effects` 视觉特效 / `feedback` 反馈类；顶层含 `avatar`、`user-menu`、`notification-bell`、`tech-tag-selector`、`theme-provider`、`theme-toggle`）。

**shared/ — 共享基础设施**

```
shared/
├── db.ts                 # SQLite 单例 + schema 初始化
├── app-error.ts          # 应用错误基类 + assertOwnership
├── logger.ts             # pino 结构化日志（Q4，dev pino-pretty / 生产 NDJSON）
├── server-only.ts        # server-only 本地空实现（M11，自定义 dev server 兼容）
├── db/                   # drivers/（sqlite/pg）repositories/（audit.repo）schema/（Drizzle）schemas/（手写 DDL）schema.ts seeds.ts cleanup.ts
├── events/               # event-bus.ts（进程内总线）+ event-types.ts
├── config/               # avatar-presets / admin-avatars / header-images / auth-constants
├── hooks/                # 客户端 hooks（全 'use client'，M11）：use-auth / use-collapsing-hero / use-debounce / use-focus-trap / use-topic-detail / use-topic-actions(Q1) / use-reply-actions(Q1)
├── types/                # role-types / user-types / audit-types（M11 下沉斩断依赖）
├── security/             # 已模块化：security.ts / rate-limiter.ts / origin-guard.ts / request-utils.ts / http-helpers.ts / password.ts / permissions.ts / permission-points.ts / builtin-roles.ts / audit.ts / proxy-headers.ts / tenant-context.ts（PG Phase 1）/ schemas/（zod 按模块）/ index.ts
└── utils/                # utils / pagination / image-utils / tech-tags / ui-constants / mail / mask / monitoring（基于 pino，可选 Sentry）
```

**modules/ — 业务模块（9 个，统一 `server/`+`types/`+`ui/`）**

| 模块 | 说明 | server 文件数 | 数据表 |
|------|------|:---:|------|
| `admin/` | 用户/角色/审计/权限/密码重置 | 6 | users, sessions, admin_actions |
| `auth/` | 登录/注册/2FA/OAuth/密码重置 | 6 | users, sessions, login_history, verification_codes, password_reset_requests |
| `community/` | 论坛+博客+成员名录+Feed | 15 | forum_categories, forum_topics, forum_replies, forum_likes, forum_favorites, forum_topic_views, forum_mentions, forum_images, blog_posts, blog_series, blog_likes |
| `events/` | 活动 CRUD/报名/签到/归档 | 6 | events, event_registrations, event_checkins |
| `join/` | 入社申请 | 1 | join_applications |
| `notification/` | 通知（含 notification-events.ts） | 2 | notifications |
| `announcement/` | 公告 | 1 | announcements |
| `tools/` | 考试/资源/任务/组件注册表/Auxilio | 11 | exams, exam_questions, exam_question_options, exam_attempts, tasks, task_claims, resources, points_transactions |
| `user/` | 用户资料 | 2 | users, activity_participations |

> community 是 forum/blog/members 扁平合并产物，内部 `server/` 按 `forum/`、`blog/`、`members/` 子目录拆分（详见 [§2.2](#22-community-模块内部结构)）。

**API 前缀映射**

| 业务域 | API 前缀 |
|--------|---------|
| 认证 | `/api/auth/*`、`/api/auth/2fa/*`、`/api/auth/oauth/*` |
| 个人资料 | `/api/profile/*`、`/api/avatars/*` |
| 活动 | `/api/events/*` |
| 社区 | `/api/community/{forum,blog,members,feed,tags}/*` |
| 通知 | `/api/notifications/*` |
| 管理后台 | `/api/admin/{users,password-resets,events,notifications,actions,community,join,tools,announcements}/*` |
| 工具集 | `/api/tools/{exam,resource,task,points,auxilio,component-registry}/*` |
| 入社 / 会话 / 开发文档 / 健康检查 | `/api/join`、`/api/sessions`、`/api/dev-docs/*`、`/api/health`(+`/events`规划/`/security`规划) |

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
| `blog-points.test.ts` `mask.test.ts` `password-policy.test.ts` `permissions-hunt.test.ts` `proxy-headers.test.ts` `security.test.ts` `totp.test.ts` `audit-repo.test.ts` `tenant-context.test.ts` `error-rate-monitor.test.ts` | Vitest | 各模块单测 |
| `e2e/{auth,core-flows,events,exam,forum}.spec.ts` `e2e/global-setup.ts` | Playwright | 认证/核心流程/活动/考试/论坛 E2E |

### 脚本与部署

`tools/scripts/`：`build-app.mjs`、`dev-server.mjs`(端口 2333)、`start-server.mjs`、`install-deps.sh`、`create-user.mjs`(CLI 提权)、`seed-exam-data.mjs`、`cloudflare-tunnel.mjs`、`setup-litestream.sh`。

部署：Docker + Caddy + Litestream，详见 [Devdocs-Ops.md](Devdocs-Ops.md) Part A。

### 数据库与部署模型

DB 文件 `data/app.db`（gitignored），首次启动自动建表 + seed。用户头像/论坛图片存 `data/avatars/`、`data/forum-images/`。

> 重要约束：当前为**单进程部署模型**，多个机制依赖此前提。

| 组件 | 位置 | 单进程依赖 |
|------|------|:---:|
| 速率限制 `RateLimiter` | [src/shared/security/security.ts](../../src/shared/security/security.ts#L248-L296) | ✅ 内存 Map |
| Session 存储 | SQLite `sessions` | ❌ 共享存储 |
| 2FA 预认证 token（`consumed jti` 集合） | [src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts) | ✅ 进程内 Set |
| 事件总线 `appBus` | [src/shared/events/event-bus.ts](../../src/shared/events/event-bus.ts) | ✅ Node.js EventEmitter |

多实例迁移清单（完成前禁止横向扩展）：
1. 速率限制迁 Redis（替换 `RateLimiter` Map）
2. 2FA `consumed jti` 集合迁 Redis SET（5min TTL）
3. 事件总线评估跨实例广播（见 [Devdocs-Sec.md](Devdocs-Sec.md) ADR-014）

---

## 二、模块化分析

### 2.1 模块层级关系

```
基础设施层（shared/）- 被所有模块依赖
  ├── db.ts / db/   security.ts   events/event-bus.ts   其他 shared 工具
        ↓
核心业务模块
  ├── auth      user      community(论坛+博客+成员+Feed)
  ├── events    tools(考试/任务/资源/Auxilio)   notification   announcement   join
        ↓
跨模块聚合层
  └── admin（聚合所有模块管理操作 + 审计日志）
```

### 2.2 community 模块内部结构

```
community/
├── server/
│   ├── forum/    # categories/topics/replies/reactions/moderation/mentions/user-data/uploads/shared
│   ├── blog/     # posts/series/likes/utils
│   ├── members/  # index.ts
│   ├── feed.ts   # Feed 聚合查询
│   └── index.ts  # 统一 barrel
└── types/
    └── index.ts  # ForumTopic/BlogPost/MemberItem/FeedItem 等统一类型
```

命名规范：按业务域拆 `forum/`、`blog/`、`members/` 子目录，文件名去除原前缀（`forum-`/`blog-`）扁平放置。

### 2.3 直接导入依赖矩阵

| 模块 \ 被依赖 | db | admin | notification | community | auth | events | pagination | shared |
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

> P0 方向 Q1/Q2/Q3 已全部收敛（2026-07-31），详见 [Devdocs-evolution.md](Devdocs-evolution.md)。

| # | 严重度 | 问题 | 状态 |
|---|--------|------|------|
| 1 | 🔴 高 | TopicDetail 过长 | ✅ Q1：主组件 191 行，拆 3 子组件 + 2 hook |
| 2 | 🟡 中 | `EASE` 常量重复 | ✅ Q3：统一 `--ease-ark` CSS 变量 |
| 3 | 🟡 中 | 错误处理不统一 | ✅ Q2：全站 `AppError` + `errorResponse` |

### 3.2 已完成优化

| 项 | 说明 |
|----|------|
| 模块合并 | forum+blog+members → community（flat 结构） |
| 路由重组 | `/forum/*`→`/community/forum/*`、`/blog/*`→`/community/blog/*`、`/members`→`/community/members` |
| API 重组 | `/api/forum/*`→`/api/community/forum/*` |
| 类型统一 | ForumTopic/BlogPost/MemberItem/FeedItem → `community/types/index.ts` |
| 结构精简 | `tests/scripts/deploy/dev-docs`→`tools/`；`shared/ui/`→`components/ui/` |
| Sentry 移除 | `@sentry/nextjs` 未装，monitoring 基于 pino |
| template.tsx 删除 | 无实际逻辑 |
| security.test.ts | `shared/`→`tools/tests/` |
| import 清理 | `resource/index.ts` 移除冗余 `TECH_TAGS` |
| Q1 | TopicDetail 拆分（< 200 行） |
| Q2 | 错误处理统一（`AppError` + `ERROR_STATUS_MAP`） |
| Q3 | EASE 常量提取（`--ease-ark`） |
| Q4 | pino 结构化日志 + 请求 ID |
| Q5/Q6 | 健康检查端点 / `X-Request-Id` 注入 |
| F1/F2/F3 | CollapsingHero 统一 / CSP nonce / proxy.ts 安全头统一入口 |
| M3 | 活动月历视图 |
| M11 | server-only 边界澄清 + `AuditContext` 下沉 |

### 3.3 待处理优化

- P1：M10 Repository 抽象层、M1 关注/好友、M2 Wiki、M4 活动评价、M5 相册
- P2：L6 PWA 离线、L8 未读通知 SSE、L9 定时任务

> 剩余项详见 [Devdocs-evolution.md](Devdocs-evolution.md)。

---

# Part B: API 接口参考

> 验证 cadence：API 契约变更时 | Stale 信号：端点清单与实际路由不一致

## 一、通用约定

**基础 URL**：开发 `http://localhost:2333`；生产 `https://<your-domain>`。

**鉴权级别**

| 级别 | 标识 | 说明 |
|------|------|------|
| 公开 | - | 无需登录 |
| 登录 | `requireAuth` | 有效 Session Cookie |
| 管理员 | `requireAdmin` | `admin` 或 `root` |
| 超级管理员 | `requireRoot` | `root` |

**请求/响应**：`Content-Type: application/json`；成功 `{ success: true, data? }`；错误 `{ error, code?, details? }`。

**安全措施**（所有写操作）：Origin 白名单校验；速率限制；管理员操作记 `admin_actions` 审计日志。

## 二、认证模块（/api/auth/）

**2.1 基础认证**

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 公开 | 注册（邮箱+密码+验证码） |
| POST | `/api/auth/login` | 公开 | 登录（邮箱+密码） |
| POST | `/api/auth/logout` | 登录 | 登出 |
| GET | `/api/auth/me` | 登录 | 当前用户信息 |
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

> TOTP 基于 RFC 6238 自实现，secret 用 AES-256-GCM 加密存储；管理员可被强制启用 2FA。

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
| POST | `/topics` | 登录 | 创建（5/min/IP） |
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

**9.6 开发文档（/api/dev-docs/）**

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

限制器集中于 [src/shared/security/security.ts](../../src/shared/security/security.ts) 的 `RATE_LIMIT_CONFIG`，环境变量覆盖：`RATE_LIMIT_<NAME>_MAX`（次数）/`RATE_LIMIT_<NAME>_WINDOW_MS`（毫秒），`<NAME>` 为大写限制器名（如 `RATE_LIMIT_LOGIN_MAX=20`）。

| 限制器 | 默认 | 窗口 | key | 主要路由 |
|--------|:---:|:----:|-----|---------|
| `login` | 10 | 60s | IP+邮箱 | `POST /api/auth/login` |
| `register` | 5 | 60s | IP | `POST /api/auth/register` |
| `sendCode` | 3 | 60s | IP+email | `POST /api/auth/send-code` |
| `forgotPassword` | 3 | 60s | IP | `POST /api/auth/forgot-password` |
| `twoFactor` | 5 | 60s | IP+用户 | `2fa/verify` `/disable` `/backup-codes` |
| `twoFactorSetup` | 3 | 60s | IP+用户 | `2fa/setup` |
| `auth` | 20 | 60s | IP | `/api/auth/oauth/*` |
| `profileUpdate` | 10 | 60s | IP | `PATCH /api/profile`、密码、`/sessions` |
| `avatarPreset` | 10 | 60s | IP | `POST /api/profile/avatar/preset` |
| `avatarUpload` | 5 | 60s | IP | `POST /api/profile/avatar/upload` |
| `adminActions` | 30 | 60s | IP | `/api/admin/*`、`/api/tools/component-registry/*` |
| `forumPost` | 5 | 60s | IP | `POST .../forum/topics` |
| `forumReply` | 10 | 60s | IP | `POST .../forum/.../replies`、`POST .../exam/[id]/submit` |
| `forumLike` | 30 | 60s | IP | `POST .../forum/like`、`/favorite` |
| `forumUpload` | 10 | 60s | IP | `POST .../forum/upload`、`POST .../resource/upload` |
| `eventCheckin` | 10 | 60s | IP | `POST /api/admin/events/[id]/checkin` |
| `resourceSubmit`/`resourceUpload`/`joinApplication` | — | — | — | 预留，复用 `forumUpload`/`forumReply`/`adminActions` |
| 读操作 | - | - | - | 无硬限制 |

> 单进程内存实现（`Map`）；多实例前须迁 Redis。响应头 `Retry-After` + `X-RateLimit-Remaining` 标识剩余配额。

## 十三、状态码约定

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 302 | 重定向（OAuth） |
| 400 | 请求参数错误 |
| 401 | 未登录 / Session 过期 |
| 403 | 权限不足（未登录/Session 过期由 401 表示）|
| 404 | 资源不存在 |
| 409 | 冲突（重复注册/报名） |
| 413 | 上传文件过大 |
| 429 | 速率限制 |
| 500 | 服务器内部错误 |

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

**14.2 错误码清单**（对应 [Devdocs-Sec.md](Devdocs-Sec.md) 发现 15）

| code | HTTP | 触发场景 |
|------|:----:|---------|
| `INVALID_ORIGIN` | 403 | Origin/Referer 不在白名单 |
| `INVALID_CONTENT_TYPE` | 400 | Content-Type 非 json |
| `VALIDATION_FAILED` | 400 | Zod 校验失败（含 `details`） |
| `UNAUTHORIZED` | 401 | 未登录/Session 过期 |
| `FORBIDDEN` | 403 | 权限不足/非作者 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 状态冲突 |
| `RATE_LIMITED` | 429 | 触发限流（含 `retryAfter`） |
| `FILE_TOO_LARGE` | 413 | 上传超限 |
| `INVALID_FILE_TYPE` | 400 | 文件类型不在白名单 |
| `ACCOUNT_DISABLED` | 403 | 用户已禁用 |
| `2FA_REQUIRED` | 403 | 需完成 2FA |
| `2FA_FAILED` | 403 | 2FA 验证码错误 |
| `PASSWORD_CONFIRMATION_REQUIRED` | 403 | 高危操作需密码二次确认 |
| `LAST_ADMIN_PROTECTED` | 403 | 降级/删除最后一个管理员 |
| `INTERNAL_ERROR` | 500 | 未知错误（记日志，返通用消息） |

**14.3 Zod 校验示例**

```json
{
  "error": "请求参数错误",
  "code": "VALIDATION_FAILED",
  "details": { "email": "请输入有效的邮箱地址", "password": "密码至少 8 位" }
}
```

## 十五、事件总线接口

> 进程内通信（非 HTTP）。对应 [Devdocs-onboarding-guide.md](Devdocs-onboarding-guide.md#83-模块化开发规范) 模块协作规范、[Devdocs-evolution.md](Devdocs-evolution.md) ADR-013/014。

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

**15.4 监听器初始化**（[ADR-013](Devdocs-evolution.md#adr-013-事件监听器显式初始化)，2026-07-29 实施）

通知监听器迁至 `src/instrumentation.ts` 显式初始化（委托 `instrumentation-node.ts`，server-only，pino logger），不再依赖加载副作用：

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('@/instrumentation-node');
}
```

`initNotificationEvents()` 幂等（`initialized` 标志）；并注册 `unhandledRejection`/`uncaughtException` 全局处理写 pino 日志（ADR-13+15）。基础 `/api/health` 已就绪；`/api/health/events` 规划中。

## 十六、版本化与兼容性策略

**16.1 版本策略**：无版本前缀，向后兼容演进。

| 变更 | 策略 |
|------|------|
| 新增端点 / 可选请求字段 / 响应字段 | ✅ 允许（客户端容错未知字段） |
| 修改字段语义 | 🚫 禁止，新增字段替代 |
| 移除字段 | 🚫 先标记 `@deprecated`，下个大版本移除 |
| 改变鉴权 | 须在 [Devdocs-Sec.md](Devdocs-Sec.md) 记录并通告 |

**16.2 破坏性变更处理**：① 评估能否新增字段避免（[Devdocs-evolution.md](Devdocs-evolution.md) FF2）② 记 ADR ③ 双写过渡（旧字段 `@deprecated`）④ 客户端迁移窗口 ⑤ 移除旧字段。

**16.3 稳定契约字段**：`success`、`error`、`code`、`details`（错误）；分页 `items`/`total`/`page`/`pageSize`。其他业务字段可能演进，客户端须容错。

## 十七、健康检查端点

**17.1 公开** `GET /api/health`（公开）

返回 `{ status, timestamp, version, runtime, checks: { database, disk } }`；DB 异常返 503。不返回敏感信息。

```json
{
  "status": "ok", "timestamp": "2026-07-29T10:00:00.000Z",
  "version": "0.1.0", "runtime": "nodejs",
  "checks": { "database": "ok", "disk": { "available": 5368709120, "free": 10737418240 } }
}
```

> 对应 [Devdocs-evolution.md](Devdocs-evolution.md) Q5（2026-07-29）。

**17.2 安全健康检查（规划）**：`GET /api/health/events`（root，监听器状态）、`GET /api/health/security`（root，限流器/会话/迁移状态）。对应 [Devdocs-Sec.md](Devdocs-Sec.md) 第十一章。

---

