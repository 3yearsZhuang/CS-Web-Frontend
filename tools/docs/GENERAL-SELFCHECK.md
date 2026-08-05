# CS-Web-Frontend 对照 GENERAL.md 自检报告

> 检查日期：2026-08-05
> 对照文档：`tools/docs/GENERAL.md`（最后更新 2026-08-04）
> 项目形态：Next.js 16 App Router + React 19 + Tailwind v4 + drizzle-orm

## 总评

| 维度 | 结论 | 说明 |
|------|------|------|
| 目录骨架（3.2） | ✅ 基本合规 | 框架适配良好，职责分层清晰 |
| 路径别名（3.6/5） | ✅ 合规 | 已配 `@/*` |
| 配置聚合（2.3） | ✅ 合规 | `shared/config/index.ts` 聚合导出 |
| 类型集中（3.7/4） | ✅ 合规 | `shared/types/` 子目录分文件，非巨型单文件 |
| 通用组件库（6.2.1） | ✅ 合规 | Button/Input 仅一份，无散落副本 |
| 样式 `!important`（2.5） | ✅ 基本合规 | 仅 globals.css 1 处第三方覆盖 |
| 模块自包含（3.4） | ⚠️ 部分合规 | server/types/ui 分层好，但缺 hooks 目录与 ui 桶导出 |
| **组件体量红线（2.4）** | ❌ **严重违规** | 8 个文件超 500 行，最大 1801 行 |
| **硬编码颜色（6.3.2）** | ❌ 违规 | 多处 rgb/hex 硬编码 |
| **Hooks 分离（2.2/2.4）** | ❌ 违规 | 页面内联定义 `useBreakpoint` |
| **目录文档（3.7）** | ❌ 违规 | 无任一处目录级 README |
| 组件级测试（3.8） | ⚠️ 缺失 | 测试全在 `tools/tests/`，UI/组件零测试 |
| i18n（3.2） | ⚠️ 未落地 | 无 i18n 目录（按需，非硬约束） |

---

## 一、严重违规项（必须整改）

### 1.1 组件体量超红线（GENERAL 2.4：组件总行数 > 500 必须拆分）

实测行数（`wc -l`）：

| 文件 | 行数 | 超阈值倍数 |
|------|------|-----------|
| `src/modules/community/ui/forum-admin-panel.tsx` | **1801** | ~3.6× |
| `src/modules/admin/ui/admin-users-panel.tsx` | **1569** | ~3.1× |
| `src/modules/admin/ui/admin-events-panel.tsx` | **1274** | ~2.5× |
| `src/modules/tools/ui/admin-tools-panel.tsx` | **1080** | ~2.2× |
| `src/modules/admin/ui/admin-roles-panel.tsx` | **919** | ~1.8× |
| `src/modules/admin/ui/admin-messages-panel.tsx` | **719** | ~1.4× |
| `src/modules/auth/ui/two-factor-settings.tsx` | **638** | ~1.3× |
| `src/modules/admin/ui/admin-logs-panel.tsx` | **497** | 临界 |

**改进意见**：
- 按「关注点」拆分：每个 admin panel 内部多为多个独立子面板/标签页，应拆为 `ui/panels/*.tsx`，由父组件组合（符合 2.4「按关注点拆分」+ 3.3「目录即模块」）。
- 按「复用阈值」反推：面板内重复出现的表格行、表单段、模态框应先抽为 molecules（`src/components/` 已有 primitives 体系，可加 `molecules/`）。
- 状态变量若 > 10 个（2.4），用 Context/reducer 下沉到模块 `hooks/` 或 `ui/store.tsx`（项目已有 `component-registry-store.tsx` 先例可参考）。
- **注意**：拆分属「重构无关代码」，受 6.5 约束——需作为独立专项任务进行，且每处改动说明理由，不要顺手改其他逻辑。

### 1.2 硬编码颜色/魔法值（GENERAL 6.3.2：禁用硬编码颜色/断点）

实测 `rgb()/rgba()/#hex` 出现在：

