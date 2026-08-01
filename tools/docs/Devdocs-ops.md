# FZTBUCS-Ops-运维文档

> 最后更新：2026-08-01（合并 Devdocs-deployment-guide.md + Devdocs-slo.md + Devdocs-runbook.md）
> 文档定位：运维权威文档（reference + how-to）
> 受众：oncall / 站点 owner / 运维人员 / 发布决策者
> Source of truth：运维操作、SLO 阈值、回滚流程的唯一权威位置
> 关联：架构与 API 见 [Devdocs-architecture.md](Devdocs-architecture.md)；安全见 [Devdocs-security.md](Devdocs-security.md)；演进与 ADR 见 [Devdocs-roadmap.md](Devdocs-evolution.md)；工程规则见 [Devdocs-project-rules.md](Devdocs-project-rules.md)

## 文档结构

- **Part A: 部署指南** — 环境准备、部署方式、反向代理、安全、备份、维护、故障排查
- **Part B: SLO 与错误预算** — SLI/SLO 矩阵、预算消耗规则、评审流程、历史记录
- **Part C: 运维 Runbook** — 回滚流程、故障场景处置、监控告警响应、维护操作

> 变更触发：部署架构变更 / SLO 阈值调整 / 新增故障场景 / 重大架构变更后 review
> Stale 信号：脚本路径不存在 / SLO 阈值不一致 / 季度演练未执行

---

# Part A: 部署指南

> 最后更新：2026-07-29

---

## 生产环境准备

### 环境要求

- Node.js 20+
- pnpm 9+
- 反向代理（Nginx / Caddy / Cloudflare Tunnel）
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)（仅内网穿透需要）

### 环境变量

生产环境必须正确配置以下变量（复制 `.env.example` 为 `.env`）：

```bash
# === 必填 ===
AUTH_SESSION_SECRET=<32字节以上随机字符串>
NEXT_PUBLIC_SITE_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com

# === 邮件服务 ===
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM="FZTBU CS <noreply@example.com>"

# === 安全 ===
TRUST_PROXY=true              # 反向代理部署时必设为 true
PASSWORD_RESET_DEFAULT=FZTBU_CS  # 建议修改为更复杂的默认密码
```

### Session 密钥生成

```bash
# 生成 64 字节随机密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 部署方式

### 方式一：Docker + Caddy（推荐）

```bash
cd tools/deploy
cp .env.example .env          # 编辑 .env 填写生产环境变量
docker compose up -d
```

架构说明：
- Caddy 容器：自动申请和管理 HTTPS 证书，反向代理到应用容器
- 应用容器：运行 `pnpm start`
- 数据卷：`data/` 目录挂载以持久化 SQLite 数据库

首次部署后创建管理员（详见本文档 **Part C: 运维 Runbook · 四、维护操作**）：

```bash
docker compose exec app node tools/scripts/create-user.mjs --role root
docker compose exec app node tools/scripts/create-user.mjs --role admin
```

### 方式二：直接运行

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

配合 Nginx / Caddy / Cloudflare Tunnel 等反向代理使用。

### 方式三：内网穿透（开发调试 / 临时公网访问）

使用 Cloudflare Tunnel 一键将本地服务暴露到公网，无需公网 IP 或端口转发。

```bash
# 1. 先启动本地服务器
pnpm dev

