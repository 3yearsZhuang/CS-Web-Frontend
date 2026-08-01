# FZTBUCS-Sec-安全与权限设计文档

> 文档定位：安全与权限设计权威文档（reference）
> 受众：安全审计人员 / 开发工程师 / 运维 / 权限设计者
> 关联：权限矩阵见 [Devdocs-Arch.md](Devdocs-Arch.md)；部署模型单进程假设见同文档 §部署模型；演进路线 ADR 见 [Devdocs-evolution.md](Devdocs-evolution.md)

## 文档结构

- **Part 1: 安全审计** — 对照 OWASP Top 10 (2021) 的发现与修复状态（28 项，全部已修复）
- **Part 2: 权限设计** — 角色、权限点、权限矩阵（RBAC）
- **Part 3: 事件驱动安全与运行时监测** — 事件总线、2FA 加固、运行时监测
- **Part 4: 安全加固变更记录** — 可审计证据包（原 Devdocs-security-hardening-record.md）

---

# Part 1: 安全审计

> 项目：fztbucs-projects | 审计日期：2026-07-27 | 范围：全量代码审查，对照 OWASP Top 10 (2021)
> 方法：静态代码分析 + 架构审查 | 状态：所有发现已于 2026-07-31 修复（ADR-015 及第二轮加固）

## 风险总览

| 风险等级 | 数量 | 状态 |
|---------|------|------|
| 🔴 严重  | 0    | 无已知严重漏洞 |
| 🟠 高    | 4    | ✅ 已全部修复（2026-07-31，ADR-015） |
| 🟡 中    | 7    | ✅ 已全部修复（2026-07-31，第二轮）|
| 🟢 低    | 5    | ✅ 已全部修复（2026-07-31，第二轮）|

## OWASP Top 10 逐项检查

### A01: 访问控制失效

| # | 发现 | 等级 | 位置 | 修复 | 状态 |
|---|------|------|------|------|:---:|
| 1 | 2FA 端点缺少 `assertAllowedOrigin` | 🟠高 | `api/auth/2fa/verify` | verify/setup/disable/backup-codes 全部补齐，移至 body 解析前 | ✅ |
| 2 | 2FA 设置端点缺少速率限制 | 🟡中 | `api/auth/2fa/setup` `disable` | 新增 `twoFactorSetupLimiter`（3 次/分/IP+用户） | ✅ |
| 3 | Admin 路由权限检查一致性 | — | `admin/server/require.ts` | `requireAdmin`/`requireRoot` 实时读 DB；高危操作 `requirePasswordConfirmation` | ✅ 良好 |
| 4 | 细粒度角色缺少模块级 enforce | 🟡中 | `auth/types` `admin/server/require` | `ROLE_MODULE_MAP` + `requireModuleAdmin(req, module)`；forum(11)/exam(7)/task(1) 共 19 路由迁移 | ✅ |

### A02: 加密失效

| # | 发现 | 等级 | 位置 | 修复 | 状态 |
|---|------|------|------|------|:---:|
| 5 | TOTP Secret 密钥派生不够健壮 | 🟡中 | `auth/server/totp.ts` | 生产强制 `TOTP_ENCRYPTION_KEY`（缺失 `[FATAL]`+退出）；HKDF-SHA256 派生 32 字节；开发用 globalThis 随机密钥 | ✅ |
| 6 | 密码哈希实现 | — | `auth/server/identity.ts` | `scryptSync` + 16 字节随机 salt；`timingSafeEqual`；不存在用户执行 dummy scrypt | ✅ 良好 |
| 7 | Session Token 存储 | — | `auth/server/identity.ts` | DB 存 HMAC-SHA256 签名值而非原始 token | ✅ 良好 |
| 8 | 生产 `AUTH_SESSION_SECRET` 缺失仅警告 | 🟠高 | `auth/server/identity.ts` | 生产缺失 `[FATAL]`+退出；开发回退 globalThis 随机密钥 | ✅ |

