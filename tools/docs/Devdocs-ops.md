# FZTBUCS-Ops-运维文档

> 最后更新：2026-08-01（合并 deployment-guide + SLO + runbook）｜类型：reference + how-to
> 受众：oncall / 站点 owner / 运维 / 发布决策者
> Source of truth：运维操作、SLO 阈值、回滚流程的唯一权威位置
> 关联：架构与 API 见 [Devdocs-Arch.md](Devdocs-Arch.md)；安全见 [Devdocs-Sec.md](Devdocs-Sec.md)；演进与 ADR 见 [Devdocs-evolution.md](Devdocs-evolution.md)；工程规则见 [Devdocs-onboarding-guide.md](Devdocs-onboarding-guide.md)
> 变更触发：部署架构变更 / SLO 阈值调整 / 新增故障场景 / 重大架构变更后 review
> Stale 信号：脚本路径不存在 / SLO 阈值不一致 / 季度演练未执行

## 文档结构

- **Part A: 部署指南** — 环境准备、部署方式、反向代理、安全与备份、维护、基础排查
- **Part B: SLO 与错误预算** — SLI/SLO 矩阵、预算消耗规则、评审流程、历史记录
- **Part C: 运维 Runbook** — 回滚流程、故障场景处置、监控告警响应、维护操作

---

# Part A: 部署指南

> 最后更新：2026-07-29

## 生产环境准备

### 环境要求

- Node.js 20+ / pnpm 9+
- 反向代理：Nginx / Caddy / Cloudflare Tunnel
- [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)（仅内网穿透需要）

### 环境变量

复制 `.env.example` 为 `.env` 并配置：

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

生成 Session 密钥（64 字节）：

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 部署方式

### 方式一：Docker + Caddy（推荐）

```bash
cd tools/deploy
cp .env.example .env          # 编辑填写生产变量
docker compose up -d
```

- Caddy 容器：自动申请管理 HTTPS 证书，反向代理到应用容器
- 应用容器：运行 `pnpm start`
- 数据卷：`data/` 持久化 SQLite 数据库

首次部署后创建管理员（见 Part C · 四）：

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

配合 Nginx / Caddy / Cloudflare Tunnel 使用。

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

Caddy 自动处理 HTTPS 证书。

---

## 安全与备份

### 必须修改的默认值

1. `AUTH_SESSION_SECRET` — 随机强密钥，绝不可用默认值
2. `PASSWORD_RESET_DEFAULT` — 建议改为更复杂默认密码
3. `ALLOWED_ORIGINS` — 设为实际生产域名
4. `NEXT_PUBLIC_SITE_URL` — 设为实际 HTTPS URL

### 反向代理安全

- `TRUST_PROXY=true`，否则速率限制无法正确获取客户端 IP
- 确保反向代理设置 `X-Forwarded-For` / `X-Forwarded-Proto`
- 生产环境建议在代理层额外配置速率限制

### 数据库备份（Litestream 流式）

SQLite 实时流式备份，监控 WAL 变更增量复制，支持 PITR，数据丢失窗口通常 < 1 秒。

**Docker 部署（自动启用）**：备份存于 `backups/`（bind mount 持久化）：

```
backups/
├── generations/    # 快照代
└── wal/            # WAL 增量
```

**裸机部署（手动）**：

```bash
sudo ./tools/scripts/setup-litestream.sh
systemctl status litestream    # 查看状态
journalctl -u litestream -f    # 查看日志
```

**恢复**：

```bash
litestream restore -o data/app-restored.db data/app.db
# 停止应用后替换
cp data/app-restored.db data/app.db
```

**S3 远程备份（可选）**：编辑 `tools/deploy/litestream.yml` 取消注释 S3 块并填凭证，Docker 部署传入 AWS 凭证：

```bash
LITESTREAM_ACCESS_KEY_ID=AKIA... docker compose up -d
```

> 备份中断处置与季度 restore drill 见 Part C · 二场景 3 与四维护操作。

### 日志与监控

- 应用日志输出 stdout/stderr，由 Docker / systemd 收集，建议配置日志轮转
- 管理员审计日志存于 `admin_actions` 表
- 错误率告警与监控响应见 Part C · 三

### HTTPS

- 生产必须启用 HTTPS；Docker+Caddy 自动处理，直接运行需在代理层配置证书
- 证书失败处置见 Part C · 二场景 4

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

> 回滚时的迁移兼容性与停机决策见 Part C · 一。

### 数据库迁移

schema 在应用启动时自动初始化（幂等），新增表/列通过 `db.ts` 增量迁移自动处理，无需手动 SQL。

---

## 故障排查（基础）

> 完整场景处置见 Part C · 二。

**端口冲突**（默认 2333）：

```bash
lsof -i :2333
PORT=5200 pnpm start    # 改用其他端口
```

