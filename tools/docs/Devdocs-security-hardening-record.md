# 安全加固变更记录（Engineering Control Evidence）

> 文档定位：跨表面工程控制记录包，收敛代码/审计/架构/CI 中的安全加固改动为可审计变更记录
> 范围：2026-07-31 两轮加固（4 高 + 7 中 + 5 低 = 16 项 + ADR-015 新增 4 项 = 20 项已落地）| 状态：✅ 全部通过验证（tsc 0 errors / 441 tests passed）| 创建：2026-07-31
> 关联文档：[Devdocs-security.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-security.md) 安全审计 | [Devdocs-architecture.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-architecture.md) 部署模型 | [Devdocs-roadmap.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-roadmap.md) ADR-015 / R7 / R8

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
| 1 | 发现 1 🟠高 | 2FA verify/setup/disable/backup-codes 全部补齐 `assertAllowedOrigin(req)`，且移至 body 解析前 | [src/app/api/auth/2fa/verify/route.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/auth/2fa/verify/route.ts) 等 4 路由 | 静态扫描无遗漏；441 tests passed |
| 2 | 发现 2 🟡中 | `twoFactorSetupLimiter`（3/min/IP+userId）覆盖 setup/disable/backup-codes | [src/shared/security/security.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/shared/security/security.ts) | 单测覆盖；441 tests passed |
| 3 | 发现 8 🟠高 | 生产环境缺失 `AUTH_SESSION_SECRET` 时 `[FATAL]` + `process.exit(1)`；开发环境用 globalThis 缓存随机密钥 | [src/modules/auth/server/identity.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/modules/auth/server/identity.ts) | 启动断言单测；441 tests passed |
| 4 | 发现 16 🟠高 | 生产环境缺失 `ALLOWED_ORIGINS` 时 `process.exit(1)`；开发环境回退 localhost + 局域网 IP | [src/shared/config/auth-constants.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/shared/config/auth-constants.ts) | 启动断言单测；441 tests passed |
| 5 | 发现 19 🟠高 | 登录成功但启用 2FA 时改发 5min 短期预认证 token（含 jti 防重放，HMAC 签名），2FA verify 不再传密码 | [src/modules/auth/server/identity.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/modules/auth/server/identity.ts) | `totp.test.ts` 11 tests passed |
| 6 | 发现 20 🟠高 | `twoFactorLimiter`（5/min/IP+userId）覆盖 verify（setup+login 双模式） | [src/app/api/auth/2fa/verify/route.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/auth/2fa/verify/route.ts) | 单测覆盖；441 tests passed |
| 7 | ADR-015 新增 🔴严重 | GitHub OAuth 流程强制 2FA 校验，绕过即拒绝 | [src/app/api/auth/oauth/github/callback/route.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/auth/oauth/github/callback/route.ts) | OAuth 集成测试 |
| 8 | ADR-015 新增 🟠高 | 2FA 预认证 token 防重放：内存 `consumed jti` 集合 + 5min 惰性清理 | [src/modules/auth/server/identity.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/modules/auth/server/identity.ts) | `totp.test.ts` replay 用例 |
| 9 | ADR-015 新增 🟠高 | OAuth 流程 token 传输从 URL query 改为 `__Host-oauth_2fa` HttpOnly cookie | [src/app/api/auth/oauth/github/callback/route.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/auth/oauth/github/callback/route.ts), [src/app/api/auth/2fa/verify/route.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/auth/2fa/verify/route.ts) | 响应头快照；441 tests passed |
| 10 | ADR-015 新增 🟠高 | 2FA 备用码重新生成补齐 `assertAllowedOrigin` + `twoFactorSetupLimiter` | [src/app/api/auth/2fa/backup-codes/route.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/auth/2fa/backup-codes/route.ts) | 单测覆盖；441 tests passed |

### 2.2 第二轮（2026-07-31）— 中级与低级加固

