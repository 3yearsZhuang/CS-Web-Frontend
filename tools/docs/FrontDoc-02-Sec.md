# FZTBUCS-Sec-安全与权限设计文档

> 文档定位：**前端 BFF 层**的安全与权限设计权威文档（reference）
> 受众：安全审计人员 / 开发工程师 / 运维 / 权限设计者
> Source of truth：**BFF 层**的安全审计发现、UI 层角色与权限矩阵、安全不变量、加固变更记录
> 关联：**后端鉴权/RBAC/密码/2FA/限流/审计日志权威见 [CS-Web-Backend/tools/docs/BackDoc-02-Sec.md](../../CS-Web-Backend/tools/docs/BackDoc-02-Sec.md)**；权限矩阵与部署模型见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md)；运维见 [FrontDoc-Ops.md](FrontDoc-Ops.md)；演进路线 ADR 见 [FrontDoc-Evo.md](../../../docs/项目演变历史-0.9.1.md#附录前端演进路线图与迁移文档原-frontdocevomd)
> 最后更新：2026-08-05（BFF 视角重写，区分 BFF/后端/遗留三层责任）
> 更新人：3yearsZ
> 变更触发：BFF 安全发现 / UI 层角色变更 / 后端鉴权契约变更 / 新漏洞类
> Stale 信号：发现项状态与代码现状不一致 / 权限矩阵与实际 handler 不符 / 仍把后端职责（JWT 签发/密码哈希/TOTP/RBAC enforce/审计日志）写成前端职责

> **范围声明（BFF 视角）**：前端为 BFF 薄转发层。安全责任划分如下：
> - **BFF 层（本文档覆盖）**：Origin/Referer 白名单（防 Login CSRF）、Content-Type 与 Zod body 校验、JWT HttpOnly Cookie 托管（`__Host-` 前缀、Secure、SameSite=Lax）、401 静默刷新轮换、UI 层角色路由保护与按钮显隐
> - **后端层（见后端 `CS-Web-Backend/tools/docs/BackDoc-02-Sec.md`）**：JWT 签发与校验、密码哈希（bcrypt）、TOTP/2FA 加密与验证、RBAC `require_permission(resource, action)` 强制、速率限制、审计日志写入、session/refresh_token 表
> - **遗留代码层（迁移前单体，运行时不被任何 API 路由引用）**：`src/modules/auth/server/identity.ts`（scrypt 密码哈希）、`src/modules/auth/server/totp.ts`（前端 TOTP）、`src/modules/auth/server/session.ts`（HMAC session）、`src/modules/auth/server/verification-code.ts`（验证码 HMAC）。这些文件仍存在但运行时不被引用，待清理；其历史安全发现保留在 Part A 作为审计证据。

## 文档结构

- **Part A: 安全审计** - 对照 OWASP Top 10 (2021) 的历史发现与修复状态（28 项，全部已修复），每项标注当前责任层
- **Part B: 角色与权限设计（BFF 视角）** - BFF UI 层角色展示与路由保护、权限矩阵（真实 RBAC enforce 在后端）
- **Part C: 事件驱动安全与运行时监测** - 前端事件总线、BFF 转发链路监测、后端 2FA/限流/审计的边界
- **Part D: 安全加固变更记录** - 可审计证据包（原 Devdocs-security-hardening-record.md）

---

# Part A: 安全审计

> 项目：fztbucs-projects | 审计日期：2026-07-27 | 范围：全量代码审查，对照 OWASP Top 10 (2021)
> 方法：静态代码分析 + 架构审查 | 状态：所有发现已于 2026-07-31 修复（ADR-015 及第二轮加固）
> **责任层标注（2026-08-05 追加）**：审计于单体时代完成，发现项涉及的前端代码多为**遗留代码层**（运行时不被 API 路由引用）。迁移到 BFF 后，对应安全控制的真实运行时位置已迁至后端。下表"责任层"列说明每项发现的当前归属。

## 风险总览

| 风险等级 | 数量 | 状态 |
|---------|------|------|
| 🔴 严重  | 0    | 无已知严重漏洞 |
| 🟠 高    | 4    | ✅ 已全部修复（2026-07-31，ADR-015） |
| 🟡 中    | 7    | ✅ 已全部修复（2026-07-31，第二轮）|
| 🟢 低    | 5    | ✅ 已全部修复（2026-07-31，第二轮）|

## OWASP Top 10 逐项检查

> 责任层图例：**[BFF]** = BFF 运行时仍执行 · **[后端]** = 已迁移至后端 FastAPI · **[遗留]** = 前端单体时代代码，运行时不被引用，待清理

### A01: 访问控制失效

| # | 发现 | 等级 | 位置（审计时） | 当前责任层 | 修复 | 状态 |
|---|------|------|------|:---:|------|:---:|
| 1 | 2FA 端点缺少 `assertAllowedOrigin` | 🟠高 | `api/auth/2fa/verify` | **[BFF]** | verify/setup/disable/backup-codes 全部补齐，移至 body 解析前；BFF 路由仍执行 Origin 校验 | ✅ |
| 2 | 2FA 设置端点缺少速率限制 | 🟡中 | `api/auth/2fa/setup` `disable` | **[后端]** | 原 `twoFactorSetupLimiter`（3 次/分/IP+用户）为前端内存限流；迁移后由后端限流（见后端 `CS-Web-Backend/tools/docs/BackDoc-02-Sec.md` §3） | ✅ |
| 3 | Admin 路由权限检查一致性 | - | `admin/server/require.ts` | **[BFF]+[后端]** | BFF `requireAdmin`/`requireRoot` 做 UI 层兜底；真实 RBAC enforce 由后端 `require_permission` | ✅ 良好 |
| 4 | 细粒度角色缺少模块级 enforce | 🟡中 | `auth/types` `admin/server/require` | **[后端]** | 原 `ROLE_MODULE_MAP` + `requireModuleAdmin` 为前端实现；迁移后由后端 `require_permission(resource, action)` 统一 enforce | ✅ |

### A02: 加密失效

| # | 发现 | 等级 | 位置（审计时） | 当前责任层 | 修复 | 状态 |
|---|------|------|------|:---:|------|:---:|
| 5 | TOTP Secret 密钥派生不够健壮 | 🟡中 | `auth/server/totp.ts` | **[遗留]**→**[后端]** | 前端 `totp.ts` 为遗留代码（运行时不引用）；TOTP 加密/派生由后端处理（`TOTP_ENCRYPTION_KEY`） | ✅ |
| 6 | 密码哈希实现 | - | `auth/server/identity.ts` | **[遗留]**→**[后端]** | 前端 `scryptSync` 为遗留代码；运行时密码哈希由后端 bcrypt（见后端 `CS-Web-Backend/tools/docs/BackDoc-02-Sec.md` §1） | ✅ 良好 |
| 7 | Session Token 存储 | - | `auth/server/identity.ts` | **[遗留]**→**[后端]** | 前端 HMAC session 为遗留代码；运行时 JWT 对（access/refresh）由后端签发，BFF 以 HttpOnly Cookie 托管 | ✅ 良好 |
| 8 | 生产 `AUTH_SESSION_SECRET` 缺失仅警告 | 🟠高 | `auth/server/identity.ts` | **[遗留]** | 前端 `session.ts` 仍保留生产 `[FATAL]`+退出逻辑（遗留代码自保护）；运行时 JWT 签名密钥为后端 `SECRET_KEY` | ✅ |

### A03: 注入

| # | 发现 | 等级 | 位置（审计时） | 当前责任层 | 修复 | 状态 |
|---|------|------|------|:---:|------|:---:|
| 9 | SQL 注入防护 | - | 全部 DB 查询 | **[后端]** | 运行时 SQL 由后端 SQLAlchemy ORM 参数化（原 `better-sqlite3` 遗留代码已删除） | ✅ 良好 |

### A04: 不安全的设计

| # | 发现 | 等级 | 位置（审计时） | 当前责任层 | 修复 | 状态 |
|---|------|------|------|:---:|------|:---:|
| 10 | 速率限制为单进程内存实现 | 🟡中 | `shared/security/security.ts` | **[BFF]+[后端]** | BFF 仍为单进程内存限流（仅 Origin 校验等 BFF 自身用）；业务限流已由后端 Redis 实现 | ✅ 已标注 |
| 11 | 输入校验 | - | `shared/security/security.ts` | **[BFF]** | BFF 全入口 Zod `validateBody` + Content-Type 校验；密码上限 1024 字节防 scrypt DoS（遗留，后端 bcrypt 也有 72 字节限制） | ✅ 良好 |
| 12 | 速率限制覆盖 | - | `shared/security/security.ts` | **[后端]** | 前端 18 场景限流器多为遗留；业务限流覆盖由后端统一 | ✅ 良好 |

### A05: 安全配置错误

| # | 发现 | 等级 | 位置（审计时） | 当前责任层 | 修复 | 状态 |
|---|------|------|------|:---:|------|:---:|
| 13 | CSP 含 `unsafe-inline` | 🟢低 | `next.config.ts` `proxy.ts` | **[BFF]** | `buildCsp(nonce)` 按环境分流：生产 `script-src 'self' 'nonce-...'`（移除 unsafe-eval/inline） | ✅ |
| 14 | 安全头总体配置 | - | `next.config.ts` | **[BFF]** | HSTS(2年+preload)/X-Frame-Options DENY/nosniff/Permissions-Policy 合理 | ✅ 良好 |
| 15 | 错误响应泄露 | - | `shared/security/security.ts` | **[BFF]** | `errorResponse` 未知错误返回通用消息，不泄露堆栈 | ✅ 良好 |
| 16 | 生产 `ALLOWED_ORIGINS` 回退 localhost | 🟠高 | `shared/config/auth-constants.ts` | **[BFF]** | 生产未配置 `[FATAL]`+退出；开发回退 localhost+局域网 IP | ✅ |

### A06: 脆弱的组件

| # | 发现 | 等级 | 位置（审计时） | 当前责任层 | 修复 | 状态 |
|---|------|------|------|:---:|------|:---:|
| 17 | 缺少自动化漏洞扫描 | 🟡中 | `package.json` | **[BFF]** | 新增 `.github/workflows/audit.yml`：`pnpm audit --audit-level=high` 阻断构建 | ✅ |

### A07: 认证失效

| # | 发现 | 等级 | 位置（审计时） | 当前责任层 | 修复 | 状态 |
|---|------|------|------|:---:|------|:---:|
| 18 | 登录尝试限制 | - | `api/auth/login` | **[BFF]+[后端]** | BFF 路由仍做 Origin->Content-Type->Zod 链路；登录限流由后端统一 | ✅ 良好 |
| 19 | 2FA 登录模式重复传密码 | 🟠高 | `auth/server/identity.ts` | **[遗留]**→**[后端]** | 前端预认证 token 为遗留；后端 2FA 流程由后端实现（`/auth/2fa/verify`） | ✅ |
| 20 | 2FA 验证码无速率限制 | 🟠高 | `api/auth/2fa/verify` | **[后端]** | verify/disable/backup-codes 限流由后端统一执行 | ✅ |
| 21 | Cookie 缺 `__Host-` 前缀 | 🟢低 | `api/auth/login` `auth-constants.ts` | **[BFF]** | 生产 JWT Cookie 用 `__Host-fztbu_access` / `__Host-fztbu_refresh`（Secure+Path=/+无 Domain）；开发无前缀 | ✅ |
| 22 | Session 管理 | - | `auth/server/identity.ts` | **[遗留]**→**[后端]** | 前端 7 天 TTL session 为遗留；运行时 JWT access 15min / refresh 7day，BFF 401 静默刷新，refresh token 轮换由后端 | ✅ 良好 |

### A08: 软件和数据完整性故障

| # | 发现 | 等级 | 位置（审计时） | 当前责任层 | 修复 | 状态 |
|---|------|------|------|:---:|------|:---:|
| 23 | 文件上传安全 | - | `community/server/community/uploads.ts` | **[后端]** | 上传校验（大小/MIME/扩展名/魔数/文件名随机化/路径遍历防护）由后端执行；BFF 薄转发 FormData | ✅ 良好 |
| 24 | 社区图片读取无访问控制 | 🟡中 | `api/community/community/images/[filename]` | **[后端]** | 图片访问鉴权由后端执行；BFF 转发时注入 JWT | ✅ |

### A09: 安全日志和监控故障

| # | 发现 | 等级 | 位置（审计时） | 当前责任层 | 修复 | 状态 |
|---|------|------|------|:---:|------|:---:|
| 25 | 审计日志设计 | - | `admin/server/audit.ts` | **[后端]** | `admin_actions` 表由后端写入；BFF 仅薄转发，不直接写审计日志 | ✅ 良好 |
| 26 | 登录历史只记录成功 | 🟢低 | `auth/server/identity.ts` `api/auth/login` | **[后端]** | `login_history` / `attempted_email` 由后端记录 | ✅ |
| 27 | 错误日志仅 console.error | 🟢低 | `shared/logger.ts` | **[BFF]** | BFF 集成 pino + pino-pretty；`createRequestLogger(req)` 绑定 `x-request-id`；33 模块替换 console.error | ✅ |

### A10: SSRF

| # | 发现 | 等级 | 位置（审计时） | 当前责任层 | 修复 | 状态 |
|---|------|------|------|:---:|------|:---:|
| 28 | 无明显 SSRF 风险 | - | - | **[BFF]** | BFF 仅向固定 `BACKEND_URL` 转发，无用户可控 URL 请求；无 webhook/反代 | ✅ 良好 |

### 附加检查

| 类别 | 发现 | 责任层 | 状态 |
|------|------|:---:|:---:|
| CSRF | 所有 POST 端点 Origin/Referer 白名单 + `SameSite=Lax` 双重防护；精确 `URL().origin` 比较防子域名绕过 | **[BFF]** | ✅ 良好 |
| XSS | `react-markdown` + `rehype-sanitize`（GitHub 默认白名单）+ `rehype-highlight` | **[BFF]** | ✅ 良好 |

## 加固清单（发现 -> 行动索引）

| 优先级 | 发现 | 行动 | 状态 |
|:---:|------|------|:---:|
| 🔴 立即 | 1/2/20 | 2FA `assertAllowedOrigin` + `twoFactorLimiter` | ✅ ADR-015 |
| 🔴 立即 | 19 | 预认证 token 消除密码二次传输 + OAuth `__Host-oauth_2fa` cookie | ✅ ADR-015 |
| 🔴 立即 | 16 | 生产缺失 `ALLOWED_ORIGINS` 即退出 | ✅ |
| 🟠 尽快 | 5/8 | 2FA setup 限流 + HKDF 派生 + `AUTH_SESSION_SECRET` 缺失退出 | ✅ |
| 🟠 尽快 | 4 | `requireModuleAdmin` 落地 19 路由 | ✅ |
| 🟡 计划 | 17/24/10 | `pnpm audit` CI + 社区图片 session 校验 + 单进程标注 | ✅ |
| 🟢 加固 | 13/21/26/27 | CSP nonce + `__Host-` 前缀 + 失败登录记录 + pino | ✅ |

> ⚠️ **迁移后注意**：上表"行动"列描述的是单体时代的修复动作。迁移到 BFF 后，涉及 [后端] 责任层的控制（2FA 限流、HKDF、`requireModuleAdmin`、社区图片鉴权、失败登录记录等）真实运行时位置在后端，前端代码为遗留。后续清理遗留代码时，对应"行动"描述需同步更新为后端实现引用。

---

# Part B: 角色与权限设计（BFF 视角）

> 描述 BFF UI 层的角色展示与路由保护逻辑。**真实 RBAC enforce（`require_permission(resource, action)`）在后端**，BFF 仅做 UI 层兜底与按钮显隐，任何 BFF 层鉴权都不能替代后端鉴权。

## 1. 角色层级

| 角色 | 后端存储 | BFF 解析来源 | 用途 |
|------|----------|------|------|
| 超级管理员 | `is_superuser=true`（PG） | JWT `/auth/me` 返回 `isSuperuser` → BFF 解析为 `root` | 系统级管控、审计、自定义重置密码 |
| 普通管理员 | `admin` 角色（后端 RBAC 表） | `/auth/me` `roles` 数组含 `admin` | 用户管理、活动、通知群发、社区管理 |
| 内容管理员 | `content_moderator` | `roles` 数组含 `content_moderator` | 社区审核 |
| 考试管理员 | `exam_admin` | `roles` 数组含 `exam_admin` | 考试组卷/发布/排名 |
| 任务发布者 | `task_publisher` | `roles` 数组含 `task_publisher` | 任务发布/认领审核 |
| 普通用户 | `user`（默认） | `roles` 为空或含 `user` | 站点功能使用 |

优先级：`root > admin > 细粒度角色 > user`。BFF `resolvePrimaryRole()` 按此优先级从后端 `roles` 数组解析主角色；`is_superuser` 优先于显式角色列表解析为 `root`（保证 root 专属 UI/端点对超级用户可见）。

> 角色数据真实存储与权限分配见后端 `CS-Web-Backend/tools/docs/BackDoc-02-Sec.md` §1 与 `CS-Web-Backend/tools/docs/BackDoc-01-Arch.md` RBAC 章节。

## 2. BFF 层权限保护（UI 兜底）

BFF 在 API 路由层提供轻量角色兜底，**真实权限判定在后端**：

| BFF 保护 | 位置 | 说明 |
|---------|------|------|
| `requireAdmin()` | `admin/server/require.ts` | 读 `/auth/me` roles，非 admin/root 返回 403；后端仍会二次 enforce |
| `requireRoot()` | `admin/server/require.ts` | 读 `/auth/me` roles，非 root 返回 403；后端仍会二次 enforce |
| `requireModuleAdmin(req, module)` | `admin/server/require.ts` | 细粒度角色模块级兜底（遗留实现，运行时后端 `require_permission` 为权威） |
| `requirePasswordConfirmation()` | `admin/server/require.ts` | 高危操作要求密码确认（转发后端校验） |
| UI 按钮显隐 | 各模块 UI | 根据 `SafeUser.role` 条件渲染管理入口 |

> ⚠️ **不变量**：BFF 鉴权失败必返回 403/401，但 BFF 鉴权通过**不等于**授权成立。后端 `require_permission` 是最终权威。任何绕过后端直连 DB 的遗留代码路径（已全部不再被 API 路由引用）都违反此不变量。

## 3. 权限矩阵（用户视角）

> 以下矩阵描述**用户可见的操作权限**（BFF UI 显隐 + 后端 enforce 的综合效果）。真实 RBAC 权限点定义在后端 `rbac.py` 与 seed 数据。

| 操作 | admin | root |
|------|:---:|:---:|
| 查看用户列表/详情 | ✅ | ✅ |
| 编辑/删除用户（硬删除） | ❌ | ✅ |
| 禁用/启用用户（仅普通用户） | ✅ | ✅ |
| 重置密码（默认/自定义） | ✅ / ❌ | ✅ / ✅ |
| 操作其他管理员（跨级保护） | ❌ | ✅ |
| 活动 / 通知 管理 | ✅ | ✅ |
| 社区审核（隐藏/恢复/置顶/加精/删除） | ✅ | ✅ |
| 查看/删除审计日志 | ❌ | ✅ |
| 密码重置审批（不能审批自己） | ✅ | ✅ |

**细粒度角色**（`admin`/`root` 自动继承）：

| 模块 | content_moderator | exam_admin | task_publisher |
|------|:-:|:-:|:-:|
| 社区：主题/回复审核、版块管理 | ✅ / ❌ | ❌ | ❌ |
| 考试：创建/发布/结束/题目/排名 | ❌ | ✅ | ❌ |
| 任务：创建发布关闭/认领审核 | ❌ | ❌ | ✅ |
| 社区 / 资源 | ✅(登录用户) / ❌ | - | - |

## 4. 安全约束（6 种保护机制）

> 以下保护由**后端**在 service 层强制；BFF 不实现这些约束，仅转发请求。

| 保护 | 说明 | enforce 位置 |
|------|------|------|
| SELF_DEMOTE / SELF_DISABLE / SELF_DELETE | 管理员不能降级/禁用/删除自己 | 后端 service |
| SELF_APPROVE | 管理员不能批准自己的密码重置申请 | 后端 service |
| LAST_ADMIN | 禁止降级/禁用/删除最后一个活跃管理员 | 后端 service |
| ADMIN_CROSS_PROTECT | 管理员不能禁用/重置其他管理员的密码 | 后端 service |

root 额外保护：不可降级/禁用/删除、不可被任何角色重置密码、唯一且重复创建被拒（后端 enforce）。

## 5. 审计日志

> 审计日志由**后端**写入 `admin_actions` 表。BFF 仅薄转发管理员写请求，不直接写审计日志。

后端 `logAdminAction` 覆盖：用户管理（update/delete/disable/enable/reset）、群发通知、活动管理、密码重置审批、公告管理、社区版块/主题/回复审核、入社申请审批、考试/题目管理、资源审核、任务管理/认领审核、活动签到核销、删除审计日志（自我审计）。

BFF 通过 `toAdminAction()`（[backend-client.ts](../../src/shared/backend-client.ts)）把后端 `AuditLogItem` 翻译为前端 `AdminAction` 形状供 UI 展示。

## 6. API 端点权限（节选高敏）

> 以下为 BFF 路由层的 UI 兜底鉴权。**后端对同一资源有独立的 `require_permission` enforce**，即使 BFF 被绕过，后端仍会拒绝越权请求。

| 端点（BFF） | BFF 鉴权 | 后端鉴权 |
|------|------|------|
| `GET /api/admin/users` `GET /api/admin/users/[id]` | admin / root | `require_permission` |
| `PUT /api/admin/users/[id]` `DELETE /api/admin/users/[id]` | root only | `require_permission` |
| `POST /api/admin/users/[id]/disable` `enable` `reset-password-default` | admin / root | `require_permission` |
| `POST /api/admin/users/[id]/reset-password` | root only | `require_permission` |
| `GET/DELETE /api/admin/actions` `DELETE /api/admin/actions/[id]` | root only | `require_permission` |

> 完整端点鉴权见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md) Part B（管理后台 §7）；后端权限点定义见后端 `CS-Web-Backend/tools/docs/BackDoc-02-Sec.md` §1。

