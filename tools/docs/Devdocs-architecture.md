# 项目架构与 API 参考文档

> 最后更新：2026-08-01（同步 shared/security 与 community/server 子目录拆分；合并 API 接口参考）
> 文档定位：架构与 API 契约权威文档（reference）
> 受众：开发工程师 / 架构评审 / API 接入方 / 新人
> 关联：安全与权限设计见 [Devdocs-security.md](Devdocs-security.md)；部署/SLO/Runbook 见 [Devdocs-ops.md](Devdocs-ops.md)；演进路线 ADR 见 [Devdocs-roadmap.md](Devdocs-evolution.md)

## 文档结构

- **Part A: 项目架构** — 目录结构、模块化分析、代码质量（原 Devdocs-architecture.md）
  - 一、项目结构 / 二、模块化分析 / 三、代码质量
- **Part B: API 接口参考** — 端点契约、鉴权、速率限制、错误码、事件总线（原 Devdocs-api-reference.md）
  - 一、通用约定 … 十七、健康检查端点

---

# Part A: 项目架构

## 一、项目结构

### 顶层目录

```
fztbucs-projects/
├── tools/                   # 工具集（测试 + 脚本 + 部署配置 + 文档）
│   ├── docs/                # 设计与开发文档
│   ├── tests/               # 所有测试
│   │   ├── e2e/             # Playwright E2E 测试
│   │   └── *.test.ts        # Vitest 单元测试
│   ├── scripts/             # Node.js 工具脚本（dev/start/build/create-user 等）
│   └── deploy/              # 部署配置（Docker + Caddy + Litestream）
├── public/                  # 静态资源（头像预设、logo）
├── src/                     # 源代码
│   ├── app/                 # Next.js App Router（页面 + API 路由）
│   ├── components/          # 全局 React 组件
│   ├── modules/             # 业务模块（server/types/ui 三层自洽）
│   ├── shared/              # 全局共享基础设施
│   └── server.ts            # 自定义 Node.js 服务器入口
├── .env.example             # 环境变量模板
├── next.config.ts           # Next.js 配置
├── tsconfig.json            # TypeScript 配置
├── eslint.config.mjs        # ESLint 配置
├── vitest.config.ts         # Vitest 配置
├── playwright.config.ts     # Playwright 配置
├── postcss.config.mjs       # PostCSS 配置
└── package.json
```

### 源代码结构（`src/`）

#### app/ - Next.js App Router

页面路由：

| 路由 | 说明 |
|------|------|
| `/` | 首页 - 极简单屏 Hero + 粒子莫比乌斯环 |
| `/about` | 关于页 |
| `/events` | 活动 - 年度计划 + 往期回顾 |
| `/events/[id]` | 活动详情 |
| `/login` | 登录/注册 |
| `/profile` | 个人资料 |
| `/admin` | 管理后台 |
| `/notifications` | 消息通知 |
| `/community` | 社区聚合页 - Feed 流 |
| `/community/forum` | 论坛首页 - 版块列表 + 最近主题 |
| `/community/forum/[category]` | 版块详情 - 主题列表 |
| `/community/forum/[category]/[topicId]` | 主题详情 - 主帖 + 回复 |
| `/community/forum/new` | 发新帖 |
| `/community/blog/[slug]` | 博客详情 - Markdown 渲染 |
| `/tools` | 工具集首页 |
| `/tools/exam` | 题库 |
| `/tools/exam/[id]` | 考试详情 |
| `/tools/resource` | 资源库 |
| `/tools/task` | 任务发布板 |
| `/tools/auxilio` | Auxilio 学习助手 |
| `/users/[id]` | 用户主页 |
| `/community/members` | 成员名录 |

全局文件：`layout.tsx`、`globals.css`、`robots.ts`、`error.tsx`、`loading.tsx`

#### components/ - 全局 React 组件

```
src/components/
├── index.ts                  # barrel：通用 UI 原子统一导出
├── primitives/               # 通用 UI 原子（无业务语义）
│   ├── button.tsx            # 通用按钮
│   ├── input.tsx             # 通用输入框
│   ├── loading.tsx           # 加载态组件（Loading/Overlay/Skeleton）
│   ├── spinner.tsx           # 旋转加载指示器
│   └── confirm-dialog.tsx    # 确认对话框
├── layout/                   # 全局布局结构
│   ├── navbar.tsx            # 顶部导航
│   ├── footer.tsx            # 页脚
│   ├── floating-capsule-sidebar.tsx # 悬浮折叠胶囊侧边栏
│   ├── page-header-background.tsx   # 页首背景图层
│   └── collapsing-hero.tsx   # 可折叠 Hero 区域
├── effects/                  # 视觉特效与动画
│   ├── mobius-ring.tsx       # 粒子莫比乌斯环
│   ├── page-transition.tsx   # 路由切换动画
│   ├── motion-primitives.tsx # 动画原语（Reveal/Stagger）
│   └── scroll-indicator.tsx  # 滚动进度指示器
├── feedback/                 # 反馈类组件
│   ├── toast.tsx             # Toast 通知
│   ├── fallback.tsx          # 共享 Loading/Error fallback
│   └── announcement-banner.tsx # 全站公告横幅
├── avatar.tsx                # 头像组件
├── user-menu.tsx             # 用户下拉菜单
├── notification-bell.tsx     # 通知铃铛
├── tech-tag-selector.tsx     # 技术方向标签选择器
├── theme-provider.tsx        # next-themes Provider
└── theme-toggle.tsx          # 主题切换按钮
```

#### shared/ - 全局共享基础设施