- `src/modules/community/ui/forum-admin-panel.tsx`（5 处）
- `src/components/effects/mobius-ring.tsx`（11 处）
- `src/components/effects/page-transition.tsx`（2 处）
- `src/components/layout/page-header-background.tsx`（1 处）
- `src/app/login/page.tsx`（3 处）
- `src/app/page.tsx`（1 处）

**改进意见**：
- 统一改用 Tailwind 设计令牌（主题 CSS 变量）或 `shared/config` 中已有的 theme 常量。
- 动画特效类（mobius-ring、page-transition）若确需精确色值，应定义为主题 CSS 变量而非内联字面值，便于暗色模式一致（文档 2.5 要求主题走设计令牌）。
- 断点（如 `useBreakpoint` 中的数值）应提取到 `shared/constants` 或 Tailwind 配置。

### 1.3 页面内联定义 Hook（GENERAL 2.2/2.4：逻辑 > 150 行提为 Hook）

`src/app/page.tsx:82` 定义了 `function useBreakpoint()`，位于页面文件内，未抽到 `shared/hooks/`。

**改进意见**：
- 迁移至 `src/shared/hooks/use-breakpoint.ts`，并在 `shared/hooks/index.ts` 桶导出（与 `use-debounce`、`use-collapsing-hero` 等保持一致范式）。
- 若仅首页使用且确定不复用，按 6.2.4「仅在确定会被多处使用时才抽离」可保留，但需在文件头部注释说明原因（符合 6.6.3 显式说明）。

---

## 二、部分合规项（建议补齐）

### 2.1 模块自包含度（GENERAL 3.3/3.4）

现状：`modules/<domain>/` 均为 `server/ types/ ui/` 三层，业务边界清晰 ✅。
缺失：
- 各域**未带独立 `hooks/` 目录**（文档 3.4 三条规则第 3 条："每个域自带 hooks/ types.ts"）。
- `modules/<domain>/ui/` **无 `index.ts` 桶导出**（目录即模块要求 `index.ts` 桶导出；目前仅 `server/` 有）。

**改进意见**（低优先级，按需）：
- 当某域 hooks 增多时，在域内建 `hooks/`，避免全部塞进 `shared/hooks`（3.4 规则 2：域内复用就在域内建子目录）。
- 为 `ui/` 补 `index.ts` 聚合导出，统一消费入口。

### 2.2 组件级测试（GENERAL 3.8）

现状：测试全部位于 `tools/tests/*.test.ts`（后端/工具层），`src/` 内 UI/组件零单元测试。

**改进意见**：
- 优先为已超红线的拆分后组件、以及 `primitives/` 原子件补 Vitest + RTL 测试（文档 2.4「拆分即补测」、3.8「tests 覆盖拆分后组件」）。
- 与现有 `vitest.config.ts` 体系对齐，避免新建测试框架（6.4.2 禁止多种同类库）。

### 2.3 i18n（GENERAL 3.2）

现状：无 `i18n/` 目录。文档将其列入标准骨架但属「按需」项。当前项目若仅单一语言，可暂缓，但**若计划多语言应在骨架期补齐**（5.落地清单未强制 i18n）。

---

## 三、合规良好的项（保持）

- ✅ **目录按职责分层**（3.1）：`app/ components/ modules/ shared/` 明确，无按后缀分组。
- ✅ **路径别名**（3.6）：`tsconfig.json` 配 `@/*`，消除深路径。
- ✅ **配置聚合**（2.3）：`shared/config/index.ts` 聚合；`shared/types/` 分文件非巨型单文件。
- ✅ **通用组件唯一**（6.2.1）：`Button`/`Input` 仅 `primitives/` 一份，无重复创建。
- ✅ **`!important` 克制**（2.5）：全仓仅 `globals.css:627` 一处 `.prose-ark * { transition: none !important }`，属第三方 markdown 渲染覆盖例外，符合「仅第三方注入样式例外」。建议在该处补一行注释标注「第三方 prose 覆盖 · 已审批」以完全满足文档「须集中、须审批」。
- ✅ **状态管理用框架能力**（6.4.4）：用 React Context + useReducer（如 `component-registry-store.tsx`、`toast`、`confirm-dialog`），未自行封装与框架等价的底层状态库。
- ✅ **组件头部注释**（3.7）：`components/` 下 27 个文件带 `@file/@description`，远超一般项目文档伴随度。
- ✅ **工程化闭环**（3.8）：`package.json` 串起 lint/ts-check/test/build + `packageManager: pnpm` + CI 友好脚本。