### A03: 注入

| # | 发现 | 等级 | 位置 | 修复 | 状态 |
|---|------|------|------|------|:---:|
| 9 | SQL 注入防护 | — | 全部 DB 查询 | 统一 `better-sqlite3` 参数化（`?` 占位符），无字符串拼接 | ✅ 良好 |

### A04: 不安全的设计

| # | 发现 | 等级 | 位置 | 修复 | 状态 |
|---|------|------|------|------|:---:|
| 10 | 速率限制为单进程内存实现 | 🟡中 | `shared/security/security.ts` | 架构文档标注单进程假设，多实例前须迁 Redis（见 Part 4 例外 1） | ✅ 已标注 |
| 11 | 输入校验 | — | `shared/security/security.ts` | 全入口 Zod `validateBody` + Content-Type 校验；密码上限 1024 字节防 scrypt DoS | ✅ 良好 |
| 12 | 速率限制覆盖 | — | `shared/security/security.ts` | 覆盖登录/注册/论坛/上传/考试等 18 场景，环境变量可调 | ✅ 良好 |

### A05: 安全配置错误

| # | 发现 | 等级 | 位置 | 修复 | 状态 |
|---|------|------|------|------|:---:|
| 13 | CSP 含 `unsafe-inline` | 🟢低 | `next.config.ts` `proxy.ts` | `buildCsp(nonce)` 按环境分流：生产 `script-src 'self' 'nonce-...'`（移除 unsafe-eval/inline） | ✅ |
| 14 | 安全头总体配置 | — | `next.config.ts` | HSTS(2年+preload)/X-Frame-Options DENY/nosniff/Permissions-Policy 合理 | ✅ 良好 |
| 15 | 错误响应泄露 | — | `shared/security/security.ts` | `errorResponse` 未知错误返回通用消息，不泄露堆栈 | ✅ 良好 |
| 16 | 生产 `ALLOWED_ORIGINS` 回退 localhost | 🟠高 | `shared/config/auth-constants.ts` | 生产未配置 `[FATAL]`+退出；开发回退 localhost+局域网 IP | ✅ |

### A06: 脆弱的组件

| # | 发现 | 等级 | 位置 | 修复 | 状态 |
|---|------|------|------|------|:---:|
| 17 | 缺少自动化漏洞扫描 | 🟡中 | `package.json` | 新增 `.github/workflows/audit.yml`：`pnpm audit --audit-level=high` 阻断构建 | ✅ |

### A07: 认证失效

| # | 发现 | 等级 | 位置 | 修复 | 状态 |
|---|------|------|------|------|:---:|
| 18 | 登录尝试限制 | — | `api/auth/login` | Origin→Content-Type→Zod→IP+邮箱限流(10/分)→时序均衡→2FA；不存在用户 dummy scrypt | ✅ 良好 |
| 19 | 2FA 登录模式重复传密码 | 🟠高 | `auth/server/identity.ts` | 登录成功启用 2FA 时发 5 分钟预认证 token（HMAC+jti 防重放），verify 仅需 token+TOTP 码 | ✅ |
| 20 | 2FA 验证码无速率限制 | 🟠高 | `api/auth/2fa/verify` | verify/disable/backup-codes 全部补齐 `twoFactorLimiter.check(ip:userId)` | ✅ |
| 21 | Cookie 缺 `__Host-` 前缀 | 🟢低 | `api/auth/login` `auth-constants.ts` | 生产 `__Host-auth_session`（Secure+Path=/+无 Domain）；开发保留 `auth_session` | ✅ |
| 22 | Session 管理 | — | `auth/server/identity.ts` | 7 天 TTL 自动删；禁用账号 session 立即失效；支持查看/远程注销其他 session + 登录历史 | ✅ 良好 |

### A08: 软件和数据完整性故障