```
src/shared/
├── db.ts                    # SQLite 单例 + schema 初始化入口（保留根级）
├── app-error.ts             # 应用错误基类 + assertOwnership（保留根级）
├── logger.ts                # pino 结构化日志封装（Q4，dev 用 pino-pretty，生产 NDJSON）
├── server-only.ts           # server-only 包本地空实现（M11，自定义 dev server 模块解析兼容）
├── db/                      # 数据库子模块（PG 迁移 Phase 0+1 完成）
│   ├── drivers/             # 数据库驱动抽象（sqlite-driver / pg-driver）
│   ├── repositories/        # Repository 抽象层（audit.repo.ts）
│   ├── schema/              # Drizzle ORM schema（PG 迁移目标）
│   ├── schemas/             # SQLite fallback 手写 DDL
│   ├── schema.ts            # 表结构初始化入口
│   ├── seeds.ts             # 种子数据
│   └── cleanup.ts           # 过期数据清理
├── events/                  # 事件总线
│   ├── event-bus.ts         # 进程内事件总线
│   └── event-types.ts       # 事件类型定义
├── config/                  # 配置
│   ├── avatar-presets.ts    # 预设头像列表
│   ├── admin-avatars.ts     # 管理员头像彩蛋
│   ├── header-images.ts     # 页首背景图配置
│   └── auth-constants.ts    # 认证常量
├── hooks/                   # 客户端 hooks（全部 'use client' 标注，M11）
│   ├── use-auth.ts          # 认证状态 hook
│   ├── use-collapsing-hero.ts # Hero 收缩动画 hook
│   ├── use-debounce.ts      # 防抖 hook
│   ├── use-focus-trap.ts    # 焦点陷阱 hook
│   ├── use-topic-detail.ts  # 主题详情 hook
│   ├── use-topic-actions.ts # 主题操作 hook（Q1 拆分自 TopicDetail）
│   └── use-reply-actions.ts # 回复操作 hook（Q1 拆分自 TopicDetail）
├── types/                   # 共享类型定义
│   ├── role-types.ts        # 角色类型（UserRole / AdminRole）
│   ├── user-types.ts        # 用户公开类型（User）
│   └── audit-types.ts       # 审计上下文类型（M11 下沉，斩断 admin/types -> server-only 依赖链）
├── security/                # 安全相关（已模块化拆分）
│   ├── security.ts          # HTTP 入口安全（速率限制 / Cookie 解析）
│   ├── rate-limiter.ts      # 速率限制器实现
│   ├── origin-guard.ts      # Origin/Referer 校验（防 Login CSRF）
│   ├── request-utils.ts     # 请求工具（getClientIp 等）
│   ├── http-helpers.ts      # HTTP 响应工具
│   ├── password.ts          # 密码哈希（scrypt）与策略
│   ├── permissions.ts       # 权限点定义与角色元数据
│   ├── permission-points.ts # 权限点常量
│   ├── builtin-roles.ts     # 内置角色定义
│   ├── audit.ts             # 管理员操作审计日志
│   ├── proxy-headers.ts     # 反向代理头清理
│   ├── tenant-context.ts    # 多租户上下文（PG 迁移 Phase 1）
│   ├── schemas/             # zod 输入校验 schema（按模块拆分）
│   └── index.ts             # barrel 统一导出
└── utils/                   # 工具函数与服务
    ├── utils.ts             # 日期格式化等通用工具
    ├── pagination.ts        # 分页计算工具
    ├── image-utils.ts       # 图片魔数校验
    ├── tech-tags.ts         # 技术方向标签常量
    ├── ui-constants.ts      # UI 常量（z-index / EASE / INPUT_CLASS）
    ├── mail.ts              # 邮件发送服务
    ├── mask.ts              # 数据脱敏（邮箱/手机号，monitoring 与日志复用）
    └── monitoring.ts        # 错误监控封装（基于 pino，可选接入 Sentry）
```

#### modules/ - 业务模块（9 个）

每个模块统一结构：`server/`（业务逻辑）+ `types/`（类型定义）+ `ui/`（模块专属组件）。

| 模块 | 说明 | server 文件数 | 数据表 |
|------|------|:---:|------|
| `admin/` | 管理后台（用户/角色/审计/权限/密码重置） | 6 | users, sessions, admin_actions |
| `auth/` | 认证（登录/注册/2FA/OAuth/密码重置） | 6 | users, sessions, login_history, verification_codes, password_reset_requests |
| `community/` | 社区模块（论坛 + 博客 + 成员名录 + Feed 聚合） | 15 | forum_categories, forum_topics, forum_replies, forum_likes, forum_favorites, forum_topic_views, forum_mentions, forum_images, blog_posts, blog_series, blog_likes |
| `events/` | 活动（CRUD/报名/签到/归档/设置） | 6 | events, event_registrations, event_checkins |
| `join/` | 入社申请 | 1 | join_applications |
| `notification/` | 通知（含事件总线 notification-events.ts） | 2 | notifications |
| `announcement/` | 公告 | 1 | announcements |
| `tools/` | 工具集（考试/资源/任务/组件注册表/Auxilio） | 11 | exams, exam_questions, exam_question_options, exam_attempts, tasks, task_claims, resources, points_transactions |
| `user/` | 用户资料 | 2 | users, activity_participations |

社区模块（community）是 forum、blog、members 三个原独立模块的扁平合并产物，内部结构：

```
community/
├── server/
│   ├── forum/               # 论坛逻辑（子目录拆分）
│   │   ├── categories.ts    # 版块 CRUD
│   │   ├── topics.ts        # 主题 CRUD
│   │   ├── replies.ts       # 回复 CRUD
│   │   ├── reactions.ts     # 点赞 + 收藏
│   │   ├── moderation.ts    # 管理员审核
│   │   ├── mentions.ts      # @ 提及
│   │   ├── user-data.ts     # 用户主页论坛数据
│   │   ├── uploads.ts       # 图片上传
│   │   └── shared.ts        # 内部共享类型与工具
│   ├── blog/                # 博客逻辑（子目录拆分）
│   │   ├── posts.ts         # 文章 CRUD
│   │   ├── series.ts        # 系列管理
│   │   ├── likes.ts         # 点赞 + 浏览计数
│   │   └── utils.ts         # slug / tags / TOC
│   ├── members/             # 成员名录
│   ├── feed.ts              # Feed 聚合查询
│   └── index.ts             # 统一 barrel
├── types/
│   └── index.ts             # 统一类型（Forum/Blog/Members/Feed）
└── ui/                      # 社区 UI 组件
```

API 路由路径对应关系（完整端点契约见本文档 **Part B: API 接口参考**）：

| 业务域 | API 前缀 |
|--------|---------|
| 认证 | `/api/auth/*`、`/api/auth/2fa/*`、`/api/auth/oauth/*` |
| 个人资料 | `/api/profile/*`、`/api/avatars/*` |
| 活动 | `/api/events/*` |
| 社区（论坛/博客/成员/Feed/标签） | `/api/community/{forum,blog,members,feed,tags}/*` |
| 通知 | `/api/notifications/*` |
| 管理后台 | `/api/admin/{users,password-resets,events,notifications,actions,community,join,tools,announcements}/*` |
| 工具集 | `/api/tools/{exam,resource,task,points,auxilio,component-registry}/*` |
| 入社 | `/api/join` |
| 会话 | `/api/sessions` |
| 开发文档 | `/api/dev-docs/*` |
| 健康检查 | `/api/health`、`/api/health/events`（规划）、`/api/health/security`（规划） |

