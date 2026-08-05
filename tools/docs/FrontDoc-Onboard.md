# FZTBUCS-Onboarding-新开发者入职指南

> 文档定位：新人上手指南 + 工程规范（tutorial + reference）
> 受众：新加入项目的开发者 / 全体代码贡献者
> Source of truth：开发环境、启动流程、模块协作规范、禁止事项、防再犯清单的唯一权威位置
> 关联：架构与 API 见 [FrontDoc-Arch.md](FrontDoc-Arch.md)；安全见 [FrontDoc-Sec.md](FrontDoc-Sec.md)；运维见 [FrontDoc-Ops.md](FrontDoc-Ops.md)；演进与 ADR 见 [FrontDoc-Evo.md](FrontDoc-Evo.md)
> 最后更新：2026-08-05（修正技术栈与快速开始：前端已降级为 BFF，业务数据/认证/邮件由后端承载）
> 更新人：3yearsZ
> 变更触发：开发环境变更 / 启动流程变更 / 新增禁止事项 / 协作流程变更 / 新增 ADR
> Stale 信号：启动命令与 package.json scripts 不一致 / ADR 编号与 evolution 最新不一致 / 禁止事项与实际依赖冲突

## 文档结构

- **第 1–7 节：上手** — 快速开始、技术栈、关键架构、开发工作流、关键文件索引、常见坑、参考文档
- **第 8 节：项目规则** — 禁止事项、设计规范、模块化规范、ADR 引用规则、文档维护流程、编码规范、防再犯清单

---

## 1. 快速开始

> ⚠️ 前端为 BFF，**需后端 FastAPI 运行才能完整工作**。推荐在根仓库用 `make dev-up` 并行启动前后端（后端 :9000 / 前端 :2333）。单独 `pnpm dev` 仅能起前端，API 调用会失败。

```bash
git clone <repo-url> fztbucs-projects
cd fztbucs-projects
pnpm install
pnpm dev          # 前端 :2333（需另起后端，见根 README / docs/RootDoc-Deploy.md）
```

浏览器打开 <http://localhost:2333>（⚠️ 端口是 2333，不是 3000）

> 注：迁移前"首次启动自动创建 `data/app.db` SQLite + schema 初始化 + 种子数据"的描述已作废——业务数据现由后端 PostgreSQL 承载，前端不再初始化本地数据库。

### 创建管理员账号 / 生成测试数据（⚠️ 遗留脚本）

`pnpm create-user` 与 `pnpm seed` 为**迁移前遗留脚本，仍直连本地 SQLite**（`better-sqlite3`），写入的 `data/app.db` 并非运行时数据源（后端 PostgreSQL）。在新架构下：

- 创建管理员请走后端流程（见后端 `docs/BackDoc-Onboard.md` 与 `scripts/init_database.py`）
- 测试数据请通过后端 API 或后端种子脚本写入 PostgreSQL

---

## 2. 技术栈一览

