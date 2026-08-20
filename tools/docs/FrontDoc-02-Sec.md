# FrontDoc-02-Sec：前端 BFF 层安全（Origin/Cookie/路由保护/加固）

> 更新人：3yearsZ
> 更新日：2026-08-20
> 版本：1.0.1（版本基线对齐 1.0.1；含 0.9.8 BFF 同源转发、前端不持有密钥、workbench i18n 三处增补；责任层按单体→BFF 迁移后归属重新划分）
> Diátaxis：R（Reference · 规范参考 · BFF 层运行时安全唯一权威）
> 适用读者：安全审计人员、前端 Next.js/BFF 开发工程师、运维部署者、UI 权限矩阵维护者
> 变更触发：BFF proxyBackend 签名变更 / `ALLOWED_ORIGINS` / CSP 策略变更 / assertAllowedOrigin 路径清单变动 / UI 层角色路由保护矩阵变动 / Cookie 前缀与安全头策略变更
>
> **SSOT（唯一权威）声明**：本文档是 FztbuCS 前端 BFF 层 + UI 层安全机制的**唯一权威输入**。所有约束 MUST 在 BFF 路由层、Next.js 配置、Zod 校验链路中落地。**真实鉴权（JWT 签发/密码哈希/TOTP 加密/RBAC0 enforce/审计日志/限流）在后端 FastAPI 侧执行，BFF 层仅做 UI 兜底与薄转发，不可替代后端 enforce**。后端安全权威跳转 [BackDoc-02-Sec.md](../../../CS-Web-Backend/tools/docs/BackDoc-02-Sec.md)。
>
> **关联索引**：BFF 架构总览 → [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md)；前端编码约定 → [FrontDoc-03-Conv.md](FrontDoc-03-Conv.md)；通用工程红线 → [RootDoc-EngConv.md](../../../docs/RootDoc-EngConv.md)；深层威胁模型（STRIDE 15 条）→ [Mobile/tools/docs/arch/安全设计.md](../../../CS-Mobile/tools/docs/arch/安全设计.md)

---

## 0. 文档速览：约束密度总表

| 章节 | 主题 | MUST 条数 | MUST NOT 条数 | SHOULD 条数 | MAY 条数 | 关键代码入口 |
|------|------|-----------|--------------|------------|----------|-------------|
| §1 | BFF 转发安全与 Origin 边界 | 9 | 7 | 4 | 2 | `src/shared/backend-client.ts`、`src/shared/security/security.ts` |
| §2 | JWT Cookie 托管与 401 静默刷新 | 8 | 6 | 3 | 2 | `src/shared/backend-client.ts` setAuthCookies、`auth/login` route |
| §3 | UI 层角色与路由保护（UI 兜底） | 6 | 5 | 3 | 1 | `admin/server/require.ts`、`src/modules/**/ui/` 显隐逻辑 |
| §4 | 安全头、CSP、i18n 词表管理 | 7 | 5 | 3 | 2 | `next.config.ts` `buildCsp(nonce)`、`src/i18n/messages/` |
| §5 | 运行时监测与遗留代码责任划分 | 5 | 4 | 3 | 1 | `instrumentation.ts` 事件总线、`src/shared/logger.ts` pino |
| §6 | — | **35（合计）** | **27（合计）** | **16（合计）** | **8（合计）** | — |

---

## 1. BFF 转发安全与 Origin 边界

### 1.1 概述（一句话定位）

FztbuCS 前端是**同源 BFF 薄转发层架构**：浏览器仅与 Next.js BFF 同源通信，所有业务 API 由 BFF API 路由（`src/app/api/**/route.ts`）通过 `proxyBackend()` 向固定 `BACKEND_URL + /api/v1` 转发，并在转发层统一注入 Bearer、执行 401 静默刷新、翻译 snake_case→camelCase、写回 HttpOnly Cookie。浏览器**不存在直连后端的客户端代码**。

### 1.2 接口与代码入口清单

| 符号 / 配置项 | 默认值 / 签名 | 用途 |
|---|---|---|
| `proxyBackend(req, path, opts?)` | 位于 `src/shared/backend-client.ts` | BFF 路由统一调用；注入 Authorization + 401 静默重试一次 + 翻译 + 写 Cookie |
| `proxyStream(req, path)` | 同 `backend-client.ts` | SSE 流透传（Auxilio 对话）；Authorization 注入后原样 pipe，不做 JSON 解析 |
| `BACKEND_URL` | `http://localhost:9000`（开发）/ `http://backend:8000`（compose） | 固定转发上游目标；无用户可控 URL 拼接 |
| `assertAllowedOrigin(req, origins, trustedProxies)` | `security.ts` | 写端点 Origin/Referer 白名单校验；精确 `URL().origin` 比较防子域名绕过 |
| `ALLOWED_ORIGINS` | 生产必须显式配置；缺失则 FATAL 退出 | Origin 白名单（逗号分隔）；开发自动回退 `localhost` + 局域网 IP |
| `validateBody(schema, body)` / `ContentType` | Zod schema + 严格 `application/json` | BFF 全入口入参校验链；写端点 MUST 叠加 |
| `Content-Security-Policy` | `buildCsp(nonce)` 按环境生成 | 生产 `script-src 'self' 'nonce-…'`，移除 unsafe-inline / unsafe-eval |

