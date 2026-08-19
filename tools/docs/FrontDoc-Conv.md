# 前端编码规范（FrontDoc-Conv）

> 更新人：3yearsZ
> 最后更新：2026-08-09（新建：对标后端 BackDoc-Conv.md，收拢 RootDoc-EngConv.md §十 与 FrontDoc-UID.md §10 的前端编码约定，形成前端专项编码规范）
> 关联：通用工程规范见根 [`RootDoc-EngConv.md`](../../../docs/RootDoc-EngConv.md)；架构与业务模块契约见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md)；视觉与交互规范见 [FrontDoc-UID.md](FrontDoc-UID.md)；目录设计方法论见根 [RootDoc-FEArch.md](../../../docs/RootDoc-FEArch.md)；面向新人的聚合摘要见根 [docs/Onboarding.md](../../../docs/Onboarding.md#附录-a前端工程规则)

本项目的编码规范、目录组织与通用约定。**所有前端贡献者（含 AI Agent）在写代码前必须先读本文档**。

> 框架无关的通用工程规范（命名 / DRY / 圈复杂度 / 错误处理 / 安全 / 配置 / 测试 / Git）已提炼到根仓库 [`RootDoc-EngConv.md`](../../../docs/RootDoc-EngConv.md)，本文档侧重 TypeScript / React / Next.js 强相关的前端专项约定。
> **约定类文档边界**：前端专项约定以本文档（编码规范）与 `FrontDoc-01-Arch.md`（架构）、`FrontDoc-UID.md`（UI 规范）为权威；通用（两端共用）规范见根 `docs/RootDoc-EngConv.md`；`docs/Onboarding.md` 附录 A 为新人聚合摘要（非权威），细则指回权威文件。

> 文档优先级：场景内具体指令 > 本文档 > `RootDoc-EngConv.md` > 通用工作流。

---

## 1. 项目结构总览

> 完整 `src/` 目录树、模块分层与依赖矩阵见 [FrontDoc-01-Arch.md §1](FrontDoc-01-Arch.md#1-part-a项目架构)；目录设计方法论见根 [RootDoc-FEArch.md §3.2](../../../docs/RootDoc-FEArch.md#32-项目骨架cs-web-frontend-真实结构)。此处仅列与编码强相关的约束。

```
src/
├── app/                    # 页面路由 + BFF API 路由（Next.js App Router）
├── components/             # 全局组件（primitives/layout/effects/feedback + 根级）
├── modules/                # 业务模块（types/ + ui/ 两层）
├── shared/                 # 共享基础设施（backend-client / config / hooks / security / types / utils）
└── i18n/                   # 国际化（languages/{zh-CN,en}）
```

### 分层调用规则（铁律）

- **数据访问**：组件/模块禁止直接 `fetch` 后端地址，一律经 BFF API 路由（`src/app/api/**/route.ts` → `shared/backend-client.ts` 转发）。
- **依赖方向（单向）**：`模块组件 → 全局组件`；全局组件**禁止反向 import 任何 `src/modules/*`**（详见 UID §5.0 复用契约）。
- **跨模块引用**：类型引用必须用 `import type`（编译后无运行时依赖），禁止跨模块 import 运行时实现（详见 [FrontDoc-Conv §12](FrontDoc-Conv.md#12-禁止事项汇总) / Onboarding 附录 A.3 模块协作契约）。

### 文件放置规则

| 类型 | 放置位置 |
|---|---|
| 通用原子件（按钮/输入/焦点环等） | `components/primitives/` |
| 页面骨架 / 导航 / Hero | `components/layout/` |
| 入场 / 过渡动效原语 | `components/effects/` |
| 加载 / 空 / 错 / 成功四态 | `components/feedback/` |
| 跨页面全局件 | `components/`（顶层） |
| 业务模块组件 | `modules/<域>/ui/` |
| 业务模块类型 | `modules/<域>/types/` |
| 跨域类型 | `shared/types/` |
| 跨域工具函数 | `shared/utils/` |
| 跨域 hooks | `shared/hooks/` |

---

## 2. 命名规范

| 对象 | 规范 | 示例 |
|---|---|---|
| 组件文件 | `PascalCase.tsx`，与默认导出同名 | `Button.tsx` → `Button` |
| 普通文件 | `kebab-case` | `use-collapsing-hero.ts`、`floating-capsule-sidebar.tsx` |
| Hook | `useXxx.ts` | `useCollapsingHero` |
| 工具函数 | `[功能]-utils.ts` / `camelCase` | `pagination`、`getTodayStart` |
| 类型 / 接口 | `PascalCase` | `CapsuleTab`、`CommunityTopic` |
| 常量 | `UPPER_SNAKE_CASE` | `FORM_LIMITS`、`DEFAULT_PAGE_SIZE` |
| 桶导出 | `index.ts` | 聚合导出 |

---

## 3. TypeScript / React / Next.js 约定

### 3.1 React Compiler 红线

> 前端按 React Compiler 语义编写（自动记忆组件与 Hook 返回值），以下为不可违反的红线：

- **Hook 返回值不得混入 ref 对象**：`useMemo` / 自定义 Hook 的返回值若包含 `useRef` 产物，React Compiler 会误将其当作可记忆值缓存，导致引用错乱；需记忆的状态与 ref 必须分开返回。
- **`useCallback` 闭包用到 ref 时，ref 必须列入依赖数组**：`ref.current` 变化不被自动追踪，漏写依赖会读到过期值。

> 现状：当前 `CS-Web-Frontend/next.config.ts` 尚未显式开启 `compiler.reactCompiler`，上述红线作为**防御性约定**先行落实；编译器启用后即为硬性约束。[待填写：确认 React Compiler 是否已在 0.9.8 启用]

### 3.2 客户端 / 服务端边界

- `'use client'` 指令位于文件头 JSDoc 之后（注释允许出现在指令之前，指令仍被正确识别）；**禁止 `'use client'` 出现在 import 语句之后**。
- `'use client'` 仅用于需要 hooks / 交互的组件；数据获取在客户端 `useEffect` 中用 `fetch`（BFF API）。
- API 路由遵循 Next.js App Router 约定（`route.ts`），BFF 薄转发。
- **server-only 边界**（详见 ADR-010）：任何 import `nodemailer` / `crypto` / `fs` / `pino` 的文件首行 `import 'server-only'`，客户端组件禁止 import；`src/shared/server-only.ts` 本地空实现兜底自定义 dev server。

---

## 4. 代码质量红线

> 通用红线（文件大小、单一职责、DRY 三次法则、圈复杂度 ≤ 10、禁止散落魔法值、禁止硬编码）见根 [`RootDoc-EngConv.md`](../../../docs/RootDoc-EngConv.md) §二。本节只列前端专属补充。

- **组件规模**：组件总行数 > **500** 必须拆分（样式 > 200 行 / 逻辑 > 150 行 → 拆出 hook / 子组件 / util）。
- **状态变量**：useState 等状态变量 > 10 个 → 拆子组件 + 状态管理。
- **复用阈值**：重复 UI 结构 ≥ 2 次 → 抽取为 primitives 原子件；模块内组件被 ≥ 2 个模块复用 → 评审后提升为全局。
- **导入依赖**：单文件导入 > 10 个 → 提取服务层 / 收口导出。
- **拆分四法**：按功能 / 按 UI 层级 / 按关注点 / 提取通用容器。

---

## 5. 样式与视觉令牌约定

> 视觉规范（颜色语义 / 字体 / 布局 / 动效 / 组件外观）见 [FrontDoc-UID.md](FrontDoc-UID.md)，本文档只列**编码侧**样式约束。

- **必须用 Tailwind 工具类**，禁止内联 `style`（动态计算例外）。
- CSS 变量通过 `var(--xxx)` 在 Tailwind 任意值中引用（如 `text-[var(--primary)]`），颜色、圆角、阴影、z-index、动效时长全部走 `src/app/globals.css` token。
- **禁止散落硬编码 hex**：颜色必须走项目令牌（`var(--primary)` / `var(--foreground)` / `var(--muted-foreground)` / `var(--destructive)` / `var(--border)` / `var(--chart-1..n)`）或 Tailwind 语义色板（emerald / amber / red / blue / green 等）。
  - 例外：SVG `stroke` / `fill` 无法用类名时，集中收口到常量文件（如 `src/modules/workbench/widgets/pomodoro/constants.ts`）并注释色板来源，不得就地写 hex。
- 动态 className 用模板字符串 + 三元，不引入 `clsx` / `classnames`。
- 中文排版：汉字间不留空格、中英文间留空格、中文与数字间留空格（见根 [`RootDoc-EngConv.md`](../../../docs/RootDoc-EngConv.md) §九）。

---

## 6. 文件头注释（JSDoc）

每个组件 / 页面必须有 JSDoc 头注释：

```tsx
/**
 * @file 组件/页面名称 - 一句话描述
 *
 * 设计原则：
 *   - 原则 1
 *   - 原则 2
 *
 * 视觉层次：
 *   [ 00 ] - SectionName -> 描述
 *   [ 01 ] - SectionName -> 描述
 *
 * 数据流：
 *   - GET /api/xxx -> 数据
 *
 * 移动端兼容：
 *   - 适配说明
 */
```

---

## 7. 组件体系与复用契约

> 完整分层与复用层级见 [FrontDoc-UID.md §5.0](FrontDoc-UID.md#50-全局组件体系与复用契约)；目录设计方法论见根 [RootDoc-FEArch.md](../../../docs/RootDoc-FEArch.md) §2.1。

- 前端组件分两层：**全局设计系统**（`src/components/`，零业务依赖，全站复用）与**模块局部组件**（`src/modules/*/ui/`，仅本模块使用）。
- 复用契约：
  1. 一律从 `primitives` 取按钮 / 输入 / 焦点环，禁止在模块里重造原子组件。
  2. 模块组件可 import 全局组件；全局组件不得 import 模块组件（保持零业务依赖）。
  3. 模块内组件若被 ≥ 2 个模块复用，应评审后提升为全局 `primitives`（新增全局原语须评审）。

---

## 8. 工作台 widget：注册表约定

- 新增工作台（workbench）widget 必须三步：① 在 `src/modules/workbench/widget-registry.ts` 的 `WIDGETS` 数组声明（`id` / `slot` / `titleKey`）；② 组装组件（建议放 `src/modules/workbench/widgets/`）；③ 工作台按 `slot`（`full` / `main` / `side`）自动渲染。
- `widget-registry` 是渲染的**唯一事实源**：未注册的组件不出现在工作台；布局显隐由用户偏好 `wb_widget_prefs`（localStorage）驱动，无需改骨架。
- 新增 widget 通常还需配套 i18n 词条（见 §9）与（如涉及）后端 `/api/workbench/**` 路由（经前端 BFF 薄转发）。

---

## 9. i18n 约定

> 完整国际化迁移指南见 [FrontDoc-i18n.md](FrontDoc-i18n.md)。

- 文案统一走 `useTranslations('<namespace>')`，词条定义在 `src/i18n/messages/*.ts`。
- 新增 / 修改一条 workbench 文案，必须同步**三处**，否则 `AppMessages` 类型编译失败或运行时缺译：
  1. **类型（interface）**：`src/i18n/types.ts` 内 namespace 块新增 key；
  2. **中文（zhCN）**：`src/i18n/messages/` 内 `zhCN` 对象给出中文串；
  3. **英文（en）**：`src/i18n/messages/` 内 `en` 对象给出英文串。
- 聚合入口 `src/i18n/languages/{zh-CN,en}.ts` 自动展开，无需手动登记。

---

## 10. 测试约定

> 通用测试约定（三类路径、边界用例）见根 [`RootDoc-EngConv.md`](../../../docs/RootDoc-EngConv.md) §六。

- **目录**：`tools/tests/` 按模块分组；E2E 在 `tools/tests/e2e/`。
- **框架**：Vitest（单元）+ Playwright（E2E）。
- **要求**：新增 / 修改业务逻辑必须补测试；测试数据必须模拟真实写入路径（UI / API 写什么格式，测试就构造什么格式），覆盖边界用例（空字符串、null、临界值）。
- **类型检查**：`pnpm run ts-check` / `tsc --noEmit` + `eslint` 必须 0 错误。

---

## 11. Git 与提交

> 通用 Git 约定（提交格式 `<type>(<scope>): <subject>`、不主动 commit / push、侵入性操作先说明范围）见根 [`RootDoc-EngConv.md`](../../../docs/RootDoc-EngConv.md) §七。

- **禁止提交**：`*.db`、`logs/`、`test-results/`、密钥、本地环境覆盖文件（`.env.local` 等）。
- 前端子仓库**无独立 CHANGELOG.md**（薄锚点已于 2026-08-17 删除），版本锚点一律以根仓 [`CHANGELOG.md`](../../../CHANGELOG.md) 为准。

---

## 12. 禁止事项汇总

> 视觉侧禁止清单（硬编码颜色、默认阴影、发光、白名单外圆角、ease-in-out、渐变等）见 [FrontDoc-UID.md §11](FrontDoc-UID.md#11-ui-专属禁止清单)；安全侧见 [FrontDoc-02-Sec.md](FrontDoc-02-Sec.md)。本节仅列**编码侧**前端专属禁止项。

- 禁止 `console.log` 留在生产代码（用专门日志或删除）。
- 禁止 CSS `@import` 拉取 Google Fonts（字体必须走 `next/font/google` 自托管，见 UID §2）。
- 禁止用 `.sh` 脚本（用 `.mjs` Node 脚本）。
- 禁止引入 `react-dev-inspector`（与 Turbopack 不兼容）。
- 禁止引入 Vite 依赖（使用 Next.js + Turbopack；`vitest` 可保留，仅测试）。
- 禁止引入未在 `package.json` 中声明的依赖 / 未经评审的新库。
- 禁止跨模块直接 import server 代码（类型引用用 `import type`）。
- 禁止在 `types/index.ts` 引入运行时依赖（破坏 server-only 边界）。
- 禁止组件直连后端地址（一律走 BFF API 路由）。
- 禁止模块间循环依赖（类型引用用 `import type`，确保编译后无运行时依赖）。

---

## 13. 检查清单（提交前自查）

- [ ] 新代码风格与周围代码一致（命名、React Compiler 红线、错误处理）？
- [ ] 改动半径最小？没有顺手重构无关模块？
- [ ] 组件未超 ~500 行？逻辑 < 150 行 / 状态 < 10 个？
- [ ] 通用原子件已从 `components/primitives/` 取用，没有重造？
- [ ] 业务组件放对模块（`modules/<域>/ui/`）？没有散落多目录？
- [ ] 数据走 BFF API（`app/api/**/route.ts`）？没有组件直连后端？
- [ ] 颜色 / 圆角 / 阴影 / z-index / 动效全部用 `globals.css` token？没有硬编码 hex？
- [ ] 文件头 JSDoc 完整，`'use client'` 在 JSDoc 之后？
- [ ] 新增 widget 已在 `widget-registry.ts` 声明（声明 → 配置 → 注册三步）？
- [ ] 新增 i18n 文案已同步类型 / zhCN / en 三处？
- [ ] 测试已补（正向 / 反向 / 边界）？`pnpm run ts-check` + `eslint` 通过？
- [ ] 新增禁止事项已登记 `FrontDoc-Conv §12`（编码侧）/ `FrontDoc-UID §11`（UI 侧）？

---

## 14. 深链接（端侧完整规范）

| 端 | 权威文档 |
|---|---|
| 编码规范 | 本文档 `FrontDoc-Conv.md`（前端专项：TS/React/Next.js 约定、样式令牌、JSDoc、组件契约） |
| 架构 | `FrontDoc-01-Arch.md`（BFF 架构 + 业务模块契约 Part B + 前后端联动） |
| 视觉 / 交互 | `FrontDoc-UID.md`（颜色 / 字体 / 布局 / 组件外观 / 动效 / 交互） |
| 安全 | `FrontDoc-02-Sec.md`（CSP、Origin 校验、安全约束） |
| 运维 | `FrontDoc-Ops.md`（部署、SLO、回滚 Runbook） |
| 国际化 | `FrontDoc-i18n.md` |
| 方法论 | 根 `RootDoc-FEArch.md`（目录设计艺术） |
| 通用工程 | 根 `RootDoc-EngConv.md`（命名 / DRY / 圈复杂度 / 错误处理 / 安全 / 配置 / 测试 / Git） |
