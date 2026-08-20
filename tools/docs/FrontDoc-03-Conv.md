# FrontDoc-03-Conv：前端工程约定（Reference · 目录/BFF/组件/状态/测试的权威定义）

> 更新人：3yearsZ
> 更新日：2026-08-20
> 版本：1.0.1 · 七夕（Diátaxis R 类规范，前端实现级约定 SSOT 权威）
> Diátaxis：R（Reference · 回答「是什么」，提供前端工程实现规范的接口、配置、不变量的精确权威定义；不包含可执行步骤）
> 适用读者：前端 Next.js 贡献者 / BFF 路由开发者 / shadcn 组件定制作者 / 前端 reviewer / 移动端 H5 共享组件贡献者
> 变更触发：新增/重命名业务域模块 / BFF 路由层新增或签名变动 / shadcn 组件体系扩缩 / 状态库或 Query keys 约定变动 / 测试策略或覆盖率阈值调整 / i18n 命名空间或语言包变动

> **SSOT 分工声明**：
> - 本文档是「**前端工程实现级约定（目录分层/BFF 路由/组件体系/状态管理/测试 i18n 性能）**」的唯一权威（SSOT）。
> - 前端安全红线（Origin 校验/Cookie 托管/路由保护/CSP）→ [FrontDoc-02-Sec.md](FrontDoc-02-Sec.md)。
> - 前端架构总览（Arc42 完整章节）→ [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md)。
> - UI 组件库与设计系统 → [RootDoc-UIStandard.md](../../../docs/RootDoc-UIStandard.md)。
> - 跨仓通用工程约定（命名门禁/版本三源/Makefile）→ [RootDoc-EngConv.md](../../../docs/RootDoc-EngConv.md)。
> - 命名门禁详情 → [RootDoc-ModuleMap.md](../../../docs/RootDoc-ModuleMap.md)。

> **治理红线**：
> - MUST 所有工程约束在代码结构、TypeScript 类型、Lint 规则中落地；正文与实现不一致时，以本节约束为准
> - MUST NOT 在组件层直接 fetch 后端或引入第二套 UI 库
> - MUST 新增业务域模块时同步登记 RootDoc-ModuleMap.md 并通过 `make gen-doc-facts` 校验
> - MUST 前端变更 PR 附带 `make ci` 全绿（lint + typecheck + test + e2e + docs-health）

---

## 快速索引

| 工程领域 | 概述 | 接口/配置 | 不变量(RFC2119) | 自检 Checklist | 代码位置 |
|---|---|---|---|---|---|
| **§1 目录结构分层** | App Router + BFF + 契约层 + 组件层 | §1.2 | §1.3 | §1.4 | `app/`、`server/`、`src/lib/api/`、`src/components/`、`src/hooks/`、`src/store/` |
| **§2 BFF 路由规范** | 转发 + Zod 校验 + 权限 preload + 错误翻译 | §2.2 | §2.3 | §2.4 | `server/bff.ts`、`app/api/[domain]/route.ts`、`server/zodSchemas.ts`、`middleware.ts` |
| **§3 组件约定** | shadcn 扩展 / Props 命名 / 样式系统 / i18n | §3.2 | §3.3 | §3.4 | `src/components/ui/`、`src/components/[domain]/`、`tailwind.config.ts`、`postcss.config.js` |
| **§4 状态管理** | TanStack Query + Zustand + Query keys 规范 | §4.2 | §4.3 | §4.4 | `src/lib/queryClient.ts`、`src/hooks/use{Domain}*.ts`、`src/store/`、`@tanstack/react-query` |
| **§5 测试分层与性能** | Vitest/Playwright + i18n + Lighthouse 性能实践 | §5.2 | §5.3 | §5.4 | `tests/unit/`、`tests/e2e/`、`src/i18n/`、`next.config.mjs`、`server/monitoring.ts` |
| **§6 变更门禁** | Pre-commit 必查清单 | — | — | §6 | — |

---

## §1 目录结构分层（App Router + BFF + 契约层 + 组件层）

### 1.1 概述

