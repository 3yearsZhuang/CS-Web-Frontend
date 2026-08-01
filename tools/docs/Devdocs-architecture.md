# 项目架构文档

> 最后更新：2026-08-01（同步 shared/security 与 community/server 子目录拆分）

---

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

API 路由路径对应关系：
- `/api/community/forum/*` - 论坛 API
- `/api/community/blog/*` - 博客 API
- `/api/community/members` - 成员 API
- `/api/community/feed` - Feed 聚合 API
- `/api/community/tags` - 聚合标签 API
- `/api/admin/community/forum/*` - 管理员论坛操作
- `/api/admin/community/blog/*` - 管理员博客操作

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

Docker + Caddy + Litestream 方案，详见 [Devdocs-deployment-guide.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-deployment-guide.md)。

### 数据库

数据库文件位于 `data/app.db`（gitignored），首次启动自动创建并初始化 schema 和 seed 数据。用户上传的头像和论坛图片也存储在 `data/`（avatars/、forum-images/）。

### 部署模型与单进程假设

> 重要约束：当前为单进程部署模型，多个安全机制依赖此前提。

| 组件 | 实现位置 | 单进程依赖 |
|------|---------|-----------|
| 速率限制（`RateLimiter`） | [src/shared/security/security.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/shared/security/security.ts#L248-L296) | ✅ 基于内存 Map |
| Session 存储 | SQLite `sessions` 表 | ❌（共享存储，无单进程依赖） |
| 2FA 预认证 token 防重放（`consumed jti` 集合） | [src/modules/auth/server/identity.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/modules/auth/server/identity.ts) | ✅ 进程内 Set |
| 事件总线（`appBus`） | [src/shared/events/event-bus.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/shared/events/event-bus.ts) | ✅ Node.js EventEmitter |

多实例部署前的迁移清单（必须完成才能横向扩展）：

1. 速率限制迁移到 Redis（替换 `RateLimiter` 的 Map 实现）
2. 2FA 预认证 token 的 `consumed jti` 集合迁移到 Redis SET（带 5min TTL）
3. 事件总线评估是否需要跨实例广播（参见 [Devdocs-security.md §9.3](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-security.md) ADR-014）

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

*文档结束*
