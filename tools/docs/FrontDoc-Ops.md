# FrontDoc-Ops：前端 BFF 运维 How-to（6 个目标场景 · 一步一结果）

> 更新人：3yearsZ
> 更新日：2026-08-20
> 版本：1.0.1 · 七夕（SLO 定义与错误预算规则剥离至 P4 单独文档）
> Diátaxis：H（How-to · 目标导向 · 每个场景解决一个具体部署/运维问题；不教原理，只给可复制的命令序列与验收标准）
> 适用读者：oncall / 站点 owner / 运维 / 发布决策者；已完成 Onboarding 并了解 BFF 架构
> 变更触发：BFF 部署架构变更 / 新增故障场景 / 反向代理配置调整 / 脚手架工具升级

> **SSOT 分工声明**：
> - 本文档是「**前端 BFF 独立部署、运维 Runbook、故障处置**」的唯一权威（不使用根级 compose 的独立部署场景）。
> - SLO 定义、Error Budget 规则、评审流程 → 剥离至 P4 `FrontDoc-SLO.md`（Reference 类型），与根级 [RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md) §G 基线对齐。
> - 全栈编排（db + backend + frontend 一键起）→ [RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md) 场景 B；本文仅覆盖**前端独立部署**。
> - 后端运维端点、PG 备份、Alembic 迁移 → [BackDoc-Infra.md](../../../CS-Web-Backend/tools/docs/BackDoc-Infra.md)。
> - 实现级约束（BFF 边界、路由规范、状态管理）→ [FrontDoc-03-Conv.md](FrontDoc-03-Conv.md)。

> **前置条件（全部满足后才能进入任何场景）**：
> 1. Node.js ≥ 22、pnpm 9.x（`package.json` `engines.node` / `packageManager` 已强制锁定，使用 npm/yarn 会被 `preinstall` 拦截）。
> 2. 后端 FastAPI 可达（BFF 启动后所有 `/api/**` 均转发到 `BACKEND_URL`，后端不可达 → 所有业务 API 返回 5xx）。
> 3. 反向代理可用（Nginx / Caddy / Cloudflare Tunnel 任一）。
> 4. 可用端口：生产 2333（BFF 应用端口）/ 443（HTTPS）；开发 2333 / 5200（备用）。

---

## 本文 6 个目标场景（选择你要完成的一个，直接跳到对应节）

| # | 场景名称 | 适用时机 | 读一节约需 |
|---|---|---|---|
| **A** | **Docker + Caddy 独立部署（推荐方式）** | 前端独立部署到 staging/prod | 5 min |
| **B** | **直接运行 + 反向代理（裸机/进程管理）** | 不使用容器，配合 Nginx/Caddy | 3 min |
| **C** | **内网穿透临时公网（Cloudflare Tunnel）** | 开发调试 / 临时演示 | 2 min |
| **D** | **版本更新部署 + 回滚** | 发版升级 / 故障回滚 | 5 min |
| **E** | **故障场景处置（4 类高频故障）** | BFF 5xx / Session 失效 / 证书失败 / 考试期紧急 | 8 min |
| **F** | **监控告警响应（2 类告警）** | 错误率飙升 / 健康检查失败 | 3 min |

> **How-to 阅读规则**：不必从头读到尾，挑你当下要达成的那个目标场景按编号跳。每节内「步骤」= 可复制的命令；「成功标准」= 本节做完后 MUST 全部通过的验收。

---

## 场景 A：Docker + Caddy 独立部署（目标：HTTPS 域名访问 + 全站 200）

**适用**：前端独立部署，不使用根级 `docker-compose.yml`。

### A.1 操作步骤

```bash
# A.1-1 进入前端部署目录
cd CS-Web-Frontend/tools/deploy

# A.1-2 生成生产环境变量
cp .env.example .env
```

打开 `.env`，**MUST** 配置以下变量（留空会导致部署后业务不可用）：