### 1.3 约束（RFC2119 分层）

**MUST（铁律红线，违反即安全漏洞）：**
1. 所有业务 API **MUST** 经 BFF 路由 → `proxyBackend()` 转发到固定 `BACKEND_URL + /api/v1`；**MUST NOT** 允许组件/模块直接 `fetch(后端地址)`，后端地址/端口 **MUST NOT** 进入客户端 bundle。
2. `proxyBackend()` 转发目标 **MUST** 仅拼接后端资源路径（`/api/v1/**`），**MUST NOT** 接受用户可控 URL，消除 SSRF 风险（BFF 不实现 webhook/任意 URL 反代）。
3. 写端点（POST/PUT/DELETE/PATCH）**MUST** 在进入 Zod 校验前调用 `assertAllowedOrigin(req)`：Origin 必须落入 `ALLOWED_ORIGINS`，**MUST NOT** 用后缀匹配/正则子域名宽松匹配。
4. `ALLOWED_ORIGINS` **MUST** fail-fast：生产缺失 → 进程 `[FATAL]` 退出；**MUST NOT** 回退 `localhost` 或 `*`。
5. BFF 写端点 **MUST** 叠加 Zod `validateBody` + `Content-Type: application/json` 严格检查双重防线，**MUST NOT** 直接 `await req.json()` 无校验。
6. `assertAllowedOrigin` **MUST** 对 `2FA verify/setup/disable/backup-codes`、登录、注册、管理员写操作等高敏路径强制开启；**MUST NOT** 有遗漏。
7. `BACKEND_URL`（含后端 host/port）**MUST NOT** 出现在 `NEXT_PUBLIC_*` 环境变量或任何客户端可访问的 JS bundle；仅存在于 BFF server 运行时。
8. `Content-Type` 白名单 **MUST** 为严格 `application/json`（FormData 例外须单独声明，如文件上传走 `multipart/form-data` 且后端执行 MIME/魔数/扩展名三重校验）。
9. CSP `buildCsp(nonce)` **MUST** 随 `nonce` 按请求随机生成；生产 **MUST** 移除 `unsafe-inline`/`unsafe-eval`，style-src 保留 unsafe-inline 作为唯一例外（Next.js 注入限制），并在 §6 门禁中追踪。

**MUST NOT（禁止事项，违反即安全漏洞）：**
1. **MUST NOT** 把 `ALLOWED_ORIGINS` 配置为 `*` 或含公网 0.0.0.0/0 的宽泛网段；该错误等价于禁用 CSRF，必须 CI 配置检查阻断。
2. **MUST NOT** 在 BFF 层直连数据库（`better-sqlite3` 依赖已整体移除，遗留代码仍在清理，运行时路径为零引用）；BFF 仅转发、不落业务库。
3. **MUST NOT** 暴露运维端点（`/readyz`、`/metrics/json`、`/status`）给浏览器；BFF 运维接口仅有 `/api/health`（公开，转发后端 `/health`，仅返回 `{ok:true/false}`，不泄露细节）。
4. **MUST NOT** 允许 BFF 代码路径「先写响应再做 assertAllowedOrigin」；校验必须是 handler 第一行。
5. **MUST NOT** 允许 `proxyBackend()` 与上游的 HTTP 通信明文；生产 MUST 走 HTTPS 或 compose 内网隔离。
6. **MUST NOT** 把 `api_usage` 埋点记录的 user_id、请求体、查询参数、Header 写入 `api_call_logs` 表；匿名原则见后端 Sec §5.3（BFF 仅透传）。
7. **MUST NOT** 在 BFF 层实现业务级 RBAC enforce（只做 UI 兜底）；真实权限判定 MUST 由后端 `require_permission` 执行（§3.1 不变量）。

**SHOULD（建议事项，偏离需 CR 说明理由）：**
1. BFF 所有错误响应 **SHOULD** 走 `errorResponse` 统一格式；未知错误 **SHOULD** 返回通用消息，**SHOULD NOT** 暴露堆栈、内部路径、环境变量值。
2. `/health` **SHOULD** 返回 `{ok:true}` + 超简版时间戳；**SHOULD NOT** 把连接池状态、DB 版本、Redis latency 等内部信息暴露给公网。
3. **SHOULD** 后续接入 Dependabot / Snyk（pnpm audit 已 CI 阻断）做组件漏洞告警，形成分层扫描。
4. **SHOULD** BFF 日志字段 **SHOULD** 携带 `requestId`（必填）、`module`（可选）、`userId`（有条件），不记录 token/参数/URL query；`createRequestLogger(req)` 已统一封装。

