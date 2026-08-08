# FZTBUCS-Ops-运维文档

> 最后更新：2026-08-08（BFF 视角重写，去 SQLite/Litestream；补充开发约定：pnpm 强制 / Node>=22 / i18n 新增流程 / 新增 widget 须注册 registry）｜类型：reference + how-to
> 更新人：3yearsZ
> 受众：oncall / 站点 owner / 运维 / 发布决策者
> Source of truth：**前端 BFF 层**的运维操作、SLO 阈值、回滚流程的唯一权威位置
> 关联：**全栈部署/编排权威见根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md)**（含 §七 跨端 SLO 与可观测性基线）；后端 PG/备份/运维端点见 [CS-Web-Backend/tools/docs/BackDoc-Infra.md](../../../CS-Web-Backend/tools/docs/BackDoc-Infra.md)；架构与 API 见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md)；安全见 [FrontDoc-02-Sec.md](FrontDoc-02-Sec.md)；演进与 ADR 见 [RootDoc-ADR.md](../../../docs/RootDoc-ADR.md)；工程规则见根级 [docs/Onboarding.md](../../../docs/Onboarding.md#附录-a前端工程规则)
> 变更触发：BFF 部署架构变更 / SLO 阈值调整 / 新增故障场景 / 重大架构变更后 review
> Stale 信号：脚本路径不存在 / SLO 阈值不一致 / 季度演练未执行 / 仍引用 SQLite/Litestream（应为后端职责）

> **范围声明**：前端为 BFF（Backend-for-Frontend）薄转发层，**不持有业务数据**。业务数据、认证、邮件、OAuth 均由后端 FastAPI + PostgreSQL 承载。本文只覆盖 BFF 自身的部署、SLO 与 Runbook；PostgreSQL 备份、Alembic 迁移、Litestream、后端运维端点（`/health /readyz /metrics/json /status`）等**后端职责**见上方"关联"链接，不在本文重复。




## 章节速查（导航）

- [文档结构](#文档结构)
- [生产环境准备](#生产环境准备)
- [部署方式](#部署方式)
- [反向代理配置](#反向代理配置)
- [安全](#安全)
- [维护操作](#维护操作)
- [故障排查（基础）](#故障排查基础)
- [一、SLO 定义（0.9.1 最小集）](#一slo-定义091-最小集)
- [二、Error Budget 消耗规则](#二error-budget-消耗规则)
- [三、SLO 评审流程](#三slo-评审流程)
- [四、Error Budget 历史记录](#四error-budget-历史记录)
- [五、相关文档与 ADR](#五相关文档与-adr)
- [一、回滚流程](#一回滚流程)
- [二、故障场景处置](#二故障场景处置)
- [三、监控与告警响应](#三监控与告警响应)
- [四、维护操作](#四维护操作)
- [五、相关文档](#五相关文档)

## 文档结构

- **Part A: 部署指南** — 环境准备、部署方式、反向代理、安全、维护、基础排查
- **Part B: SLO 与错误预算** — SLI/SLO 矩阵、预算消耗规则、评审流程、历史记录
- **Part C: 运维 Runbook** — 回滚流程、故障场景处置、监控告警响应、维护操作

---

# Part A: 部署指南

> 最后更新：2026-08-05

## 生产环境准备

### 环境要求

- Node.js >=22（`package.json` `engines.node: ">=22"`）/ pnpm 9+（`packageManager: pnpm@9.0.0`）
- 反向代理：Nginx / Caddy / Cloudflare Tunnel
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)（仅内网穿透需要）
- 包管理：强制 **pnpm**（`package.json` 设 `preinstall: "npx only-allow pnpm"`，使用 npm/yarn 安装会被拦截）
- **后端 FastAPI 必须可达**（BFF 启动后所有 `/api/**` 调用均转发到 `BACKEND_URL`，后端不可达 → 所有业务 API 返回 5xx）

### 环境变量

复制 `.env.example` 为 `.env` 并配置。**BFF 运行时必填**：

```bash
# === BFF 运行时（必填）===
BACKEND_URL=http://localhost:9000              # BFF 转发的后端 FastAPI 地址（本地开发；容器编排内改为 http://backend:8000）
NEXT_PUBLIC_SITE_URL=https://your-domain.com   # 站点 URL（metadata base URL）
ALLOWED_ORIGINS=https://your-domain.com        # Origin 白名单（逗号分隔，POST 端点防 Login CSRF）
TRUST_PROXY=true                               # 反向代理部署时必设为 true（速率限制需正确客户端 IP）
```

可选项：

```bash
SENTRY_DSN=                                    # Sentry 错误监控（运行时动态导入，留空不启用）
```

> 以下为**迁移前单体遗留变量**，运行时**不被任何 API 路由引用**（认证/邮件/OAuth 已由后端承载），仅遗留代码与开发/种子脚本可能使用，待后续清理：
> `SQLITE_DB_PATH`、`AUTH_SESSION_SECRET`、`SMTP_HOST/PORT/USER/PASS/FROM`、`PASSWORD_RESET_DEFAULT`、`GITHUB_CLIENT_ID/SECRET/CALLBACK_URL`。
> 完整说明见 [`.env.example`](../../.env.example)。

> 后端必填密钥（`DATABASE_PASSWORD` / `SECRET_KEY` / `TOTP_ENCRYPTION_KEY` 等）见根 [`.env.example`](../../../.env.example) 与后端 `CS-Web-Backend/tools/docs/BackDoc-Conv.md`。

---

## 部署方式

> 全栈编排（db + backend + frontend + caddy 一键起）的权威流程见根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md)。下方方式一/二/三为前端独立部署视角，适用于不使用根级 compose 的场景。

### 方式一：Docker + Caddy（推荐，前端独立部署）

```bash
cd tools/deploy
cp .env.example .env          # 编辑填写生产变量（含 BACKEND_URL 指向后端）
docker compose up -d
```

- Caddy 容器：自动申请管理 HTTPS 证书，反向代理到应用容器
- 应用容器：运行 `pnpm start`
- **无本地业务数据卷**：前端为 BFF，业务数据由后端 PostgreSQL 承载（`data/` 仅遗留脚本/上传文件，非运行时数据源）

首次部署后创建管理员：通过**后端 CLI / Swagger** 创建（后端 rbac_init seed 已用 `ADMIN_USERNAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` 配置创建默认管理员），见根级 `docs/Onboarding.md`（附录 B 后端工程约定）。原前端遗留脚本 `pnpm create-user` 已删除。

### 方式二：直接运行

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

配合 Nginx / Caddy / Cloudflare Tunnel 使用。需保证 `BACKEND_URL` 指向可达的后端。

### 方式三：内网穿透（开发调试 / 临时公网）

```bash
pnpm dev          # 终端 1：启动本地服务
pnpm tunnel       # 终端 2：启动 Cloudflare Tunnel，提取 *.trycloudflare.com 地址
```

脚本自动：检测/安装 cloudflared → 清理旧 tunnel → 启动并提取公网地址 → 更新 `.env` 的 `ALLOWED_ORIGINS` / `NEXT_PUBLIC_SITE_URL`。

```bash
pnpm tunnel --port 3000      # 指定本地端口（默认 2333）
pnpm tunnel --no-update-env  # 不更新 .env
```

> `NEXT_PUBLIC_*` 在构建时嵌入，修改 `.env` 后需重启 `pnpm dev` 生效。

### 方式四：静态导出（不支持）

项目使用 App Router + API Routes（BFF 转发），不支持 `next export` 静态导出。

---

## 反向代理配置

### Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    location / {
        proxy_pass http://127.0.0.1:2333;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Caddy

```caddy
your-domain.com {
    reverse_proxy 127.0.0.1:2333
}
```

Caddy 自动处理 HTTPS 证书。

---

## 安全

### 必须修改的默认值

1. `BACKEND_URL` — 生产环境指向内网后端（如 `http://backend:8000`），勿指向公网未鉴权地址
2. `ALLOWED_ORIGINS` — 设为实际生产域名
3. `NEXT_PUBLIC_SITE_URL` — 设为实际 HTTPS URL
4. `TRUST_PROXY=true` — 反向代理部署时必设

### 反向代理安全

- `TRUST_PROXY=true`，否则速率限制无法正确获取客户端 IP
- 确保反向代理设置 `X-Forwarded-For` / `X-Forwarded-Proto`
- 生产环境建议在代理层额外配置速率限制

### 数据库备份

> **BFF 无本地业务数据库，无需备份**。业务数据由后端 PostgreSQL 承载，备份/恢复/PITR 见后端 `CS-Web-Backend/tools/docs/BackDoc-Infra.md` 与根 `docs/RootDoc-Deploy.md` §六。

### 日志与监控

- 应用日志输出 stdout/stderr，由 Docker / systemd 收集，建议配置日志轮转
- 管理员审计日志存于**后端** `admin_actions` 表（前端仅薄转发）
- 错误率告警与监控响应见 Part C · 三

### HTTPS

- 生产必须启用 HTTPS；Docker+Caddy 自动处理，直接运行需在代理层配置证书
- 证书失败处置见 Part C · 二场景 3

---

## 维护操作

### 更新部署

```bash
git pull
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

Docker 部署：

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

> 回滚时的停机决策见 Part C · 一。

---

### 开发约定（i18n 词条新增 / 新增 widget 注册）

> 前端为 Next.js 16（App Router）+ next-intl + pnpm。以下为新功能接入的强制约定（BFF 视角，详见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md) §1.2.4 / Part B §2.1）。

**包管理（强制 pnpm）**：`package.json` 设 `preinstall: "npx only-allow pnpm"`（npm/yarn 安装被拦截）、`packageManager: pnpm@9.0.0`、`engines.node: ">=22"`。本地开发：`pnpm install && pnpm dev`（自定义 `server.ts`，默认端口 **2333**）。

**i18n 词条新增流程**（工作台相关文案）：

1. 在 `src/i18n/messages/tools.ts` 的 `ToolsMessages.workbench` 接口新增 key（类型声明）；
2. 在 `zhCN.workbench` 与 `en.workbench` 两处同步补中/英词条（三处缺一即 `tsc` 报错或运行时空文案）；
3. 组件内用 `useTranslations('workbench')` 取值。

**新增 widget 注册流程**（工作台卡片）：

1. 在 `src/modules/workbench/widgets/` 新增组件（复用 `@/components/primitives/{Input,Button}` 与 `InlineTabs`；颜色仅用项目令牌 `var(--*)`；组件 < 500 行；hook 返回值不混入 ref）；
2. 在 `src/modules/workbench/widget-registry.ts` 的 `WIDGETS` 数组声明 `id` / `slot`（`full` / `main` / `side`）/ `titleKey`（指向 `workbench` namespace）/ `component`——`workbench.tsx` 按 slot 分组 + `wb_widget_prefs`（localStorage）显隐自动渲染，**无需改骨架**；
3. （可选）在布局设置显隐开关中暴露该 widget。

> ⚠️ **部分就绪提醒**：`api-usage-stats` 后端路由 `/api/workbench/stats/api-usage` 与 i18n（`workbench.apiUsageTitle`）已就绪，但前端 widget 卡片尚未在 `WIDGETS` 注册、未渲染。接入须补齐第 1–2 步（详见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md) §1.2.4）。

---

## 故障排查（基础）

> 完整场景处置见 Part C · 二。

**端口冲突**（默认 2333）：

```bash
lsof -i :2333
PORT=5200 pnpm start    # 改用其他端口
```

**BFF 转发 5xx（上游故障）**：BFF 转发后端失败时返回 5xx，日志可见 `BACKEND_URL` 不可达或后端返回非 2xx。完整处置见 Part C · 二场景 1。

**Session 异常失效**：JWT 由后端签发，前端以 HttpOnly Cookie 托管。检查 `BACKEND_URL` 是否变更、代理是否正确传递 Cookie、`NEXT_PUBLIC_SITE_URL` 是否正确。完整清单见 Part C · 二场景 2。

---

# Part B: SLO 与错误预算

> 类型：reference + how-to｜受众：站点 owner / oncall / 发布决策者｜最后验证：2026-08-05
> cadence：每月 1 日 review 预算消耗 / 每季度 review 阈值｜Stale 信号：连续 2 月未记录 / 可用性低于目标 / 季度 review 未执行
> 变更触发：性能可用性偏离 SLO / 用户量增长触发容量重评估 / 重大架构变更

> **范围说明**：本 SLO 覆盖**用户可见的 BFF 端点**（含其转发后端的链路）。后端 PG / Alembic / Redis 等组件的内部 SLO 由后端文档管理。
> **跨端 SLO 基线（可用性/延迟/数据持久性/错误预算/可观测性/告警/巡检）的唯一权威见根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md#七slo-与可观测性基线) §七**；本文 Part B 仅补充 BFF 端点级 SLI 矩阵、错误预算消耗规则与评审流程。

## 一、SLO 定义（0.9.1 最小集）

> SLO = Service Level Objective。SLI（指标）→ SLO（目标）→ Error Budget（允许失败的预算）。
> 0.9.1 采用用户视角：可用性 + 关键路径延迟 + 错误率，不追求全覆盖。

### 1. SLI / SLO 矩阵

| SLI | 定义 | SLO 目标 | 测量窗口 | Error Budget |
|-----|------|---------|---------|-------------|
| 可用性 | `/api/health` 返回 200 比例（BFF 转发后端 `/health`） | 99.0% / 月 | 30 天滚动 | 432 分钟/月（≈ 7.2 小时） |
| API 错误率 | 5xx / 总响应（核心端点，含 BFF 自身与后端转发失败） | < 1% / 月 | 30 天滚动 | 1% 允许 5xx |
| API P95 延迟 | 核心端点 P95 响应时间（含后端处理时间） | < 500ms | 5 分钟滚动 | 连续 3 个窗口超阈值 = 预算消耗 |
| 考试提交可用性 | `/api/exam/submit` 成功率（BFF→后端全链路） | 99.9% / 考试期 | 单次考试窗口 | 0 次失败（关键业务） |

### 2. 核心端点清单（SLO 覆盖范围）

```
GET  /api/health                  — 可用性探活（BFF 转发后端 /health）
POST /api/auth/login              — 认证关键路径
GET  /api/community/community/topics  — 社区列表（读高频）
POST /api/exam/submit             — 考试提交（业务关键，单独 SLO）
GET  /api/events                  — 活动列表
GET  /api/notifications           — 通知（轮询高频）
```

非核心端点（管理后台、低频管理操作）不纳入 SLO，但仍受监控。

### 3. 测量方法

| SLI | 数据源 | 采集方式 |
|-----|-------|---------|
| 可用性 | `/api/health` | Caddy healthcheck |
| API 错误率 | pino NDJSON 日志 | 聚合 `level=error` + `status>=500` |
| API P95 延迟 | pino `requestId` + `responseTime` | 按端点分组计算 P95 |
| 考试提交 | pino 业务日志 | 按考试 ID 聚合 `exam.submit` 成功率 |

> ℹ️ 外部探针接入等待办条目已迁移至 `docs/项目待办事项.md`。

---

## 二、Error Budget 消耗规则

### 1. 消耗场景与响应

| 消耗速度 | 触发条件 | 响应动作 |
|---------|---------|---------|
| 正常 | 月消耗 < 50% | 无动作，继续迭代 |
| 预警 | 月消耗 50%–80% | 月度 review 标记并分析根因 |
| 警戒 | 月消耗 80%–100% | 暂停非紧急功能迭代，优先修复可靠性 |
| 超支 | 月消耗 > 100% | 冻结所有非可靠性发布，直至下月预算重置 |
| 考试期紧急 | 考试提交成功率 < 99.9% | 立即介入，按 [Part C 场景 4](#场景-4考试期紧急故障slo-999) 处置 |

### 2. 冻结与解冻

- **冻结条件**：月可用性预算超支（> 7.2 小时宕机）或考试期 SLO 违约
- **冻结范围**：所有非 hotfix 发布暂停；hotfix 须经 oncall 批准
- **解冻条件**：下一测量窗口开始 + 根因分析文档完成（写入 [RootDoc-ADR.md](../../../docs/RootDoc-ADR.md) ADR）

---

## 三、SLO 评审流程

**月度 Review（每月 1 日）**：

1. 采集上月 SLI 数据（pino 日志聚合 + `/api/health`）
2. 计算可用性 / 错误率 / P95 是否达成 SLO
3. 计算 error budget 消耗比例
4. 若超支 → 触发根因分析 + 写入 evolution ADR
5. 更新本文档「四、历史记录」
6. 连续 2 月超支 → 评估下调 SLO 目标（需 owner 批准）

**季度 Review（每季度末）**：评估 SLO 阈值合理性、核心端点清单、是否新增 SLI（如后端 PG 连接池饱和度、Redis 命中率——以后端指标为准）、EX-1 单实例风险接受是否仍合理。

**年度 Review（每年 12 月）**：评估升级可用性目标（99.0% → 99.5%）、是否需多实例化（L3 多区域灾备触发）。

---

## 四、Error Budget 历史记录

> 每月 review 后追加一行。首次发布前为空。

| 月份 | 可用性 | 5xx 错误率 | P95 延迟 | Budget 消耗 | 状态 | 备注 |
|------|--------|----------|---------|------------|------|------|

> ℹ️ 待发布月份记录等待办条目已迁移至 `docs/项目待办事项.md`。

---

## 五、相关文档与 ADR

- [RootDoc-ADR.md](../../../docs/RootDoc-ADR.md) — ADR-018（0.9.1 SLO 与单实例风险接受）、R18（外部探针未接入前降级风险）
- 本文档 Part C — SLO 违约运维处置｜Part A — 部署与回滚（影响可用性）

---

# Part C: 运维 Runbook

> 类型：how-to｜受众：oncall / 站点 owner / 运维｜最后验证：2026-08-05
> cadence：每季度演练（rollback + 后端 restore drill）+ 重大架构变更后 review｜Stale 信号：脚本路径不存在 / SLO 阈值不一致 / 季度演练未执行

## 一、回滚流程

### 1. 触发条件

| 场景 | 触发条件 | 决策者 |
|------|---------|--------|
| SLO 违约 | 月宕机 > 7.2 小时 或 考试期 SLO 违约 | oncall |
| 严重 bug | 核心功能不可用（登录/考试/社区）且无 hotfix | oncall + owner |
| BFF 转发链路故障 | BFF 镜像回归致大面积 5xx | oncall |
| 安全回退 | 发布引入安全漏洞（如 ADR-015 类） | oncall + owner |

> 数据损坏 / 不可逆迁移回滚属**后端职责**，见后端 `CS-Web-Backend/tools/docs/BackDoc-Infra.md` §六 迁移验证与根 `docs/RootDoc-Deploy.md` §六。

### 2. 决策树

```
1. 是否可通过 hotfix 修复？
   ├─ 是 → 优先 hotfix
   └─ 否 → 继续
2. 故障是否在 BFF 自身代码/配置？
   ├─ 是 → 方案 A（回滚到上一 tag，重建前端镜像）
   └─ 否 → 故障在后端或 PG → 移交后端 Runbook
3. 回滚后验证 SLO 恢复
```

### 3. 方案 A：回滚到上一 tag（BFF 镜像重建）

前置：上一 tag 镜像仍在 registry 或本地缓存。BFF 为无状态薄转发层，无本地数据库迁移兼容性问题。

```bash
git tag --sort=-creatordate | head -5      # 确认当前版本与上一 tag
cd tools/deploy
docker compose stop cs-website
git checkout v1.0.0                          # 替换为实际回滚目标 tag
docker compose build cs-website
docker compose up -d cs-website
curl -f http://localhost:2333/api/health    # 期望 {"ok":true,...}
# 手动验证：首页 / 登录测试账号 / 社区·活动·考试列表
# 记录回滚事件 ADR（见根 docs/RootDoc-ADR.md）
```

RTO：≤ 10 分钟（从决策到服务恢复）。

### 4. 方案 B：必须 hotfix（BFF 代码缺陷无法回滚）

```bash
git checkout -b hotfix/critical-issue-<date>
pnpm ts-check && pnpm test -- --run
docker compose build cs-website && docker compose up -d cs-website   # 跳过 CI 等待
# 验证 + 记录
```

### 5. 回滚后必做检查

- [ ] `/api/health` 返回 200（BFF + 后端链路通）
- [ ] 登录正常（JWT Cookie 设置/刷新链路）
- [ ] 核心读路径正常（社区/活动/考试列表）
- [ ] pino 日志连续 5 分钟无 ERROR
- [ ] 在 [RootDoc-ADR.md](../../../docs/RootDoc-ADR.md) 新增 ADR 记录回滚事件

---

## 二、故障场景处置

### 场景 1：BFF 转发 5xx（上游/后端不可达）

**症状**：API 普遍返回 502/504，日志现 `BACKEND_URL` 不可达或后端返回 5xx；`/api/health` 可能 503（BFF 转发失败）。
**根因**：后端容器崩溃 / `BACKEND_URL` 配置错误 / 内网 `cs-net` 不通 / 后端 PG 故障致后端 5xx。

```bash
docker compose ps                                 # 后端容器是否 Running
docker compose logs backend 2>&1 | tail -50       # 后端日志
docker compose exec cs-website sh -c "curl -fsS $$BACKEND_URL/health"   # 容器内直连后端
docker compose logs cs-website 2>&1 | grep -i "fetch.*failed\|ECONNREFUSED"
docker compose restart backend                    # 后端崩溃则重启
curl -f http://localhost:2333/api/health          # 验证 BFF 链路
```

**预防**：部署前确认 `BACKEND_URL` 内网可达；监控 BFF 5xx 率；后端 PG 故障处置见后端 Runbook。

---

### 场景 2：Session 异常失效（用户频繁掉线）

**症状**：用户反馈频繁掉线；日志现 401 静默刷新失败；JWT Cookie 被清除。

> **架构说明**：JWT 由**后端**签发（access 15min / refresh 7day），前端 BFF 以 HttpOnly Cookie 托管并 401 静默刷新。session 表、refresh token 表均属后端 PG。

| 可能原因 | 检查方法 | 处置 |
|---------|---------|------|
| `BACKEND_URL` 变更或后端重启 | 查 `.env` / `docker compose ps` | 恢复原值；后端重启后 refresh token 仍有效（PG 持久化） |
| 反向代理未传 Cookie | 查 Caddyfile/Nginx | 确认 `proxy_pass` 转发 Cookie |
| `NEXT_PUBLIC_SITE_URL` 错误 | 查 `.env` | 修正 Cookie domain 不匹配 |
| 用户被管理员禁用 | 后端查 `users.is_active` | 正常行为 |
| Refresh token 过期或被撤销 | 后端查 `refresh_tokens` 表 | 正常行为（7 天） |
| 后端 `SECRET_KEY` 变更 | 查后端 `.env` | 接受全部 JWT 失效，需重新登录 |
| 跨子域访问 | 检查 URL | Cookie 不跨子域，需统一域名 |

```bash
grep BACKEND_URL .env                            # 确认指向正确后端
cat tools/deploy/Caddyfile                       # 确认 reverse_proxy 无额外 header 修改
docker compose logs cs-website | grep -i "401\|refresh.*failed\|clearAuth"
docker compose logs backend | grep -i "token\|jwt\|auth"
docker compose restart cs-website                # BFF 配置错误修正后重启
```

---

### 场景 3：Caddy 证书失败

**症状**：浏览器证书错误；HTTPS 不可用；Caddy 日志现 ACME 挑战失败。
**根因**：DNS 未指向 / Let's Encrypt 速率限制 / ACME 端点被防火墙阻断 / 系统时间错误。

```bash
date                                            # 错误则 sudo ntpdate pool.ntp.org
dig your-domain.com +short                      # 应返回公网 IP
docker compose logs caddy 2>&1 | tail -100
curl -I http://your-domain.com/.well-known/acme-challenge/test   # ACME 需 80 端口
docker compose restart caddy
curl -vI https://your-domain.com 2>&1 | grep -A5 "SSL certificate"
```

若 Let's Encrypt 速率限制，临时改用 ZeroSSL（Caddyfile 加 `tls { issuer zerossl }`）。

降级：修复期间可临时用 Cloudflare Tunnel 暴露（`pnpm tunnel --no-update-env`，Cloudflare 提供 edge 证书）。

---

### 场景 4：考试期紧急故障（SLO 99.9%）

**症状**：考试提交失败率 > 0.1%。**优先级：最高。**

```bash
curl -f http://localhost:2333/api/health        # BFF 链路
docker compose ps                                # 容器状态
docker compose logs cs-website | grep -i "exam.*submit\|5xx"
docker compose logs backend | grep -i "exam\|submit\|database"   # 后端考试/DB 错误
df -h
docker compose restart cs-website                # BFF 崩溃则立即重启
docker compose restart backend                   # 后端崩溃则重启（PG 数据不丢）
# 通过 admin 后台创建全站公告通知考生
```

> 数据库损坏恢复属后端职责，见后端 `CS-Web-Backend/tools/docs/BackDoc-Infra.md` §六 迁移验证。

违约后按 [Part B](#二error-budget-消耗规则) 二·1 立即介入 + 根因分析写入 ADR。

---

## 三、监控与告警响应

### 1. 错误率告警（HIGH_ERROR_RATE）

触发：pino 日志现 `alert: 'HIGH_ERROR_RATE'`。

```bash
docker compose logs cs-website | grep "HIGH_ERROR_RATE" -A5
docker compose logs cs-website | grep "level.*error" | tail -20
# 判断已知问题：是否刚发布 / 后端是否 5xx（见场景 1）/ 磁盘（df -h）
# 预算快速消耗 → 考虑回滚（见一·3）
```

### 2. 健康检查失败

触发：`/api/health` 返回 503（BFF 转发后端 `/health` 失败）。

```bash
curl http://localhost:2333/api/health | jq       # BFF 端
docker compose exec cs-website sh -c "curl -fsS $$BACKEND_URL/health"   # 容器内直连后端
docker compose ps                                # 容器状态
df -h                                            # 磁盘问题
# 后端不通 → 见场景 1
```

---

## 四、维护操作

### 1. 创建管理员

> 原前端遗留脚本 `pnpm create-user` / `pnpm seed`（直连 SQLite）已于 2026-08-07 删除。管理员由后端 `rbac_init` seed 创建（配置 `ADMIN_USERNAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`，见后端 `.env.example`）；生产环境如需额外管理员请通过**后端 CLI / Swagger** 创建，见根级 `docs/Onboarding.md`（附录 B 后端工程约定）。

### 2. 数据保留清理

> ℹ️ 数据保留清理（手动，未来由 L9 定时任务自动化）等待办条目已迁移至 `docs/项目待办事项.md`。

### 3. 后端数据备份与恢复演练

> BFF 无本地业务数据库，**备份与 restore drill 由后端负责**（PostgreSQL 物理备份 / pg_dump / PITR）。见后端 `CS-Web-Backend/tools/docs/BackDoc-Infra.md` 与根 `docs/RootDoc-Deploy.md` §六。

---

## 五、相关文档

- 本文档 Part B — SLO 阈值与 error budget 规则｜Part A — 部署配置与环境变量
- [RootDoc-ADR.md](../../../docs/RootDoc-ADR.md) — ADR 记录（回滚事件需新增 ADR）
- 根 [docs/Onboarding.md](../../../docs/Onboarding.md#a7-防再犯清单explanation) — 防再犯清单
- 根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md) — 全栈部署/编排权威
- 后端 [docs/BackDoc-Infra.md](../../../CS-Web-Backend/tools/docs/BackDoc-Infra.md) — 后端运维端点 / PG / Redis / OTel
- 后端 [docs/BackDoc-Infra.md §六 迁移验证](../../../CS-Web-Backend/tools/docs/BackDoc-Infra.md#六迁移验证migration_verification) — Alembic 迁移与回滚验证

---
