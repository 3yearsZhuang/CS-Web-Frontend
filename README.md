# FZTBU CS — 计算机协会官网

编辑式技术极简美学的校园技术社区官网，融合工业终端质感与粒子莫比乌斯环视觉元素。

---

## 快速开始

环境要求：Node.js 20+ · pnpm 9+

```bash
pnpm install          # 安装依赖
cp .env.example .env  # 复制环境变量模板
pnpm dev              # 启动开发服务器 → http://localhost:2333
```

> ⚠️ 前端为 BFF，需后端 FastAPI 运行才能完整工作。推荐在根仓库用 `make dev-up` 并行启动前后端（后端 :9000 / 前端 :2333）；或单独启动后端（见 [根 README](../README.md)）。需配置 `BACKEND_URL` 指向后端。

生产部署：

```bash
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器
```

管理员账号通过 CLI 创建，详见「常用命令」。

内网穿透（Cloudflare Tunnel）：

```bash
pnpm tunnel           # 一键启动内网穿透，自动更新 .env 中的公网地址
pnpm tunnel --port 3000  # 指定端口（默认 2333）
```

> 前置条件：需先启动本地服务器（`pnpm dev`）。运行 `pnpm tunnel` 会自动清理旧进程、启动 Cloudflare Tunnel、提取公网地址并更新 `.env` 中的 `ALLOWED_ORIGINS` 和 `NEXT_PUBLIC_SITE_URL`。

---

## 项目架构

前端为 **BFF（Backend-for-Frontend）薄转发层**，基于 Next.js 16 App Router；业务数据、认证、邮件均由后端 FastAPI + PostgreSQL 承载，前端 API 路由（`src/app/api/**/route.ts`）统一通过 [`shared/backend-client.ts`](src/shared/backend-client.ts) 代理到后端（注入 JWT、401 静默刷新、snake_case→camelCase 翻译）。

- 业务模块：位于 `src/modules/`，按业务域拆分（admin / announcement / auth / community / events / join / notification / tools / user）。其中 `community` 已扁平化合并原 forum / blog / members 三个子域
- 共享基础设施：`src/shared/`（BFF 客户端 / 安全 / 配置 / hooks）。其中 `db/`、`utils/mail.ts`、`events/` 为迁移前单体遗留代码，**运行时不被任何 API 路由引用**，待清理
- 测试：`tools/tests/`（Vitest 单元 + Playwright E2E）

> 顶层编排与全栈架构见根仓库 [README.md](../README.md) 与 [docs/RootDoc-Deploy.md](../docs/RootDoc-Deploy.md)；详细前端结构见 [架构文档](tools/docs/FrontDoc-Arch.md)。

---

## 页面

| 路由 | 说明 |
|------|------|
| `/` | 首页 — 极简单屏 Hero + 粒子莫比乌斯环 |
| `/about` | 关于 — 社团故事 · 信念 · 六大方向 · 流程 · 报名 |
| `/events` | 活动 — 年度计划 · 往期回顾 · 时间轴/月历双视图 |
| `/events/[id]` | 活动详情 |
| `/login` | 登录/注册 |
| `/profile` | 个人资料（需登录） |
| `/admin` | 管理后台（需 admin/root） |
| `/notifications` | 消息通知（需登录） |
| `/community` | 社区聚合页 — Feed 流 |
| `/community/forum` | 论坛首页 — 版块列表 · 最近主题 |
| `/community/forum/[category]` | 版块详情 — 主题列表 |
| `/community/forum/[category]/[topicId]` | 主题详情 — 主帖 · 回复 · 楼中楼 |
| `/community/forum/new` | 发新帖 |
| `/community/blog/[slug]` | 博客详情 — Markdown 渲染 |
| `/community/members` | 成员名录 |
| `/tools` | 工具集首页 |
| `/tools/exam` | 题库 |
| `/tools/exam/[id]` | 考试详情 |
| `/tools/resource` | 资源库 |
| `/tools/task` | 任务发布板 |
| `/tools/auxilio` | Auxilio 学习助手 |
| `/join` | 入社申请 |
| `/users/[id]` | 用户主页 |