| 变量 | 生产建议值 | 说明 |
|---|---|---|
| `BACKEND_URL` | `http://backend:8000`（容器内网）或 `http://<后端服务器IP>:9000` | BFF 转发的后端 FastAPI 地址 |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` | 站点 URL（metadata base URL，浏览器端读取） |
| `ALLOWED_ORIGINS` | `https://your-domain.com,https://www.your-domain.com` | Origin 白名单（逗号分隔，POST 端点防 Login CSRF） |
| `TRUST_PROXY` | `true` | 反向代理部署时**必设**（速率限制需正确获取客户端 IP） |

可选：`SENTRY_DSN`（留空不启用 Sentry）。

> **遗留变量说明**：`SQLITE_DB_PATH` / `AUTH_SESSION_SECRET` / `SMTP_*` / `PASSWORD_RESET_DEFAULT` / `GITHUB_*` 等为迁移前单体遗留，运行时不被任何 API 路由引用，仅遗留脚本可能使用。

```bash
# A.1-3 一键启动（首次 build 需 3–10 分钟）
docker compose up -d

# A.1-4 本机验证（确认容器内链路通）
curl -s http://127.0.0.1:2333/api/health     # → {"status":"ok"}
curl -s http://127.0.0.1:2333/login | head -5 # → 返回 HTML（200）
```

### A.2 成功标准

- `docker compose ps` 两个服务 STATE 均为 Up（`cs-website` + `caddy`）。
- `curl http://127.0.0.1:2333/api/health` 返回 200。
- 浏览器访问 `https://your-domain.com` → 首页正常加载。
- 登录/登出流程走通（JWT Cookie 设置/刷新链路正常）。

### A.3 失败回退路径

| 症状 | 处理 |
|---|---|
| `docker compose ps` 中 `cs-website` 一直在 `starting` | 首次构建久等；`docker compose logs cs-website --tail 50` 看 next build 进度 |
| `/api/health` 5xx | `BACKEND_URL` 不可达；确认后端容器 Running + 容器内网 `cs-net` 连通：`docker exec cs-website sh -c "curl -fsS $BACKEND_URL/health"` |
| Caddy HTTPS 证书申请失败 | DNS 未指向 / Let's Encrypt 速率限制 / 系统时间错误：`date` 检查 → `dig your-domain.com +short` → `docker compose logs caddy --tail 100` |

---

## 场景 B：直接运行 + 反向代理（目标：裸机/进程管理方式部署）

**适用**：不使用容器，配合 Nginx/Caddy 反代。

### B.1 操作步骤

```bash
# B.1-1 安装依赖 + 构建
cd CS-Web-Frontend
pnpm install --frozen-lockfile
pnpm build

# B.1-2 启动服务（需在后台运行；推荐用 systemd/pm2/supervisor）
pnpm start
```

反向代理配置（Nginx 示例）：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    location / {
        proxy_pass http://127.0.0.1:2333;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto  $scheme;   # TRUST_PROXY=true 需此项
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
    client_max_body_size 50m;
}
```

Caddy 更简洁（自动 HTTPS）：

```caddy
your-domain.com {
    reverse_proxy 127.0.0.1:2333
}
```

### B.2 成功标准

- `pnpm start` 输出 `ready started server on 0.0.0.0:2333`。
- HTTPS 公网访问 `curl -sI https://your-domain.com` → HTTP/2 200。
- 反代传递 `X-Forwarded-Proto` → Cookie 的 `Secure` + `SameSite=Lax` 正常。

### B.3 失败回退路径

| 症状 | 处理 |
|---|---|
| `pnpm start` 报端口占用 | `lsof -i :2333` 找 PID 并 kill；或 `PORT=5200 pnpm start` + 同步改反代端口 |
| HTTPS 502 Bad Gateway | 前端进程未就绪；`curl http://127.0.0.1:2333/api/health` 先验证本地通 |
| Cookie Secure 丢失导致登录态问题 | `TRUST_PROXY=true` 未设；或反代未传 `X-Forwarded-Proto: https` |

---

## 场景 C：内网穿透临时公网（目标：Cloudflare Tunnel 暴露本地服务）

**适用**：开发调试 / 临时公网演示，**禁止**用于生产环境。

### C.1 操作步骤