# 2. 另开终端，启动内网穿透
pnpm tunnel
```

脚本会自动完成以下操作：

1. 检测并安装 cloudflared（如未安装则通过 Homebrew 自动安装）
2. 清理已有的旧 tunnel 进程
3. 启动 Cloudflare Tunnel 并提取 `*.trycloudflare.com` 公网地址
4. 自动更新 `.env` 中的 `ALLOWED_ORIGINS` 和 `NEXT_PUBLIC_SITE_URL`

命令行选项：

```bash
pnpm tunnel --port 3000      # 指定本地端口（默认 2333）
pnpm tunnel --no-update-env  # 不更新 .env 文件
```

> 注意：`NEXT_PUBLIC_*` 变量在 Next.js 构建时嵌入，修改 `.env` 后需要重启 `pnpm dev` 才能生效。

### 方式四：静态导出 + 独立后端（不推荐）

项目使用 App Router + API Routes，不支持 `next export` 静态导出。

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

Caddy 会自动处理 HTTPS 证书。

---

## 安全注意事项

### 必须修改的默认值

1. `AUTH_SESSION_SECRET` - 必须使用随机生成的强密钥，绝对不能使用默认值
2. `PASSWORD_RESET_DEFAULT` - 建议修改为更复杂的默认密码
3. `ALLOWED_ORIGINS` - 必须设置为实际的生产域名
4. `NEXT_PUBLIC_SITE_URL` - 必须设置为实际的 HTTPS URL

### 反向代理安全

- 必须设置 `TRUST_PROXY=true`，否则速率限制将无法正确获取客户端 IP
- 确保反向代理设置了正确的 `X-Forwarded-For` 和 `X-Forwarded-Proto` 头
- 生产环境建议在反向代理层配置额外的速率限制

### 数据库备份（Litestream 流式备份）

本项目使用 Litestream 实现 SQLite 实时流式备份。Litestream 监控 WAL 文件变更，将增量数据实时复制到备份目标，支持 Point-in-Time Recovery (PITR)，数据丢失窗口通常 < 1 秒。

#### Docker 部署（自动启用）

Docker Compose 部署已内置 Litestream，容器启动时自动运行。

备份文件存储在 `backups/` 目录（通过 bind mount 持久化）：

```
backups/
├── generations/    # 快照代
└── wal/            # WAL 增量
```

#### 裸机部署（手动安装）

```bash
sudo ./tools/scripts/setup-litestream.sh
```

安装后通过 systemd 管理：

```bash
systemctl status litestream    # 查看状态
journalctl -u litestream -f    # 查看日志
```

#### 恢复数据库

```bash
# 从本地备份恢复
litestream restore -o data/app-restored.db data/app.db

# 恢复后替换原数据库（先停止应用）
cp data/app-restored.db data/app.db
```

#### S3 远程备份（可选）

编辑 `tools/deploy/litestream.yml`，取消注释 S3 配置块并填写凭证。Docker 部署时将 AWS 凭证通过环境变量传入：

```bash
LITESTREAM_ACCESS_KEY_ID=AKIA... docker compose up -d
```

> 备份中断的故障处置与季度 restore drill 见本文档 **Part C: 运维 Runbook · 二、场景 3** 与 **四、维护操作**。

### 日志与监控

- 应用日志输出到 stdout/stderr，可通过 Docker 或 systemd 收集
- 建议配置日志轮转，避免日志文件过大
- 管理员操作审计日志存储在数据库 `admin_actions` 表中
- 错误率告警与监控响应见 **Part C: 运维 Runbook · 三、监控与告警响应**

### HTTPS

- 生产环境必须启用 HTTPS
- Docker + Caddy 方案自动处理证书
- 直接运行时需在反向代理层配置 SSL 证书
- 证书失败处置见 **Part C: 运维 Runbook · 二、场景 4**

---

## 维护操作

### 创建管理员

详见本文档 **Part C: 运维 Runbook · 四、维护操作**（Docker 与裸机两种方式）。

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

> 涉及回滚时的迁移兼容性与停机决策，见 **Part C: 运维 Runbook · 一、回滚流程**。

### 数据库迁移

数据库 schema 在应用启动时自动初始化（幂等），新增表或列通过 `db.ts` 中的增量迁移自动处理，无需手动执行 SQL。

---

## 故障排查

> 以下为基础排查；更完整的故障场景处置与恢复步骤见 **Part C: 运维 Runbook · 二、故障场景处置**。

### 端口冲突

默认端口 2333，如果被占用：

```bash
# 查看端口占用
lsof -i :2333