---

## 四、整改优先级建议

| 优先级 | 项 | 对应条款 | 动作 |
|--------|----|----------|------|
| P0 | 8 个超 500 行组件拆分 | 2.4 | 独立重构专项，按关注点拆子面板 |
| P0 | 硬编码颜色清理 | 6.3.2 | 改用主题令牌/CSS 变量 |
| P1 | `useBreakpoint` 抽离 | 2.2/2.4 | 迁 `shared/hooks/` |
| P1 | 补组件级测试 | 3.8 | Vitest + RTL，先覆盖 primitives 与拆分件 |
| P2 | 模块 ui 桶导出 + 域内 hooks | 3.3/3.4 | 按需补 index.ts |
| P2 | 目录 README | 3.7 | 为 components/ modules/ 写清单 |
| P3 | i18n | 3.2 | 多语言需求时补 |

> 说明：P0/P1 整改涉及「拆分/重构」，受 GENERAL 6.5 约束，须作为明确任务、最小范围改动、每处说明理由，不与其它需求混改。

---

## 五、前端调整规划（基于 GENERAL.md 原则）

> 规划遵循 GENERAL 6.5（最小范围 / 说明理由 / 不复写无关代码）与 6.6（先列计划经确认再改）。
> 所有拆分/重构作为**独立专项任务**推进，不混入业务需求 PR。

### 5.0 规划总览（按 GENERAL 3.8 工程化闭环串联）

| 阶段 | 范围 | 依据条款 | 交付物 | 准入门槛 |
|------|------|----------|--------|----------|
| T0 基线 | 设计令牌与常量收口 | 2.5 / 6.3.2 / 6.1 | `shared/theme`、`shared/constants`、globals 注释 | 不影响任何组件渲染 |
| T1 拆大件 | 8 个 >500 行组件 | 2.4 / 3.3 / 6.5 | 各 panel 拆为 `ui/panels/*.tsx` + `index.ts` | 拆后行数 < 500，测试跑绿 |
| T2 去硬编码 | 颜色/断点字面值 | 6.3.2 / 2.5 | 改用令牌/CSS 变量 | lint 无硬编码告警 |
| T3 抽逻辑 | `useBreakpoint` 等 | 2.2 / 2.4 | `shared/hooks/use-breakpoint.ts` | 桶导出一致 |
| T4 补测试 | 原子件 + 拆分件 | 3.8 / 2.4 | `src/**/*.test.tsx` | 覆盖率门槛 |
| T5 文档化 | 目录 README + 头部 | 3.7 | README / `@description` | 评审通过 |

---

### T0 — 设计令牌与常量基线（先于一切样式整改）

**原则依据**：2.5「样式按变量→优先级克制」、6.3.2「禁止硬编码颜色/断点」。

1. 在 `shared/` 下新增 `theme/` 与 `constants/`：
   - `shared/theme/tokens.css`（或并入 `globals.css` 的 `:root`/`[data-theme]`）：集中声明语义色（--color-bg、--color-fg、--color-accent、--color-danger 等），供 Tailwind 通过 `@theme` 引用。
   - `shared/constants/breakpoints.ts`：导出 `BREAKPOINTS = { sm, md, lg, xl }` 与 `useBreakpoint` 判定阈值。
2. 将 `globals.css:627` 的 `transition: none !important` 补注释：`/* 第三方 prose 覆盖 · 已审批 · 仅限 .prose-ark */`，满足 2.5「须集中、须审批」。
3. **约束自检**：T0 只新增文件、不改任何消费方，符合 6.5.2「不删改无关代码」。

### T1 — 超红线组件拆分（核心，P0）

