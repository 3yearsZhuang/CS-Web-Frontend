# 新开发者入职指南

> 计算机协会门户网站 - 第一天你需要知道的一切

> 最后更新：2026-08-01（同步 community/server 子目录拆分）| cadence：新人入职前 review | Stale 信号：引用的文件路径与实际目录结构不一致

---

## 1. 快速开始

```bash
git clone <repo-url> fztbucs-projects
cd fztbucs-projects
pnpm install
pnpm dev
```

浏览器打开 <http://localhost:2333>（⚠️ 端口是 2333，不是 3000）

首次启动会自动：
- 创建 `data/` 目录和 `data/app.db` SQLite 数据库
- 执行 schema 初始化 + 增量迁移
- 种子数据仅在表为空时写入（events 活动 + forum 版块）

### 创建管理员账号

```bash
pnpm create-user --role admin                                # 交互式输入邮箱和密码
pnpm create-user --role admin --email a@b.com --password xxx  # 命令行参数式
```

### 生成测试数据（考试 + 资源）

```bash
pnpm seed
pnpm seed -- --clear                  # 先清空再生成
```

---

## 2. 技术栈一览

| 层 | 技术 | 备注 |
|---|------|------|
| 框架 | Next.js 16.2 (App Router) | React Server Components 模式 |
| 语言 | TypeScript | 严格模式 |
| 样式 | Tailwind CSS v4 | `globals.css` 定义 CSS 变量 + 双主题 |
| 动画 | Motion (原 Framer Motion) | 页面过渡、莫比乌斯环粒子 |
| 数据库 | SQLite (better-sqlite3) | WAL 模式，单文件 `data/app.db` |
| ORM | 无 | 直接写 SQL，`shared/db.ts` 返回 `Database` 实例 |
| 部署 | Docker + Caddy + Litestream | Caddy 自动 HTTPS，Litestream 实时备份到 S3 |
| 包管理 | pnpm | `preinstall` 脚本强制 pnpm |
| 测试 | Vitest + Playwright | 单元测试 `vitest`，E2E `playwright test` |
| 图标 | Lucide React | |
| Markdown | react-markdown + remark-gfm + rehype-highlight | |

---

## 3. 关键架构概念

### 3.1 目录分工

```
src/
├── app/           ← Next.js App Router：页面(Server Component) + API Routes
├── modules/       ← 业务模块（9 个，按领域拆分）：每个模块含 server/、types/、ui/
├── shared/        ← 全局共享基础设施：db、types、security、utils、events、hooks、config（详见架构文档）
├── components/    ← React 组件（扁平目录）
└── server.ts      ← 自定义 HTTP 服务器入口
```

### 3.2 同构直连模式

这是本项目最核心的架构特点：页面直接 import modules/.../server/ 函数，没有中间 API 层。

```
┌─────────────────────────────────────────────────────────┐
│  app/xxx/page.tsx  (React Server Component)              │
│    ↓ import { listEvents } from '@/modules/events/server'│
│  modules/events/server/crud.ts  (业务逻辑 + SQL 查询)     │
│    ↓ import { getDb } from '@/shared/db'                 │
│  shared/db.ts      (better-sqlite3 连接)                 │
│    ↓                                                      │
│  data/app.db      (SQLite WAL)                           │
└─────────────────────────────────────────────────────────┘
```

- Server Component 渲染时可以 await 任何 async 函数，所以直接调用 `modules/.../server/` 导出
- API Route（`app/api/*/route.ts`）同样直接调用 `modules/.../server/` 导出，不经过 `fetch()`

### 3.3 自定义服务器

- `tools/scripts/dev-server.mjs` 启动 `tsx watch src/server.ts`，文件变更自动重启
- `tools/scripts/build-app.mjs` 用 `tsup` 打包 `src/server.ts` → `dist/server.js`
- 默认端口 2333（macOS AirPlay 占用 5000，避开冲突）
- 可通过 `DEPLOY_RUN_PORT=xxxx pnpm dev` 自定义

---

## 4. 开发工作流

### 4.1 修改代码验证

| 修改文件位置 | 生效方式 |
|-------------|---------|
| `app/**/*.tsx` (页面/组件) | HMR 自动热更新，浏览器即时刷新 |
| `app/api/**/route.ts` (API) | HMR 自动热更新 |
| `modules/**/*.ts`、`shared/**/*.ts` (业务逻辑/基础设施) | `tsx watch` 自动重启服务器（~1s） |
| `globals.css` | HMR 即时生效 |