| # | 发现 | 等级 | 位置 | 修复 | 状态 |
|---|------|------|------|------|:---:|
| 23 | 文件上传安全 | — | `community/server/forum/uploads.ts` | 大小(≤5MB)/MIME/扩展名/魔数校验 + 文件名随机化 + 路径遍历防护 | ✅ 良好 |
| 24 | 论坛图片读取无访问控制 | 🟡中 | `api/community/forum/images/[filename]` | 加 session 校验（未登录 401）；`Cache-Control` 改 `private` | ✅ |

### A09: 安全日志和监控故障

| # | 发现 | 等级 | 位置 | 修复 | 状态 |
|---|------|------|------|------|:---:|
| 25 | 审计日志设计 | — | `admin/server/audit.ts` | `logAdminAction` 记录操作者/action/目标/详情/IP/UA，支持查询删除，自我审计 | ✅ 良好 |
| 26 | 登录历史只记录成功 | 🟢低 | `auth/server/identity.ts` `api/auth/login` | 扩展 `recordLoginHistory`（success + attemptedEmail，userId 可空）；迁移 v6 重建 `login_history` 表 | ✅ |
| 27 | 错误日志仅 console.error | 🟢低 | `shared/logger.ts` | 集成 pino + pino-pretty；`createRequestLogger(req)` 绑定 `x-request-id`；33 模块替换 console.error | ✅ |

### A10: SSRF

| # | 发现 | 等级 | 位置 | 修复 | 状态 |
|---|------|------|------|------|:---:|
| 28 | 无明显 SSRF 风险 | — | — | 无服务端发起用户可控 URL 请求；单体应用无 webhook/反代 | ✅ 良好 |

### 附加检查

| 类别 | 发现 | 状态 |
|------|------|:---:|
| CSRF | 所有 POST 端点 Origin/Referer 白名单 + `SameSite=Lax` 双重防护；精确 `URL().origin` 比较防子域名绕过 | ✅ 良好 |
| XSS | `react-markdown` + `rehype-sanitize`（GitHub 默认白名单）+ `rehype-highlight` | ✅ 良好 |

## 加固清单（发现 → 行动索引）

| 优先级 | 发现 | 行动 | 状态 |
|:---:|------|------|:---:|
| 🔴 立即 | 1/2/20 | 2FA `assertAllowedOrigin` + `twoFactorLimiter` | ✅ ADR-015 |
| 🔴 立即 | 19 | 预认证 token 消除密码二次传输 + OAuth `__Host-oauth_2fa` cookie | ✅ ADR-015 |
| 🔴 立即 | 16 | 生产缺失 `ALLOWED_ORIGINS` 即退出 | ✅ |
| 🟠 尽快 | 5/8 | 2FA setup 限流 + HKDF 派生 + `AUTH_SESSION_SECRET` 缺失退出 | ✅ |
| 🟠 尽快 | 4 | `requireModuleAdmin` 落地 19 路由 | ✅ |
| 🟡 计划 | 17/24/10 | `pnpm audit` CI + 论坛图片 session 校验 + 单进程标注 | ✅ |
| 🟢 加固 | 13/21/26/27 | CSP nonce + `__Host-` 前缀 + 失败登录记录 + pino | ✅ |

---

# Part 2: 角色权限设计

> 描述 root / admin / 细粒度角色 / user 的权限划分、数据库约束、API 行为、审计日志与安全约束。状态：已实施。

## 1. 角色层级

| 角色 | DB 字段值 | 限制 | 创建方式 | 用途 |
|------|----------|------|----------|------|
| 超级管理员 | `root` | 唯一（≤1） | CLI `pnpm create-user --role root` | 系统级管控、审计、自定义重置密码 |
| 普通管理员 | `admin` | 任意 | CLI `pnpm create-user --role admin` | 用户管理、活动、通知群发、论坛管理 |
| 内容管理员 | `content_moderator` | 任意 | root 提权 | 论坛审核 |
| 考试管理员 | `exam_admin` | 任意 | root 提权 | 考试组卷/发布/排名 |
| 任务发布者 | `task_publisher` | 任意 | root 提权 | 任务发布/认领审核 |
| 普通用户 | `user` | 任意 | 注册 | 站点功能使用 |