# 修改端口（通过环境变量或启动参数）
PORT=5200 pnpm start
```

### 数据库锁定

SQLite 在并发写入时可能出现锁定。better-sqlite3 默认使用 WAL 模式，支持并发读但写入串行。如果频繁出现锁定：
- 检查是否有多个进程同时访问数据库
- 考虑升级到 PostgreSQL（需要修改 db.ts）

> 严重锁定与 checkpoint 操作见 **Part C: 运维 Runbook · 二、场景 1**。

### Session 失效

如果用户频繁掉线：
- 检查 `AUTH_SESSION_SECRET` 是否在生产环境变更
- 检查反向代理是否正确传递 Cookie
- 确认 `NEXT_PUBLIC_SITE_URL` 配置正确

> 完整根因排查清单见 **Part C: 运维 Runbook · 二、场景 2**。

---

# Part B: SLO 与错误预算

> 文档类型：reference + how-to（SLO 管理流程）| 受众：站点 owner / oncall / 发布决策者
> Source of truth：SLO 唯一权威位置；roadmap R 表与 runbook 引用本文档 | 最后验证：2026-07-31 | cadence：每月 1 日 review budget 消耗 / 每季度 review SLO 阈值 | Stale 信号：连续 2 月未记录 / 可用性低于目标 / 季度 review 未执行
> 变更触发：性能可用性偏离 SLO / 用户量增长触发容量重评估 / 重大架构变更（如 PG 迁移）

---

## 一、SLO 定义（0.9.1 最小集）

> SLO = Service Level Objective。SLI（指标）→ SLO（目标）→ Error Budget（允许失败的预算）。
> 0.9.1 采用用户视角的 SLO：可用性 + 关键路径延迟 + 错误率，不追求全覆盖。

### 1. SLI / SLO 矩阵

| SLI | 定义 | SLO 目标 | 测量窗口 | Error Budget |
|-----|------|---------|---------|-------------|
| 可用性 | `/api/health` 返回 200 的比例 | 99.0% / 月 | 30 天滚动 | 432 分钟/月（≈ 7.2 小时） |
| API 错误率 | 5xx 响应 / 总响应（核心端点） | < 1% / 月 | 30 天滚动 | 1% 允许 5xx |
| API P95 延迟 | 核心端点 P95 响应时间 | < 500ms | 5 分钟滚动 | 连续 3 个 5 分钟窗口超阈值 = 预算消耗 |
| 考试提交可用性 | `/api/exam/submit` 成功率 | 99.9% / 考试期 | 单次考试窗口 | 0 次失败（关键业务） |

### 2. 核心端点清单（SLO 覆盖范围）

```
GET  /api/health                  — 可用性探活
POST /api/auth/login              — 认证关键路径
GET  /api/community/forum/topics  — 论坛列表（读高频）
POST /api/exam/submit             — 考试提交（业务关键，单独 SLO）
GET  /api/events                  — 活动列表
GET  /api/notifications           — 通知（轮询高频）
```

非核心端点（管理后台、低频管理操作）不纳入 SLO，但仍受监控。

### 3. 测量方法

| SLI | 数据源 | 采集方式 |
|-----|-------|---------|
| 可用性 | `/api/health` | Caddy healthcheck + 外部探针（待接入，见 P2 跟进） |
| API 错误率 | pino NDJSON 日志 | 日志聚合统计 `level=error` + HTTP `status>=500` |
| API P95 延迟 | pino `requestId` + `responseTime` 字段 | 日志聚合按端点分组计算 P95 |
| 考试提交 | pino 业务日志 | 按考试 ID 聚合 `exam.submit` 事件成功率 |

降级方案：外部探针未接入前，可用性 SLI 降级为"应用层 `/api/health` 日志统计"，不构成真实端到端可用性。该降级在 R18 显式登记为风险接受，外部探针接入后消除。

---

## 二、Error Budget 消耗规则

### 1. 预算消耗场景与响应动作

| 消耗速度 | 触发条件 | 响应动作 |
|---------|---------|---------|
| 正常 | 月消耗 < 50% 预算 | 无动作，继续迭代 |
| 预警 | 月消耗 50%–80% | oncall 在月度 review 中标记，分析根因 |
| 警戒 | 月消耗 80%–100% | 暂停非紧急功能迭代，优先修复可靠性问题 |
| 超支 | 月消耗 > 100% | 冻结所有非可靠性相关发布，直至下月预算重置 |
| 考试期紧急 | 考试提交成功率 < 99.9% | 立即介入，按 [本文档 Part C 考试失败场景](#场景-5考试期紧急故障slo-999) 处置 |

### 2. 预算冻结与解冻

- 冻结条件：月可用性预算超支（> 7.2 小时宕机）或考试期 SLO 违约
- 冻结范围：所有非 hotfix 发布暂停；hotfix 须经 oncall 批准
- 解冻条件：下一测量窗口开始 + 根因分析文档完成（写入 [Devdocs-roadmap.md](Devdocs-evolution.md) ADR）

---

## 三、SLO 评审流程

### 1. 月度 Review（每月 1 日）

```
1. 采集上月 SLI 数据（pino 日志聚合 + /api/health 日志）
2. 计算可用性 / 错误率 / P95 是否达成 SLO
3. 计算 error budget 消耗比例
4. 若超支 → 触发根因分析 + 写入 roadmap ADR
5. 更新本文档「四、Error Budget 历史」表格
6. 若连续 2 月超支 → 评估是否下调 SLO 目标（需 owner 批准）
```

### 2. 季度 Review（每季度末）

```
1. 评估 SLO 阈值是否符合实际用户体验
2. 评估核心端点清单是否需调整
3. 评估是否新增 SLI（如磁盘空间、Litestream 备份延迟）
4. 评估 EX-1 单实例风险接受是否仍合理（用户量、写 QPS）
```

### 3. 年度 Review（每年 12 月）

- 评估是否升级可用性目标（99.0% → 99.5%）
- 评估是否需多实例化（L3 多区域灾备触发）

---

## 四、Error Budget 历史记录

> 每月 review 后追加一行。首次发布前为空，发布后开始记录。

| 月份 | 可用性 | 5xx 错误率 | P95 延迟 | Budget 消耗 | 状态 | 备注 |
|------|--------|----------|---------|------------|------|------|
| 2026-08 | — | — | — | — | 待发布 | 0.9.1 发布后首个完整月 |

---

## 五、相关文档与 ADR

- [Devdocs-roadmap.md](Devdocs-evolution.md) — ADR-018（0.9.1 SLO 定义与单实例风险接受）、R18（SLO 未接入外部探针前的降级风险）
- 本文档 Part C: 运维 Runbook — SLO 违约时的运维处置流程
- 本文档 Part A: 部署指南 — 部署与回滚（影响可用性）

---

# Part C: 运维 Runbook

> 文档类型：how-to（操作手册）| 受众：oncall / 站点 owner / 运维人员
> Source of truth：运维操作手册唯一权威位置；SLO 阈值引用本文档 Part B
> 最后验证：2026-07-31 | cadence：每季度演练（restore drill + rollback）+ 重大架构变更后 review
> Stale 信号：脚本路径不存在 / SLO 阈值不一致 / 季度演练未执行 | 变更触发：部署架构变更 / 新增故障场景 / SLO 阈值调整

---

## 一、回滚流程（Rollback Runbook）

### 1. 何时触发回滚

| 场景 | 触发条件 | 决策者 |
|------|---------|--------|
| SLO 违约 | 可用性预算超支（月宕机 > 7.2 小时）或考试期 SLO 违约 | oncall |
| 严重 bug | 发布后核心功能不可用（登录/考试/论坛）且无 hotfix | oncall + owner |
| 数据损坏 | 发布引入数据迁移 bug 致数据不一致 | oncall + owner |
| 安全回退 | 发布引入安全漏洞（如 ADR-015 类） | oncall + owner |

### 2. 回滚决策树

```
1. 当前版本是否能通过 hotfix 修复？
   ├─ 是 -> 优先 hotfix（避免回滚的迁移兼容性问题）
   └─ 否 -> 继续