不需要手动重启，改了就能看到效果。

### 4.2 查看数据库

```bash
# 用任何 SQLite 工具打开
sqlite3 data/app.db
sqlite3 data/app.db ".tables"         # 列出所有表
sqlite3 data/app.db ".schema users"   # 查看 users 表结构
```

推荐 GUI 工具：[DB Browser for SQLite](https://sqlitebrowser.org/) 或 VS Code 插件 "SQLite Viewer"。

### 4.3 常用命令

```bash
pnpm dev              # 开发服务器
pnpm build            # 生产构建
pnpm start            # 生产运行（需先 build）
pnpm lint             # ESLint 检查
pnpm ts-check         # TypeScript 类型检查
pnpm validate         # lint + ts-check 并行
pnpm test             # Vitest 单元测试
pnpm test:watch       # 测试监听模式
pnpm e2e              # Playwright E2E 测试
```

---

## 5. 关键文件索引

### 想改 XX 功能 → 看哪个文件

| 想改什么 | 页面文件 | 业务逻辑 | API Route |
|---------|---------|---------|-----------|
| 首页 Hero | `app/page.tsx` | — | — |
| 全局布局/导航 | `app/layout.tsx`、`components/navbar.tsx` | — | — |
| 主题/暗色模式 | `components/theme-provider.tsx`、`app/globals.css` | — | — |
| 登录/注册 | `app/login/page.tsx` | `modules/auth/server/index.ts` | `app/api/auth/login/route.ts`、`register/route.ts` |
| Session 管理 | — | `modules/auth/server/identity.ts` | `app/api/auth/me/route.ts`、`sessions/route.ts` |
| OAuth (GitHub) | — | `modules/auth/server/oauth.ts` | `app/api/auth/oauth/github/route.ts` |
| 2FA / TOTP | `components/two-factor-settings.tsx` | `modules/auth/server/totp.ts` | `app/api/auth/2fa/*/route.ts` |
| 忘记密码 | — | `modules/auth/server/password-reset.ts` | `app/api/auth/forgot-password/route.ts` |
| 活动列表/详情 | `app/events/page.tsx`、`[id]/page.tsx` | `modules/events/server/crud.ts` | `app/api/events/route.ts` |
| 活动报名 | — | `modules/events/server/registration.ts` | `app/api/events/[id]/register/route.ts` |
| 活动签到 | — | `modules/events/server/checkin.ts` | `app/api/events/[id]/checkin/route.ts` |
| 论坛首页/版块/主题 | `app/community/forum/page.tsx`、`[category]/page.tsx`、`[topicId]/page.tsx` | `modules/community/server/forum/topics.ts`、`forum/categories.ts`、`forum/replies.ts` | `app/api/community/forum/*/route.ts` |
| 论坛点赞/收藏 | — | `modules/community/server/forum/reactions.ts` | `app/api/community/forum/like/route.ts`、`favorite/route.ts` |
| 论坛 Markdown 编辑器 | `modules/community/ui/` 下的编辑器组件 | — | `app/api/community/forum/upload/route.ts` |
| 博客列表/详情 | `app/community/blog/page.tsx`、`[slug]/page.tsx` | `modules/community/server/blog/posts.ts` 等 | `app/api/community/blog/route.ts` |
| 考试列表/答题 | `app/tools/exam/page.tsx`、`[id]/page.tsx` | `modules/tools/server/exam/` | `app/api/tools/exam/*/route.ts` |
| 资源库 | `app/tools/resource/page.tsx` | `modules/tools/server/resource/` | `app/api/tools/resource/route.ts` |
| 任务板 | `app/tools/task/page.tsx` | `modules/tools/server/task/` | `app/api/tools/task/*/route.ts` |
| Auxilio 学习助手 | `app/tools/auxilio/page.tsx` | `modules/tools/server/agent/` | `app/api/tools/auxilio/route.ts` |
| 积分系统 | — | `modules/tools/server/points.ts` | `app/api/tools/points/*/route.ts` |
| 个人资料 | `app/profile/page.tsx` | `modules/user/server/profile.ts` | `app/api/profile/route.ts` |
| 头像上传/预设 | `components/avatar.tsx` | — | `app/api/profile/avatar/*/route.ts` |
| 成员名录 | `app/community/members/page.tsx` | `modules/community/server/members/index.ts` | `app/api/community/members/route.ts` |
| 入社申请 | `app/join/page.tsx` | `modules/join/server/index.ts` | `app/api/join/route.ts` |
| 通知系统 | `app/notifications/page.tsx`、`components/notification-bell.tsx` | `modules/notification/server/index.ts` | `app/api/notifications/*/route.ts` |
| 管理后台-用户管理 | `app/admin/page.tsx` | `modules/admin/server/users.ts` | `app/api/admin/users/*/route.ts` |
| 管理后台-公告 | — | `modules/announcement/server/index.ts` | `app/api/admin/announcements/*/route.ts` |
| 管理后台-审计日志 | — | `modules/admin/server/audit.ts` | `app/api/admin/actions/route.ts` |
| 管理后台-密码重置审批 | — | `modules/admin/server/password-reset.ts` | `app/api/admin/password-resets/*/route.ts` |
| 数据库 Schema | — | `shared/db/schema.ts`（所有 CREATE TABLE + 迁移） | — |
| 种子数据 | — | `shared/db/seeds.ts`、`seed-events-data.ts` | — |
| 邮件发送 | — | `shared/utils/mail.ts` | — |
| 安全头/CSRF | — | `shared/security/security.ts` | — |
| 共享类型/权限 | — | `shared/security/permissions.ts`、`schemas.ts`、`utils/tech-tags.ts` | — |

---

## 6. 常见坑

| 坑 | 说明 |
|----|------|
| **端口是 2333 不是 3000** | macOS AirPlay 占用 5000，项目统一使用 2333。`localhost:3000` 打不开是正常的 |
| **pnpm 必须用** | `preinstall` 脚本会拒绝 npm/yarn。没有 pnpm？`npm i -g pnpm` |
| **build 前会初始化数据库** | `next build` 阶段会执行 `shared/db.ts` 的 `getDb()`，确保 data/ 目录存在且 schema 就绪。CI 上 build 不需要先跑 dev |
| **Docker volume 映射** | `docker-compose.yml` 中 `../data:/app/data` 将宿主机 data/ 挂载到容器。**不要忘记创建 data/ 目录**，否则容器内 SQLite 会写到容器文件系统（重启丢失） |
| **种子数据只跑一次** | events 和 forum_categories 种子数据仅在表为空时写入。想重新生成？删掉 `data/app.db` 后重启 |
| **验证码在开发环境不走邮件** | SMTP 未配置时，验证码直接打印到终端控制台。搜 `[Mail]` 前缀日志即可找到 |
| **`modules/.../server/` 里的函数都是 async** | 所有导出函数返回 Promise，页面/API 里用 `await` 调用 |
| **Server Component 不能有 `useState`/`useEffect`** | 如需客户端交互，抽成 `'use client'` 子组件。`app/` 下的页面默认是 Server Component |
| **修改 modules/.../server/ 文件后等 ~1s** | `tsx watch` 重启有短暂延迟，改完等一秒再刷新浏览器 |
| **`src/server.ts` 手动加载 `.env`** | 自定义 server 不会自动读 .env，在 `server.ts` 开头手动解析。新环境变量要确保 `cp .env.example .env` |

---

## 7. 参考文档

已有文档都在 `tools/docs/` 目录下，按需查阅：

| 文档 | 说明 |
|------|------|
| [architecture](./Devdocs-architecture.md) | 完整目录结构 + 页面路由表 + 组件清单 + 模块化分析 + **API 端点契约（Part B）** |
| [architecture · Part B](./Devdocs-architecture.md) | 所有 API 端点、鉴权约定、请求/响应格式、速率限制、错误码 |
| [ops](./Devdocs-ops.md) | 部署（Part A）、SLO（Part B）、Runbook（Part C）：Docker 部署、Caddy 配置、Litestream 备份、回滚与故障处置 |
| [design-spec](./Devdocs-design-spec.md) | 设计规范：颜色、字体、动画、组件风格 |
| [security](./Devdocs-security.md) | 安全审计 + 角色体系与权限矩阵 |
| [roadmap](./Devdocs-roadmap.md) | 迭代计划与已完成功能清单 |
| [markdown-editor](./Devdocs-markdown-editor.md) | Markdown 编辑器组件说明 |
| [project-rules](./Devdocs-project-rules.md) | 项目编码规范 |