```bash
# 终端 1：启动本地服务
pnpm dev          # 默认端口 2333

# 终端 2：启动 Cloudflare Tunnel
pnpm tunnel       # 自动检测/安装 cloudflared → 清理旧 tunnel → 启动 → 提取公网地址
```

脚本会自动更新 `.env` 中的 `ALLOWED_ORIGINS` / `NEXT_PUBLIC_SITE_URL` 为临时公网地址（`*.trycloudflare.com`）。

可选参数：
```bash
pnpm tunnel --port 5200           # 指定本地端口
pnpm tunnel --no-update-env       # 不更新 .env
```

### C.2 成功标准

- Terminal 2 输出 `https://<random>.trycloudflare.com` 公网地址。
- 浏览器访问该地址 → 首页正常加载 + 登录流程走通。

### C.3 失败回退路径

| 症状 | 处理 |
|---|---|
| Tunnel 启动报端口占用 | 先 kill 占用 2333 的进程；或用 `--port` 指定其他端口 |
| 公网地址打开 500 | 本地 `pnpm dev` 未在运行；先启动本地服务再开 tunnel |
| Tunnel 超时断连 | 重启 `pnpm tunnel`；地址会变更，需同步更新 `ALLOWED_ORIGINS` |

### C.4 安全提醒

**MUST NOT** 用于生产。`trycloudflare.com` 域名是临时的，任何人都能访问你的开发环境；仅用于内部演示和联调。

---

## 场景 D：版本更新部署 + 回滚（目标：发版升级 + 故障 10 分钟回滚）

**适用**：日常发版；发版失败时快速回滚。

### D.1 发版流程

```bash
# D.1-1 拉最新代码
cd CS-Web-Frontend
git pull
git submodule update --init --recursive   # 同步子模块指针

# D.1-2 重建 + 重启
cd tools/deploy
docker compose build cs-website
docker compose up -d cs-website

# D.1-3 验证
curl -s http://127.0.0.1:2333/api/health   # → {"status":"ok"}
# 浏览器验证：首页 + 登录 + 核心路径
```

直接运行方式：
```bash
git pull && pnpm install --frozen-lockfile && pnpm build && pnpm start
```

### D.2 回滚流程（故障时 ≤ 10 分钟止损）

**触发条件**：SLO 违约 / 严重 bug / BFF 镜像回归致大面积 5xx / 安全回退。

```bash
# D.2-1 确认当前版本与上一 tag
cd CS-Web-Frontend
git tag --sort=-creatordate | head -5

# D.2-2 回滚到上一 tag（BFF 无状态薄转发，无本地迁移问题）
cd tools/deploy
docker compose stop cs-website
git checkout <上一个稳定 tag>    # 如 v1.0.0
docker compose build cs-website
docker compose up -d cs-website

# D.2-3 验证
curl -s http://127.0.0.1:2333/api/health   # → {"status":"ok"}
# 浏览器验证：首页 + 登录 + 社区/活动/考试列表
```

**回滚后 MUST 做的 5 项检查**：

- [ ] `/api/health` 返回 200（BFF + 后端链路通）
- [ ] 登录正常（JWT Cookie 设置/刷新链路）
- [ ] 核心读路径正常（社区/活动/考试列表）
- [ ] pino 日志连续 5 分钟无 ERROR
- [ ] 在 `RootDoc-ADR.md` 新增 ADR 记录回滚事件

**RTO**：≤ 10 分钟（从决策到服务恢复）。

### D.3 故障 hotfix（无法回滚时）

```bash
git checkout -b hotfix/critical-issue-<date>
pnpm ts-check && pnpm test -- --run
cd tools/deploy && docker compose build cs-website && docker compose up -d cs-website
# 跳过 CI 等待，直接重建部署
```

### D.4 失败回退路径

| 症状 | 处理 |
|---|---|
| `docker compose build` 报 `only-allow pnpm` 拦截 | 用 `pnpm docker build`（Dockerfile 内已指定 pnpm）或 `docker compose build --no-cache` |
| 回滚后登录态全失效 | 后端 `SECRET_KEY` 被改过；接受全部 JWT 失效，用户需重新登录 |
| hotfix 后 `ts-check` 报错 | 新代码类型对齐问题；用 `pnpm ts-check` 定位并修复 |