2. 当前版本是否含数据库迁移？
   ├─ 否 -> 直接回滚到上一 tag（方案 A）
   └─ 是 -> 评估迁移可逆性
       ├─ 可逆（如 ADD COLUMN）-> 回滚到上一 tag + 数据兼容（方案 A）
       └─ 不可逆（如 DROP COLUMN）-> 不可回滚，必须 hotfix（方案 B）
3. 回滚后验证 SLO 恢复
```

### 3. 方案 A：回滚到上一 tag（推荐，无迁移或可逆迁移）

前置条件：上一 tag 的镜像仍在 Docker registry 或本地缓存中。

```bash
# 1. 确认当前版本与上一 tag
git tag --sort=-creatordate | head -5
# 输出示例：
# v1.0.1
# v1.0.0
# v0.9.0

# 2. 停止当前应用（保留数据库运行）
cd tools/deploy
docker compose stop app

# 3. 切换到上一 tag
git checkout v1.0.0  # 替换为实际回滚目标 tag

# 4. 重建镜像（使用上一 tag 的代码）
docker compose build app

# 5. 启动
docker compose up -d app

# 6. 验证健康检查
curl -f http://localhost:2333/api/health
# 期望: {"status":"ok",...}

# 7. 验证核心功能（手动）
# - 访问首页
# - 登录测试账号
# - 查看论坛/活动/考试列表