**MAY（可选配置）：**
1. 开发期 **MAY** 临时开启 1–2 个直连后端的 dev-only 路由调试 API；但 **MUST** 通过 `process.env.NODE_ENV !== 'production'` 包裹并在 CR 时标注「仅开发使用」。
2. 定制安全头策略（如增加 Permissions-Policy 更严子集）**MAY** 在 `next.config.ts` 的 `headers()` 中叠加，但 MUST 保留现有 CSP/HSTS/X-Frame-Options/nosniff 基线。

### 1.4 自检 CheckList

- [ ] 所有写端点第一行调用 `assertAllowedOrigin`；grep 无遗漏
- [ ] 新增 BFF 路由已走 `proxyBackend` / `proxyStream`；无组件 `fetch(BACKEND_URL)`
- [ ] `BACKEND_URL` 未以 `NEXT_PUBLIC_` 前缀暴露；客户端 bundle grep 无后端 host:port 字符串
- [ ] 生产环境缺失 `ALLOWED_ORIGINS` 时的 FATAL 退出逻辑在 `tools/tests/config/security-config.test.ts` 有反向测试
- [ ] CSP 策略验证：curl 响应头 `script-src` 无 unsafe-inline/unsafe-eval（style-src 除外）

---

## 2. JWT Cookie 托管与 401 静默刷新

### 2.1 概述（一句话定位）

JWT 双 token（access 15min / refresh 7d）由**后端签发**，BFF 以 `__Host-` 前缀 HttpOnly Cookie 托管（JS 不可读）；401 时 `proxyBackend` 通过 RefreshMutex 全局单飞静默刷新并重试一次；2FA 登录模式走 `__Host-oauth_2fa` 预认证 Cookie，全程 JS 不可读。

### 2.2 接口与配置清单

| 符号 / 路径 | 默认值 / 签名 | 用途 |
|---|---|---|
| `__Host-fztbu_access` Cookie | 生产：Secure + HttpOnly + SameSite=Lax + Path=/ + 无 Domain | access token 托管；仅 HTTPS + 站点根路径可见 |
| `__Host-fztbu_refresh` Cookie | 同 access，TTL=7d | refresh token 托管；轮换时由后端重新签发 |
| `__Host-oauth_2fa` Cookie | 临时：登录→2FA 验证窗口期 | 2FA 预认证 token，验证成功后替换为双 token |
| `setAuthCookies(res, tokens)` | `backend-client.ts` 统一写 Cookie | 签名属性 MUST 与上表严格一致；禁止路由层自行写 cookie |
| `RefreshMutex` 单飞 | `proxyBackend` 401 分支 | 并发多个 401 时只触发一次 `/auth/refresh`，其余排队 |
| `POST /api/auth/refresh`（BFF→后端） | 后端路由 | 轮换双 token；复用检测：旧 refresh 立即失效 |
| SameSite=Lax 策略 | 全站 Cookie 默认 | CSRF 兜底第一道；第二道为 Origin 白名单（§1） |

### 2.3 约束（RFC2119 分层）

**MUST（铁律红线）：**
1. 生产环境 JWT Cookie **MUST** 采用 `__Host-` 前缀：要求同时满足 Secure + Path=/ + 无 Domain 三项，**MUST NOT** 放宽；开发环境无前缀但 **MUST** 保持 HttpOnly。
2. Cookie 写回 **MUST** 统一由 `setAuthCookies(res, tokens)` 执行；**MUST NOT** 在单个业务路由手写 `res.cookie()`，避免属性不一致。
3. 401 静默刷新 **MUST** 由 RefreshMutex 全局单飞，**MUST NOT** 并发请求各自独立 `/auth/refresh` 导致 refresh 复用检测命中、用户被误登出。
4. `/auth/refresh` 成功后 **MUST** 写回一对全新双 token（refresh 轮换）；**MUST NOT** 复用旧 refresh（复用检测机制下旧 refresh 立即失效）。
5. 2FA 登录模式中，预认证 twoFactorToken **MUST** 来自请求体或 `__Host-oauth_2fa` Cookie；**MUST NOT** 以 query string 传递，**MUST NOT** 让其与用户密码在同一个请求体中重复传输（单体时代缺陷已修复）。
6. Cookie Secure 属性 **MUST** 随 `process.env.NODE_ENV === 'production'` 自动开启；**MUST NOT** 明文 HTTP 生产环境。
7. 前端 JS **MUST NOT** 能通过 `document.cookie` 读出 access/refresh/twoFactor；所有高敏 cookie MUST HttpOnly。
8. 刷新失败（后端返回 `REFRESH_EXPIRED` / 网络错误）时 **MUST** 调用 `clearAuthCookies()` 并强制跳转登录页；**MUST NOT** 无限重试或静默留在受保护页面。