**原则依据**：2.4「组件 > 500 行必须拆分」、3.3「复杂组件 = 子目录即模块 + index.ts 桶导出」、2.4 拆分四法（按功能/UI 层级/关注点/通用容器）。

逐文件策略（以最大三个为例，其余同构）：

- `forum-admin-panel.tsx`(1801) → `community/ui/forum-admin/`
  - `ForumAdminPanel.tsx`（组合层 < 50 行，按 3.3）
  - `panels/`：`TopicManagePanel` `CategoryPanel` `ReportPanel` `UserManagePanel`（按 2.4「按关注点」）
  - `components/`：重复表格行/表单段抽为 `ForumTableRow` `AuditForm` 等 molecules
  - `hooks/useForumAdmin.ts`（状态 > 10 变量的下沉，按 2.4）
  - `types.ts` `index.ts`（桶导出）
- `admin-users-panel.tsx`(1569) / `admin-events-panel.tsx`(1274) / `admin-tools-panel.tsx`(1080) / `admin-roles-panel.tsx`(919) / `admin-messages-panel.tsx`(719) → 同构为 `admin/ui/users/`、`admin/ui/events/` ……
- `two-factor-settings.tsx`(638) → `auth/ui/two-factor/`
- `admin-logs-panel.tsx`(497) 临界，随 `admin/ui/logs/` 一并规整。

**复用阈值前置检查**（2.4 表）：拆分前先扫描面板间重复 UI 结构 ≥ 2 次者，统一提至 `components/primitives` 或新增 `components/molecules/`（当前 `components/` 仅有 primitives/layout/effects/feedback，缺 molecules 层——补建符合 2.1 四级分层）。

**接入仪式**（2.6）：拆出的子面板若可插拔，须「声明(类型)→配置(启用)→注册(渲染器登记)」三处齐全；普通子组件由父 panel 直接组合即可，无需注册表。

**约束**：T1 每拆一个文件，先在 PR 描述列明「原文件 → 新目录结构 + 各文件行数」，经确认再输出（6.6.1）；禁止顺手改业务逻辑（6.5.1）。

### T2 — 硬编码颜色/断点治理（P0）

**原则依据**：6.3.2、2.5。

1. 扫描清单（见 1.2）：`forum-admin-panel`(5) `mobius-ring`(11) `page-transition`(2) `page-header-background`(1) `login/page`(3) `page`(1)。
2. 业务组件（forum-admin、login、page）：替换为 T0 的语义令牌或 Tailwind 工具类。
3. 动画特效（mobius-ring、page-transition）：确需精确色值者，定义为主题 CSS 变量（如 `--fx-mobius-core`），避免内联字面量，保证暗色模式一致（2.5「主题切换走设计令牌」）。
4. 断点数值：迁 `shared/constants/breakpoints.ts`，`useBreakpoint` 引用之。
5. 配合 ESLint 规则（`no-restricted-syntax` 或自定义）拦截新增 `rgb()/hex` 字面量，固化 6.3.2。

### T3 — 逻辑抽离与 Hooks 规范（P1）

**原则依据**：2.2「展示与容器分离」、2.4「逻辑 > 150 行提为 Hook」、6.2.4「复用才抽离」。

1. `src/app/page.tsx:82` 的 `useBreakpoint` 迁至 `shared/hooks/use-breakpoint.ts`，在 `shared/hooks/index.ts` 桶导出（对齐现有 `use-debounce` 范式）。
2. 全仓普查页面内联 `function useXxx`（已发现 `page.tsx` 一处），按「≥2 处复用或逻辑 > 150 行」阈值决定是否抽离；仅单页使用且 < 150 行者，在文件头注释说明原因（6.6.3）。
3. 模块域内复用 hook（如 forum-admin 的复杂交互）落 `modules/<domain>/ui/hooks/`，遵循 3.4 规则 2「域内复用就在域内建子目录」。

### T4 — 组件级测试补齐（P1）

**原则依据**：3.8「tests 覆盖工具与拆分后组件」、2.4「拆分即补测」、6.4.2「禁止多种同类测试库」。