# 8. 记录回滚事件
# 在 Devdocs-evolution.md（Part A 五章 ADR）中记录回滚原因、时间、影响范围
```

回滚时间目标（RTO）：≤ 10 分钟（从决策到服务恢复）。

### 4. 方案 B：不可回滚（含不可逆迁移，必须 hotfix）

场景：发布含 `DROP COLUMN` / 重建表等不可逆迁移。

```bash
# 1. 立即评估 hotfix 范围
git diff v0.9.0..HEAD -- src/shared/db/schema.ts

# 2. 创建 hotfix 分支
git checkout -b hotfix/critical-issue-<date>

# 3. 修复 + 测试
pnpm ts-check && pnpm test -- --run

# 4. 发布 hotfix（同正常发布流程，但跳过 CI 等待）
docker compose build app && docker compose up -d app

# 5. 验证 + 记录
```

### 5. 数据库迁移兼容性矩阵

> 详见 [ADR-009](Devdocs-evolution.md) 与 [Devdocs-project-rules.md 防再犯 #5](Devdocs-project-rules.md)

| 迁移类型 | 可逆性 | 回滚策略 |
|---------|--------|---------|
| `ADD COLUMN` | 可逆 | 直接回滚，旧代码忽略新列 |
| `ADD INDEX` | 可逆 | 直接回滚，索引无害 |
| `DROP COLUMN` | 不可逆 | 必须 hotfix，旧代码缺列会崩 |
| `RENAME TABLE` | 不可逆 | 必须 hotfix |
| `CREATE TABLE` | 可逆 | 直接回滚，旧代码不引用新表 |
| 重建表（SQLite DROP COLUMN 模式） | 不可逆 | 必须 hotfix |

### 6. 回滚后必做检查

- [ ] `/api/health` 返回 200
- [ ] 登录功能正常（session 表结构兼容）
- [ ] 核心读路径正常（论坛/活动/考试列表）
- [ ] pino 日志无 ERROR 级别条目（连续 5 分钟）
- [ ] 在 [Devdocs-roadmap.md](Devdocs-evolution.md) 新增 ADR 记录回滚事件

---

## 二、故障场景处置

### 场景 1：数据库锁定（SQLite SQLITE_BUSY）

症状：
- API 返回 500，pino 日志出现 `SQLITE_BUSY: database is locked`
- 用户操作间歇性失败
- `/api/health` 可能仍返回 200（读未锁定）

根因：SQLite WAL 模式下写入串行化。多进程访问或长事务阻塞写入。

处置步骤：

```bash
# 1. 确认是否有多个进程访问数据库
lsof data/app.db
# 期望：只有 1 个 node 进程。若多个 -> 停止多余进程

# 2. 检查是否有长事务阻塞
sqlite3 data/app.db "SELECT * FROM sqlite_master WHERE type='table';"
# 若命令卡住 -> 锁定严重

# 3. 检查 WAL 文件大小（过大说明检查点未执行）
ls -lh data/app.db-wal
# 正常 < 10MB，若 > 100MB -> 手动 checkpoint

# 4. 强制 checkpoint（应用运行时安全）
sqlite3 data/app.db "PRAGMA wal_checkpoint(TRUNCATE);"

# 5. 若仍锁定 -> 重启应用（最后手段）
docker compose restart app