---

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 · App Router · React 19 |
| 样式 | Tailwind CSS v4 · CSS 变量双主题 |
| 动画 | Motion (Framer Motion 下一代) |
| 数据库 | 无本地业务库——前端为 BFF，业务数据由后端 PostgreSQL 承载（`better-sqlite3` 依赖已于 2026-08-07 移除，前端零 SQLite） |
| 认证 | 后端 JWT 双 token（access 15min / refresh 7day）· BFF 以 HttpOnly Cookie 托管 · 401 静默刷新 · TOTP 2FA / GitHub OAuth 由后端处理 |
| 邮件 | 由后端 aiosmtplib 承载（前端 `nodemailer` 为迁移前遗留，运行时未使用） |
| 测试 | Vitest（单元，441+）· Playwright（E2E） |
| 代码检查 | ESLint 9 · TypeScript 5 |
| 日志/监控 | pino 结构化日志（NDJSON）· 请求 ID 链路 · 健康检查 `/api/health`（转发后端）· 错误率监控 · 可选 Sentry（`SENTRY_DSN` 动态接入） |

---

## 认证与权限

### 角色

- `user` — 普通用户（默认）
- `admin` — 标准管理员（用户/活动/论坛管理）
- `root` — 超级管理员（唯一，不可删除，拥有审计日志和角色管理权限）
- `content_moderator` — 内容审核员（论坛审核）
- `exam_admin` — 考试管理员（题目/考试管理）
- `task_publisher` — 任务发布员（任务管理）

> 角色类型统一由 `src/shared/types/role-types.ts` 定义，确保单一来源。

### 权限矩阵

| 操作 | user | admin | root | 细粒度角色 |
|------|------|-------|------|------------|
| 浏览活动 | ✅ | ✅ | ✅ | ✅ |
| 报名活动 | ✅ | ✅ | ✅ | ✅ |
| 论坛发帖/回复 | ✅ | ✅ | ✅ | ✅ |
| 管理用户（禁用/启用/编辑） | ❌ | ✅（不能操作管理员） | ✅ | ❌ |
| 管理活动（创建/编辑/删除） | ❌ | ✅ | ✅ | ❌ |
| 管理论坛（版块/主题审核） | ❌ | ✅ | ✅ | ❌ |
| 管理论坛（审核/置精/删除） | ❌ | ✅ | ✅ | ✅(content_moderator) |
| 管理考试（创建/发布/结束） | ❌ | ✅ | ✅ | ✅(exam_admin) |
| 管理任务（创建/发布/关闭） | ❌ | ✅ | ✅ | ✅(task_publisher) |
| 角色权限管理 | ❌ | ❌ | ✅ | ❌ |
| 博客发文 | ✅ | ✅ | ✅ | ✅ |
| 任务认领 | ✅ | ✅ | ✅ | ✅ |
| 群发通知 | ❌ | ✅ | ✅ | ❌ |
| 审批密码重置 | ❌ | ✅（不能审批自己） | ✅ | ❌ |
| 审计日志（查看/删除） | ❌ | ❌ | ✅ | ❌ |
| 自定义重置密码 | ❌ | ❌ | ✅ | ❌ |
| 删除管理员 | ❌ | ❌ | ✅ | ❌ |

### 保护机制

| 保护 | 说明 |
|------|------|
| SELF_DEMOTE | 管理员不能降级自己 |
| SELF_DISABLE | 管理员不能禁用自己 |
| SELF_DELETE | 管理员不能删除自己 |
| SELF_APPROVE | 管理员不能批准自己的密码重置申请 |
| LAST_ADMIN | 禁止降级/禁用/删除最后一个活跃管理员 |
| ADMIN_CROSS_PROTECT | 管理员不能禁用/重置其他管理员的密码 |

---

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `BACKEND_URL` | BFF 转发的后端 FastAPI 地址 | `http://localhost:9000` |
| `NEXT_PUBLIC_SITE_URL` | 站点 URL（metadata base URL） | `http://localhost:2333` |
| `ALLOWED_ORIGINS` | Origin 白名单（逗号分隔，POST 端点防 Login CSRF） | `http://localhost:2333,http://localhost:3000` |
| `TRUST_PROXY` | 是否信任反向代理头（Caddy/Nginx 后须 true） | `false` |
| `SENTRY_DSN` | Sentry 错误监控（可选，运行时动态导入，留空不启用） | 未启用 |