**MUST NOT（禁止事项）：**
1. **MUST NOT** 把 access/refresh token 写入 `localStorage` / `sessionStorage` / IndexedDB；XSS 可轻易读取。
2. **MUST NOT** 在前端源码中出现 `process.env.SECRET_KEY`、`TOTP_ENCRYPTION_KEY` 等后端密钥引用；**前端不持有任何业务密钥**（参考 §1 不变量与 Sec §5 前端不持有密钥）。
3. **MUST NOT** 让 refresh token 生命周期 > 30 天；当前 7 天 **MUST NOT** 被放宽超过 30 天。
4. **MUST NOT** 允许 OAuth 2FA 流程绕过 GitHub OAuth 回调 state 校验再写 Cookie（防止 OAuth CSRF）。
5. **MUST NOT** 让 BFF 在 401 刷新路径上携带除 `Authorization: Bearer <refresh>` 外的敏感查询参数；所有通信 MUST 走请求体或 header。
6. **MUST NOT** 在用户登出、密码重置、账号禁用后保留 BFF 侧 token 副本；登出 MUST 调用 `clearAuthCookies()` 并向后端调用 `/auth/logout` 撤销 refresh。

**SHOULD（建议事项）：**
1. **SHOULD** 为 Cookie 追加 `Partitioned` 属性（CHIPS 支持），便于后续第三方嵌入场景维持隔离。
2. 连续 3 次 `/auth/refresh` 失败后，**SHOULD** 临时标记账号异常并在错误提示中引导用户联系管理员（防 refresh 洪水攻击）。
3. **SHOULD** 登录/注册成功后清理临时 `__Host-oauth_2fa` Cookie，无论 2FA 是否启用。

**MAY（可选配置）：**
1. 开发调试期 **MAY** 临时取消 `__Host-` 前缀，以便 localhost HTTP 工作；但 **MUST** 通过 `NODE_ENV !== 'production'` 条件编译。
2. 企业 SSO 场景 **MAY** 追加 `SameSite=none; Secure`，但 MUST 同时收紧 Cookie TTL ≤ 1 小时，作为窄口特例登记在 §6 例外表中。

### 2.4 自检 CheckList

- [ ] 生产响应头 `Set-Cookie` 含 `__Host-` 前缀 + Secure + HttpOnly + Path=/；curl 人工验证
- [ ] RefreshMutex 并发测试：并发 10 个 401 请求只触发 1 次 `/auth/refresh`；`tools/tests/security/refresh-mutex.test.ts`
- [ ] 前端 JS 读取 `document.cookie`：不含任何 access/refresh/2fa 片段
- [ ] 连续 3 次刷新失败后，用户被强制登录并清理 Cookie
- [ ] 登出/改密后，旧 refresh token 已被后端撤销且 BFF Cookie 已清理

---

## 3. UI 层角色与路由保护（UI 兜底）

### 3.1 概述（一句话定位）

BFF 在 API 路由层提供轻量角色兜底（`requireAdmin/requireRoot/requireModuleAdmin/requirePasswordConfirmation`）+ UI 按钮显隐，作为用户体验优化与 UI 误触防护；**真实 RBAC0 enforce（`require_permission(resource, action)`）位于后端**，任何 BFF 鉴权通过都不等价于授权成立。

### 3.2 接口与矩阵清单

| 角色 / 保护 | 后端存储权威 | BFF 解析来源 | 常见 UI 使用场景 |
|---|---|---|---|
| 超级管理员 `root` | `users.is_superuser=true`（PG） | `/auth/me` 返回 `isSuperuser` → 主角色解析为 `root` | 删除审计日志、硬删除用户、重置自定义密码 |
| 普通管理员 `admin` | RBAC 表 `admin` 角色 | `/auth/me` `roles` 数组含 `admin` | 用户管理、活动、通知、社区审核 |
| 细粒度角色 `content_moderator` / `exam_admin` / `task_publisher` | 后端 RBAC 表 seed 数据 | `/auth/me` `roles` 数组对应 | 社区审核、考试组卷、任务认领审核 |
| 普通用户 `user`（默认） | 无角色即 user | `roles` 为空即 user | 一般业务使用 |
| `requireAdmin()` | BFF 兜底实现 | `admin/server/require.ts` | 管理员接口 BFF 路由首行；后端二次 enforce |
| `requireRoot()` | BFF 兜底实现 | `admin/server/require.ts` | root 专属接口；后端二次 enforce |
| `requirePasswordConfirmation()` | BFF 转发后端校验 | `admin/server/require.ts` | 高危操作（重置密码、删用户） |
| UI 按钮显隐 | — | `SafeUser.role` + 权限矩阵 | 管理入口/高敏按钮仅对有权限角色渲染 |

