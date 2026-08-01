# 运维 Runbook

> 文档类型：how-to（操作手册）| 受众：oncall / 站点 owner / 运维人员
> Source of truth：运维操作手册唯一权威位置；SLO 阈值引用 [Devdocs-slo.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-slo.md)
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
# 在 Devdocs-roadmap.md ADR 中记录回滚原因、时间、影响范围
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

> 详见 [ADR-009](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-roadmap.md) 与 [Devdocs-project-rules.md 防再犯 #5](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-project-rules.md)

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
- [ ] 在 [Devdocs-roadmap.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-roadmap.md) 新增 ADR 记录回滚事件

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

SLO 影响：备份中断期间，数据丢失风险升高。若中断 > 1 小时，按 [Devdocs-slo.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-slo.md) error budget 消耗规则标记为"警戒"。

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

SLO 违约后：按 [Devdocs-slo.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-slo.md) 二·1 规则，立即介入 + 根因分析写入 ADR。

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
# - 检查数据库状态（sqlite3 data/app.db "PRAGMA integrity_check;")
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

- [Devdocs-slo.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-slo.md) - SLO 阈值与 error budget 消耗规则
- [Devdocs-deployment-guide.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-deployment-guide.md) - 部署配置与环境变量
- [Devdocs-roadmap.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-roadmap.md) - ADR 记录（回滚事件需新增 ADR）
- [Devdocs-project-rules.md 防再犯清单](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-project-rules.md) - 迁移幂等性与事务安全