前端采用 Next.js 15 App Router 架构；目录按「路由层（app/）+ BFF 转发层（app/api/ + server/）+ 契约层（src/lib/api/）+ 组件层（src/components/）+ 状态/工具/样式层（src/*）」六区划分。业务域模块按 RootDoc-ModuleMap.md 命名门禁复数蛇形聚合；禁止组件层直接 fetch 后端；禁止业务逻辑散落页面文件。

### 1.2 接口与配置清单

#### 1.2.1 六区职责表

| 区 | 路径前缀 | 职责（只做这些事） | 禁止进入 |
|---|---|---|---|
| **页面路由层** | `app/(dashboard)/[domain]/page.tsx`、`app/(auth)/login/page.tsx` | Next.js Server Component 页面壳；布局（Layout）、路由分组（Route Group）、metadata、loading.tsx、error.tsx、not-found.tsx | 禁止直接 `fetch(BACKEND_URL)`；禁止复杂业务 if/else（>30 行业务 → 抽 `src/components/`）；禁止 DB 访问 |
| **BFF 转发层** | `app/api/[domain]/route.ts`（GET/POST/PUT/DELETE）+ `server/bff.ts` `proxyBackend()` + `server/zodSchemas.ts` | 写端点 Origin 校验 + Zod 入参校验 + `proxyBackend(BACKEND_URL + '/api/v1/...')` 转发；读端点直接 BFF 到后端；返回后端蛇形字段；**不自定义 DTO** | 禁止直连数据库；禁止手写 `fetch('https://第三方')` 绕过 `proxyBackend()`；禁止自定义字段映射（snake_case→camelCase 契约层统一） |
| **API 契约层** | `src/lib/api/{domain}.ts` + `src/lib/api/client.ts`（`fetchBackend()`） | 类型 DTO 定义（响应蛇形 → 消费端 `useSnakeToCamel` 统一翻译 / 或 zod transform）、`useQuery`/`useMutation` 自定义 hooks 导出；业务组件 MUST 从契约层调用；**不直接 `fetch`** | 禁止组件直连；禁止 BFF 自定义 DTO 与契约层不一致；禁止契约层写 UI |
| **组件层** | `src/components/ui/`（shadcn 基元，由 `npx shadcn@latest add` 管理）→ `src/components/{domain}/`（业务组件，按域聚合）→ `src/components/layout/`（通用布局：Sidebar、Header、Breadcrumb） | UI 呈现；Props 受控；受控组件 `value/onChange`；组合优于继承；**只从契约层 / Zustand / hooks 取数据** | 禁止直接 fetch；禁止存本地业务 DB；禁止组件内硬编码后端地址 / 枚举副本（MUST 从契约层导入） |
| **状态层** | `src/store/{domain}.ts`（Zustand：少变全局 UI 状态）+ `src/hooks/use{Domain}*.ts`（领域 hooks：TanStack Query 封装） | 少变 UI 全局（主题、语言、左侧边栏折叠）+ 服务端缓存（TanStack Query）；**用户角色等权威数据 MUST 走 Query 服务端 + prefetch** | 禁止把「权限判断结果」持久在 Zustand 本地副本；禁止 mutable 直改 state |
| **基础设施层** | `src/lib/`（utils、queryClient、cn() 等）→ `src/i18n/`（语言包 + namespace）→ `src/styles/`（globals.css + Tailwind layers）→ `server/`（BFF 工具、鉴权 cookie、monitoring） | 通用工具 + i18n + 全局样式 + BFF 辅助 | 禁止反向 import 业务域组件/页面；保持 DAG 根节点 |

#### 1.2.2 目录结构标准（每个资源域 MUST 对齐）

```
<Root>
├── app/
│   ├── (dashboard)/{domain}/              # 页面层：列表 / 详情 / 新建 / 设置
│   │   ├── page.tsx                       # Server Component 壳
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── [id]/page.tsx                  # 详情
│   │   └── new/page.tsx
│   └── api/{domain}/                      # BFF 转发层
│       ├── route.ts                       # GET 列表 / POST 创建
│       ├── [id]/route.ts                  # GET 详情 / PUT 更新 / DELETE 删除
│       └── [id]/actions/[action]/route.ts # 动作子路由（enroll/approve/reject）
├── src/
│   ├── lib/api/{domain}.ts                # 契约层：DTO + useQuery/useMutation
│   ├── components/{domain}/               # 业务组件：List/DetailForm/Card/EmptyState
│   │   ├── {Domain}List.tsx
│   │   ├── {Domain}DetailForm.tsx
│   │   └── {Domain}Card.tsx
│   ├── store/{domain}.ts                  # Zustand：少变 UI 状态（若需要）
│   └── hooks/use{Domain}*.ts              # 领域 hooks（契约层封装；可选并入 api/）
├── server/
│   ├── bff.ts                             # proxyBackend() 唯一实现
│   ├── zodSchemas.ts                      # {domain}Schema 入参校验
│   ├── auth.ts                            # Cookie 读/写/401 刷新
│   └── monitoring.ts                      # 监控上报、错误收集
└── tests/
    ├── unit/components/{domain}/          # Vitest 组件单测（render + fireEvent）
    ├── unit/hooks/                        # hooks 单测（renderHook）
    └── e2e/{domain}/spec.ts               # Playwright 端到端（登录→列表→创建→详情）
```

### 1.3 不变量与约束（RFC2119）

**MUST（铁律红线）：**
1. 六区职责边界 **MUST** 严格对齐 §1.2.1 表；页面层 **MUST NOT** 直 fetch 后端；组件层 **MUST NOT** 直接 fetch；BFF 层 **MUST NOT** 自定义 DTO
2. 每个资源域模块 **MUST** 按 §1.2.2 目录骨架对齐；**MUST NOT** BFF 路由放在 `pages/api/`（Pages Router，已废弃）或散落在 `src/server/` 无路由前缀规范
3. 业务组件 **MUST** 放在 `src/components/{domain}/`；**MUST NOT** 直接放 `src/components/` 根目录（Root 组件、shadcn ui/* 除外）；无域组件 MUST 放 `src/components/common/` 或 `src/components/layout/`
4. BFF 转发层路径 **MUST** `app/api/[domain]/route.ts` + `[id]/route.ts` + `[id]/actions/[action]/route.ts` 三级标准；**MUST NOT** `app/api/{domain}_create.ts` 单文件多动作
5. 契约层 **MUST** 一域一文件 `src/lib/api/{domain}.ts`；**MUST NOT** 组件内 `const {data} = useQuery({ queryKey: ['foo'], queryFn: () => fetch('/api/v1/...') })` 裸写（抽离到契约层）
6. 枚举/角色/状态 **MUST** 从契约层 `src/lib/api/{domain}.ts` 或后端 `ErrorCode` i18n key 导入；**MUST NOT** 业务组件本地 `const UserRole = { ADMIN: 'admin' }` 重定义副本（Double-source 禁）
7. 路由分组 **MUST** 用 App Router Route Group 括号语法：`(dashboard)`、`(auth)` 区分；**MUST NOT** 在 `app/` 根目录平铺开几十个域 folder（层级过深不清晰）
8. 错误页与 loading **MUST** 每域至少 `error.tsx` + `loading.tsx`（或共享 `(dashboard)/error.tsx` 全局兜底 + 域级 override）；**MUST NOT** 域级纯白屏 fallback
9. 服务端组件（默认 page.tsx）**MUST NOT** 用浏览器 API：`window`、`localStorage`、`document`；需要交互 MUST 抽 Client Component `'use client'` 明确标记
10. 基础设施层 `src/lib/*` / `server/*` **MUST NOT** `import { DomainList } from '@/components/exams/...'` 反向依赖业务域；保持 DAG 根

**MUST NOT（禁止事项）：**
1. **MUST NOT** 组件层直接 `fetch(BACKEND_URL + '/api/v1/exams')` 直连后端；**MUST** 走契约层
2. **MUST NOT** BFF `proxyBackend()` 传入用户可控 URL（`/api/v1/${userInput}` 防 SSRF）；必须静态拼接 `BACKEND_URL + '/api/v1/' + 域路径白名单`（FrontSec §1.3 上位）
3. **MUST NOT** 单文件 > 500 行（业务组件/页面/hooks）；超阈值 MUST 拆子组件/子 hooks
4. **MUST NOT** 页面路由出现 PascalCase 命名（`app/ExamList/page.tsx`）；**MUST** kebab-case 或蛇形复数域（`exams`、`associations`）
5. **MUST NOT** `'use client'` 泛滥：整页包裹 Client；**MUST** 交互下沉到最小组件（列表页 shell 是 Server Component，仅「操作按钮 + 对话框」抽 Client）
6. **MUST NOT** 引入 Pages Router（`pages/` 目录）与 App Router 双路由体系；**MUST** 仅保留 App Router（Next 15 推荐）
7. **MUST NOT** 新增模块未在 RootDoc-ModuleMap.md 登记 8 项（RootEngConv §1 上位）；先登记后写代码
8. **MUST NOT** 跨域直接 import：`components/associations/` import `components/exams/ExamCard`；如需复用 MUST 抽象到 `components/common/` 或契约层共享类型

**SHOULD（建议事项）：**
1. **SHOULD** 每个域提供 `index.ts` barrel 出口：`app/api/{domain}/index.ts`（暂无）→ `src/lib/api/index.ts` 域聚合；便于跨域 import 路径清晰
2. **SHOULD** App Router `generateMetadata()` 统一设置 title/description + og:image；每域 metadata 按业务展示（「考试管理 - FztbuCS」）
3. **SHOULD** 引入 path alias：`@/lib/api/*`、`@/components/*`、`@/store/*`、`@/hooks/*` 配合 `tsconfig.json` `paths`；避免 `../../../../components/...`
4. **SHOULD** 新域模板用 `tools/scaffold-domain.mjs`（如有）一键生成：BFF route 骨架 + 契约层模板 + 组件 List/DetailForm + 最小 Vitest
5. **SHOULD** 目录结构定期通过 `tree app/ src/components/ src/lib/api/` 审阅；孤儿文件（0 import）SHOULD 删除或迁移

**MAY（可选配置）：**
1. **MAY** MVP 期 `store/{domain}.ts` 0 实现（少变 UI 暂用 TanStack Query + 路由状态足够）；**MUST NOT** 强行套 Zustand 增加复杂度
2. **MAY** 引入 Turbopack `next dev --turbo` 加速本地构建；**MUST** CI build 默认仍使用 Webpack/Rsbuild 默认保障稳定
3. **MAY** 引入 Route Handler Cache `export const dynamic = 'force-dynamic'` 或 `revalidate` 精细控制缓存；读端点 MAY 增量静态再生（ISR）

### 1.4 自检 CheckList

- [ ] 六区职责边界：grep 0 处页面直 fetch、0 处组件直 fetch、0 处 BFF 自定义 DTO
- [ ] 目录骨架：每个域对齐 §1.2.2；BFF 三级 route、契约层一域一文件、业务组件按域聚合
- [ ] 枚举/权限：0 本地副本；全从契约层 / i18n 导入
- [ ] Route Group：`(dashboard)` / `(auth)` 分组合理；平铺开域目录 ≤ 5 个
- [ ] 页面层：Server Component 默认；`'use client'` 仅交互组件；无 window/document SSR 报错
- [ ] 基础设施层：0 反向 import 业务域；DAG 检查通过（`madge` 若启用）

---

## §2 BFF 路由规范（转发 + Zod 校验 + 权限 preload + 错误翻译）

### 2.1 概述

前端 BFF 是后端 `/api/v1` 冻结契约在 Web 侧的唯一入口（RootEngConv §1 + FrontSec §1 上位）。所有业务请求 MUST 经 BFF：读端点直接转发、写端点 MUST 叠加 Origin 白名单校验 + Zod Schema 入参校验 + 权限 preload（从 cookie 反解）。BFF 不引入自定义 DTO，不做 snake→camel 字段翻译（仅契约层翻译）；统一错误返回四字段（code/message/i18n_key/details）与后端 Envelope 对齐。

### 2.2 接口与配置清单

#### 2.2.1 BFF 调用链（写端点 MUST 经过）

```
客户端 fetch('/api/exams', { method: 'POST', body })
  ↓
app/api/exams/route.ts POST handler
  1. assertAllowedOrigin(req)    ← MUST（写端点红线 FrontSec §1）
  2. const input = examCreateSchema.parse(await req.json())   ← MUST（Zod v3）
  3. { ok: user, roles, permissions } = await preloadCurrentUserFromCookie(cookies())
  4. [可选] requireAnyPermission(permissions, ['exams:create'])；不满足直接 403
  5. proxyBackend({ method: 'POST', path: '/api/v1/exams', body: input, headers:{Authorization} })
  6. return Response.json(translateErrorToFront(backendResponse))   ← MUST 统一错误包装
```

#### 2.2.2 Zod Schema 分档（`server/zodSchemas.ts`）

| 档级 | 规则 | 示例 |
|---|---|---|
| **Create Schema** | 与后端 `*Create` DTO 字段一一对应；snake_case 或 camelCase 二选一（BFF 内 MUST 统一 camel → snake 转换在 `proxyBackend` 注入）；邮箱 `z.string().email()`、字符串长度 `min/max`、枚举 `z.enum` | `examCreateSchema = z.object({ title: z.string().min(3).max(120), association_id: z.coerce.number().int().positive() })` |
| **Update Schema** | 全部字段 `z.optional()`；支持部分更新；`z.union([z.literal(''), ...])` 兼容「清空字符串」 | |
| **List Query Schema** | `page: z.coerce.number().int().min(1).default(1)`、`page_size: z.coerce.number().int().min(1).max(100).default(20)`、`sort_by: z.enum(['created_at','title'])`、`sort_order: z.enum(['asc','desc']).default('desc')` + 业务筛选字段 | |
| **动作 Schema** | enroll: `{ exam_id, answers?: [...] }`；approve/reject: `{ application_id, reason? }` | 动作路由 path = `app/api/[domain]/[id]/actions/[action]/route.ts` |

#### 2.2.3 Cookie 鉴权前置（`server/auth.ts`）

| 函数 | 职责 | 约束 |
|---|---|---|
| `getAccessTokenFromCookie(cookies())` | 从 `HttpOnly+Secure fztbu_access` 读 access；过期 null | 对齐 FrontSec §2 Cookie 托管 |
| `getRefreshTokenFromCookie(cookies())` | 读 refresh；用于 401 刷新 | |
| `setTokensToCookie(res, access, refresh)` | 写回 cookie：Domain / SameSite=Lax / Secure / HttpOnly / Path=/ | 刷新成功 MUST 删除旧 cookie 再写新 |
| `preloadCurrentUserFromCookie(cookies())` | GET `/auth/me`（BFF 转发）→ { user, roles, permissions }；权限校验前置避免重复向后端发两次（一次 `/auth/me` 一次业务）；失败清 token + 401 | 写端点 SHOULD 都 preload |

#### 2.2.4 错误翻译包装（`server/bff.ts` `translateErrorToFront()`）

后端 Envelope 与前端展示的桥：
- 成功：透传 `{success, code, message, data, pagination, i18n_key, trace_id}` 原样到前端契约层
- 失败 4xx：返回 `{success:false, code, message, i18n_key, details, trace_id}`；HTTP status 同后端
- 失败 5xx：code 保持后端 `E_SYS_*`；UI 展示统一 「系统繁忙，请稍后重试或联系管理员」 + trace_id 可复制
- 本地校验失败（Zod SafeParseError）：**MUST** 本地造 `E_VAL_*` 系列 code + details 字段名映射，与后端 i18n key 对齐

### 2.3 不变量与约束（RFC2119）

**MUST（铁律红线）：**
1. 写端点 **MUST** 按 §2.2.1 调用链 1→6 执行：Origin 校验 → Zod parse → preloadCurrentUser → [权限] → proxyBackend → 统一错误；**MUST NOT** 跳过任一步（Origin 跳过 = SSRF/CSRF 高风险）
2. BFF 转发目标 **MUST** 仅静态拼接 `BACKEND_URL + '/api/v1/' + 白名单路径`；**MUST NOT** 接用户可控 URL 直接转发（FrontSec §1.3 上位红线 SSRF 防）
3. Zod Schema **MUST** 分档对齐 §2.2.2；入参 **MUST** 严格 parse；**MUST NOT** `req.json()` 直接 `as CreateExam` bypass 校验（TS 类型不是运行时校验）
4. List Query page_size **MUST** ≤ 100；sort_by **MUST** `z.enum` 白名单；**MUST NOT** `sort_by: z.string()` 任意串防 SQL order by 注入
5. preloadCurrentUserFromCookie **MUST** 使用缓存：同一次请求生命周期内只调 1 次 `/auth/me`；**MUST NOT** 业务组件 + BFF 各调一次导致双倍后端压力
6. Cookie 写 **MUST** 对齐属性：`HttpOnly`、`Secure`（生产）、`SameSite=Lax`（或 `None` 跨站）、`Path=/`、`Domain` 与后端一致；**MUST NOT** 把 refresh 写进 `localStorage`（FrontSec §2.3 上位）
7. Zod 校验失败 **MUST** 返回 `E_VAL_*` 系列 code：与后端错误码前缀 VAL 一致；details **MUST** 字段级错误（`email: ['invalid email']`）供 Form 组件展示
8. 401 刷新 **MUST** 401 静默刷新单飞：BFF 与前端 QueryClient 都 MUST 有 RefreshMutex（或使用 TanStack Query `retry(failureCount, error)` 统一处理）；**MUST NOT** 并发刷新 refresh 复用检测误踢（FrontSec §2.3 上位）
9. 所有转发 **MUST** 透传 trace_id；后端返回 `trace_id` BFF **MUST** 保留到响应；便于联查

**MUST NOT（禁止事项）：**
1. **MUST NOT** BFF 响应里自定义 camelCase 字段；**MUST** 原样透传后端 snake_case（契约层统一翻译）
2. **MUST NOT** BFF 层「引入额外业务逻辑」：报名条件判断（年龄/年级）→ 必须后端 enforce；BFF 只做转发 + 校验 + 权限 preload
3. **MUST NOT** 读端点也一律 `preloadCurrentUser`（可能破坏匿名访问能力：首页、社区帖子）；preload 只在「登录态才有意义」的端点调用
4. **MUST NOT** Zod 中 `z.any()` / `z.unknown().passthrough()` 让任意字段通过；**MUST** 字段显式罗列 + `strict()`
5. **MUST NOT** 401 直接 `redirect('/login')` 页面跳转；**MUST** 返回 401 + `code: E_AUTH_002_TOKEN_EXPIRED`，由 `AuthProvider` / QueryClient 全局拦截统一跳转（避免 SSR/CSR 跳转不一致）
6. **MUST NOT** 多个写端点共享同一个 Zod Schema（如「创建考试」与「更新考试」字段要求不同）；**MUST** Create / Update Schema 拆分
7. **MUST NOT** BFF 层打印 Authorization header 或 cookies 明文（对齐 LOG-01 通用红线）

**SHOULD（建议事项）：**
1. **SHOULD** `server/zodSchemas.ts` 用 Barrel 导出：`export * as users from './users'` 等一域一对象，避免命名冲突
2. **SHOULD** 提供 `useSafeSubmit` hook：表单提交自动调用 BFF → 统一处理 Zod error、后端 error、i18n toast 提示；减少每个 Form 重复 try/catch
3. **SHOULD** preloadCurrentUser 引入 `weak cache`（Map request_id）；若同请求多次调用命中缓存；避免双重 `/auth/me`
4. **SHOULD** 错误码 i18n key 双端同步：后端 `dump_error_codes.py` 导出 JSON → 前端 `src/i18n/errors/` 自动生成映射；避免手动漂移
5. **SHOULD** BFF 路由 `Response` 设置 `Vary: Accept-Encoding, Cookie, Authorization`；避免 CDN 缓存把用户 A 的响应返回给 B

**MAY（可选配置）：**
1. **MAY** 引入 tRPC 做端到端类型安全桥（Next.js <-> BFF），但 `/api/v1` 对外契约 MUST 保持 REST 不变；tRPC 只作为内部 BFF 类型层
2. **MAY** 列表读端点引入 `NextResponse.json(data, { headers: {'Cache-Control': 's-maxage=60, stale-while-revalidate=300'} })` CDN 缓存；含用户私有数据 MUST NOT 缓存
3. **MAY** 高并发场景用 Upstash Redis 对 GET `/api/community/posts` 等公开列表做 BFF 缓存；TLL 60s + 缓存穿透保护

### 2.4 自检 CheckList

- [ ] 写端点调用链：Origin→Zod→preload→[权限]→proxy→统一错误 6 步全过；grep 0 处跳过
- [ ] proxyBackend：0 用户可控 URL；白名单路径静态拼接（SSRF 防）
- [ ] Zod：分档 Create/Update/List/Action；page_size ≤100；sort_by z.enum；0 `z.any()`
- [ ] Cookie 属性：HttpOnly+Secure（生产）+ SameSite+Path+Domain 对齐
- [ ] 401 刷新：单飞 mutex；并发 10 个 401 只刷新 1 次
- [ ] 错误：Zod 返回 E_VAL_* 字段级；后端错误透传 trace_id；5xx UI 不展示堆栈

---

## §3 组件约定（shadcn 扩展 / Props 命名 / 样式系统 / i18n 接入）

### 3.1 概述

前端组件体系以 **shadcn/ui + Tailwind CSS + Radix Primitives** 为唯一基元；禁止引入第二套 UI 库（如 Ant Design、MUI、Chakra）。业务组件 MUST 以「组合 + 组合优于继承」构建：`<Card><CardHeader /><CardContent /><CardFooter />` 复合模式。组件 Props 命名受控统一；i18n 三语 MUST 使用 `next-international` namespace 管理；不裸写硬编码中文字符串。

### 3.2 接口与配置清单

#### 3.2.1 组件三梯队

| 梯队 | 所在路径 | 管理方式 | 示例 | 约束 |
|---|---|---|---|---|
| **T1 UI 基元**（shadcn）| `src/components/ui/button.tsx` 等 | `npx shadcn@latest add button` CLI 管理；**禁止手动改 `ui/` 内文件，需改 → `components/customized-ui/` 包装继承** | `Button`、`Input`、`Card`、`Dialog`、`Table`、`Form` + `zodResolver` | 改 T1 **MUST NOT** 直接改 `ui/button.tsx`；包装 MUST 透传所有原生 props（`React.ButtonHTMLAttributes<HTMLButtonElement>`） |
| **T2 通用业务组件**（跨域复用） | `src/components/common/`、`src/components/layout/` | 人写；版本变更 CR 双审 | `DataTable<T>`（泛型表格，基于 shadcn Table + TanStack Table）、`EmptyState`、`ConfirmDialog`、`CrumbNav`、`RoleGuard`（按权限渲染子元素）| 跨域组件 **SHOULD** 带 README 使用示例 + Vitest |
| **T3 域内业务组件**（单一域使用） | `src/components/{domain}/` | 域 Owner 维护；不承诺跨域稳定 | `ExamList`、`ApplicationForm`、`PostCard` | 不跨域直接 import；跨域复用 MUST 先升入 T2 |

#### 3.2.2 Props 命名约定（受控组件统一）

| 类别 | 命名 | 类型 | 说明 |
|---|---|---|---|
| 值 / onChange 对 | `value` / `onChange` | `T` / `(v: T) => void` | 受控组件 MUST；禁止 `val` / `setValue`（与 React 官方一致） |
| open / onOpenChange 对 | `open` / `onOpenChange` | `boolean` / `(open: boolean) => void` | Dialog / Drawer / Popover（Radix 标准） |
| 加载态 | `isLoading` | `boolean` | Button `isLoading` 显示 spinner + disable |
| 禁用 | `disabled` | `boolean` | HTML 标准 |
| 数据 | `data` / `items` / `record` | 泛型 | List: `items: Item[]`；Detail：`record?: DetailDTO` |
| 业务回调 | `onSubmit` / `onEnroll` / `onApprove` 等动作 | `(payload) => Promise<void> | void` | `on` 动词开头；表单提交 |
| 空态 | `emptyText` / `emptyDescription` / `emptyAction` | ReactNode | EmptyState 组合 |
| 权限守卫 | `requiredPermissions?: Permission[]` + `match?: 'any' | 'all'` | Permission 来自契约层 | `RoleGuard` 包装；不替代后端 enforce |

#### 3.2.3 样式系统（Tailwind CSS v3 + CVA + CSS Variables）

| 项 | 规则 |
|---|---|
| **className 组合工具 MUST** 使用 `src/lib/utils.ts` 的 `cn()`（clsx + tailwind-merge） | `<Button className={cn('w-full', active && 'bg-primary')} />` 解决冲突 |
| **变体 SHOULD** 使用 `class-variance-authority (cva)` 定义在组件同文件顶部 | `const buttonVariants = cva('...', { variants: { variant: { default:'...', ghost:'...' } } })` |
| **颜色 Token** MUST 通过 CSS Variables 引用：`bg-primary` / `text-muted-foreground`（shadcn 默认 tokens） | 禁止硬编码 `#2563eb` / `rgb(37,99,235)`（品牌色只能在 `globals.css :root` 一处改） |
| **响应式前缀**：sm/md/lg/xl/2xl Tailwind 断点；**SHOULD** `md:` 起（移动端优先设计） | |
| **暗色模式**：`class` 策略（Tailwind）；与 shadcn `ThemeProvider` 联动；暗色 Token **MUST** 在 `.dark { --primary: ... }` 中定义 | |

#### 3.2.4 i18n 管理（`next-international` 三语）

| 项 | 规则 |
|---|---|
| 语言支持 | 简体中文（`zh`）、繁体中文（`zh-TW`）、English（`en`）；三语 MUST 齐全上线 |
| 命名空间（namespace） | 一域一 namespace：`exams`、`associations`、`activities`、`community`、`ai`、`admin` + 共享 `common`、`errors`、`auth` |
| Key 命名 | `领域.页面.组件.语义` 蛇形或点分；`exams.list.empty_title`；禁止 `title1` / `msg_abc` 无意义命名 |
| 运行时使用 | Server Component: `getI18n().t('exams.list.empty_title')`；Client Component: `useI18n().t(...)`；**禁止硬编码中文/英文** |
| workbench 同步（FrontSec §4.3 上位）| 三处 MUST 对齐：① 前端语言包 → ② 后端 ErrorCode i18n_key → ③ UI 组件实际调用；missing MUST 由 CI flag |

### 3.3 不变量与约束（RFC2119）

**MUST（铁律红线）：**
1. UI 组件体系 **MUST** 仅 shadcn + Tailwind + Radix；**MUST NOT** 新增 AntD/MUI/Chakra 等第二套 UI 库（RootUIStandard 上位）
2. T1 shadcn `src/components/ui/*` **MUST** 由 `shadcn add` CLI 管理；**MUST NOT** 手动改 `ui/button.tsx` 等基元文件。定制化 MUST 在 `components/customized-ui/` 包装并透传所有原生 props
3. 受控组件 Props **MUST** 命名对齐 §3.2.2 表；`value/onChange`、`open/onOpenChange`、`isLoading`、`disabled` 统一；**MUST NOT** `val` / `toggle` / `isDisabled` 变体
4. className 合并 **MUST** 通过 `cn()`；**MUST NOT** 裸模板字符串拼接（无法解决 tailwind 冲突 `p-2 p-4`）
5. 颜色 Token **MUST** CSS Variables；**MUST NOT** 硬编码 HEX/RGB（品牌色/主题一次改动成本过大）
6. i18n **MUST** next-international namespace 管理；UI 展示文案 **MUST NOT** 裸写硬编码中文/英文（如 `<p>暂无数据</p>`）→ MUST `t('common.empty_title')`
7. 三语 **MUST** 齐；新 key **MUST** `zh / zh-TW / en` 三文件同时更新；**MUST NOT** 上线只写 zh 让 QA 报 bug 再补
8. 数据列表 **MUST** 复用 `common/DataTable<T>` 泛型组件（列定义 / 排序 / 分页 / 行选择统一）；**MUST NOT** 每个域重写一套 table（DRY 防）
9. 确认操作（删除 / 审核 / 撤销报名）**MUST** 复用 `common/ConfirmDialog`：标题 / 描述 / 确认按钮危险态 / 取消；**MUST NOT** onClick 直接执行无确认
10. 权限显示隐藏 **MUST** 复用 `RoleGuard` 组件；**MUST NOT** 各组件本地 `if (permissions.includes('exams:edit')) return <Button />` 重复逻辑

**MUST NOT（禁止事项）：**
1. **MUST NOT** 在业务组件直接引入 Radix 基元并自定义样式（绕开 shadcn T1 体系）；**MUST** 在 T2/T3 组合使用 shadcn 包装品
2. **MUST NOT** 组件 CSS 文件 `.module.css` + Tailwind 混用（除 `globals.css` 全局）；**MUST** 纯 Tailwind + cva（减少样式逃逸）
3. **MUST NOT** 组件 Props 超过 12 个；超过 MUST 拆子组件 + Composition 模式（`List + FilterBar + PaginationBar` 分件）
4. **MUST NOT** `any` 类型泛滥 Props；**MUST** 泛型 `<T>` 或精确 DTO；`@typescript-eslint/no-explicit-any: error` tsconfig 生效
5. **MUST NOT** i18n key 命名 `btn_ok`、`msg1`、`title2`；**MUST** 按 §3.2.4 「领域.页面.组件.语义」点分
6. **MUST NOT** 暗色模式单独在组件写 `className="bg-white dark:bg-gray-900"`；**MUST** 统一用 `bg-background / text-foreground` Token
7. **MUST NOT** 图片 `<img>` 标签；**MUST** 使用 Next.js `<Image>` 优化（尺寸/懒加载/格式）；对象存储头像 MUST `loader` 配置
8. **MUST NOT** Form 组件手写 `onSubmit + e.preventDefault()`；**MUST** 使用 `react-hook-form` + `zodResolver(schema)` 标准流程（shadcn Form 基元）

**SHOULD（建议事项）：**
1. **SHOULD** 每个业务组件附带 Storybook story（`src/components/{domain}/*.stories.tsx`）；展示 Props 变体 + 空态 + 加载态；CR reviewer 可视化 review
2. **SHOULD** `cn()` 禁止超过 5 个条件 className；**SHOULD** 抽成 `const class = cn(...)` 变量在组件顶部，提升可读性
3. **SHOULD** i18n 在 CI 跑 missing 检测：`next-international lint` 或自定义脚本扫描 `t('')` 字面量 key 与语言包 diff；缺 key 0 合并
4. **SHOULD** Props 类型定义 JSDoc：`/** 考试 ID，正整数 */ examId: number`；Storybook 自动展示为描述
5. **SHOULD** 通用 T2 组件 Vitest 覆盖「空态/加载态/异常/权限」4 种变体；减少 QA 回归面

**MAY（可选配置）：**
1. **MAY** 引入 `tailwindcss-animate` + Framer Motion 轻量动效（Drawer/Dialog 打开动画）；但 **SHOULD** 尊重用户 `prefers-reduced-motion`
2. **MAY** 引入 `@tailwindcss/typography` 做 Markdown 渲染（社区帖子详情）
3. **MAY** MVP 期 Storybook 仅跑本地开发；CI build Storybook MUST 在完整版并入（UI 冻结后）

### 3.4 自检 CheckList

- [ ] UI 仅 shadcn + Tailwind + Radix；0 处 AntD/MUI 引入；T1 ui/* 0 手动修改
- [ ] 受控 Props：value/onChange、open/onOpenChange 统一；0 val/toggle 变体
- [ ] className 合并全走 cn()；0 裸字符串拼接
- [ ] 颜色：0 处 HEX/RGB 硬编码；全 bg-primary/text-muted-foreground Token
- [ ] i18n：0 处硬编码中文；三语 zh/zh-TW/en 全；CI missing 0 警告
- [ ] 数据列表 0 重复写 table；全复用 DataTable<T>；删除/审核 MUST 走 ConfirmDialog
- [ ] 权限显示：0 本地 if；全 RoleGuard；`<Image>` 替换所有 `<img>`

---

## §4 状态管理（TanStack Query + Zustand + Query keys 规范）

### 4.1 概述

前端状态分为 **服务端缓存（Server State）** 与 **少变 UI 全局（Client State）** 两类。服务端缓存 **MUST** 使用 TanStack Query（React Query v5）+ QueryClient；少变 UI 全局（主题、语言、侧边栏折叠、用户显示偏好）**MAY** 使用 Zustand。Query keys MUST `[domain, resource, id?, filters?]` 四层数组，避免字符串键漂移。用户角色 / 权限 / SafeUser 权威数据 MUST 从 `/auth/me` Query 取；**MUST NOT** 存本地 Zustand 副本。

### 4.2 接口与配置清单

#### 4.2.1 两类状态对比

| 类别 | 示例 | 推荐库 | 持久化？| 失效策略 |
|---|---|---|---|---|
| **服务端缓存（默认 95% 状态）** | 考试列表、用户详情、社团申请、帖子列表、审计日志、权限列表 | TanStack Query v5 `useQuery / useInfiniteQuery / useMutation` | 否（内存缓存）；刷新重新拉取 | `staleTime: 30s`（默认）；写操作 MUST `invalidateQueries([domain])` |
| **少变 UI 全局（≤5% 状态）** | 主题（light/dark）、语言（zh/en/zh-TW）、侧边栏折叠、全局 Toast 栈、多页向导表单分步 | Zustand | 主题/语言 MAY `persist(middleware)`（localStorage 非敏感） | 页面刷新后读取；用户切换触发 |
| **临时表单状态** | 表单输入、对话框输入 | React `useState` / `react-hook-form`；大表单 `useFieldArray` | 否 | unmount 清空 |
| **路由状态** | 当前筛选条件（page、page_size、sort_by、keyword） | Next.js `useSearchParams` / `useRouter` | URL 持久化（可分享链接） | URL change 触发 Query 重新拉取 |

#### 4.2.2 Query keys 四层标准（`[domain, resource, id?, filters?]`）

| 键 | 格式 | 示例 |
|---|---|---|
| 域列表 | `[{domain}]` 或 `[{domain}, 'list']` | `['exams']` / `['exams','list']` |
| 域列表带筛选 | `[{domain}, 'list', filters]`（filters 是 plain object，JSON 可序列化）| `['exams','list', { page: 1, page_size: 20, sort_by:'created_at', keyword: '数学' }]` |
| 域详情 | `[{domain}, 'detail', id]` | `['exams','detail', 42]` |
| 域子资源 | `[{domain}, {sub_resource}, id?]` | `['exams','questions', 42]`、`['associations','members', 'asso_123']` |
| 当前登录用户（单例）| `['auth','me']` | 全局单例；登录/登出/refresh 成功 MUST invalidate |
| 权限（单例）| `['auth','permissions']` | 同 `/auth/me` 派生；若已包含在 me 返回则合并 |

**失效规则（写操作 `useMutation` onSuccess）**：
```ts
// 创建考试 → 失效列表
queryClient.invalidateQueries({ queryKey: ['exams'] })
// 修改考试 → 失效列表 + 该详情
queryClient.invalidateQueries({ queryKey: ['exams','detail', examId] })
queryClient.invalidateQueries({ queryKey: ['exams'] })
// 登出 → 失效 auth/me + 清空所有用户专属缓存
queryClient.invalidateQueries({ queryKey: ['auth'] })
queryClient.clear()
```

#### 4.2.3 自定义 hooks 约定（`src/lib/api/{domain}.ts` + `src/hooks/`）

| hooks 位置 | 命名 | 签名示例 | 说明 |
|---|---|---|---|
| 契约层内（推荐 70%） | `use{Resource}`（list/detail/mutation） | `function useExamsList(filters: ExamListQuery) { return useQuery({ queryKey: ['exams','list', filters], ... }) }`；`function useCreateExam() { return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({queryKey:['exams']}) }) }` | 一域一文件，同 DTO 放一处 |
| hooks 目录（跨域组合） | `use{Action}` | `function useEnrollExamWithCheckPermission(examId) { const perms = usePermissions(); const enroll = useEnrollExam(); return { canEnroll:..., doEnroll:... } }` | 跨 Query 组合逻辑 |

### 4.3 不变量与约束（RFC2119）

**MUST（铁律红线）：**
1. 服务端状态 **MUST** 使用 TanStack Query；**MUST NOT** 把「考试列表 / 用户详情 / 权限列表」写进 Zustand（Double-source 禁：后端是权威，本地是缓存副本，必须接受 stale/invalidate 语义）
2. Query keys **MUST** 四层标准 `[domain, resource, id?, filters?]` 数组；**MUST NOT** 字符串 `'exams-list'` / 嵌套命名不统一 `['exam', id]`（单复数漂移）
3. 写操作 **MUST** 在 onSuccess 中 invalidateQueries；**MUST NOT** 「乐观更新后手动改缓存」+ 不拉后端最新（漂移风险）；乐观更新 MAY 叠加但 MUST 作为 UX 提升 + invalidateQueries 兜底
4. SafeUser / 权限 **MUST** 从 `['auth','me']` Query 获取；**MUST NOT** Zustand 本地 `setUser(user)` 副本（登出 / refresh / 远程改角色 → 本地副本过期 → 越权 UI 展示）
5. 列表分页筛选 **MUST** 同步 URL searchParams（Next.js `useSearchParams` + `useRouter.replace`）；**MUST NOT** URL 无状态导致刷新白屏/回到 page=1
6. 错误处理 **MUST** 统一：QueryClient 的 `defaultOptions.queries.retry(failureCount, error) → 401 刷新、其余 failureCount<3`；**MUST NOT** 每个 useQuery 各自写 retry 逻辑（易漂移）
7. QueryClient 单例 **MUST** 放在 `src/lib/queryClient.ts`；**MUST NOT** 每个文件 `new QueryClient()`（多实例导致缓存重复 + 内存泄漏）
8. 大列表（>1k 条）**MUST** 用 `useInfiniteQuery` + 虚拟列表（`@tanstack/react-virtual`）；**MUST NOT** 一次拉 `page_size=10000` 渲染 10k DOM（卡顿 + OOM）

**MUST NOT（禁止事项）：**
1. **MUST NOT** TanStack Query `staleTime: Infinity` 永不失效（管理员改数据用户看不到）；默认 **SHOULD** 30s；公开列表 MAY 60s
2. **MUST NOT** 同一事实 2 套 Query keys：`['exam', id]` + `['exams','detail', id]` 同时存在；**MUST** 统一四层标准
3. **MUST NOT** 在 `useEffect` 中「手动 if (changed) fetchData()」；**MUST** 用 `queryKey` 依赖驱动（当 filters 改变 Query 自动 refetch）
4. **MUST NOT** 把「表单输入暂存」写进 Zustand 全局；**MUST** 路由或本地 useState（`react-hook-form` watch）
5. **MUST NOT** Zustand store 直接对象赋值 `state.theme = 'dark'`（非 immutable）；**MUST** `set({ theme: 'dark' })` 或 `immer` 中间件
6. **MUST NOT** localStorage 存敏感 token / 权限（FrontSec §2 上位）；Zustand `persist` MUST 白名单只包含主题/语言/侧边栏折叠等非敏感
7. **MUST NOT** 并发 mutation 忘记 `await` 或乐观更新顺序错；导致 invalidateQueries 先于后端 commit

**SHOULD（建议事项）：**
1. **SHOULD** 提供 `src/lib/api/generateQueryKeys(domain)` 工厂函数 → 返回 `list(filters?) / detail(id) / sub(name, id?)` 方法；避免手写 Query key 拼写错
2. **SHOULD** `@tanstack/react-query-devtools` 开发期开启；打包 excluded（Tree-shake）
3. **SHOULD** 列表 Query 支持 `placeholderData` / `keepPreviousData`，翻页切换不抖白屏
4. **SHOULD** 写 mutation 的 error case 用 Toast 组件统一提示 i18n 文案；业务组件不重复 catch + toast.error
5. **SHOULD** Zustand store > 3 个拆分到子 store；单一 `useBoundStore()` 过大导致 re-render（use shallow 或选择器 `useUserStore(s => s.theme)`）

**MAY（可选配置）：**
1. **MAY** 引入 `@tanstack/react-query-next-experimental` 的 `dehydrate + HydrationBoundary` SSR 预取（首屏无 loading）；MVP MAY 暂用 client-side loading
2. **MAY** 引入 `jotai` 替代 Zustand；但 MUST 保持 ≤5% Client State 比例，不得全面使用
3. **MAY** 高实时场景（社区帖子实时评论）引入 SSE（`EventSource`）+ `queryClient.setQueryData()` 推送更新；但 MUST 保持 REST `/api/v1` 同步能力

### 4.4 自检 CheckList

- [ ] 服务端状态：0 处 Zustand 存列表/详情/权限；全 TanStack Query
- [ ] Query keys 统一四层标准：域.资源.id.filter；0 字符串漂移
- [ ] 写操作 onSuccess：invalidateQueries 正确；乐观更新 MAY，不替代 invalidate
- [ ] SafeUser/权限：`['auth','me']` Query；0 Zustand 本地副本
- [ ] 列表筛选：page/page_size/sort/keyword 同步 URL；刷新保留
- [ ] 大列表：>1k 条 useInfiniteQuery + virtual；0 page_size=10000
- [ ] Zustand persist 白名单：仅主题/语言/侧边栏；0 token/权限敏感

---

## §5 测试分层与性能实践（Vitest / Playwright + i18n）

### 5.1 概述

前端测试分二层：**Unit（Vitest + @testing-library/react + happy-dom）** 测组件/hooks/契约层；**E2E（Playwright + Next.js build）** 测完整用户链路（登录→创建考试→报名→发帖）。覆盖率目标：Unit 总体 **≥75%**，关键组件（`DataTable`、`ConfirmDialog`、`AuthProvider`、`RoleGuard`）**≥90%**；E2E 核心路径 **≥80%**。i18n 三语 MUST 由 CI flag missing；性能遵循 Next.js 图像优化、Bundle 拆分、RSC/SSR 合理选择、Lighthouse 门槛。

### 5.2 接口与配置清单

#### 5.2.1 前端测试二层职责表

| 层 | 目录 | 测什么 | 环境 | 速度目标 |
|---|---|---|---|---|
| **Unit / Integration** | `tests/unit/components/{domain}/*.test.tsx`、`tests/unit/hooks/*.test.ts`、`tests/unit/lib/api/*.test.ts` | 组件 render + fireEvent、hooks 行为、契约层 DTO + Query key 生成、工具函数（cn、translateErrorToFront） | Vitest + happy-dom；TanStack Query `QueryClientProvider` + `mock fetch`（msw 或 vi.mock('@/lib/api/client')） | 单 case < 200ms；`make test` 全量 < 3 min |
| **E2E** | `tests/e2e/{domain}/*.spec.ts` | Playwright：启动 Next.js build 服务 → 真实后端（test env）→ 登录→列表→创建→详情→错误路径；覆盖 3 种角色 anon/member/admin；关键写路径 | Playwright 项目 chromium + webkit；CI 无头 | 单 spec ≤ 60s；`make test-e2e` 全量 < 15 min |

#### 5.2.2 覆盖率阈值（`vitest.config.ts` coverage）

| 路径 | 行覆盖率下限 | 说明 |
|---|---|---|
| 总体 `src/` | **≥ 75%** | `make test` MUST 达标；PR 低于打回补测 |
| `src/components/common/`（T2 通用）| **≥ 90%** | DataTable、ConfirmDialog、RoleGuard、EmptyState；跨域共享风险高 |
| `src/lib/api/`（契约层）| **≥ 85%** | Query keys + 错误翻译 + 刷新逻辑 |
| `server/`（BFF + auth）| **≥ 85%** | assertAllowedOrigin、Zod 校验、Cookie 读写、401 刷新 |
| `src/i18n/` | 0（语言包纯数据）| missing key 由 lint 检查代替 coverage |
| `src/components/{domain}/`（T3） | ≥ 70% | 业务组件 |
| `app/`（Next.js 页面层） | ≥ 60% | 主要靠 E2E 连带覆盖 |

#### 5.2.3 i18n 三语必查 + Lighthouse 目标

| 项 | 工具 / 命令 | 阈值 |
|---|---|---|
| i18n missing key | 自定义 `scripts/i18n-lint.mjs` 扫描 `t('...')` → 对比 zh/en/zh-TW 三文件 | missing = 0；unused MAY ≤ 5%（可附 issue 追踪清理） |
| Lighthouse Performance（首页） | CI `lhci autorun` 或 `npx playwright-lighthouse` | ≥ 90；首屏 TTI < 2s（4G/常规机器） |
| Lighthouse Accessibility | 同上 | ≥ 90；颜色对比、aria-label、role 齐全 |
| Lighthouse Best Practices | 同上 | ≥ 90；图片正确 aspect ratio、XSS 防护头 |
| Bundle size | `next build` → Build Output Analysis | 单路由 gzip ≤ 150KB；首页无第三方 > 50KB 脚本 |

#### 5.2.4 性能实践条目

| 项 | 实践 | 说明 |
|---|---|---|
| **图片** | 全用 `<Image>` 优化；头像 width/height 声明；对象存储自定义 loader；`priority` 首屏关键图；懒加载非首屏 | |
| **RSC vs Client 划分** | 默认 RSC（Shell 布局、列表骨架）；交互下沉最小 Client 组件；避免整页 `'use client'` | RSC 减小 JS bundle |
| **Bundle 拆分** | `next/dynamic` 动态 import 大组件：Markdown 编辑器、Recharts 图表、LLM Chat 面板；`ssr:false` 仅客户端依赖 | 路由级 JS 瘦身 |
| **字体** | `next/font/google` 自托管字体；预加载 subset；避免布局偏移 CLS < 0.01 | |
| **水合** | 避免长任务 > 50ms；关键交互（登录按钮、报名按钮）`useDeferredValue` 延后非关键渲染；`Suspense` 分段 loading | |
| **缓存 / ISR** | 公开列表 MAY ISR `revalidate = 300`；用户私有页 MUST `dynamic = 'force-dynamic'`；BFF 列表 MAY CDN s-maxage（见 §2.3 MAY） | |
| **监控** | 生产 MUST 集成 Sentry/Vercel Analytics/Web Vitals；CLS/LCP/FCP/INP 指标告警阈值 | 与 FrontSec §5 运行时监测联动 |

### 5.3 不变量与约束（RFC2119）

**MUST（铁律红线）：**
1. 测试 **MUST** 二层职责严格对齐 §5.2.1；Unit **MUST NOT** 起 Next.js 服务连真实后端；E2E **MUST NOT** mock 掉 BFF / 后端（否则假绿）
2. 覆盖率阈值 **MUST** 达标 §5.2.2；PR **MUST** 本地 `make test` 与 CI 一致；低于阈值 MUST 打回补测；**MUST NOT**「先合后补」
3. 新组件 / 新 hooks / 新 BFF 路由 **MUST** 伴随测试：核心公共组件 DataTable/ConfirmDialog/AuthProvider MUST ≥ 90%；**MUST NOT** 裸上 PR 无测试
4. i18n missing key **MUST** = 0；自定义 i18n-lint MUST 在 pre-commit / CI 双跑；**MUST NOT** 上线只有中文缺 en/zh-TW（国际用户体验红线）
5. Lighthouse Performance + Accessibility **MUST** ≥ 90（首页 / 核心页面）；PR 合入前 MUST 本地跑 Lighthouse；**MUST NOT** 低于红线直接合
6. Bundle size 单路由 gzip **MUST** ≤ 150KB；大编辑器/图表 MUST `next/dynamic` 拆分；**MUST NOT** 单路由超过 300KB（移动端首屏白屏风险）
7. 图片 **MUST** `<Image>` + width/height 声明 + 懒加载非首屏；**MUST NOT** 裸 `<img>` 标签（FrontDoc-01-Arch 3.1.1 上位）
8. 用户私有页 **MUST** `export const dynamic = 'force-dynamic'`；**MUST NOT** 静态生成用户 A dashboard 缓存给用户 B（数据泄露风险）

**MUST NOT（禁止事项）：**
1. **MUST NOT** 写 `describe('button', () => { it('works') })` 无意义断言（`expect(1+1).toBe(2)`）凑覆盖率；覆盖率是质量工具，不得造假
2. **MUST NOT** 用 `toHaveClass('bg-red-500')` 断言 Tailwind class（重命名 class 后测试全黄）；**SHOULD** 断言语义（role、text、`toBeInTheDocument`、`toHaveAccessibleName`）
3. **MUST NOT** 测试依赖真实网络调用第三方；**MUST** msw 或 vi.mock；离线 `npm test` MUST 通过
4. **MUST NOT** `next build` 出现 `Warning: data being parsed as...` hydration mismatch；RSC/Client 边界 MUST 清晰；开发期 MUST 0 条 hydration 警告
5. **MUST NOT** 首屏加载 `Lighthouse` 加载第三方脚本（Google Analytics、广告、聊天工具）> 50KB；**SHOULD** `strategy: 'lazyOnload'` 延迟加载
6. **MUST NOT** E2E 用「sleep 5s」等待异步；**MUST** Playwright auto-waiting（`locator.waitFor({ state: 'visible' })` + `expect(locator).toBeVisible()`）
7. **MUST NOT** i18n 直接拼接：`t('exams.success') + ' - ' + examId` → MUST ICU 模板 `t('exams.success_with_id', { id: examId })`（语序不同语言不同）

**SHOULD（建议事项）：**
1. **SHOULD** Playwright global setup 统一 `storageState`（登录态保存）；避免每个 spec 重复登录（提升 E2E 速度 2-3x）
2. **SHOULD** 视觉回归（Playwright snapshots）对 T2 通用组件（DataTable header / ConfirmDialog 文案）；改颜色/字体 CR 时 snapshot diff reviewer 一眼看到
3. **SHOULD** `@testing-library/jest-dom` 语义断言（`toBeDisabled`、`toHaveAccessibleDescription`、`toBeInvalid`），替代 DOM 结构断言
4. **SHOULD** Bundle Size GitHub PR Comment（`nextjs-bundle-analysis`）；PR 增/减 KB diff 自动贴评论，reviewer 一目了然
5. **SHOULD** 性能监控 dash（LCP/CLS/INP）+ 告警阈值（INP > 200ms 告警），快速定位线上退化

**MAY（可选配置）：**
1. **MAY** 引入 `@vitest/coverage-v8` 行覆盖率 + 分支覆盖率双阈值；复杂业务分支覆盖率 MAY ≥ 80%
2. **MAY** 引入 `axe-core` + Playwright 自动跑无障碍扫描；a11y 违规 MUST 阻断
3. **MAY** 开发期启用 `React.StrictMode` + `next dev --experimental-use-no-cdn`，提前发现双调用和不规范副作用

### 5.4 自检 CheckList

- [ ] 测试二层职责：Unit 0 起真实 Next；E2E 0 mock BFF
- [ ] 覆盖率：总体 ≥ 75%、T2 common ≥ 90%、server/BFF ≥ 85%
- [ ] i18n missing：lint 0 警告；ICU 模板；0 处字符串拼接翻译
- [ ] Lighthouse：Performance + A11y ≥ 90；单路由 gzip ≤ 150KB
- [ ] 图片：0 处裸 `<img>`；非首屏懒加载；对象存储自定义 loader
- [ ] 私有页：`dynamic='force-dynamic'`；0 处 ISR 用户私有数据缓存
- [ ] Playwright：0 `sleep`；auto-wait + storageState 全局登录；≥ 80% 核心路径覆盖

---

## §6 变更门禁

> 本章为 Pre-commit 必查清单。每次提交涉及目录结构、BFF 路由、组件体系、状态管理、测试、i18n、性能的任何变更前，提交人 **MUST** 逐项自查并在 PR 描述中打钩；CR 审核人 **MUST** 核对本清单并在未打钩时打回。

### §6.1 通用门禁

- [ ] 变更是否影响 §1–§5 任一 MUST/MUST NOT 约束？若是，本节约束文字 **MUST** 已同步更新
- [ ] `make ci` 前端子仓：`make lint (eslint --fix) + make typecheck (tsc --noEmit) + make test (vitest) + make test-e2e (playwright) + docs-health + gen-doc-facts` 全绿
- [ ] 6 行元数据头：版本号、变更日期已同步更新（若改动文档本身）
- [ ] 跨仓同步：若改动 `/api/v1` 契约/DTO/枚举/字段风格，后端 Schema 与移动端 ApiClient MUST 同步 PR 已关联
- [ ] 版本三源：`make gen-doc-facts` 0 diff（RootEngConv §2 上位）

### §6.2 目录结构门禁（§1 相关）

- [ ] 六区职责边界：0 页面直 fetch / 0 组件直 fetch / 0 BFF 自定义 DTO
- [ ] 目录骨架：BFF 三级 route、契约层一域一文件、业务组件按域聚合；无域 common/layout 归类正确
- [ ] 枚举/权限：0 本地副本；全契约层导入
- [ ] Route Group：(dashboard) / (auth) 分组正确；平铺开域目录 ≤ 5
- [ ] 默认 Server Component；'use client' 仅交互组件；0 window SSR 错误

### §6.3 BFF 路由门禁（§2 相关）

- [ ] 写端点链：Origin→Zod→preload→[权限]→proxy→统一错误 6 步；0 跳过
- [ ] SSRF 防：proxyBackend 0 用户可控 URL；路径白名单
- [ ] Zod：分档四套 Create/Update/List/Action；page_size ≤ 100；sort_by enum；0 `z.any()`
- [ ] Cookie 属性对齐：HttpOnly+Secure+SameSite
- [ ] 401 刷新：mutex 单飞；并发刷新 0 误踢

### §6.4 组件与样式门禁（§3 相关）

- [ ] UI：仅 shadcn + Tailwind + Radix；0 处 AntD/MUI；T1 ui/* 0 手动修改
- [ ] Props：value/onChange、open/onOpenChange 受控命名；isLoading/disabled；0 val/toggle 变体
- [ ] className：cn() 合并；0 裸字符串；颜色 0 HEX/RGB；全 Token
- [ ] i18n：0 硬编码中文；zh/en/zh-TW 三全；Key 领域.页面.组件.语义
- [ ] 通用：DataTable + ConfirmDialog + RoleGuard + Next Image 全复用

### §6.5 状态 / Query 门禁（§4 相关）

- [ ] 服务端状态：0 Zustand 列表/详情/权限；全 TanStack Query
- [ ] Query keys：四层 `[domain, resource, id?, filters?]`；0 字符串漂移
- [ ] 写操作 invalidateQueries：MUST 对应 keys；乐观更新 MAY 不替代 invalidate
- [ ] SafeUser / 权限：`['auth','me']` Query；0 本地副本
- [ ] 大列表：>1k virtual + infinite；0 page_size=10000

### §6.6 测试 / i18n / 性能门禁（§5 相关）

- [ ] 测试二层：Unit 0 Next 服务；E2E 0 mock BFF
- [ ] 覆盖率：总体 ≥ 75% / common ≥ 90%；新组件有测试
- [ ] i18n：lint 0 missing；ICU 模板；0 拼接翻译
- [ ] Lighthouse：Perf + A11y ≥ 90；Bundle 单路由 ≤ 150KB gzip
- [ ] 性能：裸 `<img>` 0；私有页 force-dynamic；长任务 0 > 50ms 无 defer

---

> ↩ **返回前端文档地图**：[FrontDoc-01-Arch.md](FrontDoc-01-Arch.md) · [FrontDoc-02-Sec.md](FrontDoc-02-Sec.md) · **UI 标准**：[RootDoc-UIStandard.md](../../../docs/RootDoc-UIStandard.md) · **跨仓通用约定**：[RootDoc-EngConv.md](../../../docs/RootDoc-EngConv.md) · **命名门禁**：[RootDoc-ModuleMap.md](../../../docs/RootDoc-ModuleMap.md)