---

## 场景 E：故障场景处置（4 类高频故障）

### E.1 场景 1：BFF 转发 5xx（上游/后端不可达）

**症状**：API 普遍返回 502/504，日志现 `BACKEND_URL` 不可达或后端返回 5xx；`/api/health` 可能 503。

**根因**：后端容器崩溃 / `BACKEND_URL` 配置错误 / 内网 `cs-net` 不通 / 后端 PG 故障致后端 5xx。

```bash
cd CS-Web-Frontend/tools/deploy
docker compose ps                                 # 后端容器是否 Running
docker compose logs backend 2>&1 | tail -50       # 后端日志
docker compose exec cs-website sh -c "curl -fsS $BACKEND_URL/health"   # 容器内直连后端
docker compose logs cs-website 2>&1 | grep -i "fetch.*failed\|ECONNREFUSED"
docker compose restart backend                    # 后端崩溃则重启
curl -s http://127.0.0.1:2333/api/health          # 验证 BFF 链路
```

**预防**：部署前确认 `BACKEND_URL` 内网可达；监控 BFF 5xx 率。

### E.2 场景 2：Session 异常失效（用户频繁掉线）

**症状**：用户反馈频繁掉线；日志现 401 静默刷新失败；JWT Cookie 被清除。

**架构说明**：JWT 由**后端**签发（access 15min / refresh 7day），前端 BFF 以 HttpOnly Cookie 托管并 401 静默刷新。session 表、refresh token 表均属后端 PG。

| 可能原因 | 检查方法 | 处置 |
|---|---|---|
| `BACKEND_URL` 变更或后端重启 | 查 `.env` / `docker compose ps` | 恢复原值；后端重启后 refresh token 仍有效（PG 持久化） |
| 反向代理未传 Cookie | 查 Caddyfile/Nginx | 确认 `proxy_pass` 转发 Cookie |
| `NEXT_PUBLIC_SITE_URL` 错误 | 查 `.env` | 修正 Cookie domain 不匹配 |
| 后端 `SECRET_KEY` 变更 | 查后端 `.env` | 接受全部 JWT 失效，需重新登录 |
| 跨子域访问 | 检查 URL | Cookie 不跨子域，需统一域名 |

```bash
cd CS-Web-Frontend
grep BACKEND_URL .env
cat tools/deploy/Caddyfile                       # 确认 reverse_proxy 无额外 header 修改
docker compose logs cs-website | grep -i "401\|refresh.*failed\|clearAuth"
docker compose logs backend | grep -i "token\|jwt\|auth"
docker compose restart cs-website                # BFF 配置错误修正后重启
```

### E.3 场景 3：Caddy/HTTPS 证书失败

**症状**：浏览器证书错误；HTTPS 不可用；Caddy 日志现 ACME 挑战失败。

**根因**：DNS 未指向 / Let's Encrypt 速率限制 / ACME 端点被防火墙阻断 / 系统时间错误。

```bash
date                                            # 错误则 sudo ntpdate pool.ntp.org
dig your-domain.com +short                      # 应返回公网 IP
cd CS-Web-Frontend/tools/deploy
docker compose logs caddy 2>&1 | tail -100
curl -I http://your-domain.com/.well-known/acme-challenge/test   # ACME 需 80 端口
docker compose restart caddy
curl -vI https://your-domain.com 2>&1 | grep -A5 "SSL certificate"
```

若 Let's Encrypt 速率限制，临时改用 ZeroSSL（Caddyfile 加 `tls { issuer zerossl }`）。

**降级**：修复期间可临时用 Cloudflare Tunnel 暴露（`pnpm tunnel --no-update-env`），Cloudflare 提供 edge 证书。

### E.4 场景 4：考试期紧急故障（SLO 99.9%）

**症状**：考试提交失败率 > 0.1%。**优先级：最高。**