#### server.ts - 自定义服务器入口

Node.js 自定义服务器入口，通过 `tsx watch src/server.ts`（开发）或 tsup 打包后启动（生产）。

### 测试（`tools/tests/`）

> 更新（2026-07-31）：单元测试 437+，E2E 25+。下表按模块分组。

| 路径 | 框架 | 说明 |
|------|------|------|
| `tools/tests/announcement.test.ts` | Vitest | 公告模块（56 测试） |
| `tools/tests/blog-points.test.ts` | Vitest | 博客积分逻辑 |
| `tools/tests/events.test.ts` | Vitest | 活动 CRUD/报名/归档日期兼容（51 测试） |
| `tools/tests/exam.test.ts` | Vitest | 考试模块（58 测试） |
| `tools/tests/join.test.ts` | Vitest | 入社申请（38 测试） |
| `tools/tests/mask.test.ts` | Vitest | 数据脱敏 |
| `tools/tests/password-policy.test.ts` | Vitest | 密码策略与历史复用 |
| `tools/tests/permissions-hunt.test.ts` | Vitest | 角色权限漏洞修复验证 |
| `tools/tests/proxy-headers.test.ts` | Vitest | 反向代理头清理 |
| `tools/tests/resource.test.ts` | Vitest | 资源站（48 测试） |
| `tools/tests/security.test.ts` | Vitest | 安全工具单元测试 |
| `tools/tests/task.test.ts` | Vitest | 任务发布板（63 测试） |
| `tools/tests/totp.test.ts` | Vitest | TOTP 双因素认证 |
| `tools/tests/audit-repo.test.ts` | Vitest | 审计 Repository 抽象层 |
| `tools/tests/tenant-context.test.ts` | Vitest | 多租户上下文 |
| `tools/tests/error-rate-monitor.test.ts` | Vitest | 错误率监控告警 |
| `tools/tests/e2e/auth.spec.ts` | Playwright | 认证登录 E2E |
| `tools/tests/e2e/core-flows.spec.ts` | Playwright | 核心流程 E2E（论坛/考试/活动） |
| `tools/tests/e2e/events.spec.ts` | Playwright | 活动报名 E2E |
| `tools/tests/e2e/exam.spec.ts` | Playwright | 考试答题 E2E |
| `tools/tests/e2e/forum.spec.ts` | Playwright | 论坛发帖 E2E |
| `tools/tests/e2e/global-setup.ts` | Playwright | E2E globalSetup 自动建号 + storageState 复用 |

### 脚本（`tools/scripts/`）

| 文件 | 说明 |
|------|------|
| `build-app.mjs` | 构建脚本 |
| `dev-server.mjs` | 开发服务器启动（端口 2333） |
| `start-server.mjs` | 生产服务器启动 |
| `install-deps.sh` | 依赖安装 |
| `create-user.mjs` | CLI 创建/提升特权账号 |
| `seed-exam-data.mjs` | 填充工具集种子数据 |
| `cloudflare-tunnel.mjs` | Cloudflare Tunnel 内网穿透 |
| `setup-litestream.sh` | Litestream 配置脚本 |

### 部署配置（`tools/deploy/`）

Docker + Caddy + Litestream 方案，详见 [Devdocs-ops.md](Devdocs-ops.md) Part A。

### 数据库

数据库文件位于 `data/app.db`（gitignored），首次启动自动创建并初始化 schema 和 seed 数据。用户上传的头像和论坛图片也存储在 `data/`（avatars/、forum-images/）。

### 部署模型与单进程假设

> 重要约束：当前为单进程部署模型，多个安全机制依赖此前提。