优先级：`root > admin > 细粒度角色 > user`。细粒度角色仅拥有对应模块权限，无通用管理员权限；`admin`/`root` 自动拥有全部细粒度权限。

## 2. 数据库约束

- 复用 `users.role` 列（`TEXT NOT NULL DEFAULT 'user'`），取值 `{user, admin, root}`（细粒度角色另行存储）。
- root 唯一性：partial unique index `idx_users_root_unique ON users(id) WHERE role='root'`。
- 当前 root：`3yearszhuang@root.233`（仅 CLI 创建，不暴露 HTTP 接口）。

## 3. 权限矩阵

| 操作 | admin | root |
|------|:---:|:---:|
| 查看用户列表/详情 | ✅ | ✅ |
| 编辑/删除用户（硬删除） | ❌ | ✅ |
| 禁用/启用用户（仅普通用户） | ✅ | ✅ |
| 重置密码（默认/自定义） | ✅ / ❌ | ✅ / ✅ |
| 操作其他管理员（跨级保护） | ❌ | ✅ |
| 活动 / 通知 管理 | ✅ | ✅ |
| 论坛审核（隐藏/恢复/置顶/加精/删除） | ✅ | ✅ |
| 查看/删除审计日志 | ❌ | ✅ |
| 密码重置审批（不能审批自己） | ✅ | ✅ |

**细粒度角色**（`admin`/`root` 自动继承）：

| 模块 | content_moderator | exam_admin | task_publisher |
|------|:-:|:-:|:-:|
| 论坛：主题/回复审核、版块管理 | ✅ / ❌ | ❌ | ❌ |
| 考试：创建/发布/结束/题目/排名 | ❌ | ✅ | ❌ |
| 任务：创建发布关闭/认领审核 | ❌ | ❌ | ✅ |
| 博客 / 资源 | ✅(登录用户) / ❌ | — | — |

## 4. 安全约束（6 种保护机制）

| 保护 | 说明 |
|------|------|
| SELF_DEMOTE / SELF_DISABLE / SELF_DELETE | 管理员不能降级/禁用/删除自己 |
| SELF_APPROVE | 管理员不能批准自己的密码重置申请 |
| LAST_ADMIN | 禁止降级/禁用/删除最后一个活跃管理员 |
| ADMIN_CROSS_PROTECT | 管理员不能禁用/重置其他管理员的密码 |

root 额外保护：不可降级/禁用/删除、不可被任何角色重置密码、唯一且重复创建被拒。

## 5. 审计日志

所有管理员（含 root）写操作记录至 `admin_actions` 表。覆盖：用户管理（update/delete/disable/enable/reset）、群发通知、活动管理、密码重置审批、公告管理、论坛版块/主题/回复审核、入社申请审批、考试/题目管理、资源审核、任务管理/认领审核、活动签到核销、删除审计日志（自我审计）。

## 6. API 端点权限（节选高敏）

| 端点 | 鉴权 |
|------|------|
| `GET /api/admin/users` `GET /api/admin/users/[id]` | admin / root |
| `PUT /api/admin/users/[id]` `DELETE /api/admin/users/[id]` | root only |
| `POST /api/admin/users/[id]/disable` `enable` `reset-password-default` | admin / root |
| `POST /api/admin/users/[id]/reset-password` | root only |
| `GET/DELETE /api/admin/actions` `DELETE /api/admin/actions/[id]` | root only |

> 完整端点鉴权见 [Devdocs-Arch.md](Devdocs-Arch.md) Part B（管理后台 §7）。

## 7. 管理后台 Tab 结构

```
[ 01 ] Users         - 用户列表（按钮按角色显示）
[ 02 ] Activities     - 活动管理
[ 03 ] Notifications  - 通知管理
[ 04 ] Forum          - 论坛管理
[ 05 ] Logs           - 审计日志（仅 root 可见）
```