```bash
cd CS-Web-Frontend/tools/deploy
curl -s http://127.0.0.1:2333/api/health        # BFF 链路
docker compose ps                                # 容器状态
docker compose logs cs-website | grep -i "exam.*submit\|5xx"
docker compose logs backend | grep -i "exam\|submit\|database"   # 后端考试/DB 错误
df -h                                            # 磁盘检查
docker compose restart cs-website                # BFF 崩溃则立即重启
docker compose restart backend                   # 后端崩溃则重启（PG 数据不丢）
```

> 数据库损坏恢复属后端职责，见 [BackDoc-Infra.md](../../../CS-Web-Backend/tools/docs/BackDoc-Infra.md) §六。

违约后立即介入 + 根因分析写入 `RootDoc-ADR.md`。

### E.5 成功标准（每个场景处置后 MUST 全过）

- [ ] `/api/health` 返回 200
- [ ] 登录正常（JWT Cookie 设置/刷新链路）
- [ ] 核心读路径正常（社区/活动/考试列表）
- [ ] pino 日志连续 5 分钟无 ERROR
- [ ] 故障根因记录在 ADR

### E.6 失败回退路径

| 故障持续 | 升级动作 |
|---|---|
| > 30 分钟未恢复 | 启用维护页（反代层返回 503 + retry_after），避免用户继续写脏数据 |
| > 2 小时未恢复 | 移交后端 oncall（可能 PG/迁移级故障），同步 P0 告警 |
| > 4 小时未恢复 | 启动全栈灾难恢复：[RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md) 场景 F 回滚流程 |

---

## 场景 F：监控告警响应（2 类高频告警）

### F.1 告警 1：错误率飙升（HIGH_ERROR_RATE）

**触发**：pino 日志现 `alert: 'HIGH_ERROR_RATE'`。

```bash
cd CS-Web-Frontend/tools/deploy
docker compose logs cs-website | grep "HIGH_ERROR_RATE" -A5
docker compose logs cs-website | grep "level.*error" | tail -20
# 判断已知问题：是否刚发布 / 后端是否 5xx（见场景 E.1）/ 磁盘（df -h）
# 预算快速消耗 → 考虑回滚（见场景 D.2）
```

### F.2 告警 2：健康检查失败（/api/health 503）

**触发**：`/api/health` 返回 503（BFF 转发后端 `/health` 失败）。

```bash
curl -s http://127.0.0.1:2333/api/health | jq   # BFF 端
cd CS-Web-Frontend/tools/deploy
docker compose exec cs-website sh -c "curl -fsS $BACKEND_URL/health"   # 容器内直连后端
docker compose ps                                # 容器状态
df -h                                            # 磁盘问题
# 后端不通 → 见场景 E.1
```

### F.3 告警响应流程

1. **5 分钟内**：确认告警类型 → 跳对应 E 场景处置
2. **15 分钟内**：未恢复 → 升级到 D.2 回滚或 E.6 升级
3. **恢复后**：在 `RootDoc-ADR.md` 记录故障时间线与根因

---

## 附录 A：BFF Route 骨架生成器（C-15 脚手架）

> 位置：`CS-Web-Frontend/tools/scripts/gen/bff-routes.mjs`。用于把 `openapi.baseline.json` 的 API 路径自动产出薄转发骨架，削减手写 BFF 路由的重复。

### 前置条件

- `openapi.baseline.json`（前端根上一级）须为最新后端契约。
- `src/shared/backend-client.ts` 已存在通用原语（`proxyBackend` / `bodyOrEmpty` / `arrayFrom` / `okJson` / `errJson` / `readJsonBody`）。

### 命令

```bash
cd CS-Web-Frontend

# 默认 dry-run：仅生成草稿 + 对账报告，绝不触碰 src
node tools/scripts/gen/bff-routes.mjs

# 指定草稿目录
node tools/scripts/gen/bff-routes.mjs --out .bff-scaffold

# 真正写入：仅新建 NEW 端点骨架（绝不覆盖已存在文件）
node tools/scripts/gen/bff-routes.mjs --write
```

其他开关：`--openapi <path>` 指定 openapi 文件；`--no-check` 跳过 TS 语法校验。