# 6. 验证
curl -f http://localhost:2333/api/health
```

预防：
- 确保只有一个应用进程访问数据库
- 监控 WAL 文件大小（建议接入 `/api/health` 的 disk 检查）
- 若频繁锁定 -> 评估迁移 PostgreSQL（R1 触发条件）

---

### 场景 2：Session 异常失效（用户频繁掉线）

症状：
- 用户反馈"登录后频繁掉线"
- pino 日志出现 session 删除记录
- `sessions` 表行数异常下降

根因排查清单：

| 可能原因 | 检查方法 | 处置 |
|---------|---------|------|
| `AUTH_SESSION_SECRET` 变更 | 检查 `.env` 是否被改 | 恢复原密钥；若必须变更，接受所有 session 失效 |
| 反向代理未传 Cookie | 检查 Caddyfile/Nginx 配置 | 确认 `proxy_pass` 转发 Cookie |
| `NEXT_PUBLIC_SITE_URL` 错误 | 检查 `.env` | Cookie domain 不匹配，修正 |
| 用户被管理员禁用 | 查 `users.is_active` | 正常行为，告知用户 |
| Session 过期（7 天） | 查 `sessions.expires_at` | 正常行为 |
| 跨子域访问 | 检查 URL | Cookie 不跨子域，需统一域名 |

处置步骤：

```bash
# 1. 检查环境变量是否被改
grep AUTH_SESSION_SECRET .env
# 与备份对比，确认未变更

# 2. 检查反向代理配置
cat tools/deploy/Caddyfile
# 确认 reverse_proxy 127.0.0.1:2333 无额外 header 修改

# 3. 查询 session 表状态
sqlite3 data/app.db "SELECT COUNT(*), MAX(created_at) FROM sessions;"
# 若行数为 0 -> 所有 session 失效

# 4. 查询近期 session 删除日志
docker compose logs app | grep -i "session.*delete\|session.*expired"

# 5. 若确认密钥变更 -> 接受所有用户需重新登录
# 若配置错误 -> 修正后重启
docker compose restart app
```

---

### 场景 3：Litestream 备份中断

症状：
- pino 日志无 Litestream 输出
- `backups/wal/` 目录无新文件
- `backups/generations/` 停止增长

根因：
- Litestream 进程崩溃
- 磁盘空间不足
- S3 凭证失效（若用 S3 远程备份）

处置步骤：

```bash
# 1. 检查 Litestream 进程状态
# Docker 部署
docker compose ps
# 检查是否有 litestream 容器或 app 容器内 litestream 进程

# 裸机部署
systemctl status litestream

# 2. 查看日志
# Docker
docker compose logs litestream 2>&1 | tail -50

# 裸机
journalctl -u litestream -n 50

# 3. 检查磁盘空间
df -h
# 若磁盘满 -> 清理日志/旧备份后重启

# 4. 检查配置
cat tools/deploy/litestream.yml
# 确认 db path 与 data/app.db 一致

# 5. 重启 Litestream
# Docker
docker compose restart litestream

# 裸机
sudo systemctl restart litestream

# 6. 验证备份恢复
ls -lh backups/wal/  # 应有新文件生成

# 7. 执行 restore drill 验证备份可用
bash tools/scripts/restore-drill.sh
```

SLO 影响：备份中断期间，数据丢失风险升高。若中断 > 1 小时，按 [本文档 Part B](#二error-budget-消耗规则) error budget 消耗规则标记为"警戒"。

---

### 场景 4：Caddy 证书失败

症状：
- 浏览器显示证书错误（NET::ERR_CERT_DATE_INVALID 等）
- HTTP 请求失败，HTTPS 不可用
- Caddy 日志显示 ACME 挑战失败

根因：
- 域名 DNS 未正确指向服务器
- Let's Encrypt 速率限制（多次失败后）
- Caddy 无法访问 ACME 端点（防火墙阻断）
- 系统时间错误

处置步骤：

```bash
# 1. 检查系统时间
date
# 若时间错误 -> 同步：sudo ntpdate pool.ntp.org

# 2. 检查 DNS 解析
dig your-domain.com +short
# 应返回服务器公网 IP

# 3. 检查 Caddy 日志
docker compose logs caddy 2>&1 | tail -100
# 查找 ACME / certificate 相关错误

# 4. 检查 80/443 端口可达性（ACME 挑战需要 80）
curl -I http://your-domain.com/.well-known/acme-challenge/test

# 5. 若 Let's Encrypt 速率限制 -> 临时使用 ZeroSSL
# 编辑 Caddyfile，添加备用 issuer：
# your-domain.com {
#   tls {
#     issuer zerossl
#   }
#   reverse_proxy 127.0.0.1:2333
# }

# 6. 重启 Caddy
docker compose restart caddy