## 8. 迁移影响

现有 `role='admin'` 账号自动成为普通管理员（权限收敛）；旧审计日志记录保留兼容；仅新增 partial index，无破坏性变更，可安全回滚。

---

# Part 3: 事件驱动安全与运行时监测

> 承接 [Devdocs-evolution.md](Devdocs-evolution.md) ADR-013 / ADR-014 / R7 / R8。状态：已实施。

## 9. 事件总线安全

- **监听器显式初始化（ADR-013 ✅）**：`src/instrumentation.ts` 显式调用 `initNotificationEvents()`；函数幂等（`initialized` 标志）；删除 `notification/server/index.ts` 的副作用 `_initEvents()`。健康检查 `/api/health/events` 返回各事件监听器数量（规划中）。
- **事件载荷完整性**：仅含序列化安全类型；用户输入先经 Zod 校验；跨模块载荷定义 TS 接口于 `shared/events/event-types.ts`；监听器内 try-catch 不中断 emit 链。
- **异步化时机（ADR-014）**：活跃用户 ≤ 500 维持同步 emit；触发异步化条件为 > 500 或某监听器 P95 > 500ms；安全事件（如 `admin.action.logged`）维持同步确保审计不丢。

## 10. 2FA 流程加固（✅ 已实施，ADR-015）

- **缺陷回顾（全部已修复）**：verify 缺 Origin 校验(高)、无速率限制(高)、登录模式重复传密码(高)、setup/disable 缺限流(中)、backup-codes 缺限流+Origin(高)、GitHub OAuth 绕过 2FA(严重)。
- **预认证 Token（消除密码二次传输）**：登录成功启用 2FA 时发 5 分钟 HMAC 签名 token（含 userId + jti 防重放，consumed 后失效）；verify 仅需 token + TOTP 码。OAuth token 改用 `__Host-oauth_2fa` HttpOnly cookie，避免经 URL/Referer 泄漏。
- **速率限制加固**：

| 端点 | 限制 | 说明 |
|------|------|------|
| `POST /api/auth/2fa/verify` | 5 次/分/IP+userId | 暴力破解防护 |
| `POST /api/auth/2fa/setup` `disable` `backup-codes` | 3 次/分/userId | 防资源消耗 |

连续失败 3 次后递增延迟（1s→2s→4s…，上限 30s）。
- **Origin 校验全覆盖**：verify/setup/disable/backup-codes 处理前均调用 `assertAllowedOrigin(req)`。

## 11. 运行时安全监测

- **安全健康检查** `/api/health/security`（仅 root）：返回事件监听器计数、限流器活跃/拒绝数、session 总数、迁移状态。
- **失败登录记录（✅ 发现 26）**：`recordLoginHistory(userId|null, ip, ua, success, attemptedEmail?)`；迁移 v6 新增 `attempted_email` 列。用于检测暴力破解（同 IP 5 分钟 > 20 失败）、账户枚举、凭证填充。
- **结构化日志（✅ 发现 27）**：pino + pino-pretty；`createRequestLogger(req)` 绑定 `x-request-id`。字段：`level`/`time`/`msg`/`requestId`(必填)、`userId`/`ip`/`module`(视情况)。
- **依赖漏洞扫描（✅ 发现 17）**：`.github/workflows/audit.yml`，`pnpm audit --audit-level=high` 阻断构建；后续：Dependabot、SBOM。

## 12. 安全不变量（可测属性）