### 3.3 约束（RFC2119 分层）

**MUST（铁律红线）：**
1. 后端 5 种管理员保护约束（SELF_DEMOTE / SELF_DISABLE / SELF_DELETE / SELF_APPROVE / LAST_ADMIN / ADMIN_CROSS_PROTECT）**MUST** 仅由后端 service 层 enforce；BFF 层 **MUST NOT** 自行实现这些保护逻辑，避免两套算法不一致。
2. BFF 管理员路由 **MUST** 首行调用 `requireAdmin()` / `requireRoot()`；**MUST NOT** 仅通过 UI 按钮隐藏来保护。
3. root 专属 UI 入口（审计日志、硬删除用户、重置自定义密码）**MUST** 仅在主角色 = `root` 时渲染；**MUST NOT** 对 admin 角色可见。
4. 后端权限矩阵新增资源点后 **MUST** 同步更新 BFF UI 显隐矩阵；两端出现不一致时，**MUST** 以后端 `require_permission` 为权威并立即修复 BFF 显隐。
5. 越权测试时，**MUST** 断言：即便绕过 BFF 直接请求后端，`require_permission` 会返回 403；BFF 兜底与后端 enforce **MUST** 形成双层保护。
6. 新增管理员写操作 **MUST** 确保后端已纳入 `logAdminAction` 覆盖；BFF 层 **MUST NOT** 直接写审计日志，**MUST NOT** 绕过后端 audit 机制直接操作 `admin_actions` 表。

**MUST NOT（禁止事项）：**
1. **MUST NOT** 允许 BFF 管理员 UI 以「角色名字符串前端判断」替代后端 enforce（例如前端仅判 `role==='admin'` 放行，后端实际无权限）——前后端 MUST 双层校验。
2. **MUST NOT** 允许 `roles` 数组由客户端表单传入或修改；角色清单 MUST 仅来自 `/auth/me` 后端返回，前端禁止用户可控编辑。
3. **MUST NOT** 把默认管理员创建、`ADMIN_PASSWORD` 生成逻辑放到 BFF 端；RBAC seed + 默认管理员 MUST 由后端 startup 任务经 PostgreSQL advisory lock 单实例执行。
4. **MUST NOT** 把 OAuth 注册用户直接设为管理员；默认 MUST 是 `member` 角色，升级 MUST 走后端手工 RBAC 流程。
5. **MUST NOT** 在 `/auth/me` 响应体中暴露 `ADMIN_PASSWORD`、`password_hash`、`TOTP 种子` 等敏感字段；SafeUser DTO MUST 与后端对齐。

**SHOULD（建议事项）：**
1. **SHOULD** 在管理后台 UI 中提供「当前角色与权限一览」卡片，展示主角色（root/admin/content_moderator/…）+ 可见模块清单，便于管理员自查。
2. 密码重置审批流程 **SHOULD** 在 BFF UI 层屏蔽「审批自己申请」的按钮，配合后端 SELF_APPROVE 保护。
3. **SHOULD** 对连续 3 次 BFF 管理员 403 触发告警，与后端审计日志联动（账户接管检测）。

**MAY（可选配置）：**
1. 小体量内测期 **MAY** 在 BFF 侧提供「dev switch」临时把普通账号伪装为管理员，用于 UI 交互验收；但 **MUST** 通过 `NODE_ENV !== 'production'` 包裹，生产自动关闭。

### 3.4 自检 CheckList

- [ ] 管理员端点数与 BFF 保护矩阵一一对应；grep 无遗漏
- [ ] 越权测试：绕过 BFF 直接请求后端，所有管理员端点均返回 403（非对应角色）
- [ ] 管理后台 UI 权限矩阵（`admin × root` 与 3 细粒度角色）与后端 seed 一致
- [ ] 默认管理员创建流程：BFF 代码路径 grep 确认未写 ADMIN_PASSWORD
- [ ] SafeUser DTO 不含密码哈希、TOTP 种子、邮箱密码登录原始字段

---

## 4. 安全头、CSP、i18n 词表管理与前端不持有密钥

### 4.1 概述（一句话定位）

Next.js `next.config.ts` 统一产出 HSTS/CSP/X-Frame-Options/nosniff/Permissions-Policy 等安全头；`globals.css` token 收敛视觉变量；i18n 文案通过 next-intl 三处（类型+zhCN+en）同步；**前端不持有任何业务密钥**——用户级 LLM Key 经 BFF 转发后端加密存储，前端仅拿脱敏 `apiKeyMasked`。

### 4.2 接口与配置清单

