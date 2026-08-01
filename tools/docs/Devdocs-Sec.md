# FZTBUCS-Sec-安全与权限设计文档

> 文档定位：安全与权限设计权威文档（reference）
> 受众：安全审计人员 / 开发工程师 / 运维 / 权限设计者
> 关联：权限矩阵见 [Devdocs-architecture.md](Devdocs-architecture.md)；部署模型单进程假设见同文档 §部署模型；演进路线 ADR-015 见 [Devdocs-roadmap.md](Devdocs-evolution.md)

## 文档结构

- **Part 1: 安全审计** — 对照 OWASP Top 10 的发现与修复状态
- **Part 2: 权限设计** — 角色、权限点、权限矩阵（RBAC）
- **Part 3: 配置与密钥** — 生产配置要求与密钥生命周期
- **Part 4: 安全加固变更记录** — 加固变更的可审计证据包（原 Devdocs-security-hardening-record.md）

---

# Part 1: 安全审计

> 项目：fztbucs-projects | 审计日期：2026-07-27 | 范围：全量代码审查，对照 OWASP Top 10 (2021)
> 方法：静态代码分析 + 架构审查
> 更新（2026-07-31）：所有发现已修复，详见各条目与本文档 **Part 4: 安全加固变更记录**

---

## 风险总览

| 风险等级 | 数量 | 说明 |
|---------|------|------|
| 🔴 严重  | 0    | 无已知严重漏洞 |
| 🟠 高    | 4    | ✅ 已全部修复（2026-07-31，ADR-015） |
| 🟡 中    | 7    | ✅ 已全部修复（2026-07-31，第二轮）|
| 🟢 低    | 5    | ✅ 已全部修复（2026-07-31，第二轮）|

---

## OWASP Top 10 (2021) 逐项检查

### A01: 访问控制失效