# 7. 验证证书
curl -vI https://your-domain.com 2>&1 | grep -A5 "SSL certificate"
```

降级方案：证书修复期间，可临时通过 Cloudflare Tunnel 暴露服务（Cloudflare 提供 edge 证书）：

```bash
pnpm tunnel --no-update-env
```

---

### 场景 5：考试期紧急故障（SLO 99.9%）

症状：考试提交失败率 > 0.1%

优先级：最高。考试期 SLO 不允许失败。

处置步骤：

```bash
# 1. 立即检查应用状态
curl -f http://localhost:2333/api/health
docker compose ps

# 2. 检查数据库锁定（考试提交是写操作）
sqlite3 data/app.db "PRAGMA wal_checkpoint(PASSIVE);"

# 3. 检查磁盘空间（考试答卷写入需磁盘空间）
df -h

# 4. 若应用崩溃 -> 立即重启
docker compose restart app

# 5. 若数据库损坏 -> 从 Litestream 恢复（最后手段）
bash tools/scripts/restore-drill.sh
# 恢复后需手动确认考试数据完整性

# 6. 通知所有考生
# 通过全站公告发布（admin 后台 -> 创建公告）
```

SLO 违约后：按 [本文档 Part B](#二error-budget-消耗规则) 二·1 规则，立即介入 + 根因分析写入 ADR。

---

## 三、监控与告警响应

### 1. 错误率告警（error-rate-monitor）

触发：pino 日志出现 `alert: 'HIGH_ERROR_RATE'`

响应：

```bash
# 1. 查看告警详情
docker compose logs app | grep "HIGH_ERROR_RATE" -A5

# 2. 定位错误端点
docker compose logs app | grep "level.*error" | tail -20

# 3. 判断是否为已知问题
# - 检查是否刚发布（可能引入新 bug）
# - 检查数据库状态（sqlite3 data/app.db "PRAGMA integrity_check;"）
# - 检查磁盘空间（df -h）

# 4. 若 SLO 预算快速消耗 -> 考虑回滚（见一·3）
```

### 2. 健康检查失败

触发：`/api/health` 返回 503

响应：

```bash
# 1. 查看 health 响应详情
curl http://localhost:2333/api/health | jq

# 2. 若 database: "error: ..." -> 数据库故障
sqlite3 data/app.db "SELECT 1;"
# 若失败 -> 数据库锁定或损坏，见场景 1

# 3. 若 disk: null -> 磁盘问题
df -h
```

---

## 四、维护操作

### 1. 创建管理员

```bash
# Docker 部署
docker compose exec app node tools/scripts/create-user.mjs --role root
docker compose exec app node tools/scripts/create-user.mjs --role admin

# 裸机部署
pnpm create-user --role root
```

### 2. 数据库备份手动触发

```bash
# Litestream 通常自动备份，手动触发仅用于验证
sqlite3 data/app.db ".backup data/manual-backup-$(date +%Y%m%d).db"
```

### 3. 数据保留清理（手动，未来由 L9 定时任务自动化）

```bash
# 清理 90 天前的登录历史
sqlite3 data/app.db "DELETE FROM login_history WHERE created_at < datetime('now', '-90 days');"

# 清理 1 年前的审计日志（保留更长以合规）
sqlite3 data/app.db "DELETE FROM admin_actions WHERE created_at < datetime('now', '-365 days');"

# 清理过期 session
sqlite3 data/app.db "DELETE FROM sessions WHERE expires_at < datetime('now');"
```

### 4. Litestream restore drill（季度执行）

```bash
bash tools/scripts/restore-drill.sh
# 检查 restore-drill.log 确认成功
```

---

## 五、相关文档

- 本文档 Part B: SLO 与错误预算 — SLO 阈值与 error budget 消耗规则
- 本文档 Part A: 部署指南 — 部署配置与环境变量
- [Devdocs-roadmap.md](Devdocs-evolution.md) - ADR 记录（回滚事件需新增 ADR）
- [Devdocs-project-rules.md](Devdocs-project-rules.md) - 防再犯清单（迁移幂等性与事务安全）

---

*本文档由 2026-08-01 合并 Devdocs-deployment-guide.md + Devdocs-slo.md + Devdocs-runbook.md 生成，原三份文档内容完整保留于 Part A / Part B / Part C。*