| 项目 | 默认值 / 签名 | 说明 |
|---|---|---|
| HSTS（`Strict-Transport-Security`） | `max-age=63072000; includeSubDomains; preload` | 2 年 + 子域 + Chrome preload 列表 |
| X-Frame-Options | `DENY` | 禁止任何 iframe 嵌套 |
| X-Content-Type-Options | `nosniff` | 禁止 MIME 嗅探 |
| Permissions-Policy | `geolocation=(), microphone=(), camera=(), payment=()` | 高敏能力全关 |
| CSP `script-src` | 生产 `'self' 'nonce-…'`；开发放宽 | 无 `unsafe-inline` / `unsafe-eval` |
| CSP `style-src` | `'self' 'unsafe-inline'`（例外） | Next.js 注入限制，作为唯一例外登记 §6 |
| `globals.css` token 体系 | `--primary` / `--foreground` / `--muted-foreground` / `--destructive` / `--border` / `--chart-*` + 字号/圆角/z-index/动效时长 | 颜色全部走 token 或 Tailwind 语义色板 |
| workbench namespace i18n 三处 | `src/i18n/types.ts`（类型）→ `messages/zhCN.ts` → `messages/en.ts` | 新增文案三处同步；缺 key 即 tsc 错/运行时空文案 |
| LLM 用户级 Key 写入 | BFF `POST /api/workbench/llm-config` → 后端 AES-GCM 加密落库 → 返回 `apiKeyMasked`（如 `sk-****1234`） | 前端不持有明文 Key |

### 4.3 约束（RFC2119 分层）

**MUST（铁律红线）：**
1. 生产部署 **MUST** 开启 HSTS `max-age ≥ 31536000` + includeSubDomains；上线 Chrome HSTS preload 列表后 MUST 保持两年策略不回退。
2. CSP **MUST** 使用 nonce 策略，**MUST NOT** 固定 hardcode nonce 值；每请求 MUST 重新生成。
3. 颜色、字号、圆角、阴影、z-index、动效时长 **MUST** 全部走 `globals.css` token 或 Tailwind 语义色板；**MUST NOT** 就地散落硬编码 hex / 毫秒数值（SVG `stroke`/`fill` 例外：集中收口到 constants.ts 并注释来源）。
4. i18n workbench namespace 新增/修改文案 **MUST** 在类型、zh-CN、en 三处同步新增 key；**MUST NOT** 只改中文不改英文或只改语言包不改类型。
5. LLM 用户级 Key **MUST** 通过 BFF 路由→后端加密链路；**MUST NOT** 前端明文存储、**MUST NOT** 明文返回 `/users/me` / llm config 读接口。
6. 所有 `NEXT_PUBLIC_*` 变量 **MUST** 经人工评审确认「公开安全」；**MUST NOT** 以 `NEXT_PUBLIC_` 前缀暴露内部端口、后端直连地址、内部接口路径。
7. 字体 **MUST** 走 `next/font/google` 自托管；**MUST NOT** 通过 CSS `@import` 拉 Google Fonts（绕过安全 + 隐私 + 合规）。

**MUST NOT（禁止事项）：**
1. **MUST NOT** 在生产环境关闭 CSP、HSTS、X-Frame-Options 任何一项；调试期临时关闭 MUST 配套条件编译 + 上线前回归。
2. **MUST NOT** 在 CSP 白名单中引入未知第三方 CDN（script-src/style-src/connect-src 全部显式收敛到 self + 已知后端/SSE 上游）。
3. **MUST NOT** 允许前端 import `crypto` / `fs` / `nodemailer` / `pino` 等 node 原生/包进入客户端 bundle；对应文件首行 **MUST** `import 'server-only'` 声明 server-only 边界（ADR-010）。
4. **MUST NOT** 前端在 `console.log` / 错误上报 / 埋点中打印 token、密码、手机号、邮箱、TOTP 验证码；与通用 LOG-01/N3 对齐。
5. **MUST NOT** 在 SVG 就地硬编码 `#ffffff`/`#667eea` 等颜色超过 3 处，超过 SHOULD 收口到 constants 文件并提取 token 命名。

**SHOULD（建议事项）：**
1. **SHOULD** 定期用 CSP Evaluator（https://csp-evaluator.withgoogle.com/）复查策略强度，确认无 bypass 路径。
2. **SHOULD** 在 CI 中加入「i18n 三处一致性检查」脚本：类型、zhCN、en 的 key 集合完全相等，不一致则 CI 失败。
3. **SHOULD** 字体文件 **SHOULD** 预加载（`<link rel="preload" as="font">`）并配合 CSP font-src 自托管，避免字体回退闪烁。

**MAY（可选配置）：**
1. 小型内测/预览版 **MAY** 临时把 style-src `unsafe-inline` 放宽；但 MUST 与生产分离并在 §6 中显式标注。
2. 多语言扩展（越南语/繁体中文）**MAY** 按「三处同步」模式新增对应 `vi.ts` / `zh-TW.ts` 语言包。