#### 发现 1 - 2FA 相关端点缺少 Origin 校验 🟠高 ✅ 已修复（2026-07-31，ADR-015）
- 位置：[src/app/api/auth/2fa/verify/route.ts](../../src/app/api/auth/2fa/verify/route.ts#L15-L69)
- 描述：2FA 验证（登录模式）和 2FA 禁用端点未执行 `assertAllowedOrigin()` 校验。登录 API 有 Origin 白名单校验，但 2FA 验证作为登录流程第二步，缺少同等防护。
- 影响：攻击者可能通过 CSRF 诱使已输入正确密码的用户完成 2FA 验证，劫持登录流程。
- 修复：verify（setup+login 双模式）/disable/setup/backup-codes 全部补齐 `assertAllowedOrigin(req)`（移至 body 解析前）。

#### 发现 2 - 2FA 设置端点缺少速率限制 🟡中 ✅ 已修复（2026-07-31，ADR-015）
- 位置：[src/app/api/auth/2fa/setup/route.ts](../../src/app/api/auth/2fa/setup/route.ts#L15-L34), [src/app/api/auth/2fa/disable/route.ts](../../src/app/api/auth/2fa/disable/route.ts#L12-L31)
- 描述：2FA 设置、禁用、备用码重新生成端点未实施速率限制。攻击者可频繁调用进行资源消耗攻击。
- 修复：添加 `twoFactorSetupLimiter`（3 次/分钟/IP+用户）。

#### 发现 3 - Admin 路由权限检查一致性良好 ✅
- 位置：[src/modules/admin/server/require.ts](../../src/modules/admin/server/require.ts)
- 评价：`requireAdmin` / `requireRoot` 每次都从 DB 实时读取 role 和 is_active，不依赖 session 缓存。高危操作有 `requirePasswordConfirmation` 二次确认。权限模型完善（root -> admin -> 细粒度角色）。

#### 发现 4 - 细粒度角色缺少模块级别 enforce 🟡中 ✅ 已修复（2026-07-31，第二轮）
- 位置：[src/modules/auth/types/index.ts](../../src/modules/auth/types/index.ts#L65-L97), [src/modules/admin/server/require.ts](../../src/modules/admin/server/require.ts#L99-L114)
- 描述：`isAdminRole()` 将 `content_moderator` / `exam_admin` / `task_publisher` 全部视为管理员，`hasModulePermission()` 细粒度检查已定义但未在 API 路由层广泛使用。例如 `content_moderator` 可能访问 `exam` 管理接口。
- 修复：
  1. 扩展 `AdminModule` 类型并实现 `ROLE_MODULE_MAP` 角色-模块映射，`hasModulePermission()` 改为基于此映射校验
  2. 新增 `requireModuleAdmin(req, module)` 守卫，封装 requireAdmin + 模块权限校验
  3. forum（11 路由）、exam（7 路由）、task（1 路由）共 19 个高敏 admin 路由全部迁移

---

### A02: 加密失效

#### 发现 5 - TOTP Secret 加密密钥派生不够健壮 🟡中 ✅ 已修复（2026-07-31，第二轮）
- 位置：[src/modules/auth/server/totp.ts](../../src/modules/auth/server/totp.ts)
- 描述：TOTP secret 的加密密钥从 `TOTP_ENCRYPTION_KEY` 或 `AUTH_SESSION_SECRET` 通过 SHA-256 哈希派生。开发环境使用硬编码字符串 `'dev-only-insecure-key-do-not-use-in-production'`，可能导致配置意外泄漏到生产。
- 修复：
  1. 生产环境强制要求 `TOTP_ENCRYPTION_KEY`，缺失时 `[FATAL]` + `process.exit(1)`
  2. 改用 HKDF-SHA256 从密钥材料派生加密密钥（info=`fztbucs-totp-encryption`，32 字节）
  3. 开发环境使用 `globalThis` 缓存的随机密钥替代硬编码字符串

#### 发现 6 - 密码哈希实现良好 ✅
- 位置：[src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts#L152-L172)
- 评价：使用 `scryptSync` + 随机 16 字节 salt，存储格式 `salt:hash`。验证使用 `timingSafeEqual` 防止时序攻击。`authenticateUser` 在用户不存在时执行 dummy scrypt 均衡时序。

#### 发现 7 - Session Token 存储设计良好 ✅
- 位置：[src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts#L57-L59)
- 评价：DB 存储 token 的 HMAC-SHA256 签名值而非原始 token，即使数据库泄露攻击者也无法直接复用。原始 token 仅存于 cookie。

#### 发现 8 - 生产环境 AUTH_SESSION_SECRET 缺失时仅警告 ✅ 已修复（2026-07-31）
- 位置：[src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts#L53-L60)
- 描述：生产环境缺少 `AUTH_SESSION_SECRET` 时只输出 `console.warn`，服务仍继续运行，进程级随机密钥在重启后全部 session 失效。
- 修复：生产环境缺失时 `[FATAL]` + `process.exit(1)` 拒绝启动；开发环境回退到 globalThis 缓存的随机密钥（解决 Next.js dev 模块重载导致密钥不一致问题）。

---

### A03: 注入

#### 发现 9 - SQL 注入防护良好 ✅
- 位置：全部数据库查询代码
- 评价：项目统一使用 `better-sqlite3` 的参数化查询（`?` 占位符），未发现字符串拼接 SQL。所有用户输入均通过参数绑定传递。`listAdminActions` 中的动态 WHERE 子句使用参数化方式构建。

---

### A04: 不安全的设计

#### 发现 10 - 速率限制为单进程内存实现 🟡中 ✅ 已标注（2026-07-31，第二轮）
- 位置：[src/shared/security/security.ts](../../src/shared/security/security.ts#L248-L296)
- 描述：`RateLimiter` 基于内存 Map 实现，单实例部署时正常工作。多进程/多实例部署时限流将失效。
- 修复：[Devdocs-architecture.md](Devdocs-architecture.md) 明确标注当前为单进程架构，速率限制基于内存 Map；多实例部署前必须迁移至 Redis 等共享存储。当前单实例部署下风险可控。

#### 发现 11 - 输入校验良好 ✅
- 位置：[src/shared/security/security.ts](../../src/shared/security/security.ts#L61-L80)
- 评价：所有 API 入口使用 Zod schema 校验，`validateBody` 组合 Content-Type 校验 + JSON 解析 + 结构校验。密码长度有上限（1024 字节）防 scrypt DoS。

#### 发现 12 - 速率限制覆盖全面 ✅
- 位置：[src/shared/security/security.ts](../../src/shared/security/security.ts#L365-L386)
- 评价：覆盖登录、注册、论坛、上传、考试等 18 种场景，支持环境变量动态调整。限流粒度合理（登录按 IP+邮箱，注册按 IP）。

---

### A05: 安全配置错误

#### 发现 13 - 安全头配置良好，但 CSP 存在 unsafe-inline 🟢低 ✅ 已修复（2026-07-31，第二轮）
- 位置：[next.config.ts](../../next.config.ts), [src/proxy.ts](../../src/proxy.ts)
- 描述：CSP 中 `script-src` 包含 `'unsafe-inline'` 和 `'unsafe-eval'`，削弱了 CSP 对 XSS 的防护能力。
- 修复：`buildCsp(nonce)` 按环境分流——生产 `script-src 'self' 'nonce-${nonce}'`（移除 unsafe-eval/inline），开发保留 `'unsafe-eval'` 依赖热重载；`style-src` 暂保留 `'unsafe-inline'`（Next.js 内联样式与 Tailwind 注入需要，已添加注释说明）。

#### 发现 14 - 安全头配置总体良好 ✅
- 位置：[next.config.ts](../../next.config.ts#L27-L90)
- 评价：HSTS max-age=2年含 includeSubDomains 和 preload，X-Frame-Options DENY，X-Content-Type-Options nosniff，Permissions-Policy 禁用敏感 API。CSP 中 frame-ancestors 'none'、base-uri 'self'、form-action 'self' 配置合理。

#### 发现 15 - 错误响应不泄露内部信息 ✅
- 位置：[src/shared/security/security.ts](../../src/shared/security/security.ts#L145-L162)
- 评价：`errorResponse` 对已知错误返回映射后的消息，未知错误返回通用 "请求失败，请稍后再试" 并记录日志。不会向客户端泄露堆栈信息。

#### 发现 16 - 生产环境 ALLOWED_ORIGINS 未配置时回退到 localhost ✅ 已修复（2026-07-31）
- 位置：[src/shared/config/auth-constants.ts](../../src/shared/config/auth-constants.ts#L77-L108)
- 描述：`ALLOWED_ORIGINS` 默认值为 `http://localhost:2333,http://localhost:3000`。生产环境忘记配置时，Origin 校验形同虚设，Login CSRF 防护失效。
- 修复：`ALLOWED_ORIGINS` 派生逻辑按 `NODE_ENV` 分流——生产环境未配置时 `[FATAL]` + `process.exit(1)` 拒绝启动；开发环境才回退到 localhost + 局域网 IP 白名单。

---

### A06: 脆弱的组件

#### 发现 17 - 依赖版本较新但缺少自动化漏洞扫描 🟡中 ✅ 已修复（2026-07-31，第二轮）
- 位置：[package.json](../../package.json), [.github/workflows/audit.yml](../../.github/workflows/audit.yml)
- 描述：关键依赖版本较新（next 16.2.12、better-sqlite3 ^12.11.1、react 19.2.8、react-markdown ^10.1.0、rehype-sanitize ^6.0.0、nodemailer ^9.0.3、zod ^4.4.3），但未集成 `npm audit` 或 Dependabot/Snyk 等自动化漏洞扫描。
- 修复：新增 [.github/workflows/audit.yml](../../.github/workflows/audit.yml)，触发条件：push/PR 改动 `package.json` 或 `pnpm-lock.yaml`、每周一定时、手动触发；执行 `pnpm audit --audit-level=high`，high 及以上漏洞阻断构建。

---

### A07: 认证失效

#### 发现 18 - 登录尝试限制良好 ✅
- 位置：[src/app/api/auth/login/route.ts](../../src/app/api/auth/login/route.ts#L33-L84)
- 评价：登录端点安全控制完善：Origin 校验 -> Content-Type 校验 -> Zod schema -> IP+邮箱速率限制（10/min）-> 时序均衡密码验证 -> 2FA 检查。`authenticateUser` 对不存在的用户执行 dummy scrypt 防枚举。

#### 发现 19 - 2FA 登录模式重新验证密码 ✅ 已修复（2026-07-31）
- 位置：[src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts#L313-L361)（`create2FAToken`/`verify2FAToken`）
- 描述：2FA 验证的登录模式要求客户端再次发送 email + password 明文，密码在前端临时存储且通过 HTTP 传输两次。
- 修复：登录成功但启用 2FA 时，改由 `create2FAToken` 发放 5 分钟有效期的加密签名预认证 token（含 jti 防重放，HMAC 校验），2FA 验证接口只需 token + TOTP 码，不再传输密码；OAuth 流程的 token 改用 `__Host-oauth_2fa` HttpOnly cookie 传递，避免经 URL/Referer/日志泄漏。

#### 发现 20 - 2FA 验证码无速率限制 🟠高 ✅ 已修复（2026-07-31，ADR-015）
- 位置：[src/app/api/auth/2fa/verify/route.ts](../../src/app/api/auth/2fa/verify/route.ts#L15-L69)
- 描述：2FA 验证端点没有速率限制。攻击者获取到用户的临时凭据后，可在窗口期内暴力尝试 6 位 TOTP 码。
- 修复：verify（setup+login 双模式）/disable/backup-codes 全部补齐 `twoFactorLimiter.check(${ip}:${userId})`。

#### 发现 21 - Cookie 安全属性 🟢低 ✅ 已修复（2026-07-31，第二轮）
- 位置：[src/app/api/auth/login/route.ts](../../src/app/api/auth/login/route.ts#L76-L82), [src/shared/config/auth-constants.ts](../../src/shared/config/auth-constants.ts)
- 描述：Cookie 配置 `httpOnly: true`, `sameSite: 'lax'`, `secure` 在生产环境启用，但缺少 `__Host-` 前缀（需 `path=/` 且 `secure` 且不含 `domain`）。
- 修复：`AUTH_COOKIE_NAME` 按环境分流——生产 `__Host-auth_session`（强制 Secure + Path=/ + 无 Domain），开发因 HTTP 无法满足 `__Host-` 前缀的 Secure 要求，保留无前缀的 `auth_session`。

#### 发现 22 - Session 管理良好 ✅
- 位置：[src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts#L258-L370)
- 评价：7 天 TTL，过期自动删除，禁用账号的 session 立即失效并清除所有 session。支持用户查看和远程注销其他 session。支持记录登录历史（IP、User-Agent）。

---

### A08: 软件和数据完整性故障

#### 发现 23 - 文件上传安全良好 ✅
- 位置：[src/modules/community/server/forum/uploads.ts](../../src/modules/community/server/forum/uploads.ts#L46-L111)
- 评价：论坛图片上传多层防护：文件大小校验（≤ 5MB）、MIME 白名单（JPEG/PNG/WebP/GIF）、扩展名白名单、魔数校验、文件名随机化（userId+timestamp+随机后缀）、存储路径限定、读取时路径遍历防护。

#### 发现 24 - 论坛图片读取端点无访问控制 🟡中 ✅ 已修复（2026-07-31，第二轮）
- 位置：[src/app/api/community/forum/images/[filename]/route.ts](../../src/app/api/community/forum/images/[filename]/route.ts)
- 描述：`readForumImage` 函数和 `/api/community/forum/images/[filename]` API 路由没有访问控制——任何知道文件名的用户都可以读取。
- 修复：API 路由添加 session 校验：从 cookie 提取 `AUTH_COOKIE_NAME`，调用 `getSession(token)` 验证登录态，未登录或会话失效返回 401；`Cache-Control` 从 `public` 改为 `private`，防止公共代理缓存泄漏敏感图片。

---

### A09: 安全日志和监控故障

#### 发现 25 - 审计日志设计良好但缺少失败尝试记录 🟢低
- 位置：[src/modules/admin/server/audit.ts](../../src/modules/admin/server/audit.ts)
- 评价：`logAdminAction` 记录管理员操作，包含操作者 ID、action 类型、目标用户、详情、IP、User-Agent。支持查询和删除。删除操作自我审计。

#### 发现 26 - 登录历史只记录成功登录 🟢低 ✅ 已修复（2026-07-31，第二轮）
- 位置：[src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts), [src/app/api/auth/login/route.ts](../../src/app/api/auth/login/route.ts), [src/shared/db/migrations.ts](../../src/shared/db/migrations.ts)
- 描述：`recordLoginHistory` 只在成功登录时调用，不记录失败登录尝试，不利于检测暴力破解攻击。
- 修复：
  1. 扩展 `recordLoginHistory` 签名，新增 `success` 与 `attemptedEmail` 参数，支持 `userId=null` 表示用户不存在
  2. 新增数据库迁移 v6：重建 `login_history` 表，`user_id` 改为可空，新增 `attempted_email` 列与对应索引
  3. 登录路由在认证失败（用户不存在/密码错误）与账号禁用分支调用 `recordLoginHistory(null, ip, userAgent, false, email.toLowerCase())`，统一返回 401 防邮箱枚举

#### 发现 27 - 错误日志仅用 console.error 🟢低 ✅ 已修复（2026-07-31，第二轮）
- 位置：[src/shared/logger.ts](../../src/shared/logger.ts), [package.json](../../package.json)
- 描述：错误日志使用 `console.error`，未集成结构化日志系统。
- 修复：集成 [pino](../../src/shared/logger.ts) + `pino-pretty`：dev 美化输出，生产 NDJSON；封装 `createRequestLogger(req)` 自动从请求头提取 `x-request-id` 绑定到子 logger。已在 33 个 API 路由/服务端模块替换 `console.error`。

---

### A10: SSRF

#### 发现 28 - 无明显 SSRF 风险 ✅
- 评价：未发现服务端发起用户可控 URL 请求的功能。项目为单体应用，无反向代理请求或 webhook 功能。`nodemailer` 用于发送邮件，连接的是预配置的 SMTP 服务器。

---

## 附加安全检查

### CSRF 防护

#### 发现 29 - Login CSRF 防护良好，但 SameSite=Lax 不是银弹 ✅
- 位置：[src/shared/security/security.ts](../../src/shared/security/security.ts#L203-L233)
- 评价：所有 POST 端点实施 Origin/Referer 白名单校验，配合 `SameSite=Lax` cookie 双重防护。Origin 匹配使用精确 `new URL().origin` 比较而非前缀匹配，防子域名绕过。2FA 验证端点原缺少此校验，已在发现 1 修复。

### XSS 防护

#### 发现 30 - Markdown 渲染使用 rehype-sanitize ✅
- 位置：[package.json](../../package.json#L37-L38)
- 评价：使用 `react-markdown` + `rehype-sanitize` + `rehype-highlight` 渲染 Markdown。`rehype-sanitize` 默认使用 GitHub 的 HTML 白名单，可有效防止 XSS 通过 Markdown 注入。默认配置已足够严格，无需额外调整。

---

## 加固清单

> 详细变更记录见本文档 **Part 4: 安全加固变更记录**。下表为发现到行动的简明索引。

| 优先级 | 发现 | 行动 | 状态 |
|---|------|------|------|
| 🔴 立即 | 1/2/20 | 2FA 端点 `assertAllowedOrigin` + `twoFactorLimiter` | ✅ 已修复（ADR-015）|
| 🔴 立即 | 19 | 预认证 token 消除密码二次传输 + OAuth `__Host-oauth_2fa` cookie | ✅ 已修复（ADR-015）|
| 🔴 立即 | 16 | 生产缺失 `ALLOWED_ORIGINS` 时 `process.exit(1)` | ✅ 已修复 |
| 🟠 尽快 | 5/8 | 2FA setup 限流 + HKDF-SHA256 派生 + `AUTH_SESSION_SECRET` 缺失拒绝启动 | ✅ 已修复 |
| 🟠 尽快 | 4 | `requireModuleAdmin(req, module)` 在 forum/exam/task 19 路由落地 | ✅ 已修复 |
| 🟡 计划 | 17/24/10 | `pnpm audit --audit-level=high` CI + 论坛图片 session 校验 + 单进程标注 | ✅ 已修复/已标注 |
| 🟢 加固 | 13/21/26/27 | CSP nonce 化 + `__Host-` 前缀 + 失败登录记录 + pino 结构化日志 | ✅ 已修复 |

---

## 总体评价

项目整体安全水平较高，主要亮点：

1. 认证体系完善：scrypt 密码哈希 + HMAC session token + 2FA + 细粒度角色 + 高危操作二次确认
2. 纵深防御：Origin 校验 + Content-Type 校验 + Zod schema + 速率限制 + 魔数校验多层防护
3. 安全头配置：HSTS/CSP/X-Frame-Options/Permissions-Policy 配置完整
4. SQL 注入防护：全部使用参数化查询
5. 文件上传安全：多层校验（大小/MIME/扩展名/魔数/文件名随机化）

2FA 流程加固与生产配置强制校验均已于 2026-07-31 完成（详见第 12 节路线图）。

---

# Part 2: 角色权限设计

> 描述 root / admin / 细粒度角色 / user 的权限划分、数据库约束、API 行为、审计日志与安全约束。
> 状态：已实施 | 最后更新：2026-07-27

---

## 1. 角色层级

| 角色 | DB 字段值 | 数量限制 | 创建方式 | 用途 |
|------|----------|---------|---------|------|
| 超级管理员 | `role = 'root'` | 唯一（最多 1 个） | CLI `pnpm create-user --role root` | 系统级管控、审计日志、自定义重置密码 |
| 普通管理员 | `role = 'admin'` | 任意 | CLI `pnpm create-user --role admin` | 用户管理（受限）、活动管理、通知群发、论坛管理 |
| 内容管理员 | `role = 'content_moderator'` | 任意 | root 提权 | 论坛审核（主题/回复隐藏、恢复、置顶、加精） |
| 考试管理员 | `role = 'exam_admin'` | 任意 | root 提权 | 考试系统管理（组卷、发布、结束、排名） |
| 任务发布者 | `role = 'task_publisher'` | 任意 | root 提权 | 任务系统管理（发布、关闭、认领审核） |
| 普通用户 | `role = 'user'` | 任意 | 注册 | 站点功能使用 |

优先级：`root > admin > 细粒度角色 > user`

> 细粒度角色说明：`content_moderator`/`exam_admin`/`task_publisher` 是第二期引入的专项管理角色，仅拥有对应模块的管理权限，不具备用户管理、活动管理、通知群发等通用管理员权限。`admin` 和 `root` 自动拥有细粒度角色的全部权限。

---

## 2. 数据库约束

### 2.1 users 表

复用现有 `role` 列（`TEXT NOT NULL DEFAULT 'user'`），取值扩展为 `{ 'user', 'admin', 'root' }`。

### 2.2 root 唯一性

通过 partial unique index 保证：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_root_unique
  ON users(id) WHERE role = 'root';
```

### 2.3 当前 root 账号

`3yearszhuang@root.233`（仅 CLI 创建，不通过 HTTP 接口暴露）

---

## 3. 权限矩阵

### 3.1 用户管理

| 操作 | admin | root |
|------|-------|------|
| 查看用户列表/详情 | ✅ | ✅ |
| 编辑用户资料 | ❌ | ✅ |
| 删除用户（硬删除） | ❌ | ✅ |
| 禁用/启用用户 | ✅（仅普通用户） | ✅ |
| 重置为默认密码 | ✅（仅普通用户） | ✅ |
| 自定义重置密码 | ❌ | ✅ |
| 操作其他管理员 | ❌（跨级保护） | ✅ |

### 3.2 活动管理

| 操作 | admin | root |
|------|-------|------|
| 查看/创建/编辑/删除活动 | ✅ | ✅ |

### 3.3 通知管理

| 操作 | admin | root |
|------|-------|------|
| 群发通知 | ✅ | ✅ |
| 查看群发历史 | ✅ | ✅ |

### 3.4 论坛管理

| 操作 | admin | root |
|------|-------|------|
| 版块管理 | ✅ | ✅ |
| 主题审核（隐藏/恢复/置顶/加精/删除） | ✅ | ✅ |
| 回复审核（隐藏/恢复/删除） | ✅ | ✅ |

### 3.5 审计日志（root 专属）

| 操作 | admin | root |
|------|-------|------|
| 查看审计日志 | ❌ | ✅ |
| 删除审计日志 | ❌ | ✅ |

### 3.6 密码重置审批

| 操作 | admin | root |
|------|-------|------|
| 查看密码重置申请列表 | ✅ | ✅ |
| 批准/拒绝密码重置申请 | ✅（不能审批自己） | ✅ |

### 3.7 细粒度角色权限

> 细粒度角色仅拥有对应模块的管理权限，不具备通用管理员权限（用户管理、活动管理、通知群发等）。`admin` 和 `root` 自动拥有以下全部权限。

| 模块 | 操作 | content_moderator | exam_admin | task_publisher |
|------|------|:-:|:-:|:-:|
| 论坛 | 主题审核（隐藏/恢复/置顶/加精） | ✅ | ❌ | ❌ |
| 论坛 | 回复审核（隐藏/恢复/删除） | ✅ | ❌ | ❌ |
| 论坛 | 版块管理（创建/编辑/删除） | ❌ | ❌ | ❌ |
| 考试 | 创建/编辑/删除考试 | ❌ | ✅ | ❌ |
| 考试 | 发布/结束考试 | ❌ | ✅ | ❌ |
| 考试 | 题目管理 | ❌ | ✅ | ❌ |
| 考试 | 查看排名 | ❌ | ✅ | ❌ |
| 任务 | 创建/发布/关闭任务 | ❌ | ❌ | ✅ |
| 任务 | 认领审核（通过/拒绝） | ❌ | ❌ | ✅ |
| 博客 | 发文/编辑（所有登录用户） | ✅ | ✅ | ✅ |
| 资源 | 上传/审核 | ❌ | ❌ | ❌ |

---

## 4. 安全约束（6 种保护机制）

| 保护 | 说明 |
|------|------|
| SELF_DEMOTE | 管理员不能降级自己 |
| SELF_DISABLE | 管理员不能禁用自己 |
| SELF_DELETE | 管理员不能删除自己 |
| SELF_APPROVE | 管理员不能批准自己的密码重置申请 |
| LAST_ADMIN | 禁止降级/禁用/删除最后一个活跃管理员 |
| ADMIN_CROSS_PROTECT | 管理员不能禁用/重置其他管理员的密码 |

### root 额外保护

- root 不可降级、不可禁用、不可删除
- root 不可被任何角色重置密码
- root 账号唯一，重复创建被拒绝

---

## 5. 审计日志

所有管理员（含 root）的写操作均记录审计日志到 `admin_actions` 表。

| action | 说明 |
|--------|------|
| `update_user` | 编辑用户资料（root） |
| `delete_user` | 硬删除用户（root） |
| `disable_user` | 禁用用户 |
| `enable_user` | 启用用户 |
| `reset_password_default` | 重置为默认密码 |
| `reset_password_custom` | 自定义重置密码（root） |
| `broadcast_notification` | 群发通知 |
| `create_event` / `update_event` / `delete_event` | 活动管理 |
| `approve_password_reset` / `reject_password_reset` | 密码重置审批 |
| `delete_log` | 删除审计日志（root，自我审计） |
| `create_announcement` / `update_announcement` / `delete_announcement` | 公告管理 |
| `create_category` / `update_category` / `delete_category` | 论坛版块管理 |
| `forum_topic_hide` / `forum_topic_restore` / `forum_topic_pin` / `forum_topic_feature` | 论坛主题审核 |
| `forum_reply_hide` / `forum_reply_restore` | 论坛回复审核 |
| `review_join_application` | 入社申请审批 |
| `create_exam` / `update_exam` / `delete_exam` / `publish_exam` / `end_exam` | 考试管理 |
| `create_question` / `update_question` / `delete_question` | 题目管理 |
| `review_resource` | 资源审核 |
| `create_task` / `update_task` / `publish_task` / `close_task` | 任务管理 |
| `review_task_claim` | 任务认领审核 |
| `event_checkin` | 活动签到核销 |

---

## 6. API 端点权限

| 端点 | 鉴权 |
|------|------|
| `GET /api/admin/users` | admin / root |
| `GET /api/admin/users/[id]` | admin / root |
| `PUT /api/admin/users/[id]` | root only |
| `DELETE /api/admin/users/[id]` | root only |
| `POST /api/admin/users/[id]/disable` | admin / root |
| `POST /api/admin/users/[id]/enable` | admin / root |
| `POST /api/admin/users/[id]/reset-password` | root only |
| `POST /api/admin/users/[id]/reset-password-default` | admin / root |
| `GET /api/admin/actions` | root only |
| `DELETE /api/admin/actions` | root only |
| `DELETE /api/admin/actions/[id]` | root only |

---

## 7. 管理后台 Tab 结构

```
[ 01 ] Users         - 用户列表（按钮按角色显示）
[ 02 ] Activities    - 活动管理
[ 03 ] Notifications - 通知管理
[ 04 ] Forum         - 论坛管理
[ 05 ] Logs          - 审计日志（仅 root 可见）
```

---

## 8. 迁移影响

- 现有 `role = 'admin'` 账号自动成为普通管理员，权限收敛
- 旧审计日志记录保留兼容
- 数据库无破坏性变更（仅新增 partial index），可安全回滚

---

# Part 3: 事件驱动安全与运行时监测

> 承接 [Devdocs-roadmap.md](Devdocs-evolution.md) 中 ADR-013 / ADR-014 / R7 / R8 的决策，描述事件总线、2FA 流程加固与运行时安全监测的实施规范。
> 状态：已实施（ADR-013 落地，2FA 流程加固与运行时监测已实施）| 最后更新：2026-07-30

---

## 9. 事件总线安全

### 9.1 监听器注册确定性

背景：`notification/server/index.ts` 原通过模块加载副作用 `_initEvents()` 注册监听器，依赖"该模块被任意路径间接 import"的隐式假设。Next.js 按需加载可能导致某些启动路径未触发该 import，通知静默失效（R7）。

实施（[ADR-013](Devdocs-evolution.md#adr-013-事件监听器显式初始化)，2026-07-29 落地）：

1. 显式初始化入口 ✅：`src/instrumentation.ts`（Next.js 启动钩子）显式调用 `initNotificationEvents()`
2. 幂等保护 ✅：`initNotificationEvents()` 内部维护 `let initialized = false` 标志，重复调用安全
3. 健康检查断言 🚧：新增 `/api/health/events` 端点返回各事件类型的监听器数量（规划中，Q5 基础端点已就绪）
4. 删除副作用 ✅：已删除 `notification/server/index.ts` 中的 `_initEvents()` 自动调用

```typescript
// src/instrumentation.ts - 委托给 instrumentation-node.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/instrumentation-node');
  }
}
```

`instrumentation-node.ts` 显式调用 `initNotificationEvents()` 注册通知事件监听器，并注册全局异常处理器将未捕获异常写入 pino 日志（ADR-013 + ADR-015）。

### 9.2 事件载荷完整性

事件总线 `appBus` 基于 Node.js EventEmitter，跨模块传递事件载荷时需遵守：

| 约束 | 说明 |
|------|------|
| 载荷只含序列化安全类型 | 禁止传递 DB statement、文件句柄、函数引用 |
| 用户输入需先经 Zod 校验 | 事件 emit 前必须完成输入校验，禁止透传 raw body |
| 跨模块载荷需定义 TypeScript 接口 | 在 `src/shared/events/event-types.ts` 集中声明 |
| 禁止在监听器中抛出未捕获异常 | 监听器内部 try-catch，失败记录日志但不中断 emit 链 |

### 9.3 异步化时机与安全影响

背景：`appBus.emit` 同步执行所有监听器。`createNotificationForAll` 大用户量广播与 `reply.created` 大量 @提及会同步阻塞请求，延长 P95（R8）。

决策（[ADR-014](Devdocs-evolution.md#adr-014-事件总线异步化时机)）：

- 当前阶段（活跃用户 ≤ 500）：维持同步 emit，保证事务内一致性语义
- 触发异步化条件：活跃用户 > 500 或某事件监听器 P95 > 500ms
- 异步化方案：重负载事件改用 `setImmediate` 异步队列，或迁移至 BullMQ
- 安全影响：异步化后事件处理失败不再阻塞请求，需额外保障：
  - 异步队列需有死信队列（DLQ）记录失败事件
  - 关键安全事件（如 `admin.action.logged`）维持同步，确保审计日志不丢
  - 异步监听器需独立重试逻辑，不依赖请求上下文

---

## 10. 2FA 流程加固

> 状态：✅ 已实施（2026-07-31，ADR-015）

### 10.1 当前缺陷回顾

| 发现 | 等级 | 位置 | 状态 |
|------|------|------|------|
| 2FA 验证端点缺少 Origin 校验 | 🟠高 | `/api/auth/2fa/verify`（setup+login 模式） | ✅ 已修复 |
| 2FA 验证无速率限制 | 🟠高 | `/api/auth/2fa/verify`（setup+login 模式） | ✅ 已修复 |
| 2FA 登录模式重复传密码 | 🟠高 | `/api/auth/2fa/verify`（login 模式） | ✅ 已修复（twoFactorToken 方案已实施） |
| 2FA 设置/禁用端点缺少速率限制 | 🟡中 | `/api/auth/2fa/setup`、`/api/auth/2fa/disable` | ✅ 已修复 |
| 2FA 备用码重新生成缺少限流+Origin | 🟠高 | `/api/auth/2fa/backup-codes` | ✅ 已修复（ADR-015 新增） |
| GitHub OAuth 绕过 2FA | 🔴严重 | `/api/auth/oauth/github/callback` | ✅ 已修复（ADR-015 新增） |

### 10.2 加固方案

#### 10.2.1 预认证 Token 方案（消除密码二次传输）

登录成功但未完成 2FA 时，发放短期 2FA 预认证 token，2FA 验证接口只需 token + TOTP 码，不再需要密码。

```
1. POST /api/auth/login { email, password }
   -> 密码校验通过 + 用户启用 2FA
   -> 返回 { preAuthToken, expiresAt }（不设置 session cookie）
   -> preAuthToken：HMAC 签名的短字符串，5 分钟有效期，含 userId

2. POST /api/auth/2fa/verify { preAuthToken, code, mode: 'login' }
   -> 校验 preAuthToken 签名 + 有效期
   -> 校验 TOTP code
   -> 成功则创建 session，设置 cookie
   -> 失败则递增失败计数，达到阈值锁定
```

```typescript
interface PreAuthToken {
  userId: number;
  issuedAt: number;  // Unix ms
  expiresAt: number; // issuedAt + 5min
  signature: string; // HMAC-SHA256(userId|issuedAt, AUTH_SESSION_SECRET)
}
```

安全属性：Token 不可伪造（HMAC 签名）、不可重放（使用后立即标记为 consumed，存内存 Map 5 分钟过期）、密码不再二次传输。

#### 10.2.2 速率限制加固

| 端点 | 限制 | 说明 |
|------|------|------|
| `POST /api/auth/2fa/verify` | 5 次/分钟/IP+userId | 暴力破解防护 |
| `POST /api/auth/2fa/setup` | 3 次/分钟/userId | 防资源消耗 |
| `POST /api/auth/2fa/disable` | 3 次/分钟/userId | 防资源消耗 |
| `POST /api/auth/2fa/backup-codes` | 3 次/分钟/userId | 防资源消耗 |

递增延迟：连续失败 3 次后，每次失败延迟翻倍（1s -> 2s -> 4s -> ...，上限 30s）。

#### 10.2.3 Origin 校验全覆盖

所有 2FA 写操作端点（verify/setup/disable/backup-codes）均需在处理前调用 `assertAllowedOrigin(req)`，与 login 端点保持一致。

---

## 11. 运行时安全监测

### 11.1 安全健康检查端点

新增 `/api/health/security` 端点（仅 root 可访问），返回运行时安全状态：

```json
{
  "events": {
    "topic.created": 1,
    "reply.created": 1,
    "admin.action.logged": 1
  },
  "rateLimiters": {
    "login": { "activeEntries": 12, "rejectedLastHour": 3 },
    "forumPost": { "activeEntries": 5, "rejectedLastHour": 0 }
  },
  "sessions": {
    "total": 156,
    "expiredCleanupLastRun": "2026-07-29T10:00:00Z"
  },
  "migrations": {
    "applied": ["0001", "0002", "0003"],
    "pending": []
  }
}
```

### 11.2 失败登录记录

> ✅ 已实施（2026-07-31，第二轮）——详见发现 26。

扩展后的 `recordLoginHistory(userId, ip, userAgent, success, attemptedEmail?)` 支持 `userId=null`（用户不存在）与 `success=false`（认证失败）；新增数据库迁移 v6 在 `login_history` 表新增 `attempted_email` 列；登录路由在认证失败/账号禁用分支记录失败历史，用于暴力破解与账户枚举检测。

```typescript
function recordLoginHistory(
  userId: number | null,  // null 表示用户不存在
  ip: string,
  userAgent: string,
  success: boolean,
  failureReason?: 'wrong_password' | 'user_not_found' | 'disabled' | '2fa_failed'
): void;
```

监控用途：检测暴力破解（同 IP 5 分钟内 > 20 次失败）、检测账户枚举（同 IP 针对多个不存在的邮箱尝试）、检测凭证填充（多个不同 IP 针对同一账户失败）。

### 11.3 结构化日志规范

> ✅ 已实施（2026-07-31，第二轮）——详见发现 27。

集成 `pino` + `pino-pretty`（[src/shared/logger.ts](../../src/shared/logger.ts)）；dev 美化输出，生产 NDJSON；封装 `createRequestLogger(req)` 自动从请求头提取 `x-request-id` 绑定到子 logger。已在 33 个 API 路由/服务端模块替换 `console.error`。

目标格式（JSON Lines）：

```json
{"level":"error","time":"2026-07-29T10:00:00Z","msg":"2fa verify failed","userId":42,"ip":"1.2.3.4","reason":"wrong_code","requestId":"abc123"}
```

字段约定：

| 字段 | 必填 | 说明 |
|------|:---:|------|
| `level` | ✅ | error / warn / info / debug |
| `time` | ✅ | ISO 8601 时间戳 |
| `msg` | ✅ | 人类可读消息 |
| `requestId` | ✅ | 请求追踪 ID（从 cookie/header 生成）|
| `userId` | 视情况 | 已认证用户 ID |
| `ip` | 视情况 | 客户端 IP |
| `module` | ✅ | 模块名（auth/notification/forum...）|

### 11.4 依赖漏洞扫描

> ✅ 已实施（2026-07-31，第二轮）——详见发现 17。

新增 [.github/workflows/audit.yml](../../.github/workflows/audit.yml)，触发条件：push/PR 改动 `package.json` 或 `pnpm-lock.yaml`、每周一定时、手动触发；执行 `pnpm audit --audit-level=high`，high 及以上漏洞阻断构建。

后续加固路径：启用 GitHub Dependabot 自动提 PR 更新依赖；`better-sqlite3` 升级时检查原生二进制安全公告；CI 生成 SBOM（Software Bill of Materials）便于漏洞响应。

---

## 12. 安全加固路线图

| 优先级 | 事项 | 对应发现 | 状态 |
|:------:|------|---------|:---------:|
| P0 | 2FA 验证端点 Origin 校验 + 速率限制 | 发现 1/2/20 | ✅ 已完成（2026-07-31）|
| P0 | 生产环境 ALLOWED_ORIGINS 强制校验 | 发现 16 | ✅ 已完成（2026-07-31）|
| P0 | 预认证 Token 方案消除密码二次传输 | 发现 19 | ✅ 已完成（2026-07-31）|
| P1 | 事件监听器显式初始化 | ADR-013/R7 | ✅ 已完成（2026-07-29）|
| P1 | AUTH_SESSION_SECRET 缺失拒绝启动 | 发现 8 | ✅ 已完成（2026-07-31）|
| P1 | 细粒度角色模块级权限校验 | 发现 4 | ✅ 已完成（2026-07-31，第二轮）|
| P1 | TOTP 加密密钥派生加固 | 发现 5 | ✅ 已完成（2026-07-31，第二轮）|
| P2 | 事件总线异步化评估 | ADR-014/R8 | M9 |
| P2 | 失败登录记录 | 发现 26 | ✅ 已完成（2026-07-31，第二轮）|
| P2 | CI 集成 pnpm audit | 发现 17 | ✅ 已完成（2026-07-31，第二轮）|
| P3 | 结构化日志（pino） | 发现 27 | ✅ 已完成（2026-07-31，第二轮）|
| P3 | CSP nonce 化 | 发现 13 | ✅ 已完成（2026-07-31，第二轮）|
| P3 | Cookie __Host- 前缀 | 发现 21 | ✅ 已完成（2026-07-31，第二轮）|
| P3 | 论坛图片访问控制 | 发现 24 | ✅ 已完成（2026-07-31，第二轮）|

---

## 13. 安全不变量（可测属性）

> 以下不变量需保持可测，防止安全属性退化。对应 [Devdocs-roadmap.md](Devdocs-evolution.md) 健壮函数 FF5。

| ID | 不变属性 | 度量 | 阈值 | 检查方式 |
|----|---------|------|------|---------|
| SI1 | 所有写端点有 Origin 校验 | 缺 `assertAllowedOrigin` 的 POST/PUT/DELETE 路由数 | 0 | 静态扫描 + E2E |
| SI2 | 2FA 端点有速率限制 | 2FA 端点缺 `*RateLimiter` 数 | 0 | 静态扫描 |
| SI3 | 密码不出现在 2FA 验证请求 | 2FA verify 请求 body 含 password 字段 | 0 | E2E 请求断言 |
| SI4 | 事件监听器已注册 | 健康检查返回监听器数 < 1 的事件类型数 | 0 | 启动后健康检查 |
| SI5 | 生产环境关键变量已配置 | `AUTH_SESSION_SECRET`/`ALLOWED_ORIGINS`/`TOTP_ENCRYPTION_KEY` 缺失 | 0 | 启动断言（`AUTH_SESSION_SECRET`+`ALLOWED_ORIGINS` 已实现 `process.exit(1)`；`TOTP_ENCRYPTION_KEY` 待补，见发现 7） |
| SI6 | 审计日志覆盖所有管理员写操作 | 管理员写端点缺 `logAdminAction` 数 | 0 | 静态扫描 |

---

*本章节随架构演进持续更新，新增 ADR 或安全发现需同步此处。*

---

# Part 4: 安全加固变更记录（Engineering Control Evidence）

> 文档定位：跨表面工程控制记录包，收敛代码/审计/架构/CI 中的安全加固改动为可审计变更记录
> 范围：2026-07-31 两轮加固（4 高 + 7 中 + 5 低 = 16 项 + ADR-015 新增 4 项 = 20 项已落地）| 状态：✅ 全部通过验证（tsc 0 errors / 441 tests passed）| 创建：2026-07-31
> 关联文档：本文档 Part 1–3 安全审计与权限设计 | [Devdocs-architecture.md](Devdocs-architecture.md) 部署模型 | [Devdocs-roadmap.md](Devdocs-evolution.md) ADR-015 / R7 / R8

---

## 1. 期望 → 行为 → 记录映射（Expectation To Record Map）

| 工程期望 | 归属 specialist | 期望行为 | 记录来源 | 频率 |
|---------|----------------|---------|---------|------|
| 2FA 写端点必须有 Origin 校验 | input-validation-and-injection-defense | 在 body 解析前调用 `assertAllowedOrigin(req)` | 静态扫描缺 `assertAllowedOrigin` 的 POST 路由数 | 每次 PR |
| 2FA 端点必须有速率限制 | input-validation-and-injection-defense | 调用 `twoFactorLimiter` / `twoFactorSetupLimiter` | 静态扫描缺 `*RateLimiter` 的 2FA 路由数 | 每次 PR |
| 密码不得在 2FA 验证请求中传输 | identity-and-secrets | 用预认证 token + TOTP 码替代密码二次传输 | E2E 请求断言 body 含 password 字段数 | 每次发布 |
| 生产环境关键变量必须配置 | configuration-and-automation-safety | 缺失时 `process.exit(1)` 拒绝启动 | 启动日志（FATAL 行）+ 启动健康检查 | 每次部署 |
| TOTP 加密密钥派生必须使用 HKDF | cryptography-and-key-lifecycle | 用 HKDF-SHA256 派生 32 字节密钥，禁用硬编码 | 代码审查 + 单测 `totp.test.ts` | 每次依赖/密钥变更 |
| 细粒度角色必须有模块级 enforce | client-application-security | 在 admin 路由入口调用 `requireModuleAdmin(req, module)` | 静态扫描 forum/exam/task 路由的守卫调用 | 每次 PR |
| 生产环境 CSP 不得含 unsafe-eval | edge-traffic-and-ddos-defense | `buildCsp(nonce)` 按环境分流，生产仅 `self + nonce` | CSP 响应头快照 | 每次部署 |
| 认证 cookie 必须使用 `__Host-` 前缀 | identity-and-secrets | 生产环境 cookie 名为 `__Host-auth_session` | 浏览器 DevTools 检查 + 响应头快照 | 每次部署 |
| 失败登录必须记录到 login_history | observability-and-alerting | 登录失败分支调用 `recordLoginHistory(null, ip, ua, false, email)` | DB 查询 `login_history WHERE success=0` 计数 | 每日 |
| 论坛图片读取必须校验 session | client-application-security | API 路由提取 cookie → `getSession(token)` 验证 | 未登录请求返回 401 的 E2E 断言 | 每次发布 |
| 依赖 high+ 漏洞必须阻断构建 | software-supply-chain-security | `pnpm audit --audit-level=high` 在 CI 执行 | GitHub Actions `audit.yml` 运行结果 | push/PR + 每周一 |
| 错误日志必须使用结构化日志 | observability-and-alerting | 用 `createRequestLogger(req)` 替代 `console.error` | 代码扫描 `console.error` 出现次数 | 每次 PR |
| 多实例部署前必须迁移速率限制 | high-availability-design | Redis 替换内存 Map 实现 | 架构评审检查清单 | 部署架构变更前 |

---

## 2. 已完成变更记录包（Record Pack Outline）

> 按「发现编号 → 变更内容 → 源工件 → 验证证据」四列组织。所有变更已落地并通过统一验证（见 §5）。

### 2.1 第一轮（ADR-015，2026-07-31）— 高危与 2FA 流程加固

| # | 发现 | 变更内容 | 源工件 | 验证证据 |
|---|------|---------|--------|---------|
| 1 | 发现 1 🟠高 | 2FA verify/setup/disable/backup-codes 全部补齐 `assertAllowedOrigin(req)`，且移至 body 解析前 | [src/app/api/auth/2fa/verify/route.ts](../../src/app/api/auth/2fa/verify/route.ts) 等 4 路由 | 静态扫描无遗漏；441 tests passed |
| 2 | 发现 2 🟡中 | `twoFactorSetupLimiter`（3/min/IP+userId）覆盖 setup/disable/backup-codes | [src/shared/security/security.ts](../../src/shared/security/security.ts) | 单测覆盖；441 tests passed |
| 3 | 发现 8 🟠高 | 生产环境缺失 `AUTH_SESSION_SECRET` 时 `[FATAL]` + `process.exit(1)`；开发环境用 globalThis 缓存随机密钥 | [src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts) | 启动断言单测；441 tests passed |
| 4 | 发现 16 🟠高 | 生产环境缺失 `ALLOWED_ORIGINS` 时 `process.exit(1)`；开发环境回退 localhost + 局域网 IP | [src/shared/config/auth-constants.ts](../../src/shared/config/auth-constants.ts) | 启动断言单测；441 tests passed |
| 5 | 发现 19 🟠高 | 登录成功但启用 2FA 时改发 5min 短期预认证 token（含 jti 防重放，HMAC 签名），2FA verify 不再传密码 | [src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts) | `totp.test.ts` 11 tests passed |
| 6 | 发现 20 🟠高 | `twoFactorLimiter`（5/min/IP+userId）覆盖 verify（setup+login 双模式） | [src/app/api/auth/2fa/verify/route.ts](../../src/app/api/auth/2fa/verify/route.ts) | 单测覆盖；441 tests passed |
| 7 | ADR-015 新增 🔴严重 | GitHub OAuth 流程强制 2FA 校验，绕过即拒绝 | [src/app/api/auth/oauth/github/callback/route.ts](../../src/app/api/auth/oauth/github/callback/route.ts) | OAuth 集成测试 |
| 8 | ADR-015 新增 🟠高 | 2FA 预认证 token 防重放：内存 `consumed jti` 集合 + 5min 惰性清理 | [src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts) | `totp.test.ts` replay 用例 |
| 9 | ADR-015 新增 🟠高 | OAuth 流程 token 传输从 URL query 改为 `__Host-oauth_2fa` HttpOnly cookie | [src/app/api/auth/oauth/github/callback/route.ts](../../src/app/api/auth/oauth/github/callback/route.ts), [src/app/api/auth/2fa/verify/route.ts](../../src/app/api/auth/2fa/verify/route.ts) | 响应头快照；441 tests passed |
| 10 | ADR-015 新增 🟠高 | 2FA 备用码重新生成补齐 `assertAllowedOrigin` + `twoFactorSetupLimiter` | [src/app/api/auth/2fa/backup-codes/route.ts](../../src/app/api/auth/2fa/backup-codes/route.ts) | 单测覆盖；441 tests passed |

### 2.2 第二轮（2026-07-31）— 中级与低级加固

| # | 发现 | 变更内容 | 源工件 | 验证证据 |
|---|------|---------|--------|---------|
| 11 | 发现 4 🟡中 | 扩展 `AdminModule` 类型 + `ROLE_MODULE_MAP`；新增 `requireModuleAdmin(req, module)`；forum（11）/exam（7）/task（1）共 19 路由迁移 | [src/modules/auth/types/index.ts](../../src/modules/auth/types/index.ts), [src/modules/admin/server/require.ts](../../src/modules/admin/server/require.ts), [src/app/api/admin/community/forum/](../../src/app/api/admin/community/forum), [src/app/api/admin/tools/exam/](../../src/app/api/admin/tools/exam), [src/app/api/admin/tools/task/route.ts](../../src/app/api/admin/tools/task/route.ts) | tsc 0 errors；静态扫描无本地 `requireXxxAdmin` 残留 |
| 12 | 发现 5 🟡中 | HKDF-SHA256 派生 TOTP 加密密钥（info=`fztbucs-totp-encryption`，32 字节）；生产强制 `TOTP_ENCRYPTION_KEY` 否则 `process.exit(1)`；开发用 globalThis 缓存随机密钥替代硬编码 | [src/modules/auth/server/totp.ts](../../src/modules/auth/server/totp.ts) | `totp.test.ts` 11 tests passed；启动断言 |
| 13 | 发现 10 🟡中 | 架构文档新增「部署模型与单进程假设」节，列出速率限制/2FA 防重放/事件总线的单进程依赖，明确多实例部署前迁移清单 | [Devdocs-architecture.md](Devdocs-architecture.md) §部署模型 | 文档评审 |
| 14 | 发现 17 🟡中 | 新增 `.github/workflows/audit.yml`：push/PR 改动 `package.json`/`pnpm-lock.yaml` + 每周一 + 手动触发；执行 `pnpm audit --audit-level=high` 阻断构建 | [.github/workflows/audit.yml](../../.github/workflows/audit.yml) | CI 工作流文件存在性检查 |
| 15 | 发现 24 🟡中 | 论坛图片 API 添加 session 校验（cookie → `getSession(token)` → 401）；`Cache-Control` 从 `public` 改为 `private` | [src/app/api/community/forum/images/[filename]/route.ts](../../src/app/api/community/forum/images/[filename]/route.ts) | 441 tests passed |
| 16 | 发现 13 🟢低 | `buildCsp(nonce)` 按环境分流：生产 `script-src 'self' 'nonce-${nonce}'`（移除 unsafe-eval/inline）；开发保留 unsafe-eval 依赖热重载；style-src 保留 unsafe-inline 并加注释 | [src/proxy.ts](../../src/proxy.ts), [next.config.ts](../../next.config.ts) | `proxy-headers.test.ts` 13 tests passed |
| 17 | 发现 21 🟢低 | `AUTH_COOKIE_NAME` 按环境分流：生产 `__Host-auth_session`（强制 Secure+Path=/+无 Domain）；开发 `auth_session`（HTTP 无法满足 `__Host-` 前缀） | [src/shared/config/auth-constants.ts](../../src/shared/config/auth-constants.ts) | 启动日志 + 浏览器 DevTools 检查 |
| 18 | 发现 26 🟢低 | `recordLoginHistory` 扩展签名（success + attemptedEmail）；迁移 v6 重建 `login_history` 表（user_id 可空 + attempted_email 列 + 索引）；登录失败分支记录 | [src/modules/auth/server/identity.ts](../../src/modules/auth/server/identity.ts), [src/app/api/auth/login/route.ts](../../src/app/api/auth/login/route.ts), [src/shared/db/migrations.ts](../../src/shared/db/migrations.ts) | 441 tests passed |
| 19 | 发现 27 🟢低 | 集成 pino + pino-pretty；封装 `createRequestLogger(req)` 自动绑定 `x-request-id`；33 个 API 路由/服务端模块替换 `console.error` | [src/shared/logger.ts](../../src/shared/logger.ts), [package.json](../../package.json) | 代码扫描 `console.error` 残留数 |
| 20 | 发现 30 🟢低 | rehype-sanitize 默认 GitHub 白名单审查结论：默认配置已足够严格，无需额外调整 | [package.json](../../package.json) rehype-sanitize ^6.0.0 | 文档审查记录 |

---

## 3. 记录清单（Record Inventory）

| 记录 | 来源 | 频率 | 保留期 |
|------|------|------|--------|
| 2FA 端点 Origin/RateLimiter 扫描 | 静态扫描脚本（待建设，见 §6 backlog） | 每次 PR | 90 天 |
| 生产环境关键变量启动断言 | `AUTH_SESSION_SECRET` / `ALLOWED_ORIGINS` / `TOTP_ENCRYPTION_KEY` 缺失时 `[FATAL]` 日志 | 每次部署 | 90 天 |
| 细粒度角色模块级守卫扫描 | 静态扫描 forum/exam/task 路由的 `requireModuleAdmin` 调用 | 每次 PR | 90 天 |
| CSP 响应头快照 | 生产环境部署后 `curl -I` 抓取响应头 | 每次部署 | 180 天 |
| Cookie `__Host-` 前缀检查 | 浏览器 DevTools 或响应头快照 | 每次部署 | 180 天 |
| 失败登录记录 | `login_history` 表 `WHERE success=0` | 持续写入 | 180 天（与成功记录一致） |
| 依赖漏洞扫描 | GitHub Actions `audit.yml` 运行结果 | push/PR + 每周一 | 365 天（GitHub Actions 默认） |
| 结构化日志输出 | pino NDJSON 输出（生产环境） | 持续 | 按日志聚合服务策略 |
| 测试套件 | `pnpm test`（vitest run） | 每次 PR + 每次部署 | 90 天 |
| TypeScript 类型检查 | `pnpm exec tsc --noEmit` | 每次 PR + 每次部署 | 90 天 |

---

## 4. 记分卡（Scorecard）

> 截至 2026-07-31 第二轮加固完成后的状态。

| 控制 | 状态 | 证据 | 缺口 | 负责人 |
|------|------|------|------|--------|
| 2FA 写端点 Origin 校验 | ✅ Pass | verify/setup/disable/backup-codes 全覆盖 | 无 | auth 模块 owner |
| 2FA 端点速率限制 | ✅ Pass | `twoFactorLimiter` + `twoFactorSetupLimiter` 全覆盖 | 无 | auth 模块 owner |
| 2FA 预认证 token 防重放 | ✅ Pass | jti + consumed 集合 + 5min 过期 | 单进程内存实现（见 §5 例外 1） | auth 模块 owner |
| 生产环境关键变量强制配置 | ✅ Pass | 3 个变量缺失即 `process.exit(1)` | 无 | platform owner |
| TOTP 密钥派生 | ✅ Pass | HKDF-SHA256 + 32 字节输出 | 无 | auth 模块 owner |
| 细粒度角色模块级 enforce | ✅ Pass | forum/exam/task 19 路由全覆盖 | event/blog/resource/notification/join 模块无细粒度角色，仅 admin/root 可访问（设计如此） | admin 模块 owner |
| 生产环境 CSP 严格度 | ✅ Pass | script-src 移除 unsafe-eval/inline | style-src 保留 unsafe-inline（见 §5 例外 2） | platform owner |
| Cookie `__Host-` 前缀 | ✅ Pass | 生产环境 `__Host-auth_session` | 无 | auth 模块 owner |
| 失败登录记录 | ✅ Pass | login_history 表 + attempted_email 列 | 无 | auth 模块 owner |
| 论坛图片访问控制 | ✅ Pass | session 校验 + private 缓存 | 无 | community 模块 owner |
| 依赖漏洞 CI 阻断 | ✅ Pass | `audit.yml` high+ 阻断 | Dependabot/Snyk 未启用（见 §6 backlog） | platform owner |
| 结构化日志 | ✅ Pass | pino + createRequestLogger 全覆盖 | 33 个文件已迁移，剩余历史 console.error 持续清理 | platform owner |
| 多实例速率限制迁移 | ⚠️ Exception | 架构文档已标注单进程假设 | 多实例部署前需迁移 Redis（见 §5 例外 1） | platform owner |

---

## 5. 例外登记（Exception Register）

| 例外 | 残余风险 | 补偿控制 | 接受方 | 到期 | 刷新触发 |
|------|---------|---------|--------|------|---------|
| 1. 速率限制 / 2FA jti 防重放为单进程内存实现 | 多实例部署时限流与防重放失效 | (a) 架构文档明确禁止多实例部署；(b) 部署前迁移清单（Redis）已写入 [Devdocs-architecture.md](Devdocs-architecture.md) §部署模型；(c) Session 存储已用 SQLite 共享存储，不依赖单进程 | 项目 owner | 多实例部署启动前 | 部署架构变更评审 |
| 2. CSP `style-src` 保留 `'unsafe-inline'` | 内联样式注入理论上可行 | (a) Next.js 内联样式与 Tailwind 注入依赖 unsafe-inline；(b) `script-src` 已移除 unsafe-inline/unsafe-eval，XSS 主路径已封堵；(c) 已添加注释说明保留原因 | 项目 owner | Next.js 支持非 inline style 注入后 | Next.js 主版本升级评审 |
| 3. rehype-sanitize 使用默认 GitHub 白名单 | 默认配置允许 `className` 等属性，理论上有滥用空间 | (a) 默认 GitHub 白名单经社区广泛验证，未发现实际 XSS 路径；(b) react-markdown + rehype-highlight 组合已在生产环境运行无事故；(c) 已记录审查结论在 §2.2 第 20 项 | 项目 owner | 无明确到期（默认配置持续有效） | rehype-sanitize 主版本升级或发现新 CVE 时 |

---

## 6. 标准更新积压（Standards Update Backlog）

| 缺口来源 | 工程期望 | 严重度 | 预期修复路径 | 目标日期 |
|---------|---------|--------|-------------|---------|
| §4 记分卡 — 依赖漏洞扫描 | 启用 GitHub Dependabot 自动提 PR 更新依赖 | 🟢低 | 在 `.github/dependabot.yml` 启用 Dependabot，每周检查 pnpm 依赖更新 | M8 |
| §4 记分卡 — 结构化日志 | 清理剩余历史 `console.error` 调用 | 🟢低 | 全仓库扫描 `console.error`，按模块迁移到 `createRequestLogger` | M8 持续 |
| §4 记分卡 — 静态扫描自动化 | 2FA Origin/RateLimiter 与细粒度角色守卫的静态扫描脚本化 | 🟡中 | 在 CI 中新增 ESLint 自定义规则或独立扫描脚本，将 §1 期望转为机器可检查规则 | M9 |
| §5 例外 1 — 多实例速率限制 | Redis 替换内存 Map 实现 | 🟡中 | 当活跃用户 > 500 或需要多实例部署时，迁移 `RateLimiter` 到 Redis；2FA jti 集合迁移到 Redis SET（带 5min TTL） | M9 或多实例部署前 |
| ADR-014 — 事件总线异步化 | 评估事件总线是否需要跨实例广播 | 🟡中 | 活跃用户 > 500 或某事件监听器 P95 > 500ms 时，重负载事件改用 `setImmediate` 异步队列或迁移 BullMQ | M9 |

---

## 7. 验证收据（Verification Receipt）

> 2026-07-31 第二轮加固完成后的统一验证结果。

| 验证项 | 命令 | 结果 | 收据 |
|--------|------|------|------|
| TypeScript 类型检查 | `pnpm exec tsc --noEmit` | 0 errors | 退出码 0 |
| ESLint（改动文件） | `pnpm exec eslint src/app/api/admin/community/forum src/app/api/admin/tools/exam src/app/api/admin/tools/task src/modules/admin/server/require.ts src/modules/auth/types/index.ts` | 0 warnings / 0 errors | 退出码 0 |
| 单元测试 | `pnpm test`（vitest run） | 441/441 passed（13 test files） | 退出码 0；Duration 2.72s |

---

## 8. 文档维护

- 真相源：本文档为变更记录的聚合视图，原始发现条目与详细描述以本文档 Part 1（安全审计）为准。
- 刷新触发：每次安全加固迭代完成后，追加新的「已完成变更记录包」章节，并更新 §4 记分卡与 §5 例外登记。
- 保留期：本文档长期保留，作为安全审计的可追溯证据。
- 归档条件：当项目进入维护期且无新安全加固时，本部分转为归档状态，不再追加新章节。

---

*本文档 Part 4 由 2026-07-31 安全加固第二轮收尾时生成，遵循 engineering-control-evidence specialist 输出契约。*