| 组件 | 实现位置 | 单进程依赖 |
|------|---------|-----------|
| 速率限制（`RateLimiter`） | [src/shared/security/security.ts](../../src/shared/security/security.ts#L248-L296) | ✅ 基于内存 Map |
| Session 存储 | SQLite `sessions` 表 | ❌（共享存储，无单进程依赖） |
| 2FA 预认证 token 防重放（`consumed jti` 集合） | [src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts) | ✅ 进程内 Set |
| 事件总线（`appBus`） | [src/shared/events/event-bus.ts](../../src/shared/events/event-bus.ts) | ✅ Node.js EventEmitter |

多实例部署前的迁移清单（必须完成才能横向扩展）：

1. 速率限制迁移到 Redis（替换 `RateLimiter` 的 Map 实现）
2. 2FA 预认证 token 的 `consumed jti` 集合迁移到 Redis SET（带 5min TTL）
3. 事件总线评估是否需要跨实例广播（参见 [Devdocs-security.md](Devdocs-security.md) ADR-014）

> 在未完成上述迁移前，禁止多实例部署，否则速率限制与防重放将失效。

---

## 二、模块化分析

### 2.1 模块层级关系

```
基础设施层（shared/）- 被所有模块依赖
    ├── db.ts / db/        - 数据库单例 + schema + seeds
    ├── security.ts        - 安全工具
    ├── events/event-bus.ts - 事件总线
    └── 其他 shared 工具
          ↓
    核心业务模块
    ├── auth               - 注册 / 登录 / OAuth / 2FA / Session
    ├── user               - 个人资料 / 用户主页
    ├── community          - 论坛 + 博客 + 成员名录 + Feed
    ├── events             - 活动 CRUD / 报名 / 签到
    ├── tools              - 考试 / 任务 / 资源 / Auxilio
    ├── notification       - 站内通知
    ├── announcement       - 全站公告
    └── join               - 入社申请
          ↓
    跨模块聚合层
    └── admin              - 管理后台（聚合所有模块的管理操作 + 审计日志）
```

### 2.2 community 模块内部结构

```
community/
├── server/
│   ├── forum/             # 论坛逻辑（子目录拆分）
│   │   ├── categories.ts  # 版块 CRUD
│   │   ├── topics.ts      # 主题 CRUD
│   │   ├── replies.ts     # 回复 CRUD
│   │   ├── reactions.ts   # 点赞 + 收藏
│   │   ├── moderation.ts  # 管理员审核
│   │   ├── mentions.ts    # @ 提及
│   │   ├── user-data.ts   # 用户主页论坛数据
│   │   ├── uploads.ts     # 图片上传
│   │   └── shared.ts      # 内部共享类型与工具
│   ├── blog/              # 博客逻辑（子目录拆分）
│   │   ├── posts.ts       # 文章 CRUD
│   │   ├── series.ts      # 系列管理
│   │   ├── likes.ts       # 点赞 + 浏览计数
│   │   └── utils.ts       # slug / tags / TOC
│   ├── members/           # 成员名录
│   │   └── index.ts
│   ├── feed.ts            # Feed 聚合查询
│   └── index.ts           # 统一 barrel
└── types/
    └── index.ts           # ForumTopic/BlogPost/MemberItem/FeedItem 等统一类型
```

文件命名规范：按业务域拆分为 `forum/`、`blog/`、`members/` 子目录，文件名去除原模块前缀（`forum-`/`blog-`），扁平放在对应子目录下。

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

### 3.1 历史问题收敛状态

> 更新（2026-07-31）：P0 代码质量方向 Q1/Q2/Q3 已全部收敛，详见 roadmap。下表保留历史记录供追溯。

| # | 严重度 | 类别 | 问题 | 状态 |
|---|--------|------|------|------|
| 1 | 🔴 高 | 复杂度 | TopicDetail 页面组件过长 | ✅ 已完成（Q1，主组件 191 行，拆出 3 子组件 + 2 hook） |
| 2 | 🟡 中 | 冗余代码 | `EASE` 缓动常量重复定义 | ✅ 已完成（Q3，统一 `--ease-ark` CSS 变量 + `.hero-reveal`） |
| 3 | 🟡 中 | 不一致 | 错误处理模式不统一 | ✅ 已完成（Q2，全站 `AppError` + `errorResponse` 状态码映射） |

### 3.2 已完成优化

| 优化项 | 说明 |
|------|------|
| 论坛/博客/成员模块合并 | forum + blog + members -> community，统一 flat 结构 |
| App 路由重组 | `/forum/*` -> `/community/forum/*`、`/blog/*` -> `/community/blog/*`、`/members` -> `/community/members` |
| API 路由重组 | `/api/forum/*` -> `/api/community/forum/*` 等 |
| 类型统一定义 | 所有 ForumTopic/BlogPost/MemberItem/FeedItem 统一定义在 `community/types/index.ts` |
| 文件结构精简 | tests/scripts/deploy/dev-docs -> tools/；`shared/ui/` -> `components/ui/` |
| Sentry 依赖移除 | `@sentry/nextjs` 未安装，monitoring.ts 基于 pino，可选接入 Sentry |
| template.tsx 删除 | 无实际逻辑的直通透传 |
| security.test.ts 迁移 | `shared/` -> `tools/tests/` |
| 未使用 import 清理 | resource/index.ts 中 TECH_TAGS 已移除 |
| Q1 TopicDetail 拆分 | 主组件 < 200 行，拆出 `TopicHero`/`TopicContent`/`TopicReplySection` + `useTopicActions`/`useReplyActions` |
| Q2 错误处理统一 | 全站服务层抛 `AppError`，路由层 `errorResponse` 按 `ERROR_STATUS_MAP` 映射 |
| Q3 EASE 常量提取 | 功能代码零硬编码 cubic-bezier，统一 `--ease-ark` 变量 |
| Q4 pino 结构化日志 | `shared/logger.ts` + 请求 ID 链路 + 19 路由 `console.*` 全替换 |
| Q5 健康检查端点 | `/api/health` 返回 DB/磁盘/版本号 |
| Q6 请求 ID 注入 | `server.ts` + `proxy.ts` 协同注入 `X-Request-Id` |
| F1 CollapsingHero 统一 | 19 个页面统一使用（首页/登录页除外） |
| F2 CSP nonce 化 | `proxy.ts` per-request nonce，移除 `unsafe-inline` |
| F3 proxy.ts 统一入口 | 安全头/限流/请求 ID 统一入口 |
| M3 活动月历视图 | `events/ui/month-calendar.tsx`，时间轴/月历双视图切换 |
| M11 客户端/服务端边界澄清 | server-only 标记 + hooks 'use client' + AuditContext 类型下沉 |

### 3.3 待处理优化

> P0 代码质量方向已清零。剩余项均为 P1/P2，详见 roadmap 第三章。

- 中优先级（P1）：M10 Repository 抽象层、M1 关注/好友系统、M2 Wiki/知识库、M4 活动评价、M5 相册
- 低优先级（P2）：L6 PWA 离线增强、L8 未读通知 SSE 推送、L9 定时任务系统

---

# Part B: API 接口参考

> 最后更新：2026-08-01（修复 community 路径重复 + instrumentation 代码片段同步）
> 验证 cadence：API 契约变更时 | Stale 信号：API 端点清单与实际路由不一致

---

## 一、通用约定

### 1.1 基础 URL

```
开发环境：http://localhost:2333
生产环境：https://<your-domain>
```

### 1.2 鉴权机制

| 鉴权级别 | 标识 | 说明 |
|---------|------|------|
| 公开 | - | 无需登录，任何人可访问 |
| 登录 | `requireAuth` | 需携带有效 Session Cookie |
| 管理员 | `requireAdmin` | 需登录 + 角色为 `admin` 或 `root` |
| 超级管理员 | `requireRoot` | 需登录 + 角色为 `root` |

### 1.3 请求/响应格式

- Content-Type：`application/json`
- 成功响应：`{ success: true, data?: ... }`
- 错误响应：`{ error: string }` + 对应 HTTP 状态码

### 1.4 安全措施

所有写操作（POST/PUT/DELETE）均实施：
- Origin 白名单校验
- 速率限制（登录路由：5 次/分钟/IP；写操作：5-10 次/分钟/IP）
- 管理员操作：审计日志记录到 `admin_actions` 表

---

## 二、认证模块（/api/auth/）

### 2.1 基础认证

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 公开 | 用户注册（邮箱 + 密码 + 验证码） |
| POST | `/api/auth/login` | 公开 | 用户登录（邮箱 + 密码） |
| POST | `/api/auth/logout` | 登录 | 登出，销毁 Session |
| GET | `/api/auth/me` | 登录 | 获取当前登录用户信息 |
| POST | `/api/auth/send-code` | 公开 | 发送邮箱验证码（注册/找回密码） |
| POST | `/api/auth/forgot-password` | 公开 | 申请密码重置（发送重置邮件） |
| GET | `/api/auth/oauth/github` | 公开 | GitHub OAuth 登录入口（302 重定向） |
| GET | `/api/auth/oauth/github/callback` | 公开 | GitHub OAuth 回调处理 |

### 2.2 双因素认证（TOTP）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/auth/2fa` | 登录 | 查询 2FA 状态（是否启用 / 是否已设置） |
| POST | `/api/auth/2fa/setup` | 登录 | 初始化 2FA（生成 secret + QR + backup codes，未确认前不生效） |
| POST | `/api/auth/2fa/verify` | 登录 | 验证码（设置确认 / 登录二次验证） |
| POST | `/api/auth/2fa/disable` | 登录 | 禁用 2FA（需验证码） |
| POST | `/api/auth/2fa/backup-codes` | 登录 | 重新生成备用码（需验证码） |

> 备注：TOTP 基于 RFC 6238 自实现，secret 使用 AES-256-GCM 加密存储。管理员可被强制启用 2FA。

---

## 三、个人资料模块（/api/profile/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/profile` | 登录 | 获取当前用户完整资料 |
| PUT | `/api/profile` | 登录 | 更新个人资料（displayName、bio 等） |
| POST | `/api/profile/password` | 登录 | 修改密码（需旧密码验证） |
| POST | `/api/profile/avatar/upload` | 登录 | 上传自定义头像（2MB / JPEG/PNG/WebP） |
| POST | `/api/profile/avatar/preset` | 登录 | 设置预设头像（从预设列表中选择） |
| GET | `/api/avatars/[filename]` | 公开 | 头像静态文件服务 |

---

## 四、活动模块（/api/events/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/events` | 公开 | 活动列表（支持 status/type/page 参数） |
| GET | `/api/events/[id]` | 公开 | 活动详情 |
| POST | `/api/events/[id]/register` | 登录 | 报名活动 |
| GET | `/api/events/[id]/registration` | 登录 | 查询当前用户对某活动的报名状态 |
| GET | `/api/events/me/registered` | 登录 | 获取当前用户已报名的活动列表 |

---

## 五、论坛模块（/api/community/forum/）

### 5.1 版块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/forum/categories` | 公开 | 版块列表 |

### 5.2 主题

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/forum/topics` | 公开 | 主题列表（支持 category/search/page/sort） |
| GET | `/api/community/forum/topics/[id]` | 公开 | 主题详情（含点赞/收藏状态） |
| POST | `/api/community/forum/topics` | 登录 | 创建主题（速率限制 5/min/IP） |
| PUT | `/api/community/forum/topics/[id]` | 作者/管理员 | 编辑主题 |
| DELETE | `/api/community/forum/topics/[id]` | 作者/管理员 | 软删除主题 |

### 5.3 回复

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/forum/topics/[id]/replies` | 公开 | 回复列表（主回复分页） |
| POST | `/api/community/forum/topics/[id]/replies` | 登录 | 创建回复（含楼中楼） |
| GET | `/api/community/forum/replies/[id]/nested` | 公开 | 楼中楼列表 |
| PUT | `/api/community/forum/replies/[id]` | 作者/管理员 | 编辑回复 |
| DELETE | `/api/community/forum/replies/[id]` | 作者/管理员 | 软删除回复 |

### 5.4 互动

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/community/forum/like` | 登录 | 切换点赞（target_type + target_id） |
| POST | `/api/community/forum/favorite` | 登录 | 切换收藏（topic_id） |
| GET | `/api/community/forum/favorites` | 登录 | 收藏列表 |

### 5.5 用户内容

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/forum/users/[id]/topics` | 公开 | 用户发布的主题 |
| GET | `/api/community/forum/users/[id]/replies` | 公开 | 用户发布的回复 |

### 5.6 上传

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/community/forum/upload` | 登录 | 图片上传（5MB / JPEG/PNG/WebP/GIF） |
| GET | `/api/community/forum/images/[filename]` | 公开 | 论坛图片静态服务 |

---

## 六、通知模块（/api/notifications/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/notifications` | 登录 | 通知列表（分页） |
| GET | `/api/notifications/unread-count` | 登录 | 未读通知数量 |
| POST | `/api/notifications/[id]/read` | 登录 | 标记单条通知为已读 |
| POST | `/api/notifications/read-all` | 登录 | 标记全部通知为已读 |

---

## 七、管理后台（/api/admin/）

### 7.1 用户管理（管理员 + 超级管理员）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/users` | 管理员 | 用户列表（含分页/搜索） |
| GET | `/api/admin/users/[id]` | 管理员 | 用户详情 |
| PUT | `/api/admin/users/[id]` | 超级管理员 | 编辑用户资料 |
| POST | `/api/admin/users/[id]/disable` | 管理员 | 禁用用户（仅普通用户） |
| POST | `/api/admin/users/[id]/enable` | 管理员 | 启用用户 |
| POST | `/api/admin/users/[id]/reset-password-default` | 管理员 | 重置密码为默认密码（仅普通用户） |

### 7.2 用户管理（仅超级管理员）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/admin/users/[id]/reset-password` | 超级管理员 | 自定义重置密码 |
| DELETE | `/api/admin/users/[id]` | 超级管理员 | 硬删除用户 |

### 7.3 密码重置审批

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/password-resets` | 管理员 | 密码重置申请列表 |
| POST | `/api/admin/password-resets/[id]/approve` | 管理员 | 批准密码重置申请 |
| POST | `/api/admin/password-resets/[id]/reject` | 管理员 | 拒绝密码重置申请 |

### 7.4 活动管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/events` | 管理员 | 活动列表（含管理字段） |
| POST | `/api/admin/events` | 管理员 | 创建活动 |
| PUT | `/api/admin/events/[id]` | 管理员 | 编辑活动 |
| DELETE | `/api/admin/events/[id]` | 管理员 | 删除活动 |

### 7.5 通知管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/notifications` | 管理员 | 通知列表（管理视图） |
| POST | `/api/admin/notifications` | 管理员 | 发送全站通知 |

### 7.6 审计日志（仅超级管理员）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/actions` | 超级管理员 | 管理员操作日志列表 |
| DELETE | `/api/admin/actions/[id]` | 超级管理员 | 删除指定日志条目 |

### 7.7 论坛管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/community/forum/topics` | 管理员 | 论坛主题列表（管理视图） |
| PUT | `/api/admin/community/forum/topics/[id]` | 管理员 | 编辑任意主题 |
| DELETE | `/api/admin/community/forum/topics/[id]` | 管理员 | 删除任意主题 |
| POST | `/api/admin/community/forum/topics/[id]/hide` | 管理员 | 隐藏主题 |
| POST | `/api/admin/community/forum/topics/[id]/restore` | 管理员 | 恢复主题 |
| POST | `/api/admin/community/forum/topics/[id]/pin` | 管理员 | 切换置顶 |
| POST | `/api/admin/community/forum/topics/[id]/feature` | 管理员 | 切换精华 |
| PUT | `/api/admin/community/forum/replies/[id]` | 管理员 | 编辑任意回复 |
| DELETE | `/api/admin/community/forum/replies/[id]` | 管理员 | 删除任意回复 |
| POST | `/api/admin/community/forum/replies/[id]/hide` | 管理员 | 隐藏回复 |
| POST | `/api/admin/community/forum/replies/[id]/restore` | 管理员 | 恢复回复 |
| GET | `/api/admin/community/forum/categories` | 管理员 | 版块列表（管理视图） |
| POST | `/api/admin/community/forum/categories` | 管理员 | 创建版块 |
| PUT | `/api/admin/community/forum/categories/[id]` | 管理员 | 编辑版块 |
| DELETE | `/api/admin/community/forum/categories/[id]` | 管理员 | 删除版块 |

### 7.8 博客管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/admin/community/blog` | 管理员 | 博客管理操作（publish/archive/delete） |

### 7.9 入社审批

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/join` | 管理员 | 入社申请列表（支持状态筛选） |
| PATCH | `/api/admin/join` | 管理员 | 审批入社申请（通过/拒绝） |

### 7.10 工具集管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/tools/exam` | 管理员(exam_admin) | 考试列表（管理视图） |
| POST | `/api/admin/tools/exam` | 管理员(exam_admin) | 创建考试 |
| PUT | `/api/admin/tools/exam/[id]` | 管理员(exam_admin) | 编辑考试 |
| DELETE | `/api/admin/tools/exam/[id]` | 管理员(exam_admin) | 删除考试 |
| POST | `/api/admin/tools/exam/[id]/publish` | 管理员(exam_admin) | 发布考试 |
| POST | `/api/admin/tools/exam/[id]/end` | 管理员(exam_admin) | 结束考试 |
| GET/POST | `/api/admin/tools/exam/[id]/questions` | 管理员(exam_admin) | 题目管理 |
| PUT/DELETE | `/api/admin/tools/exam/[id]/questions/[qid]` | 管理员(exam_admin) | 单题管理 |
| GET | `/api/admin/tools/exam/[id]/ranking` | 管理员(exam_admin) | 考试排名 |
| POST | `/api/admin/tools/resource` | 管理员 | 资源审核（通过/拒绝/下架） |
| POST | `/api/admin/tools/task` | 管理员(task_publisher) | 任务管理操作（create/publish/close/claim 审核） |

### 7.11 活动签到与统计

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/admin/events/[id]/checkin` | 管理员 | 活动签到核销 |
| POST | `/api/admin/events/[id]/registrations/manage` | 管理员 | 报名管理 |
| POST | `/api/admin/events/batch` | 管理员 | 活动批量操作 |
| GET | `/api/admin/events/stats` | 管理员 | 活动统计 |

### 7.12 公告管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/announcements` | 管理员 | 公告列表 |
| POST | `/api/admin/announcements` | 管理员 | 创建公告 |
| GET | `/api/admin/announcements/[id]` | 管理员 | 公告详情 |
| PATCH | `/api/admin/announcements/[id]` | 管理员 | 编辑公告 |
| DELETE | `/api/admin/announcements/[id]` | 管理员 | 删除公告 |

---

## 八、博客模块（/api/community/blog/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/blog` | 公开 | 已发布文章列表（支持分类筛选/搜索/分页） |
| POST | `/api/community/blog` | 登录 | 创建草稿 |
| GET | `/api/community/blog/[slug]` | 公开 | 文章详情（含目录导航/点赞状态） |
| PUT | `/api/community/blog/[slug]` | 作者/管理员 | 编辑文章 |
| DELETE | `/api/community/blog/[slug]` | 作者/管理员 | 删除文章 |
| POST | `/api/community/blog/[slug]/like` | 登录 | 点赞/取消点赞 |
| GET | `/api/community/blog/series` | 公开 | 系列列表 |
| POST | `/api/community/blog/series` | 登录 | 创建系列 |

---

## 九、工具集模块（/api/tools/）

### 9.1 考试

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tools/exam` | 公开 | 题库列表（按标签筛选） |
| GET | `/api/tools/exam/[id]` | 登录 | 考试详情 |
| POST | `/api/tools/exam/[id]/submit` | 登录 | 提交答卷（自动判分） |
| GET | `/api/tools/exam/[id]/my-results` | 登录 | 我的成绩 |

### 9.2 资源

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tools/resource` | 公开 | 资源列表 |
| POST | `/api/tools/resource/upload` | 登录 | 上传资源（审核后公开） |

### 9.3 任务

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tools/task` | 公开 | 任务列表 |
| GET | `/api/tools/task/[id]` | 公开 | 任务详情 |
| POST | `/api/tools/task/[id]/claim` | 登录 | 认领任务 |
| DELETE | `/api/tools/task/[id]/claim` | 登录 | 取消认领 |
| GET | `/api/tools/task/[id]/claims` | 公开 | 任务认领列表 |
| GET | `/api/tools/task/claims` | 登录 | 我的认领 |

### 9.4 积分

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tools/points` | 登录 | 个人积分 |
| GET | `/api/tools/points/leaderboard` | 公开 | 排行榜 |

### 9.5 Auxilio 学习助手

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tools/auxilio` | 登录 | 学习分析（薄弱点画像 + 资源推荐） |

### 9.6 开发文档（/api/dev-docs/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/dev-docs` | admin+ | 列出 tools/docs 下所有 .md 文档（slug/标题/大小/修改时间） |
| GET | `/api/dev-docs/[slug]` | admin+ | 读取文档内容（返回 readOnly 字段标识是否可编辑） |
| PUT | `/api/dev-docs/[slug]` | root | 写入文档内容（1MB 限制，审计日志） |
| DELETE | `/api/dev-docs/[slug]` | root | 删除文档（审计日志） |

安全：路径穿越防护（slug 禁止 `/`、`..`、`\`）+ assertAllowedOrigin + adminActionsLimiter 限流。

---

## 十、成员与入社模块

### 10.1 成员名录

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/members` | 公开 | 成员名录（按技术方向筛选） |

### 10.2 入社申请

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/join` | 公开 | 提交入社申请（姓名/学号/专业/技术方向/联系方式） |

---

## 十一、会话管理模块（/api/sessions/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/sessions` | 登录 | 活跃会话列表（设备/IP/最后活跃时间） |
| DELETE | `/api/sessions` | 登录 | 远程登出指定会话 |

---

## 十二、速率限制参考

限制器集中定义于 [src/shared/security/security.ts](../../src/shared/security/security.ts) 的 `RATE_LIMIT_CONFIG`。默认值可通过环境变量覆盖：`RATE_LIMIT_<NAME>_MAX`（窗口内最大次数）与 `RATE_LIMIT_<NAME>_WINDOW_MS`（窗口时长毫秒），`<NAME>` 为下表「限制器」列的大写形式（如 `RATE_LIMIT_LOGIN_MAX=20`）。

| 限制器 | 默认值 | 窗口 | key 维度 | 主要路由 |
|--------|:------:|:----:|---------|---------|
| `login` | 10 | 60s | IP+邮箱 | `POST /api/auth/login` |
| `register` | 5 | 60s | IP | `POST /api/auth/register` |
| `sendCode` | 3 | 60s | IP+email | `POST /api/auth/send-code` |
| `forgotPassword` | 3 | 60s | IP | `POST /api/auth/forgot-password` |
| `twoFactor` | 5 | 60s | IP+用户 | `POST /api/auth/2fa/verify`、`/disable`、`/backup-codes` |
| `twoFactorSetup` | 3 | 60s | IP+用户 | `POST /api/auth/2fa/setup`（防资源消耗 DoS） |
| `auth` | 20 | 60s | IP | `/api/auth/oauth/*` |
| `profileUpdate` | 10 | 60s | IP | `PATCH /api/profile`、`/api/profile/password`、`/api/sessions` |
| `avatarPreset` | 10 | 60s | IP | `POST /api/profile/avatar/preset` |
| `avatarUpload` | 5 | 60s | IP | `POST /api/profile/avatar/upload` |
| `adminActions` | 30 | 60s | IP | `/api/admin/*`、`/api/tools/component-registry/*` |
| `forumPost` | 5 | 60s | IP | `POST /api/community/forum/topics` |
| `forumReply` | 10 | 60s | IP | `POST /api/community/forum/topics/[id]/replies`、`/api/tools/exam/[id]/submit` |
| `forumLike` | 30 | 60s | IP | `POST /api/community/forum/like`、`/favorite` |
| `forumUpload` | 10 | 60s | IP | `POST /api/community/forum/upload`、`/api/tools/resource/upload` |
| `eventCheckin` | 10 | 60s | IP | `POST /api/admin/events/[id]/checkin` |
| `resourceSubmit` | 5 | 60s | IP | 已定义预留（当前路由复用 `forumUpload`/`forumReply`） |
| `resourceUpload` | 5 | 60s | IP | 已定义预留（当前路由复用 `forumUpload`） |
| `joinApplication` | 3 | 60s | IP | 已定义预留（入社申请审核走 `adminActions`） |
| 读操作 | - | - | - | 无硬限制 |

> 限制器为单进程内存实现（`Map`），适合单实例部署；多实例部署前必须迁移到 Redis 等共享存储。响应头 `Retry-After` 与 `X-RateLimit-Remaining` 标识剩余配额。

---

## 十三、状态码约定

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 302 | 重定向（OAuth） |
| 400 | 请求参数错误 |
| 403 | 401 |
| 401 | 未登录 / Session 过期 |
| 404 | 403 |
| 409 | 冲突（如重复注册、重复报名） |
| 413 | 上传文件过大 |
| 429 | 速率限制 |
| 500 | 服务器内部错误 |

---

## 十四、错误响应扩展

### 14.1 标准错误响应格式

所有 API 错误响应统一格式：

```json
{
  "error": "string",
  "code": "string",
  "details": {}
}
```

| 字段 | 必填 | 说明 |
|------|:---:|------|
| `error` | ✅ | 人类可读的错误消息（已映射，不泄露内部信息）|
| `code` | ✅ | 机器可读的错误码（见下表）|
| `details` | ❌ | 字段级错误详情（仅 Zod 校验失败时返回）|

### 14.2 错误码清单

> 对应 [Devdocs-security.md](Devdocs-security.md) 发现 15「错误响应不泄露内部信息」。

| code | HTTP | 触发场景 |
|------|:----:|---------|
| `INVALID_ORIGIN` | 403 | Origin/Referer 不在白名单 |
| `INVALID_CONTENT_TYPE` | 400 | Content-Type 非 application/json |
| `VALIDATION_FAILED` | 400 | Zod schema 校验失败（含 `details`）|
| `UNAUTHORIZED` | 401 | 未登录或 Session 过期 |
| `FORBIDDEN` | 403 | 权限不足（角色不够 / 非作者）|
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 状态冲突（重复操作）|
| `RATE_LIMITED` | 429 | 触发速率限制（含 `retryAfter` 字段）|
| `FILE_TOO_LARGE` | 413 | 上传文件超限 |
| `INVALID_FILE_TYPE` | 400 | 文件类型不在白名单 |
| `ACCOUNT_DISABLED` | 403 | 用户已被禁用 |
| `2FA_REQUIRED` | 403 | 需要完成 2FA 验证 |
| `2FA_FAILED` | 403 | 2FA 验证码错误 |
| `PASSWORD_CONFIRMATION_REQUIRED` | 403 | 高危操作需密码二次确认 |
| `LAST_ADMIN_PROTECTED` | 403 | 试图降级/删除最后一个管理员 |
| `INTERNAL_ERROR` | 500 | 未知错误（记录日志，返回通用消息）|

### 14.3 Zod 校验错误详情示例

```json
{
  "error": "请求参数错误",
  "code": "VALIDATION_FAILED",
  "details": {
    "email": "请输入有效的邮箱地址",
    "password": "密码至少 8 位"
  }
}
```

---

## 十五、事件总线接口

> 事件总线为进程内通信，非 HTTP 接口。此处记录事件契约，供模块开发参考。
>
> 对应 [Devdocs-project-rules.md](Devdocs-project-rules.md) 模块协作规范、[Devdocs-roadmap.md](Devdocs-evolution.md) ADR-013/014。

### 15.1 事件总线 API

```typescript
import { appBus } from '@/shared/events';

// 发布事件
appBus.emit('event.created', { eventId, title, description, adminId });

// 订阅事件
appBus.on('reply.created', (data) => { ... });

// 取消订阅
appBus.off('reply.created', handler);
```

运行时特性：
- 同步 emit：Node.js EventEmitter 默认同步执行所有监听器（对应 ADR-014）
- 类型安全：通过 `AppEventMap` 约束事件名和 payload
- 单例：模块级导出 `appBus`，全进程共享

### 15.2 事件清单

所有事件类型定义于 [src/shared/events/event-types.ts](../../src/shared/events/event-types.ts)。

| 事件名 | 发布方 | 订阅方 | Payload |
|--------|--------|--------|---------|
| `event.created` | events 模块 | notification | `{ eventId, title, description, adminId }` |
| `event.registered` | events 模块 | notification | `{ userId, eventId, eventTitle }` |
| `event.cancelled` | events 模块 | notification | `{ userId, eventId, eventTitle }` |
| `event.checkin.generated` | admin 模块 | notification | `{ eventId, adminId, generated }` |
| `reply.created` | community 模块 | notification | `{ replyId, topicId, authorId, contentMarkdown, mentionedUserIds }` |
| `user.registered` | auth 模块 | notification | `{ userId }` |
| `task.claim.approved` | tools 模块 | notification | `{ userId, taskId, taskTitle, points }` |
| `exam.passed` | tools 模块 | notification | `{ userId, examId, examTitle, score, points }` |

### 15.3 新增事件流程

1. 在 `src/shared/events/event-types.ts` 的 `AppEventMap` 接口添加事件类型
2. 发布方调用 `appBus.emit('event.name', payload)`
3. 订阅方调用 `appBus.on('event.name', handler)`，handler 内部 try-catch
4. 更新本章节的事件清单表格
5. 更新本文档 Part A 依赖矩阵（如新增模块间依赖）

### 15.4 事件监听器初始化

> 对应 [ADR-013](Devdocs-evolution.md#adr-013-事件监听器显式初始化)（已实施 2026-07-29）。

通知模块事件监听器迁移至 `src/instrumentation.ts` 显式初始化（逻辑委托给 `src/instrumentation-node.ts`，server-only，使用 pino logger），不再依赖模块加载副作用：

```typescript
// src/instrumentation.ts - Next.js instrumentation 入口
// 实际初始化逻辑委托给 instrumentation-node.ts（server-only，使用 pino logger）
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/instrumentation-node');
  }
}
```

`instrumentation-node.ts` 显式调用 `initNotificationEvents()` 注册通知事件监听器，并注册 `unhandledRejection`/`uncaughtException` 全局处理器写入 pino 结构化日志（ADR-013 + ADR-015）。`initNotificationEvents()` 内部有幂等保护（`initialized` 标志），重复调用安全。基础健康检查 `/api/health` 已就绪；事件监听器状态探活端点 `/api/health/events` 规划中。

---

## 十六、版本化与兼容性策略

### 16.1 API 版本策略

当前 API 无版本前缀（如 `/api/v1/...`），采用向后兼容演进策略：

| 变更类型 | 策略 |
|---------|------|
| 新增端点 | 直接添加，无需版本 |
| 新增可选请求字段 | 允许，客户端忽略未知字段 |
| 新增响应字段 | 允许，客户端不应假设响应只有已知字段 |
| 修改字段语义 | 🚫 禁止，必须新增字段替代 |
| 移除字段 | 🚫 禁止，先标记废弃，下个大版本移除 |
| 改变鉴权要求 | 必须在 [Devdocs-security.md](Devdocs-security.md) 记录并通告 |

### 16.2 破坏性变更处理

当必须引入破坏性变更时：

1. 评估必要性：能否通过新增字段避免？对应 [Devdocs-roadmap.md](Devdocs-evolution.md) FF2（公开契约兼容）
2. 记录 ADR：在 roadmap 新增 ADR 说明变更原因和影响
3. 双写过渡：新旧字段同时返回，旧字段标记 `@deprecated`
4. 客户端迁移：通告所有已知客户端，提供迁移窗口
5. 移除旧字段：确认无客户端依赖后移除

### 16.3 响应字段稳定性

以下字段为稳定契约，客户端可依赖：

- `success: boolean` - 成功响应固定字段
- `error: string` - 错误响应固定字段
- `code: string` - 错误响应机器可读码（见第十四章）
- 分页响应的 `items` / `total` / `page` / `pageSize` 字段

其他业务字段（如 `displayName`、`bio`）可能随业务演进调整，客户端应做容错处理。

---

## 十七、健康检查端点

### 17.1 公开健康检查

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 公开 | 基础存活检查，返回 `{ status, timestamp, version, runtime, checks: { database, disk } }`；DB 异常时返回 503 |

响应示例（200）：

```json
{
  "status": "ok",
  "timestamp": "2026-07-29T10:00:00.000Z",
  "version": "0.1.0",
  "runtime": "nodejs",
  "checks": {
    "database": "ok",
    "disk": { "available": 5368709120, "free": 10737418240 }
  }
}
```

> 对应 roadmap Q5（已完成 2026-07-29）。不返回敏感信息（DB 路径、环境变量、用户数）。

### 17.2 安全健康检查（规划中）

> 对应 [Devdocs-security.md](Devdocs-security.md) 第十一章。

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health/events` | 超级管理员 | 事件监听器注册状态 |
| GET | `/api/health/security` | 超级管理员 | 速率限制器状态、会话统计、迁移状态 |

---

*本文档由 2026-08-01 合并 Devdocs-api-reference.md 至 Devdocs-architecture.md 生成，原 API 契约内容完整保留于 Part B。*