### 4.4 自检 CheckList

- [ ] 生产 curl 安全头检查：HSTS/X-Frame/nosniff/CSP/Permissions-Policy 全部存在
- [ ] CSP evaluator 无 high severity 告警；style-src unsafe-inline 已在 §6 例外表登记
- [ ] globals.css token grep：颜色/字号/圆角/z-index/动效时长 ≥ 95% 走 token；无大量 hex 散落
- [ ] i18n workbench 新增文案后三处同步；pnpm ts-check 0 errors；en 语言包无 MISSING_MESSAGE
- [ ] LLM 用户级 Key 前端仅拿脱敏值；明文 API Key grep 不在前端代码/运行时响应体中

---

## 5. 运行时监测与遗留代码责任划分

### 5.1 概述（一句话定位）

前端事件总线监听器显式注册、幂等初始化；运行时失败登录记录、限流、审计日志、2FA 限流等由**后端实现**；BFF 仅做转发与结构化日志。遗留单体时代代码（`modules/auth/server/*` 等）仍在清理中，运行时已全部不再被 API 路由引用。

### 5.2 可测不变量清单

| ID | 不变属性 | 阈值 | 责任层 | 检查方式 |
|---|---|---|---|---|
| SI1 | 所有 BFF 写端点有 Origin 校验 | 缺 `assertAllowedOrigin` 的 POST/PUT/DELETE = 0 | BFF | 静态扫描 + E2E |
| SI2 | 2FA 端点有速率限制 | 缺限流的 2FA BFF 路由数 = 0（后端权威 enforce） | 后端 | 后端测试 |
| SI3 | 2FA 验证请求体不含 password | body 含 `password` 的 2FA verify 路由数 = 0 | BFF | E2E 断言 |
| SI4 | 事件监听器已注册 | 监听器数 < 1 的事件类型 = 0 | BFF | 启动健康检查 |
| SI5 | 生产关键变量已配置 | `ALLOWED_ORIGINS`（BFF）、`SECRET_KEY`/`TOTP_ENCRYPTION_KEY`（后端）缺失=0 | BFF+后端 | 启动断言 |
| SI6 | 管理员写操作全部有后端 audit log | 缺 `logAdminAction` 的后端写端点数 = 0 | 后端 | 后端静态扫描 |
| SI7 | BFF 不直连业务数据库 | `better-sqlite3` 引用数 = 0（依赖已删） | BFF | 静态扫描 |

### 5.3 约束（RFC2119 分层）

**MUST（铁律红线）：**
1. 事件总线 **MUST** 显式调用 `initNotificationEvents()` 初始化；函数 **MUST** 幂等（`initialized` 标志），**MUST NOT** 在模块加载副作用里自动初始化。
2. 事件载荷 **MUST** 仅含序列化安全类型；用户输入 **MUST** 先经 Zod 校验后再进入 emit；**MUST NOT** 把 DB cursor / 函数 / 类实例作为载荷传递。
3. pino 结构化日志 **MUST** 携带 `requestId` 字段；**MUST NOT** 混用 `console.error` 直接输出无结构化上下文的错误。
4. 失败登录记录、登录历史、尝试邮箱 **MUST** 由后端写入 `login_history` / `attempted_email`；BFF **MUST NOT** 自行做账号枚举/爆破检测。
5. 遗留单体代码（`modules/auth/server/*`、`shared/security/` 旧限流器等）**MUST NOT** 被新 BFF API 路由引用；清理工作独立跟踪且 MUST 验证「删除后 tsc 0 errors」。

**MUST NOT（禁止事项）：**
1. **MUST NOT** 在事件监听器内抛未 catch 异常导致整个 emit 链中断；每个监听器 MUST 单层 try/catch。
2. **MUST NOT** 把「登录成功」当作已过 2FA 认证；当用户启用 2FA 时 MUST 经过预认证 token → verify 两步，禁止一步登录成功直接写双 token。
3. **MUST NOT** 把依赖漏洞扫描（`pnpm audit`）挪出 CI；high 及以上 MUST 阻断构建。
4. **MUST NOT** 让 BFF 运维 `/api/health` 路由返回内部状态（DB 版本、Redis latency、容器 ID），只允许 `{ok:true/false}`。

**SHOULD（建议事项）：**
1. **SHOULD** 为结构化日志配置 7 天滚动切割 + 脱敏过滤器（LOG-01/N3），避免 token/PII 进入归档文件。
2. **SHOULD** 事件异步化阈值触发条件（活跃用户 > 500 或监听器 P95 > 500ms）达标后，自动切换为异步批处理；过渡期同步实现保持兼容。
3. **SHOULD** 遗留代码清理完成后做一次全量 E2E 回归 + tsc 0 errors + pnpm audit，确认不留空洞。