## 7. 管理后台 Tab 结构

```
[ 01 ] Users         - 用户列表（按钮按角色显示）
[ 02 ] Activities     - 活动管理
[ 03 ] Notifications  - 通知管理
[ 04 ] Community          - 社区管理
[ 05 ] Logs           - 审计日志（仅 root 可见）
```

## 8. 迁移影响

- 角色 RBAC 由后端 `rbac.py` + seed 数据承载（旧前端 SQLite `users.role` 单列已随迁移与清理移除）
- 旧 `role='admin'` 账号在迁移时映射为后端 `admin` 角色 + 必要权限
- 仅新增后端 partial index / RBAC seed，无破坏性变更，可安全回滚（后端 Alembic 管理）

---

# Part C: 事件驱动安全与运行时监测

> 承接 [FrontDoc-Evo.md](../../../docs/项目演变历史-0.9.1.md#附录前端演进路线图与迁移文档原-frontdocevomd) ADR-013 / ADR-014 / R7 / R8。
> **责任划分**：事件总线为 BFF 前端实现；2FA/限流/审计日志/失败登录记录为后端实现；BFF 仅做转发与 UI 监测。

## 9. 事件总线安全（BFF 前端实现）

- **监听器显式初始化（ADR-013 ✅）**：`src/instrumentation.ts` 显式调用 `initNotificationEvents()`；函数幂等（`initialized` 标志）；删除 `notification/server/index.ts` 的副作用 `_initEvents()`。
- **事件载荷完整性**：仅含序列化安全类型；用户输入先经 Zod 校验；跨模块载荷定义 TS 接口于 `shared/events/event-types.ts`；监听器内 try-catch 不中断 emit 链。
- **异步化时机（ADR-014）**：活跃用户 ≤ 500 维持同步 emit；触发异步化条件为 > 500 或某监听器 P95 > 500ms。

> ⚠️ 迁移后：事件总线的业务效果（如通知写入）实际由后端承载，前端事件总线为遗留机制。新增通知场景应直接走 BFF→后端转发，不再新增前端事件监听器。

## 10. 2FA 流程加固（责任层：后端）

> 2FA 的加密、验证、限流、token 签发均由**后端**实现。BFF 仅薄转发 `/api/auth/2fa/*` 请求并管理 Cookie。

- **后端 2FA 端点**：`/auth/2fa/verify` `/auth/2fa/setup` `/auth/2fa/disable` `/auth/2fa/backup-codes`，详见后端 `CS-Web-Backend/tools/docs/BackDoc-02-Sec.md`
- **BFF 转发行为**：
  - 所有 2FA POST 路由先 `assertAllowedOrigin(req)`（BFF 层 CSRF 防护）
  - login 模式：`twoFactorToken` 来自请求体或 `__Host-oauth_2fa` HttpOnly cookie，BFF 转发至后端 `skipAuth: true`
  - 成功后 BFF 用后端返回的 `accessToken/refreshToken` 写入 `__Host-fztbu_access/refresh` Cookie
- **历史缺陷回顾（已修复，ADR-015）**：verify 缺 Origin 校验(高)、无速率限制(高)、登录模式重复传密码(高)、setup/disable 缺限流(中)、backup-codes 缺限流+Origin(高)、GitHub OAuth 绕过 2FA(严重)。修复动作在单体时代完成，迁移后真实 enforce 位置在后端。

## 11. 运行时安全监测

- **BFF 健康检查** `/api/health`（公开）：转发后端 `/health`，仅返回 `{"ok": true/false}`，不泄露细节
- **后端运维端点**（不在 BFF 暴露）：`/readyz` `/metrics/json` `/status` 需超级用户，见后端 `CS-Web-Backend/tools/docs/BackDoc-Infra.md` §1.2
- **失败登录记录**：由后端写入 `login_history`（含 `attempted_email`），用于检测暴力破解、账户枚举、凭证填充
- **结构化日志（✅ 发现 27）**：BFF pino + pino-pretty；`createRequestLogger(req)` 绑定 `x-request-id`。字段：`level`/`time`/`msg`/`requestId`(必填)、`userId`/`ip`/`module`(视情况)
- **依赖漏洞扫描（✅ 发现 17）**：`.github/workflows/audit.yml`，`pnpm audit --audit-level=high` 阻断构建；后续：Dependabot、SBOM

## 12. 安全不变量（可测属性）

| ID | 不变属性 | 阈值 | 责任层 | 检查方式 |
|----|---------|------|:---:|---------|
| SI1 | 所有 BFF 写端点有 Origin 校验 | 缺 `assertAllowedOrigin` 的 POST/PUT/DELETE 数 = 0 | **[BFF]** | 静态扫描 + E2E |
| SI2 | 2FA 端点有速率限制 | 缺限流的 2FA 路由数 = 0 | **[后端]** | 后端测试 |
| SI3 | 密码不出现在 2FA 验证请求 | body 含 password 字段数 = 0 | **[BFF]** | E2E 断言 |
| SI4 | 事件监听器已注册 | 监听器数 < 1 的事件类型数 = 0 | **[BFF]** | 启动健康检查 |
| SI5 | 生产关键变量已配置 | `ALLOWED_ORIGINS`（BFF）/ `SECRET_KEY` `TOTP_ENCRYPTION_KEY`（后端）缺失 = 0 | **[BFF]+[后端]** | 启动断言 |
| SI6 | 审计日志覆盖所有管理员写操作 | 缺 `logAdminAction` 的后端端点数 = 0 | **[后端]** | 后端静态扫描 |
| SI7 | BFF 不直连业务数据库 | BFF 代码中 `better-sqlite3` 依赖引用 = 0（依赖已整体移除） | **[BFF]** | 静态扫描（迁移后新增） |

> SI5 调整说明：单体时代 `AUTH_SESSION_SECRET` 为前端 session 签名密钥；迁移后运行时 JWT 签名密钥为后端 `SECRET_KEY`，`AUTH_SESSION_SECRET` 仅遗留代码自保护使用。生产关键变量拆分为 BFF 侧（`ALLOWED_ORIGINS`）与后端侧（`SECRET_KEY`/`TOTP_ENCRYPTION_KEY`/`DATABASE_PASSWORD`）。

---

# Part D: 安全加固变更记录（Engineering Control Evidence）

> 范围：2026-07-31 两轮加固（4 高 + 7 中 + 5 低 = 16 项 + ADR-015 新增 4 项 = 20 项已落地）。状态：✅ 全部通过验证（tsc 0 errors / 441 tests passed）。
> 关联：[FrontDoc-01-Arch.md](FrontDoc-01-Arch.md) 部署模型、[FrontDoc-Evo.md](../../../docs/项目演变历史-0.9.1.md#附录前端演进路线图与迁移文档原-frontdocevomd) ADR-015 / R7 / R8。
> **责任层说明**：本记录于单体时代生成，描述的修复动作多涉及前端遗留代码。迁移后对应控制的真实运行时位置见 Part A"责任层"列。

## 4.1 变更记录包

> ℹ️ 安全加固变更记录（第一轮/第二轮共 20 项）已迁移至 `docs/项目演变历史.md`。

## 4.2 记分卡（Scorecard）

| 控制 | 状态 | 缺口 | 当前责任层 |
|------|:---:|------|:---:|
| 2FA 写端点 Origin 校验 | ✅ | 无 | **[BFF]** |
| 2FA 端点速率限制 | ✅ | 无 | **[后端]** |
| 2FA 预认证 token 防重放 | ✅ | 单进程内存实现（遗留） | **[后端]** |
| 生产关键变量强制配置 | ✅ | 无 | **[BFF]+[后端]** |
| TOTP 密钥派生 | ✅ | 无 | **[后端]** |
| 细粒度角色模块级 enforce | ✅ | event/community/resource/notification/join 仅 admin/root（设计如此） | **[后端]** |
| 生产 CSP 严格度 | ✅ | style-src 保留 unsafe-inline | **[BFF]** |
| Cookie `__Host-` 前缀 | ✅ | 无 | **[BFF]** |
| 失败登录记录 | ✅ | 无 | **[后端]** |
| 社区图片访问控制 | ✅ | 无 | **[后端]** |
| 依赖漏洞 CI 阻断 | ✅ | Dependabot/Snyk 未启用 | **[BFF]** |
| 结构化日志 | ✅ | 历史 console.error 持续清理 | **[BFF]** |
| 多实例速率限制迁移 | ⚠️ 例外 | 多实例前须迁 Redis | **[后端]** |
| BFF 不直连业务数据库 | ✅ | 遗留代码待清理 | **[BFF]** |

## 4.3 例外登记（Exception Register）

> ℹ️ 例外登记条目已迁移至 `docs/项目待办事项.md`。

## 4.4 标准更新积压（Backlog）

> ℹ️ 标准更新积压（Backlog）条目已迁移至 `docs/项目待办事项.md`。

## 4.5 验证收据

| 验证项 | 命令 | 结果 |
|--------|------|------|
| TypeScript 检查 | `pnpm exec tsc --noEmit` | 0 errors |
| ESLint（改动文件） | `pnpm exec eslint <admin/community/exam/task/auth 相关>` | 0 warnings / 0 errors |
| 单元测试 | `pnpm test` | 441/441 passed（13 files，2.72s） |

---

*本文档 Part D 由 2026-07-31 安全加固第二轮收尾生成，遵循 engineering-control-evidence 输出契约；2026-08-05 追加 BFF 视角责任层标注。*