### 安全模型

- **默认 dry-run**：骨架只写入草稿目录（默认 `.bff-scaffold/`），不碰 `src/app/api`。
- **自动对账**：扫描现有手写 `route.ts`，按规范化路径精确匹配，标为 `COVERED` 或 `NEW`；仅 `NEW` 才产出骨架。
- **`--write` 默认关闭且只新建**：即便开启也只新建不存在的文件。

### `--write` 后 MUST 做的冲突检查

生成器按路径归一判定 `COVERED`，**不识别路由目录的动态段参数名冲突**。openapi 用 `{report_id}` / `{post_id}` 等，而项目手写路由统一用 `[id]`。同层出现两个不同 `[*]` 动态段会导致 Next.js 启动直接 abort。

**标准收尾流程**：

1. `git status` 确认仅新增预期骨架；用 `find src/app/api -type d -name '\[*\]'` 检查同父目录下的动态段冲突，逐个删除冗余 `[*_id]`；
2. 打开 `.bff-scaffold/RECONCILE.md` 与 `manifest.json` 复核 NEW/COVERED 清单；
3. 骨架含 `// TODO: 补全请求体字段映射（camel→snake）`，**人工补全后再启用**；
4. `pnpm ts-check` 与 `pnpm check:bff-boundary` 须持平；
5. `pnpm dev` 确认能正常监听。

---

## 附录 B：前端开发约定速查

> 详细约定见 [FrontDoc-03-Conv.md](FrontDoc-03-Conv.md)。

### 包管理

- 强制 pnpm 9.x + Node ≥ 22（`preinstall: "npx only-allow pnpm"`）。
- 本地开发：`pnpm install && pnpm dev`（自定义 `server.ts`，默认端口 2333）。

### i18n 词条新增流程

1. 在 `src/i18n/messages/tools.ts` 的 `ToolsMessages.workbench` 接口新增 key（类型声明）；
2. 在 `zhCN.workbench` 与 `en.workbench` 两处同步补中/英词条（三处缺一即 `tsc` 报错）；
3. 组件内用 `useTranslations('workbench')` 取值。

### 新增 widget 注册流程

1. 在 `src/modules/workbench/widgets/` 新增组件（复用 `@/components/primitives/`；颜色仅用项目令牌 `var(--*)`；组件 < 500 行）；
2. 在 `src/modules/workbench/widget-registry.ts` 的 `WIDGETS` 数组声明 `id` / `slot` / `titleKey` / `component`；
3. （可选）在布局设置显隐开关中暴露该 widget。

### 创建管理员

前端遗留脚本 `pnpm create-user` / `pnpm seed` 已于 2026-08-07 删除。管理员由后端 `rbac_init` seed 创建（配置 `ADMIN_USERNAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD`）；生产环境如需额外管理员请通过**后端 CLI / Swagger** 创建。

---

## 附录 C：安全速查

> 详细安全红线见 [FrontDoc-02-Sec.md](FrontDoc-02-Sec.md)。

部署前 **MUST** 确认：

- [ ] `BACKEND_URL` 指向内网后端，非公网未鉴权地址
- [ ] `ALLOWED_ORIGINS` 设为实际生产域名
- [ ] `NEXT_PUBLIC_SITE_URL` 设为实际 HTTPS URL
- [ ] `TRUST_PROXY=true`（反向代理部署时）
- [ ] 反向代理层配置速率限制
- [ ] HTTPS 证书有效（HSTS 头已启用）
- [ ] 日志输出 stdout/stderr，由 Docker/systemd 收集，建议配置日志轮转

---

> ↩ **返回前端文档地图**：[FrontDoc-01-Arch.md](FrontDoc-01-Arch.md) · **全栈部署**：[RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md) · **后端运维**：[BackDoc-Infra.md](../../../CS-Web-Backend/tools/docs/BackDoc-Infra.md) · **安全红线**：[FrontDoc-02-Sec.md](FrontDoc-02-Sec.md) · **SLO 与错误预算**：P4 待建 `FrontDoc-SLO.md`