**MAY（可选配置）：**
1. **MAY** 接入 Sentry 作前端错误上报（生产启用、开发关闭），但 MUST 同时启用 Sentry 脱敏（PII/token 全 mask），错误详情上报在后端链路对齐。

### 5.4 自检 CheckList

- [ ] SI1–SI7 7 条 SI 不变量全部在 CI 或 E2E 中有检查
- [ ] 所有新 BFF 路由未引用遗留单体 `modules/auth/server/*`
- [ ] pnpm audit --audit-level=high 0 警告；无 high 以上漏洞进入 main 分支
- [ ] 事件监听器全部有 try/catch；异常不中断 emit 链
- [ ] `/api/health` curl 响应仅为 `{ok:true/false}`，无内部状态细节泄露

---

## 6. 变更门禁 + Pre-commit 必查清单（Reference 型文档强制尾章）

> 每次提交涉及 BFF 安全、权限矩阵、安全头、Cookie、i18n、密钥边界的代码/配置变更前，提交人 MUST 逐项自查并在 PR 描述打钩；CR 审核人 MUST 核对并在未打钩时打回。

### §6.1 通用门禁（所有 BFF 安全变更适用）

- [ ] 变更是否影响 §1–§5 任一 MUST/MUST NOT 约束？若是本节约束文字 MUST 已同步更新
- [ ] BFF proxyBackend 签名与响应格式与后端契约一致；`pnpm ts-check` 0 errors
- [ ] 新增/修改配置项已同步：根 `.env.example` + 前端 `.env.example` + `next.config.ts` 默认值 三处对齐
- [ ] 6 行元数据头：版本号、变更日期已同步更新
- [ ] `gen_doc_facts.py` 派生事实同步：`make gen-doc-facts`（版本一致性 / 模块契约对齐 / 测试存在）无漂移

### §6.2 BFF 转发与 Origin 门禁（§1 相关）

- [ ] 所有新写端点第一行 `assertAllowedOrigin`；grep 0 遗漏
- [ ] `ALLOWED_ORIGINS` 生产缺失 FATAL 退出；反向测试在 `tools/tests/config/security-config.test.ts` 中
- [ ] 新增 BFF 路由已走 `proxyBackend/proxyStream`；无组件直连后端
- [ ] CSP 配置变更后通过 CSP Evaluator 复查；style-src unsafe-inline 是唯一例外，且登记

### §6.3 Cookie 与 401 刷新门禁（§2 相关）

- [ ] 生产 Cookie `__Host-` + Secure + HttpOnly + Path=/ 齐全；curl 人工验证
- [ ] RefreshMutex 并发 10 请求 1 次 `/auth/refresh` 行为；反向测试存在
- [ ] 登出/改密/禁用后 BFF Cookie 清理 + 后端 refresh 撤销，两套流程串联正确
- [ ] 2FA verify 路径 body 中不含 `password` 字段；E2E 反向断言

### §6.4 UI 权限矩阵门禁（§3 相关）

- [ ] 新增管理员端点：BFF `requireAdmin/requireRoot` + 后端 `require_permission` 双层 enforce
- [ ] root 专属 UI 仅主角色 root 可见；与后端 RBAC seed 角色层级一致
- [ ] SafeUser DTO 不含密码哈希、TOTP 种子、邮箱密码登录原始字段
- [ ] 管理员 5 种 self/cross/last 保护：BFF 不重写实现；全部 defer 后端

### §6.5 安全头 + CSP + i18n + 密钥门禁（§4 相关）

- [ ] 生产 curl 安全头齐全；HSTS/CSP/X-Frame/nosniff/Permissions-Policy 0 缺失
- [ ] globals.css token 覆盖完整；颜色/字号/圆角/z-index/动效时长无大量 hex 散落
- [ ] i18n workbench 新增文案三处同步；tsc 0 error；en 语言包无 MISSING_MESSAGE
- [ ] LLM 用户级 Key：前端仅拿脱敏值；明文 API Key 前端代码/响应体 grep 0 命中

### §6.6 运行时监测门禁（§5 相关）

- [ ] SI1–SI7 七项不变量：CI 或 E2E 检查全部通过
- [ ] 新 BFF 路由未引用遗留单体 `modules/auth/server/*`
- [ ] pnpm audit --audit-level=high 0 警告
- [ ] `/api/health` 响应极简；无 DB 版本、Redis 延迟等内部状态泄露

---

> ↩ **返回前端架构总览**：[FrontDoc-01-Arch.md](FrontDoc-01-Arch.md) · **前端编码约定**：[FrontDoc-03-Conv.md](FrontDoc-03-Conv.md) · **后端安全权威**：[BackDoc-02-Sec.md](../../../CS-Web-Backend/tools/docs/BackDoc-02-Sec.md)