| ID | 不变属性 | 阈值 | 检查方式 |
|----|---------|------|---------|
| SI1 | 所有写端点有 Origin 校验 | 缺 `assertAllowedOrigin` 的 POST/PUT/DELETE 数 = 0 | 静态扫描 + E2E |
| SI2 | 2FA 端点有速率限制 | 缺 `*RateLimiter` 的 2FA 路由数 = 0 | 静态扫描 |
| SI3 | 密码不出现在 2FA 验证请求 | body 含 password 字段数 = 0 | E2E 断言 |
| SI4 | 事件监听器已注册 | 监听器数 < 1 的事件类型数 = 0 | 启动健康检查 |
| SI5 | 生产关键变量已配置 | `AUTH_SESSION_SECRET`/`ALLOWED_ORIGINS`/`TOTP_ENCRYPTION_KEY` 缺失 = 0 | 启动断言（前两者已实现退出；TOTP 待补） |
| SI6 | 审计日志覆盖所有管理员写操作 | 缺 `logAdminAction` 的端点数 = 0 | 静态扫描 |

---

# Part 4: 安全加固变更记录（Engineering Control Evidence）

> 范围：2026-07-31 两轮加固（4 高 + 7 中 + 5 低 = 16 项 + ADR-015 新增 4 项 = 20 项已落地）。状态：✅ 全部通过验证（tsc 0 errors / 441 tests passed）。关联：[Devdocs-Arch.md](Devdocs-Arch.md) 部署模型、[Devdocs-evolution.md](Devdocs-evolution.md) ADR-015 / R7 / R8。

## 4.1 变更记录包

**第一轮（ADR-015，2026-07-31）— 高危与 2FA 流程加固**

| # | 发现 | 变更内容 | 源工件 | 证据 |
|---|------|---------|--------|------|
| 1 | 1 🟠高 | 2FA 四路由补齐 `assertAllowedOrigin`（body 解析前） | `api/auth/2fa/*` | 静态扫描；441 tests |
| 2 | 2 🟡中 | `twoFactorSetupLimiter`（3/分/IP+userId） | `shared/security/security.ts` | 单测 |
| 3 | 8 🟠高 | 生产缺 `AUTH_SESSION_SECRET` 即 `[FATAL]`+退出 | `auth/server/identity.ts` | 启动断言单测 |
| 4 | 16 🟠高 | 生产缺 `ALLOWED_ORIGINS` 即退出 | `shared/config/auth-constants.ts` | 启动断言单测 |
| 5 | 19 🟠高 | 预认证 token（jti 防重放，HMAC）替代密码二次传输 | `auth/server/identity.ts` | totp.test 11 tests |
| 6 | 20 🟠高 | `twoFactorLimiter`（5/分/IP+userId）覆盖 verify | `api/auth/2fa/verify` | 单测 |
| 7 | ADR-015 🔴严重 | GitHub OAuth 强制 2FA，绕过即拒 | `api/auth/oauth/github/callback` | OAuth 集成测试 |
| 8 | ADR-015 🟠高 | 预认证 token 防重放（consumed jti + 5min 清理） | `auth/server/identity.ts` | replay 用例 |
| 9 | ADR-015 🟠高 | OAuth token 改 `__Host-oauth_2fa` HttpOnly cookie | `api/auth/oauth/*` `api/auth/2fa/verify` | 响应头快照 |
| 10 | ADR-015 🟠高 | backup-codes 补齐 `assertAllowedOrigin` + 限流 | `api/auth/2fa/backup-codes` | 单测 |

**第二轮（2026-07-31）— 中/低级加固**