**数据库锁定**：better-sqlite3 默认 WAL 模式，支持并发读但写入串行。频繁锁定则检查多进程访问或考虑 PostgreSQL。严重锁定与 checkpoint 见 Part C · 二场景 1。

**Session 失效**：检查 `AUTH_SESSION_SECRET` 是否变更、代理是否正确传递 Cookie、`NEXT_PUBLIC_SITE_URL` 是否正确。完整清单见 Part C · 二场景 2。

---

# Part B: SLO 与错误预算

> 类型：reference + how-to｜受众：站点 owner / oncall / 发布决策者｜最后验证：2026-07-31
> cadence：每月 1 日 review 预算消耗 / 每季度 review 阈值｜Stale 信号：连续 2 月未记录 / 可用性低于目标 / 季度 review 未执行
> 变更触发：性能可用性偏离 SLO / 用户量增长触发容量重评估 / 重大架构变更（如 PG 迁移）

## 一、SLO 定义（0.9.1 最小集）

> SLO = Service Level Objective。SLI（指标）→ SLO（目标）→ Error Budget（允许失败的预算）。
> 0.9.1 采用用户视角：可用性 + 关键路径延迟 + 错误率，不追求全覆盖。

### 1. SLI / SLO 矩阵

| SLI | 定义 | SLO 目标 | 测量窗口 | Error Budget |
|-----|------|---------|---------|-------------|
| 可用性 | `/api/health` 返回 200 比例 | 99.0% / 月 | 30 天滚动 | 432 分钟/月（≈ 7.2 小时） |
| API 错误率 | 5xx / 总响应（核心端点） | < 1% / 月 | 30 天滚动 | 1% 允许 5xx |
| API P95 延迟 | 核心端点 P95 响应时间 | < 500ms | 5 分钟滚动 | 连续 3 个窗口超阈值 = 预算消耗 |
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
| API 错误率 | pino NDJSON 日志 | 聚合 `level=error` + `status>=500` |
| API P95 延迟 | pino `requestId` + `responseTime` | 按端点分组计算 P95 |
| 考试提交 | pino 业务日志 | 按考试 ID 聚合 `exam.submit` 成功率 |

降级：外部探针未接入前，可用性 SLI 降级为"应用层 `/api/health` 日志统计"，不构成真实端到端可用性。该降级在 R18 显式登记为风险接受，外部探针接入后消除。

---

## 二、Error Budget 消耗规则

### 1. 消耗场景与响应