1. 测试栈复用现有 `vitest`（已配 `vitest.config.ts`）+ 引入 `@testing-library/react`（若未声明须先入 `package.json`，经 6.4.1 评审）。
2. 优先级：先 `components/primitives/*`（Button/Input/ConfirmDialog 等原子件，零业务依赖易测）→ 再覆盖 T1 拆出的 molecules/panels。
3. 测试位置：`src/**/*.test.tsx`，与组件同目录（贴合 3.3 目录即模块）。
4. 目标：每个拆分后组件有基础渲染 + 关键交互用例；接入 CI（package.json 已有 `validate` 串 lint+ts-check，补充 test）。

### T5 — 文档伴随与目录 README（P2）

**原则依据**：3.7「目录级 README 列清单、复杂组件头部注释、配置入口用表」。

1. 为 `components/`、`modules/` 及各域（`community/ admin/ auth/ …`）补 `README.md`，列出组件清单 + 分类原则 + 复用阈值说明。
2. `shared/config/index.ts` 已有聚合，补 ASCII 表说明每个导出项（2.3 要求）。
3. `globals.css` 第三方 `!important` 处补审批注释（见 T0）。

---

### 5.1 与 GENERAL 强约束的合规确认

| 强约束 | 本规划如何满足 |
|--------|----------------|
| 6.1 不擅自新建目录 | 新目录（theme/constants/molecules/panels）均基于现有结构自然生长，非为单功能散建 |
| 6.2 不重复造通用组件 | T1 抽出的 molecules 须先查 `primitives/` 已有件，复用而非新建 |
| 6.3 不硬编码/不写死样式 | T0+T2 全面令牌化，新增 ESLint 拦截 |
| 6.4 不引入未声明依赖 | RTL 等若需新增，先入 `package.json` 评审 |
| 6.5 最小范围/说明理由 | 每阶段独立 PR，列明改动文件与理由，不混改业务逻辑 |
| 6.6 先计划后改 | T1 各文件拆分方案先于代码输出，经确认再执行 |

### 5.2 推进节奏建议

1. **先 T0 后 T1**：令牌基线未立，T1/T2 的样式替换无据可依。
2. **T1 与 T2 可并行但分文件**：拆分时不顺便改样式（6.5.1），待 T2 统一治理；可在拆分 PR 注释标注「样式硬编码待 T2」。
3. **T3/T4 跟随 T1**：抽离的 hook、拆出的组件顺带补测试，避免二次返工。
4. **T5 贯穿全程**：每完成一个域的拆分即补该域 README，不堆到结尾。

> 验收口径：T1 完成后全仓无 > 500 行组件；T2 完成后 `rg 'rgb\(|#[0-9a-f]{3,8}' src` 仅剩已审批的动画变量；T4 完成后 `primitives/` 与所有拆分件均有测试；至此 GENERAL 2.4 / 6.3.2 / 3.8 三类已知问题闭环。

---

## 六、执行进度记录（2026-08-05 重构落地）

> 依据第五章规划逐项落地。外部 import 路径与导出名保持不变，零回归。

### ✅ T0 — 设计令牌与常量基线（完成）

- 新增 `src/shared/constants/breakpoints.ts`：`BREAKPOINTS` / `BREAKPOINT_QUERIES` 集中断点，消除硬编码断点。
- `src/shared/constants/logo-colors.ts`：`LOGO_PALETTE` / `LOGO_PALETTE_MINI` 集中 logo 色板（与 globals.css `--logo-*` 令牌对齐）。
- `globals.css` 新增 `--grid-line` 令牌（明暗两套），并给 `transition: none !important` 补审批注释。

### ✅ T1 — 超红线组件拆分（8/8 完成，均 < 500 行）