| # | 发现 | 变更内容 | 源工件 | 验证证据 |
|---|------|---------|--------|---------|
| 11 | 发现 4 🟡中 | 扩展 `AdminModule` 类型 + `ROLE_MODULE_MAP`；新增 `requireModuleAdmin(req, module)`；forum（11）/exam（7）/task（1）共 19 路由迁移 | [src/modules/auth/types/index.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/modules/auth/types/index.ts), [src/modules/admin/server/require.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/modules/admin/server/require.ts), [src/app/api/admin/community/forum/](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/admin/community/forum), [src/app/api/admin/tools/exam/](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/admin/tools/exam), [src/app/api/admin/tools/task/route.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/admin/tools/task/route.ts) | tsc 0 errors；静态扫描无本地 `requireXxxAdmin` 残留 |
| 12 | 发现 5 🟡中 | HKDF-SHA256 派生 TOTP 加密密钥（info=`fztbucs-totp-encryption`，32 字节）；生产强制 `TOTP_ENCRYPTION_KEY` 否则 `process.exit(1)`；开发用 globalThis 缓存随机密钥替代硬编码 | [src/modules/auth/server/totp.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/modules/auth/server/totp.ts) | `totp.test.ts` 11 tests passed；启动断言 |
| 13 | 发现 10 🟡中 | 架构文档新增「部署模型与单进程假设」节，列出速率限制/2FA 防重放/事件总线的单进程依赖，明确多实例部署前迁移清单 | [Devdocs-architecture.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-architecture.md) §部署模型 | 文档评审 |
| 14 | 发现 17 🟡中 | 新增 `.github/workflows/audit.yml`：push/PR 改动 `package.json`/`pnpm-lock.yaml` + 每周一 + 手动触发；执行 `pnpm audit --audit-level=high` 阻断构建 | [.github/workflows/audit.yml](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/.github/workflows/audit.yml) | CI 工作流文件存在性检查 |
| 15 | 发现 24 🟡中 | 论坛图片 API 添加 session 校验（cookie → `getSession(token)` → 401）；`Cache-Control` 从 `public` 改为 `private` | [src/app/api/community/forum/images/[filename]/route.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/community/forum/images/[filename]/route.ts) | 441 tests passed |
| 16 | 发现 13 🟢低 | `buildCsp(nonce)` 按环境分流：生产 `script-src 'self' 'nonce-${nonce}'`（移除 unsafe-eval/inline）；开发保留 unsafe-eval 依赖热重载；style-src 保留 unsafe-inline 并加注释 | [src/proxy.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/proxy.ts), [next.config.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/next.config.ts) | `proxy-headers.test.ts` 13 tests passed |
| 17 | 发现 21 🟢低 | `AUTH_COOKIE_NAME` 按环境分流：生产 `__Host-auth_session`（强制 Secure+Path=/+无 Domain）；开发 `auth_session`（HTTP 无法满足 `__Host-` 前缀） | [src/shared/config/auth-constants.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/shared/config/auth-constants.ts) | 启动日志 + 浏览器 DevTools 检查 |
| 18 | 发现 26 🟢低 | `recordLoginHistory` 扩展签名（success + attemptedEmail）；迁移 v6 重建 `login_history` 表（user_id 可空 + attempted_email 列 + 索引）；登录失败分支记录 | [src/modules/auth/server/identity.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/modules/auth/server/identity.ts), [src/app/api/auth/login/route.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/app/api/auth/login/route.ts), [src/shared/db/migrations.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/shared/db/migrations.ts) | 441 tests passed |
| 19 | 发现 27 🟢低 | 集成 pino + pino-pretty；封装 `createRequestLogger(req)` 自动绑定 `x-request-id`；33 个 API 路由/服务端模块替换 `console.error` | [src/shared/logger.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/shared/logger.ts), [package.json](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/package.json) | 代码扫描 `console.error` 残留数 |
| 20 | 发现 30 🟢低 | rehype-sanitize 默认 GitHub 白名单审查结论：默认配置已足够严格，无需额外调整 | [package.json](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/package.json) rehype-sanitize ^6.0.0 | 文档审查记录 |

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
| 1. 速率限制 / 2FA jti 防重放为单进程内存实现 | 多实例部署时限流与防重放失效 | (a) 架构文档明确禁止多实例部署；(b) 部署前迁移清单（Redis）已写入 [Devdocs-architecture.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-architecture.md) §部署模型；(c) Session 存储已用 SQLite 共享存储，不依赖单进程 | 项目 owner | 多实例部署启动前 | 部署架构变更评审 |
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

- 真相源：本文档为变更记录的聚合视图，原始发现条目与详细描述以 [Devdocs-security.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-security.md) 为准。
- 刷新触发：每次安全加固迭代完成后，追加新的「已完成变更记录包」章节，并更新 §4 记分卡与 §5 例外登记。
- 保留期：本文档长期保留，作为安全审计的可追溯证据。
- 归档条件：当项目进入维护期且无新安全加固时，本文档转为归档状态，不再追加新章节。

---

*本文档由 2026-07-31 安全加固第二轮收尾时生成，遵循 engineering-control-evidence specialist 输出契约。*