> 以下为迁移前单体遗留变量，运行时**不被任何 API 路由引用**（认证/邮件/OAuth 已由后端承载），待后续清理：`AUTH_SESSION_SECRET`、`SMTP_HOST/PORT/USER/PASS/FROM`、`PASSWORD_RESET_DEFAULT`、`GITHUB_CLIENT_ID/SECRET/CALLBACK_URL`（`SQLITE_DB_PATH` 已随 SQLite 清理于 2026-08-07 移除）。

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器（端口 2333） |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务器 |
| `pnpm tunnel` | 一键启动 Cloudflare Tunnel 内网穿透 |
| `pnpm create-user --role admin` | CLI 创建/提升管理员 |
| `pnpm create-user --role root` | CLI 创建超级管理员 |
| `pnpm seed` | 填充工具集种子数据 |
| `pnpm e2e` | 运行 E2E 测试（Playwright） |
| `pnpm validate` | TS 类型检查 + ESLint（并行） |
| `pnpm test` | 运行单元测试（Vitest） |
| `pnpm lint` | ESLint 检查 |
| `pnpm ts-check` | TypeScript 类型检查 |
| `pnpm deploy:build` | 构建部署镜像（Docker Compose，tools/deploy） |
| `pnpm deploy:up` | 启动部署（应用 + Caddy 反向代理） |
| `pnpm deploy:down` | 停止部署 |
| `pnpm deploy:logs` | 跟踪部署日志 |

---

## 测试

```
tools/tests/
├── e2e/                         # Playwright E2E（auth/core-flows/events/exam/forum + global-setup）
├── announcement.test.ts         # 公告模块
├── blog-points.test.ts          # 博客积分逻辑
├── events.test.ts               # 活动 CRUD/报名/归档日期兼容
├── exam.test.ts                 # 考试模块
├── join.test.ts                 # 入社申请
├── mask.test.ts                 # 数据脱敏
├── password-policy.test.ts      # 密码策略与历史复用
├── permissions-hunt.test.ts     # 角色权限漏洞修复验证
├── proxy-headers.test.ts        # 反向代理头清理
├── resource.test.ts             # 资源站
├── security.test.ts             # 安全工具单元测试
├── task.test.ts                 # 任务发布板
└── totp.test.ts                 # TOTP 双因素认证
```

---

## 文档

所有开发文档位于 `tools/docs/`。

| 文档 | 说明 |
|------|------|
| [架构 + API 文档](tools/docs/FrontDoc-Arch.md) | 目录结构、路由、模块分析、完整 API 端点与契约 |
| [安全文档](tools/docs/FrontDoc-Sec.md) | 安全审计（OWASP）+ 角色体系、权限矩阵与不变量 |
| [运维文档](tools/docs/FrontDoc-Ops.md) | 部署指南 + SLO 与错误预算 + 运维 Runbook（回滚/故障处置） |
| [演进与 ADR](tools/docs/FrontDoc-Evo.md) | 已完成功能 + 未来迭代规划 + 架构决策记录（ADR-001~019） |
| [Markdown 编辑器](tools/docs/FrontDoc-MDE.md) | 编辑器使用指南 |
| [入职指南 + 项目规则](../../docs/Onboarding.md) | 新开发者快速上手 + 开发约定、模块协作规范、防再犯清单（根级手册，含附录 A 前端工程规则） |
| [PG 数据迁移](tools/docs/FrontDoc-PGMig.md) | SQLite → PostgreSQL 迁移历史记录（已归档：迁移 2026-08-05 完成，脚本已删除） |
| [国际化 i18n](tools/docs/FrontDoc-i18n.md) | next-intl 迁移状态与流程（已完成/剩余清单） |
| [变更日志](CHANGELOG.md) | 版本变更记录 |

---

## 许可证

私有项目，未经授权不得用于商业用途。