| 原文件 | 原行数 → 现行数 | 拆出内容 |
|--------|----------------|----------|
| `community/ui/forum-admin-panel` | 1801 → **58** | 6 个 `*-manager` + `forum-admin-utils` |
| `admin/ui/admin-users-panel` | 1569 → **186** | `useAdminUsers` Hook + `user-list-view` + `user-resets-view` + `user-modals` + `users-panel-utils` |
| `admin/ui/admin-events-panel` | 1274 → **489** | `event-modals` + `event-list`(Row/Card/YearGroups) + `events-panel-utils` |
| `tools/ui/admin-tools-panel` | 1080 → **56** | `tool-resource-review` / `tool-exam-manage` / `tool-task-manage` + `tool-types` |
| `admin/ui/admin-roles-panel` | 919 → **435** | `role-permission-matrix` / `create-role-form` / `role-modals` + `roles-types` |
| `admin/ui/admin-messages-panel` | 719 → **205** | `announcements-panel` + `broadcast-history-panel` |
| `auth/ui/two-factor-settings` | 638 → **422** | `use-two-fa` Hook（渲染/逻辑分离） |
| `admin/ui/admin-logs-panel` | 497 → **408** | `logs-utils` + `logs-types` |

拆分方式：**原文件名与 `export function X` 保持不动** → 外部 import 零改动；主文件降为组合层/渲染层，逻辑与子面板外提至同目录独立文件。

### ✅ T2 — 去硬编码颜色（完成）

- `mobius-ring` / `page-transition`：色板 → `LOGO_PALETTE` / `LOGO_PALETTE_MINI`。
- `dashboard-manager` 卡片色 / `login/page` 密码强度色 → `var(--chart-*)`（自动适配明暗）。
- `page-header-background` / `page.tsx` 网格线 → `var(--grid-line)`。
- 组件中已无散落硬编码颜色字面量（仅剩工具函数内部 `hexToRgba` 拼接逻辑，属合法实现）。

### ✅ T3 — 逻辑抽离（完成）

- `src/app/page.tsx` 内联 `useBreakpoint` 迁至 `src/shared/hooks/use-breakpoint.ts`，`shared/hooks/index.ts` 桶导出，断点引用 `BREAKPOINT_QUERIES`。

### ✅ T4 — 组件级测试（完成）

- **纯逻辑工具测试**：`tools/tests/ui-utils.test.ts` 覆盖全部拆出的工具函数（15 用例）。
- **组件冒烟测试**：引入 `@testing-library/react` + `jsdom` + `@testing-library/jest-dom`（经 6.4.1 评审入库 `devDependencies`），为 `primitives/` 原子件补测试：
  - `button.test.tsx`（6 用例：渲染/变体/loading/disabled/onClick）
  - `input.test.tsx`（6 用例：input/textarea/select/label/error/受控）
- vitest 环境：`.tsx` 测试用 `// @vitest-environment jsdom` 注释指定 DOM；`.ts` 逻辑测试保留 node（`environmentMatchGlobs` 在 vitest 4 已废弃，改用 per-file 注释）。

### ✅ i18n 骨架（GENERAL 3.2，完成）

- `src/i18n/types.ts`：`AppMessages` 结构 + `MessageKey` 类型安全 key 联合
- `src/i18n/languages/zh-CN.ts` / `en.ts`：中英文语言包
- `src/i18n/index.ts`：轻量 `t(key)` / `setLanguage` / `getLanguage`（无第三方依赖）
- 测试：`tools/tests/i18n.test.ts`（6 用例）
- 说明：项目 UI 大量内联「中文/English」双语标签，全量迁移至语言包属后续迭代；骨架与取词范式已确立。

### ✅ T5 — 目录文档（完成）

- 新增 `src/components/README.md`、`src/modules/README.md`（目录组件清单 + 分类原则 + 复用阈值）。

### 验证

- `tsc --noEmit` 全项目 **0 错误**
- `eslint src --quiet` **0 告警**
- 新增测试 **33/33 通过**（15 工具 + 6 i18n + 12 组件）

### 遗留（下一迭代）

- [ ] i18n 全量迁移：将内联「中文 / English」双语标签逐步迁至 `@/i18n` 语言包
- [ ] 可选：为更多 `primitives/` 原子件（ConfirmDialog / Loading / Toast）补 RTL 测试