| # | 发现 | 变更内容 | 源工件 | 证据 |
|---|------|---------|--------|------|
| 11 | 4 🟡中 | `ROLE_MODULE_MAP` + `requireModuleAdmin`；19 路由迁移 | `auth/types` `admin/server/require` `api/admin/*` | tsc 0 errors |
| 12 | 5 🟡中 | HKDF-SHA256 派生 TOTP 密钥；强制 `TOTP_ENCRYPTION_KEY` | `auth/server/totp.ts` | totp.test 11 tests |
| 13 | 10 🟡中 | 架构文档标注单进程假设与多实例迁移清单 | [Devdocs-Arch.md](Devdocs-Arch.md) §部署模型 | 文档评审 |
| 14 | 17 🟡中 | 新增 `audit.yml`（high+ 阻断） | `.github/workflows/audit.yml` | CI 检查 |
| 15 | 24 🟡中 | 论坛图片 API session 校验 + `private` 缓存 | `api/community/forum/images/[filename]` | 441 tests |
| 16 | 13 🟢低 | `buildCsp(nonce)` 生产移除 unsafe-eval/inline | `proxy.ts` `next.config.ts` | proxy-headers.test 13 tests |
| 17 | 21 🟢低 | `AUTH_COOKIE_NAME` 生产 `__Host-auth_session` | `shared/config/auth-constants.ts` | 启动日志 |
| 18 | 26 🟢低 | `recordLoginHistory` 扩展 + 迁移 v6 | `auth/server/identity.ts` `api/auth/login` `shared/db/migrations.ts` | 441 tests |
| 19 | 27 🟢低 | 集成 pino + `createRequestLogger`；33 模块替换 console.error | `shared/logger.ts` `package.json` | 代码扫描 |
| 20 | 30 🟢低 | rehype-sanitize 默认 GitHub 白名单审查（无需调整） | `package.json` | 文档审查 |

## 4.2 记分卡（Scorecard）

| 控制 | 状态 | 缺口 |
|------|:---:|------|
| 2FA 写端点 Origin 校验 | ✅ | 无 |
| 2FA 端点速率限制 | ✅ | 无 |
| 2FA 预认证 token 防重放 | ✅ | 单进程内存实现 |
| 生产关键变量强制配置 | ✅ | 无 |
| TOTP 密钥派生 | ✅ | 无 |
| 细粒度角色模块级 enforce | ✅ | event/blog/resource/notification/join 仅 admin/root（设计如此） |
| 生产 CSP 严格度 | ✅ | style-src 保留 unsafe-inline |
| Cookie `__Host-` 前缀 | ✅ | 无 |
| 失败登录记录 | ✅ | 无 |
| 论坛图片访问控制 | ✅ | 无 |
| 依赖漏洞 CI 阻断 | ✅ | Dependabot/Snyk 未启用 |
| 结构化日志 | ✅ | 历史 console.error 持续清理 |
| 多实例速率限制迁移 | ⚠️ 例外 | 多实例前须迁 Redis |

## 4.3 例外登记（Exception Register）

| 例外 | 残余风险 | 补偿控制 | 到期 |
|------|---------|---------|------|
| 1. 限流 / jti 防重放为单进程内存 | 多实例时限流与防重放失效 | 架构禁止多实例；迁移清单已写入；Session 用 SQLite 共享 | 多实例启动前 |
| 2. CSP `style-src` 保留 `unsafe-inline` | 内联样式注入理论上可行 | script-src 已封堵主路径；Next.js/Tailwind 依赖 | Next.js 支持非 inline 后 |
| 3. rehype-sanitize 默认白名单 | 允许 className 等属性 | 社区广泛验证；生产无事故 | 发现新 CVE 时 |

## 4.4 标准更新积压（Backlog）

| 缺口 | 修复路径 | 目标 |
|------|---------|------|
| 依赖漏洞扫描 | 启用 Dependabot 自动提 PR | M8 |
| 结构化日志 | 清理剩余 console.error | M8 持续 |
| 静态扫描自动化 | CI 中 2FA Origin/守卫扫描脚本化 | M9 |
| 多实例速率限制 | Redis 替换内存 Map + jti SET | M9 / 多实例前 |
| 事件总线异步化 | setImmediate 队列或 BullMQ | M9 |

## 4.5 验证收据

| 验证项 | 命令 | 结果 |
|--------|------|------|
| TypeScript 检查 | `pnpm exec tsc --noEmit` | 0 errors |
| ESLint（改动文件） | `pnpm exec eslint <admin/forum/exam/task/auth 相关>` | 0 warnings / 0 errors |
| 单元测试 | `pnpm test` | 441/441 passed（13 files，2.72s） |

---

*本文档 Part 4 由 2026-07-31 安全加固第二轮收尾生成，遵循 engineering-control-evidence 输出契约。*