| 消耗速度 | 触发条件 | 响应动作 |
|---------|---------|---------|
| 正常 | 月消耗 < 50% | 无动作，继续迭代 |
| 预警 | 月消耗 50%–80% | 月度 review 标记并分析根因 |
| 警戒 | 月消耗 80%–100% | 暂停非紧急功能迭代，优先修复可靠性 |
| 超支 | 月消耗 > 100% | 冻结所有非可靠性发布，直至下月预算重置 |
| 考试期紧急 | 考试提交成功率 < 99.9% | 立即介入，按 [Part C 场景 5](#场景-5考试期紧急故障slo-999) 处置 |

### 2. 冻结与解冻

- **冻结条件**：月可用性预算超支（> 7.2 小时宕机）或考试期 SLO 违约
- **冻结范围**：所有非 hotfix 发布暂停；hotfix 须经 oncall 批准
- **解冻条件**：下一测量窗口开始 + 根因分析文档完成（写入 [Devdocs-evolution.md](Devdocs-evolution.md) ADR）

---

## 三、SLO 评审流程

**月度 Review（每月 1 日）**：

1. 采集上月 SLI 数据（pino 日志聚合 + `/api/health`）
2. 计算可用性 / 错误率 / P95 是否达成 SLO
3. 计算 error budget 消耗比例
4. 若超支 → 触发根因分析 + 写入 evolution ADR
5. 更新本文档「四、历史记录」
6. 连续 2 月超支 → 评估下调 SLO 目标（需 owner 批准）

**季度 Review（每季度末）**：评估 SLO 阈值合理性、核心端点清单、是否新增 SLI（磁盘空间 / Litestream 备份延迟）、EX-1 单实例风险接受是否仍合理。

**年度 Review（每年 12 月）**：评估升级可用性目标（99.0% → 99.5%）、是否需多实例化（L3 多区域灾备触发）。

---

## 四、Error Budget 历史记录

> 每月 review 后追加一行。首次发布前为空。

| 月份 | 可用性 | 5xx 错误率 | P95 延迟 | Budget 消耗 | 状态 | 备注 |
|------|--------|----------|---------|------------|------|------|
| 2026-08 | — | — | — | — | 待发布 | 0.9.1 发布后首个完整月 |

---

## 五、相关文档与 ADR

- [Devdocs-evolution.md](Devdocs-evolution.md) — ADR-018（0.9.1 SLO 与单实例风险接受）、R18（外部探针未接入前降级风险）
- 本文档 Part C — SLO 违约运维处置｜Part A — 部署与回滚（影响可用性）

---

# Part C: 运维 Runbook

> 类型：how-to｜受众：oncall / 站点 owner / 运维｜最后验证：2026-07-31
> cadence：每季度演练（restore drill + rollback）+ 重大架构变更后 review｜Stale 信号：脚本路径不存在 / SLO 阈值不一致 / 季度演练未执行

## 一、回滚流程

### 1. 触发条件

| 场景 | 触发条件 | 决策者 |
|------|---------|--------|
| SLO 违约 | 月宕机 > 7.2 小时 或 考试期 SLO 违约 | oncall |
| 严重 bug | 核心功能不可用（登录/考试/论坛）且无 hotfix | oncall + owner |
| 数据损坏 | 迁移 bug 致数据不一致 | oncall + owner |
| 安全回退 | 发布引入安全漏洞（如 ADR-015 类） | oncall + owner |

### 2. 决策树

```
1. 是否可通过 hotfix 修复？
   ├─ 是 → 优先 hotfix（避免回滚的迁移兼容性问题）
   └─ 否 → 继续
2. 是否含数据库迁移？
   ├─ 否 → 方案 A（回滚到上一 tag）
   └─ 是 → 评估可逆性
       ├─ 可逆（ADD COLUMN 等）→ 方案 A + 数据兼容
       └─ 不可逆（DROP COLUMN 等）→ 方案 B（必须 hotfix）
3. 回滚后验证 SLO 恢复
```

### 3. 方案 A：回滚到上一 tag（无迁移或可逆迁移）

前置：上一 tag 镜像仍在 registry 或本地缓存。

```bash
git tag --sort=-creatordate | head -5      # 确认当前版本与上一 tag
cd tools/deploy
docker compose stop app                     # 保留数据库运行
git checkout v1.0.0                          # 替换为实际回滚目标 tag
docker compose build app
docker compose up -d app
curl -f http://localhost:2333/api/health    # 期望 {"status":"ok",...}
# 手动验证：首页 / 登录测试账号 / 论坛·活动·考试列表
# 记录回滚事件到 Devdocs-evolution.md（Part A ADR）
```

RTO：≤ 10 分钟（从决策到服务恢复）。

### 4. 方案 B：不可回滚（含不可逆迁移，必须 hotfix）

```bash
git diff v0.9.0..HEAD -- src/shared/db/sqlite-init.ts   # 评估 hotfix 范围
git checkout -b hotfix/critical-issue-<date>
pnpm ts-check && pnpm test -- --run
docker compose build app && docker compose up -d app   # 跳过 CI 等待
# 验证 + 记录
```

### 5. 迁移兼容性矩阵

> 详见 [ADR-009](Devdocs-evolution.md) 与 [Devdocs-onboarding-guide.md 防再犯 #5](Devdocs-onboarding-guide.md#85-文档维护流程how-to)

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
- [ ] 登录正常（session 表结构兼容）
- [ ] 核心读路径正常（论坛/活动/考试列表）
- [ ] pino 日志连续 5 分钟无 ERROR
- [ ] 在 [Devdocs-evolution.md](Devdocs-evolution.md) 新增 ADR 记录回滚事件

---

## 二、故障场景处置

### 场景 1：数据库锁定（SQLite SQLITE_BUSY）

**症状**：API 返回 500，日志现 `SQLITE_BUSY: database is locked`；`/api/health` 可能仍 200（读未锁定）。
**根因**：WAL 模式写入串行化；多进程访问或长事务阻塞写入。

```bash
lsof data/app.db                          # 应仅 1 个 node 进程，否则停多余
sqlite3 data/app.db "SELECT * FROM sqlite_master WHERE type='table';"  # 卡住则锁定严重
ls -lh data/app.db-wal                    # 正常 < 10MB，> 100MB 需手动 checkpoint
sqlite3 data/app.db "PRAGMA wal_checkpoint(TRUNCATE);"   # 应用运行时安全
docker compose restart app                # 仍锁定 → 重启（最后手段）
curl -f http://localhost:2333/api/health
```

**预防**：仅 1 个进程访问数据库；监控 WAL 大小；频繁锁定则评估迁移 PostgreSQL（R1 触发条件）。

---

### 场景 2：Session 异常失效（用户频繁掉线）

**症状**：用户反馈频繁掉线；日志现 session 删除；`sessions` 表行数异常下降。

| 可能原因 | 检查方法 | 处置 |
|---------|---------|------|
| `AUTH_SESSION_SECRET` 变更 | 查 `.env` | 恢复原密钥；若必须变更则接受全部 session 失效 |
| 反向代理未传 Cookie | 查 Caddyfile/Nginx | 确认 `proxy_pass` 转发 Cookie |
| `NEXT_PUBLIC_SITE_URL` 错误 | 查 `.env` | 修正 Cookie domain 不匹配 |
| 用户被管理员禁用 | 查 `users.is_active` | 正常行为 |
| Session 过期（7 天） | 查 `sessions.expires_at` | 正常行为 |
| 跨子域访问 | 检查 URL | Cookie 不跨子域，需统一域名 |

```bash
grep AUTH_SESSION_SECRET .env             # 与备份对比确认未变更
cat tools/deploy/Caddyfile                # 确认 reverse_proxy 无额外 header 修改
sqlite3 data/app.db "SELECT COUNT(*), MAX(created_at) FROM sessions;"  # 0 行=全部失效
docker compose logs app | grep -i "session.*delete\|session.*expired"
docker compose restart app                # 配置错误修正后重启
```

---

### 场景 3：Litestream 备份中断

**症状**：日志无 Litestream 输出；`backups/wal/`、`backups/generations/` 停止增长。
**根因**：进程崩溃 / 磁盘不足 / S3 凭证失效。

```bash
docker compose ps / systemctl status litestream     # 检查进程
docker compose logs litestream 2>&1 | tail -50 / journalctl -u litestream -n 50
df -h                                             # 磁盘满则清理后重启
cat tools/deploy/litestream.yml                    # 确认 db path 与 data/app.db 一致
docker compose restart litestream / sudo systemctl restart litestream
ls -lh backups/wal/                                # 应有新文件
bash tools/scripts/restore-drill.sh                # restore drill 验证
```

**SLO 影响**：中断 > 1 小时按 [Part B](#二error-budget-消耗规则) 标记为"警戒"。

---

### 场景 4：Caddy 证书失败

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

### 场景 5：考试期紧急故障（SLO 99.9%）

**症状**：考试提交失败率 > 0.1%。**优先级：最高。**

```bash
curl -f http://localhost:2333/api/health
docker compose ps
sqlite3 data/app.db "PRAGMA wal_checkpoint(PASSIVE);"   # 考试提交为写操作
df -h
docker compose restart app                  # 应用崩溃则立即重启
bash tools/scripts/restore-drill.sh         # 数据库损坏则恢复（最后手段，需手动确认数据完整性）
# 通过 admin 后台创建全站公告通知考生
```

违约后按 [Part B](#二error-budget-消耗规则) 二·1 立即介入 + 根因分析写入 ADR。

---

## 三、监控与告警响应

### 1. 错误率告警（HIGH_ERROR_RATE）

触发：pino 日志现 `alert: 'HIGH_ERROR_RATE'`。

```bash
docker compose logs app | grep "HIGH_ERROR_RATE" -A5
docker compose logs app | grep "level.*error" | tail -20
# 判断已知问题：是否刚发布 / 数据库状态（sqlite3 data/app.db "PRAGMA integrity_check;"）/ 磁盘（df -h）
# 预算快速消耗 → 考虑回滚（见一·3）
```

### 2. 健康检查失败

触发：`/api/health` 返回 503。

```bash
curl http://localhost:2333/api/health | jq
sqlite3 data/app.db "SELECT 1;"        # database 错误 → 见场景 1
df -h                                  # disk 为 null → 磁盘问题
```

---

## 四、维护操作

### 1. 创建管理员

```bash
docker compose exec app node tools/scripts/create-user.mjs --role root
docker compose exec app node tools/scripts/create-user.mjs --role admin
# 裸机部署：pnpm create-user --role root
```

### 2. 手动备份（验证用）

```bash
sqlite3 data/app.db ".backup data/manual-backup-$(date +%Y%m%d).db"
```

### 3. 数据保留清理（手动，未来由 L9 定时任务自动化）

```bash
sqlite3 data/app.db "DELETE FROM login_history WHERE created_at < datetime('now', '-90 days');"
sqlite3 data/app.db "DELETE FROM admin_actions WHERE created_at < datetime('now', '-365 days');"
sqlite3 data/app.db "DELETE FROM sessions WHERE expires_at < datetime('now');"
```

### 4. Litestream restore drill（季度执行）

```bash
bash tools/scripts/restore-drill.sh
# 检查 restore-drill.log 确认成功
```

---

## 五、相关文档

- 本文档 Part B — SLO 阈值与 error budget 规则｜Part A — 部署配置与环境变量
- [Devdocs-evolution.md](Devdocs-evolution.md) — ADR 记录（回滚事件需新增 ADR）
- [Devdocs-onboarding-guide.md](Devdocs-onboarding-guide.md#88-反复出现的错误与防再犯清单explanation) — 防再犯清单（迁移幂等性与事务安全）

---