| 层 | 技术 | 备注 |
|---|------|------|
| 框架 | Next.js 16.2 (App Router) | React Server Components 模式；前端为 BFF 薄转发层 |
| 语言 | TypeScript | 严格模式 |
| 样式 | Tailwind CSS v4 | `globals.css` 定义 CSS 变量 + 双主题 |
| 动画 | Motion (原 Framer Motion) | 页面过渡、莫比乌斯环粒子 |
| 数据库 | 无本地业务库 | 业务数据由后端 PostgreSQL 承载；前端 API 路由经 `shared/backend-client.ts` 代理到后端 |
| 认证/邮件 | 后端承载 | JWT 双 token（BFF HttpOnly Cookie 托管）/ aiosmtplib；前端 `shared/db`、`utils/mail.ts`、`security/password.ts` 为迁移前遗留，运行时不引用 |
| 部署 | 根仓库 Docker Compose + Caddy | 全栈编排见根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md)；Litestream/SQLite 备份体系已随前后端分离移除 |
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
| 数据库 Schema | — | `shared/db/sqlite-init.ts`（CREATE TABLE 编排入口）、`shared/db/sqlite/*`（各模块建表）、`shared/db/drizzle/*`（Drizzle/PG schema） | — |
| 种子数据 | — | `shared/db/seeds/`（seeds.ts / seed-events-data.ts / component-seeds.ts） | — |
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
| [架构 + API 文档](./FrontDoc-Arch.md) | 完整目录结构 + 页面路由表 + 组件清单 + 模块化分析 + **API 端点契约（Part B）** |
| [安全文档](./FrontDoc-Sec.md) | 安全审计（OWASP）+ 角色体系与权限矩阵 |
| [运维文档](./FrontDoc-Ops.md) | 部署（Part A）、SLO（Part B）、Runbook（Part C）：Docker 部署、Caddy 配置、Litestream 备份、回滚与故障处置 |
| [演进与 ADR](./FrontDoc-Evo.md) | 迭代路线图、PostgreSQL 迁移、多语言微服务迁移、ADR 与风险登记 |
| [UI 设计规范](./FrontDoc-UID.md) | 设计规范：颜色、字体、动画、组件风格 |
| [Markdown 编辑器](./FrontDoc-MDE.md) | Markdown 编辑器组件说明 |
| [项目规则](#八项目规则) | 开发约定、模块协作规范、ADR 引用规则、防再犯清单（本节之后的第 8 节） |

---

# 8. 项目规则

> 文档类型：reference（工程契约）+ explanation（防再犯根因库）｜受众：全体代码贡献者（新人通读第 1–7 节后再读本规则）
> Source of truth：禁止事项、模块协作契约、ADR 编号规则、文档维护 lifecycle 的唯一权威位置
> 最后验证：2026-08-01 | cadence：每个里程碑结束 + 触发变更时即时更新｜Stale 信号：ADR 编号不一致 / 禁止事项与依赖冲突 / 同步清单与 PR 流程不符
> 变更触发：新增移除依赖、模块结构调整、ADR 新增、文档结构变更、新增安全/工程发现

---

## 8.1 禁止事项

### 1. 禁止引入 react-dev-inspector

- 原因：react-dev-inspector 是 Webpack/Vite 时代的工具，与 Next.js 16 + Turbopack 不兼容。其 Inspector 组件会遍历整个 DOM 注入 data 属性，严重拖慢开发模式下的页面渲染（render 从毫秒级飙升到 16-24 秒）。
- 替代方案：Next.js 本身已内置 React DevTools 集成，通过浏览器 React DevTools 扩展即可实现组件定位和调试。
- 注意：不仅要移除组件引用，还要从 package.json 中移除 `react-dev-inspector` 和 `@react-dev-inspector/babel-plugin` 依赖。

### 2. 禁止引入 Vite 相关依赖

- 原因：本项目使用 Next.js + Turbopack 作为构建工具，不兼容 Vite。引入任何 `@vite/client`、`vite`、`vite-plugin-*` 等包会导致浏览器请求 `/@vite/client` 并返回 404，污染控制台日志。
- 例外：`vitest` 可以保留（仅用于测试，与 Next.js 构建隔离），但不要在页面或组件中 import vitest 的任何内容。

### 3. 禁止跨模块直接 import server 代码（模块化）

- 规则：业务模块之间（auth ↔ community ↔ events ↔ tools ↔ notification）禁止直接 import 对方的 `server/` 代码，必须走事件总线。
- 例外：`admin` 模块作为聚合层，可通过事件总线 + 直接调用被管理模块的 `server/index.ts` 公开 API。
- 类型引用：跨模块引用类型必须用 `import type` 确保编译后无运行时依赖。

### 4. 禁止在 types/index.ts 中引入运行时依赖

- 规则：模块 types 文件只能包含纯类型定义和常量。引入运行时依赖会破坏 server-only 边界（参见 ADR-010 / M11 的 `AuditContext` 下沉案例）。

### 5. 禁止模块间循环依赖

- 规则：类型引用使用 `import type` 确保编译后无运行时依赖。

---

## 8.2 设计规范

所有前端开发必须严格遵守 `tools/docs/FrontDoc-UID.md`（编辑式技术极简 & 悬浮胶囊导航设计规范）。新增页面、组件、视觉交互等均需对照设计规范 Checklist 逐项检查。

---

## 8.3 模块化开发规范

> 详见 [FrontDoc-Arch.md](FrontDoc-Arch.md)，以下仅列出关键约束。

### 1. 模块结构

每个模块：`server/`（业务逻辑）+ `types/`（类型定义）+ `ui/`（模块专属组件）。

### 2. 模块间通信矩阵

| 交互方式 | 允许 | 禁止 |
|:---|:---:|:---:|
| 通过 `src/shared/` 导入类型/工具 | ✓ | - |
| 通过 `src/shared/db.ts` 导入数据库 | ✓ | - |
| 通过事件总线跨模块通信 | ✓ | - |
| 直接 import 另一个模块的 `server/` 代码 | - | ✗ |
| 直接 import 另一个模块的 `api/` 路由 | - | ✗ |

### 3. 跨模块通信决策树

当模块 A 需要模块 B 的数据或能力时，按以下顺序选择通信方式：

```
1. 只需类型？ -> import type from '@/modules/B/types'（编译后无运行时依赖）
2. 只需通用工具/类型？ -> import from '@/shared/...'
3. B 是 admin 聚合的被管理模块？ -> 直接调用 B/server/index.ts 公开 API
4. 否则 -> 通过事件总线 appBus 发布事件，B 监听处理
```

### 4. 事件总线使用规范

发布方：
```typescript
import { appBus } from '@/shared/events';
import type { TopicCreatedEvent } from '@/shared/events/event-types';

appBus.emit('topic.created', {
  topicId: topic.id,
  authorId: topic.author_id,
  title: topic.title,
} satisfies TopicCreatedEvent);
```

订阅方：
```typescript
import { appBus } from '@/shared/events';

appBus.on('topic.created', (payload) => {
  try {
    // 处理逻辑，失败不抛出
  } catch (err) {
    console.error('[notification] topic.created handler failed', err);
  }
});
```

命名约定：`<模块>.<动作>`，如 `topic.created`、`reply.created`、`admin.action.logged`、`user.registered`。

### 5. 依赖矩阵维护

新增模块或修改模块依赖时，必须同步更新 [FrontDoc-Arch.md](FrontDoc-Arch.md) 的「2.3 直接导入依赖矩阵」。该矩阵是架构不变量 FF1（依赖方向单向）的检查依据。

---

## 8.4 ADR 引用规则

### 1. 何时创建 ADR

以下决策必须记录为 ADR（Architecture Decision Record）：

- 影响多个模块的架构变更
- 引入或移除关键技术依赖（如数据库、事件队列、日志库）
- 改变模块间通信方式
- 不可逆或高成本的决策（单向门）
- 安全相关的架构决策

### 2. ADR 格式

所有 ADR 记录在 [FrontDoc-Evo.md](FrontDoc-Evo.md) 的「五、架构决策记录」章节，格式：

```markdown
### ADR-XXX: <决策标题>

- **状态**: 已采纳 / 待决策 / 已废弃
- **上下文**: <为什么需要这个决策，当前问题是什么>
- **决策**: <选择了什么方案>
- **替代方案**: ① <方案A>（拒绝：<原因>）② <方案B>（拒绝：<原因>）
- **后果**: ✅ <正面> ⚠️ <负面>
- **可逆性**: 单向门 / 两向门
- **反转触发**: <什么条件下需要重新评估>（仅两向门需要）
- **实施记录**: <日期 + 修改文件 + 测试结果>（状态变更为"已实施"时必填）
```

### 3. 文档交叉引用

当某个文档需要引用 ADR 时，使用锚点链接：

```markdown
对应 [ADR-013](FrontDoc-Evo.md#adr-013-事件监听器显式初始化)
```

锚点规则：GitHub 风格锚点 = 标题转小写 + 空格转连字符 + 移除标点。中文保留。

### 4. ADR 编号分配

- 新增 ADR 使用连续递增编号（ADR-015, ADR-016, ADR-017...）
- 废弃的 ADR 编号不回收
- ADR 状态变更需在原条目更新，不删除历史
- 当前最新：ADR-017（跨模块日期格式比较审计与归一化，2026-07-31）

### 5. ADR 状态与实施记录一致性（防再犯 #2）

- ADR 状态字段是 source of truth，必须反映实施事实
- 实施完成后状态必须从"待决策/已采纳"变更为"已实施"，并补填实施记录
- 严禁出现"代码已实施但 ADR 仍标注 proposal"的脱节状态

---

## 8.5 文档维护流程（how-to）

### 1. 文档清单与职责

| 文档 | Diátaxis 象限 | 职责 | 更新触发 | Stale 信号 |
|------|------|------|---------|---------|
| `FrontDoc-Arch.md` | reference | 项目结构、模块化分析、代码质量、依赖矩阵、API 端点/鉴权/速率限制/状态码（Part B） | 目录结构调整、新增模块、依赖矩阵变更、新增/修改 API、安全措施变更 | 矩阵与实际 import 不一致；端点签名与路由 handler 不一致 |
| `FrontDoc-Evo.md` | explanation + operational | 路线图、ADR、风险登记、健壮函数、里程碑 | 架构决策、风险识别、里程碑推进 | ADR 状态与实施记录不一致；R 项等级未随修复更新 |
| `FrontDoc-Sec.md` | reference | 安全审计、角色权限、事件驱动安全、运行时监测 | 安全发现、2FA/权限变更、ADR-013/014 推进 | 发现项状态与代码现状不一致 |
| `FrontDoc-Onboard.md` | tutorial + reference | 新人上手指南 + 项目规则、模块协作规范、ADR 引用规则、防再犯清单 | 开发环境变更、启动流程变更、新增禁止事项、协作流程变更、新增 ADR | 启动命令与 package.json scripts 不一致；ADR 编号与 evolution 最新不一致；禁止事项与实际依赖冲突 |
| `FrontDoc-UID.md` | reference | 设计规范、视觉交互 | 新增页面/组件、视觉变更 | 组件清单与实际文件不一致 |
| `FrontDoc-Ops.md` | how-to + reference | 部署配置、环境变量、SLO、Runbook（Part A/B/C） | 部署流程变更、新增环境变量、SLO 阈值调整、新增故障场景 | 环境变量表与 `.env.example` 不一致 |
| `FrontDoc-MDE.md` | how-to | Markdown 编辑器使用 | 编辑器功能变更 | 功能描述与组件实现不一致 |

### 2. Source-of-Truth 无重复规则

每个系统维度有且仅有一个权威位置，别处仅引用编号，不复制内容：

| 维度 | 权威位置 |
|------|---------|
| 禁止事项/工程契约 | `FrontDoc-Onboard.md`「8.1 禁止事项」（本文件第 8 节） |
| 架构决策记录 | `FrontDoc-Evo.md` ADR 章节 |
| 风险登记 | `FrontDoc-Evo.md` R 表 |
| 模块依赖矩阵 | `FrontDoc-Arch.md` 2.3 节 |
| 安全发现 | `FrontDoc-Sec.md` |
| API 契约 | `FrontDoc-Arch.md` Part B（原 Devdocs-api-reference.md 已合并） |
| 环境变量 | `FrontDoc-Ops.md` Part A（权威）+ `README.md`（摘要） |

重复处理：发现重复时，非权威位置必须删除内容并改为锚点引用；禁止两处同时维护同一信息。重复维护必然产生漂移。

### 3. 变更同步检查清单

完成代码修改后，逐项确认（作为 PR 自检模板）：

- [ ] `pnpm run ts-check` 通过（类型检查）
- [ ] 如调整目录结构 -> 更新 `FrontDoc-Arch.md` Part A
- [ ] 如新增/修改 API -> 更新 `FrontDoc-Arch.md` Part B
- [ ] 如新增/修改管理员权限 -> 更新 `FrontDoc-Sec.md` Part 2
- [ ] 如做出架构决策 -> 在 `FrontDoc-Evo.md` 新增 ADR
- [ ] 如新增禁止事项 -> 更新本文档「8.1 禁止事项」
- [ ] 如新增页面/组件 -> 更新 `FrontDoc-UID.md`
- [ ] 如新增环境变量 -> 更新 `FrontDoc-Ops.md` Part A 与 `README.md` 环境变量表
- [ ] 如完成路线图项 -> 在 `FrontDoc-Evo.md` 标注 `✅` + 完成日期
- [ ] 如修改 2FA/OAuth/密码重置/限流 -> 更新 `FrontDoc-Sec.md` 对应发现项 + roadmap ADR
- [ ] 如修改 events.date 格式或归档逻辑 -> 同步前后端解析（SQL REPLACE + regex），补充回归测试
- [ ] 如修改 `expires_at` / `created_at` 等日期字段的比较逻辑 -> 用 `datetime(col)` 归一化两侧格式（ISO 与 SQLite datetime 混用时 `T` > 空格致字典序错乱），补充 ISO 格式回归测试（参见 ADR-017）
- [ ] 如修改 server-only 边界 -> 同步 `tsconfig.json` paths + `vitest.config.ts` alias + 本文档 server-only 章节
- [ ] 如新增 ADR -> 同步本文档「8.4 ADR 编号分配」章节的"当前最新"字段
- [ ] 如修复一个 bug -> 立即 grep 同模式跨模块扫描，审计结果写入 ADR 的"审计确认安全"清单（防再犯 #6）

### 4. 文档一致性检查

每月或每个里程碑结束时执行：

1. 交叉引用可达性：所有 `file://` 链接指向的文件存在
2. ADR 锚点一致性：文档中引用的 ADR 锚点在 evolution 中存在
3. 依赖矩阵同步：架构文档的依赖矩阵与实际 import 一致（可用 grep 抽查）
4. 安全发现状态：security 文档的发现清单与代码现状一致（已修复的标注 `✅ 已修复`）
5. ADR 状态一致性：所有"已实施"的 ADR 在代码中确实落地；所有标注 proposal 的 ADR 在代码中确实未落地（防再犯 #2）
6. Stale 信号扫描：对照上表 Stale 信号列逐项检查，触发即标记 `stale` 并修复

### 5. Docs-as-code 工作流

- 文档变更与代码变更同 commit/PR，禁止拆分提交
- CI 自动检查项（建议接入）：`pnpm run ts-check`（类型）+ `file://` 链接可达性脚本 + ADR 锚点存在性脚本 + markdown lint
- 变更同步检查清单作为 PR 描述模板，逐项勾选

---

## 8.6 编译检查与启动

修改代码后必须运行类型检查：

```bash
pnpm run ts-check
```

启动项目：

```bash
# 开发模式（端口 2333）
pnpm run dev

# 如果遇到端口占用或锁文件问题
lsof -i :2333 -t | xargs kill -9
rm -f .next/dev/lock
pnpm run dev
```

---

## 8.7 编码规范补充

### 1. 文件命名

- 所有文件使用 `kebab-case`（小写 + 连字符）：`event-bus.ts`、`floating-capsule-sidebar.tsx`
- 组件文件名与默认导出名一致：`floating-capsule-sidebar.tsx` -> `FloatingCapsuleSidebar`
- barrel 文件统一命名 `index.ts`

### 2. 导入顺序

```typescript
// 1. React/Next.js 官方
import { NextResponse } from 'next/server';

// 2. 第三方库
import { z } from 'zod';

// 3. shared 基础设施
import { db } from '@/shared/db';
import { appBus } from '@/shared/events';

// 4. 其他模块（仅类型）
import type { ForumTopic } from '@/modules/community/types';

// 5. 本模块内部
import { createTopic } from '../server/topic-service';
```

### 3. server-only 边界（详见 ADR-010）

- 任何 import 了 `better-sqlite3`、`nodemailer`、`crypto`、`fs`、`pino` 的文件必须在首行添加 `import 'server-only';`
- 客户端组件（含 `'use client'`）禁止 import 这些文件
- barrel 文件 `index.ts` 如导出 server-only 内容，自身也需标记 `server-only`
- 自定义 dev server 兼容：项目使用 `src/server.ts` 自定义服务器，Next.js 的 `server-only` 包模块解析不生效。已新增 `src/shared/server-only.ts` 本地空实现 + `tsconfig.json` paths 别名 + `vitest.config.ts` alias 同步映射
- 类型下沉：`AuditContext` 类型已下沉至 `src/shared/types/audit-types.ts`，斩断 `admin/types` -> `shared/security/audit` 的 server-only 依赖链；模块 types 文件禁止引入运行时依赖
- hooks 边界：`shared/hooks/` 全部补齐 `'use client';` 首行标注，保留原位不迁移
- logger 例外：`shared/logger.ts` 被 `shared/utils/monitoring.ts` 引用，而 monitoring 被客户端间接依赖，故 logger.ts 不加 `server-only`（pino 本身为同构库）。此例外为显式记录的例外，禁止隐式例外（防再犯 #4）

---

## 8.8 反复出现的错误与防再犯清单（explanation）

> 以下条目源自本项目实际缺陷的归纳（ADR-015/016/017、R4/R16/R17 等），非通用最佳实践。每条均附根因、已暴露案例与强制检查项。修改相关代码前必须逐条对照。

### 1. 日期比较：ISO 与 SQLite `datetime()` 格式的字典序陷阱

- 根因：SQLite `datetime('now')` 返回空格分隔格式 `YYYY-MM-DD HH:MM:SS`，JS `new Date().toISOString()` 写入 ISO 格式 `YYYY-MM-DDThh:mm:ss.sssZ`。SQL 中直接字符串比较时 `T`(0x54) > 空格(0x20)，同日"过期"被判定为"未过期"。events.date 的 `.`/`-`/`/` 分隔符问题同源（`.`(0x2E) > `-`(0x2D)）。
- 已暴露案例：ADR-016（events.date 归档比较）、ADR-017（announcements.expires_at、sessions.expires_at、admin_actions.created_at 三处）。
- 强制检查：
  - 凡 SQL 出现 `WHERE col > datetime('now')` 或 `col < ?`（? 为 ISO 日期），必须审计该列写入格式与比较格式是否一致。
  - 修复统一用 `datetime(col) > datetime('now')` / `datetime(col) < datetime(?)` 归一化两侧，不强制统一写入格式（ISO 是 JS 原生格式，迁移成本高且易引入新 bug）。
  - 空字符串 `expiresAt` 必须在写入层用 `|| null` 归一化为 null（`?? null` 不拦截空串，`datetime('')` 返回 NULL 致数据静默隐藏）。
  - 回归测试必须用生产写入路径的真实格式（UI 写 ISO 就用 ISO），边界用例覆盖"当天已过期"场景。详见变更同步检查清单对应条目。

### 2. 文档与实施状态脱节（lifecycle freshness 失控）

- 根因：ADR 状态、风险登记表、里程碑清单为"活文档"，但常滞后于代码。单次编辑未交叉检查导致重复登记。
- 已暴露案例：ADR-008 标注 "proposal" 但实际已实施；R4 已修复未标记缓解；P1 表 M10/M11 重复登记；roadmap 缺 lifecycle metadata。
- 强制检查：
  - ADR 状态必须反映实施事实，状态字段是 source of truth，修改后立即同步状态 + 实施记录。
  - 风险登记表 R 项缓解措施落地后必须同 commit 更新状态，否则风险表失去决策价值。
  - roadmap 头部必须标注 `验证 cadence` 与 `stale 信号`（如"ADR 状态与实施记录不一致"）。
  - 跨章节合并后必须 grep 验证条目唯一性，禁止重复登记同一里程碑。

### 3. 测试覆盖与缺陷暴露的错位

- 根因："测试存在" ≠ "缺陷被覆盖"。测试数据格式与生产写入路径不一致会掩盖 bug；happy path 永远抓不到边界缺陷。
- 已暴露案例：announcement 56 条测试全用空格格式日期，ISO 路径从未被测；events 原测试覆盖分隔符但漏了 ISO 时间戳路径。
- 强制检查：
  - 测试数据必须模拟真实写入路径：UI/API 写 ISO 就用 ISO，写自由格式就构造自由格式。禁止用"看起来合理"的格式（如 `2099-12-31 23:59:59`）。
  - 必须覆盖边界用例（当天已过期、空字符串、null），不只测 happy path。
  - 审计已有测试时要问"它真的覆盖了那个分支吗"而非"这个函数有没有测试"。

### 4. server-only 边界与模块解析的"假合规"

- 根因：库的文档承诺 ≠ 运行时实际行为。Next.js `server-only` 包依赖模块解析器，自定义 dev server（`src/server.ts`）绕过了它。
- 已暴露案例：ADR-010 / M11，19 个 server-only 模块入口加 `import 'server-only'` 后实际不生效。
- 强制检查：
  - 加 `import 'server-only'` 后必须实际尝试从客户端组件 import 验证是否真的报错，而非声明即合规。
  - 自定义 dev server 场景需本地空实现 + `tsconfig.json` paths + `vitest.config.ts` alias 三重映射兜底。
  - 例外（如 `logger.ts` 因 pino 同构性不加 server-only）必须在文档显式记录，禁止隐式例外。

### 5. 迁移幂等性与事务安全

- 根因：SQLite 不支持 DROP COLUMN，重建表策略的 CREATE + INSERT + DROP + RENAME 任一步失败留下半成品表。
- 已暴露案例：ADR-015 修复 `migrateEventsDropLegacyColumns` 未包事务。
- 强制检查：
  - CREATE + INSERT + DROP + RENAME 必须用 `db.transaction()` 包裹，原子失败回滚。
  - 迁移必须检测旧 schema 特征（如 `PRAGMA table_info` 的 `notnull` 标志）而非"表存在就迁移"，保证幂等。
  - FK 策略必须匹配安全语义：审计表用 `ON DELETE SET NULL`（保留证据），业务表用 `ON DELETE CASCADE`。禁止用默认值。

### 6. 跨模块同类缺陷的系统性排查

- 根因：单点修复后未跨模块 grep 同模式，缺陷在线上窗口期持续存在。
- 已暴露案例：ADR-016 修 events.date 后未立即扫描其他 `expires_at`/`created_at`，延迟到 R17 才审计出 3 处。
- 强制检查：
  - 修复一个 bug 后立即 grep 同模式跨模块扫描，审计结果写入 ADR 的"审计确认安全"清单，避免下次重复审计。
  - 缺陷模式必须抽象为文档检查项（见变更同步检查清单），让未来维护者有 checklist。
  - 审计必须记录"安全项"（确认无缺陷的模块）而非只记缺陷。

### 7. 同一字段多消费方的不一致

- 根因：同一字段的不同消费方用了不同的比较语义，鉴权路径正确但展示路径错误，或反之。
- 已暴露案例：sessions.expires_at - `getSession`（鉴权）用 JS `new Date()` 正确解析，`listUserSessions`（展示）用 SQL 字符串比较错误。
- 强制检查：
  - 审计某字段时必须 grep 该字段的所有读取点，不能只看一处。
  - 鉴权路径错误 = 越权（高严重），展示路径错误 = 数据陈旧（中严重），但两者同源，审计必须一并覆盖。

### 防再犯元规则

以上 7 类本质是两类元问题的投影，工程纪律应围绕这两点建立：

1. 格式/契约不一致 - 日期格式、文档与代码、测试与生产写入路径。任何"两端约定"必须显式校验两端一致。
2. 单点思维而非系统扫描 - 修一处不查同类、单次编辑不交叉验证。任何 bug 修复必须触发同模式 grep 扫描。

---

*文档结束*
