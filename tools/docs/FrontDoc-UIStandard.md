# FZTBUCS-UI 组件统一规范（按钮 / 输入框 / 徽章 / Tab / 分页 / Modal / z-index）

> 最后更新：2026-08-17｜类型：reference｜状态：规范生效（2026-08-17 全站收口完成，Batch-1~5b 落地）
> 更新人：3yearsZ
> 受众：前端贡献者 / reviewer / oncall
> Source of truth：本文件为**按钮与 UI 控件的用法唯一权威（SSOT）**；实现层以 `src/app/globals.css` 与 `src/components/primitives/*` 为准；落地审计与迁移记录见 `FrontDoc-UIButton.md`。
> 关联：`FrontDoc-UID.md`（全局 UI 设计规范，颜色/字体/布局）、`FrontDoc-UIButton.md`（按钮/控件统一审计与 Batch 迁移史）、`FrontDoc-Conv.md`（编码规范）
> 变更触发：新增/修改任何 `btn-*`/`badge*`/`tab-*` 类、`Button`/`Badge`/`Pagination`/`ModalShell`/`Input` 组件 props、`INPUT_CLASS`/`Z` 常量时，须同步本规范并更新对应组件测试。
> Stale 信号：代码中出现本规范禁止的手写模式（散落描边按钮、复制粘贴输入框样式、手写徽章三元、手写 Tab 选中态、裸 z-index 数字）；变体清单与 `button.tsx`/`globals.css` 不一致。

## 1. 总则

全站 UI 控件遵循「**共享契约优先，禁止手写漂移**」：

1. 优先使用共享组件（`Button`/`Badge`/`Pagination`/`ModalShell`/`Input`/`FilterBar`/`InlineTabs`）与共享类（`btn-*`/`badge*`/`tab-*`）。
2. 所有样式令牌引用**共享常量与 CSS 变量**（`INPUT_CLASS`、`Z`、`--z-*`、`--primary` 等），**禁止裸魔法值**（如手写 `border border-[var(--border)]` 完整串、裸 `z-50`）。
3. 盒模型统一：**实色变体一律 `border: 1px solid transparent`**，与描边变体同高（差异会肉眼可见 ~2px）。
4. 新增共享 UI 的流程：先立契约（组件/类 + 回归测试）→ 逐文件迁移 → 每批 ESLint + vitest + tsc 验证。

## 2. 按钮规范（`<Button>` + `btn-*`）

组件：`src/components/primitives/button.tsx`｜类实现：`globals.css`。

### 2.1 变体 × 尺寸映射（8 变体 × md/sm/xs）

| 变体 `variant` | md | sm / xs | 语义 |
|---|---|---|---|
| `primary` | `btn-primary` | `btn-primary-sm` | 主操作（提交/保存） |
| `outline` | `btn-outline` | `btn-outline-sm` | 次操作（取消/中性） |
| `primary-outline` | `btn-primary-outline` | `btn-primary-outline-sm` | 主色描边（新建/编辑/发布键） |
| `danger` | `btn-danger` | `btn-danger-sm` | 危险实色（硬删/清空） |
| `outline-danger` | `btn-outline-danger` | `btn-outline-danger-sm` | 危险描边（删除/驳回/禁言） |
| `ghost` | `btn-ghost` | `btn-ghost` | 幽灵文字键 |
| `amber` | `btn-amber` | `btn-amber-sm` | 状态/警告键（草稿、关闭任务） |
| `filled` | `btn-filled` | `btn-filled-sm` | 反色保存键（`bg-foreground`） |

- `size`：`md`（`0.75rem 1.5rem` / 12px）/ `sm`（`0.375rem 0.75rem` / 11px）/ `xs`（视觉复用 sm）。
- `active`：套 `.btn-active`（描边选中态，用于 outline/ghost/分页；solid 变体勿用）；自动 `aria-pressed`。
- `loading`：自动禁用 + Spinner；焦点统一 `.focus-ring`。

### 2.2 选型矩阵

| 场景 | 变体 |
|---|---|
| 主提交/保存（页面主 CTA） | `primary` |
| 取消/中性次操作 | `outline` |
| 新建/编辑/发布类主色描边 | `primary-outline` |
| 删除/驳回/禁言/硬删 | `outline-danger`（危险描边）；破坏性主操作 `danger` |
| 状态切换键（草稿/下架/待审） | `amber` |
| 反色保存（表单头部） | `filled` |
| 行内小操作/文本键 | `ghost` |

### 2.3 禁止项

- ❌ 手写 `border + text-[var(--muted-foreground)] + hover:destructive/bg-primary/5` 散落描边按钮（一律 `Button` 变体）。
- ❌ 用 `className` 覆盖变体主色（如 `border-[var(--primary)] !text-[var(--primary)]`）——用 `active` prop 或选对变体。
- ❌ `danger` 变体在 sm/xs 下手动补尺寸（已由 `btn-danger-sm` 契约保证）。
- ❌ 实色变体去掉边框（盒模型会矮 2px）。

### 2.4 保留（刻意不并入）

- `underline-grow` 文本/链接按钮、导航类图标按钮（汉堡/铃铛/UserMenu）、`<span>` 徽章形态、`primary/30` 半透明弱化键（component-registry-detail advance）。

## 3. 输入框规范（`INPUT_CLASS` / `<Input>`）

- **`INPUT_CLASS`**（`src/shared/utils/ui-constants.ts`）是输入框基础样式的**唯一权威**：`w-full bg-transparent border border-[var(--border)] font-mono placeholder:... focus-ring 风格`。
- 用法：`className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}`——**用额外类覆盖 padding/字号/tracking**，不重写基础串。
- `<Input>` 组件（`primitives/input.tsx`）为带 `label`/`error`/`as=textarea|select` 的封装，内部即 `INPUT_CLASS`；两者分层不冲突。
- **禁止**：复制粘贴输入框样式字符串；在模块内定义同名 `INPUT_CLASS` 覆盖全局（历史教训：task-shared.tsx 曾导出同名常量，已改 `TASK_INPUT_CLASS`）。

## 4. 徽章规范（`<Badge>` + `badge*`）

组件：`src/components/primitives/badge.tsx`｜类：`.badge` + `.badge-muted|primary|success|amber|danger`。

- 统一视觉：直角、等宽 10px、uppercase、无圆角；语义色枚举：
  - `success` = 绿色（**统一用 emerald 系，禁用 `green-*` 直写**）
  - `amber` = 黄色（透明度统一 40%）
  - `danger` = 危险色
  - `primary` = 主色标签（PIN/FEAT）
  - `muted` = 中性
- **禁止**：手写 `meta-mono px-2 py-0.5 border ${三元色}` 徽章。
- 保留：填充圆角徽章（admin-announcements levelBadge，全站唯一风格）、`rounded-full` 胶囊徽章（github-heatmap/dev-center）、`primary/30` 半透明弱化标签。

## 5. Tab / 筛选规范（`tab-*` + `FilterBar`）

类：`.tab-chip`（胶囊描边）/ `.tab-chip-active` / `.tab-chip-danger-active` / `.tab-underline` / `.tab-underline-active`（下划线）。

- 全站 Tab 仅两套形态：**胶囊描边**（`.tab-chip`，主用于筛选/分段）与**下划线**（`.tab-underline`，主用于页头 Tab）。
- 选中态写法唯一：`${active ? 'tab-chip-active' : ''}`（危险选中用 `tab-chip-danger-active`）。
- `FilterBar`（`primitives/filter-bar.tsx`）内部已收敛到 `.tab-chip` 同源——组件与手写类视觉一致。
- **禁止**：手写选中态三元（`bg-primary/8`/`/5`/`/6`、`border-b-2`、实心填充混用）。
- 保留：component-registry-shell 反色实心筛选（域内自洽）。

## 6. 分页规范（`<Pagination>`）

组件：`src/components/primitives/pagination.tsx`。

- Props：`page` / `totalPages` / `onPageChange` / `variant: 'window'|'ellipsis'|'all'` / `activeVariant: 'outline'|'filled'` / `showTopBorder`。
  - `window`（默认）：当前页为中心 ≤5 页；`ellipsis`：首尾+省略号；`all`：全量页码。
- **禁止**：手写 `← / 页码 / →` 描边按钮组（resource、notification-center、tool-resource-review 均已收口）。
- 页码按钮统一 `.btn-page` + 选中 `.btn-active`。

## 7. Modal 规范（`ModalShell`）

组件：`src/components/primitives/modal-shell.tsx`（全局原语；admin 经 `modules/admin/ui/shared.tsx` re-export 兼容）。

- 能力：focus trap、Escape 关闭、点击遮罩关闭、滚动锁定。
- 视觉：遮罩 `bg-black/70 backdrop-blur-sm`、`z-[var(--z-header)]`、面板 `max-w-lg border bg-background shadow-[var(--shadow-modal)]`、标题栏 `meta-mono primary` + ✕ 关闭。
- **禁止**：手写 `fixed inset-0` 遮罩骨架（新 modal 一律 `ModalShell`）；遮罩透明度用 `black/70`（不用 50/40）。
- 取舍：带入场动画的自定义 modal（如 submit-resource-modal 的 AnimatePresence）可保留动画，但**遮罩与 z 层级必须对齐本规范**。

## 8. z-index 规范（`Z` / `--z-*`）

- 两层镜像：JS 侧 `Z` 常量（`src/shared/utils/ui-constants.ts`）与 CSS 侧 `--z-*` 变量（`globals.css :root`），数值一致：base 10 / sticky 30 / banner 40 / header 50 / toast 60 / transition 70 / overlay 9998。
- JSX 中一律用 CSS 变量引用：`z-[var(--z-header)]`、`z-[var(--z-banner)]`。
- **禁止**：裸写 `z-50`/`z-40`（历史已全部替换）；新增层级不得随意插值。
- 例外：navbar 汉堡遮罩 `z-[45]`（有注释的刻意例外：盖 banner 留 header 汉堡可点，体系无 45 档）——新增例外须注释说明。

## 9. 质量门禁（新增/修改共享 UI 必须）

1. 组件/类变更必须配套**回归测试**（见 `primitives/*.test.tsx`：button 15、pagination 7、badge 3、input 6、filter-bar 6）。
2. 每批迁移验证：`cd CS-Web-Frontend && pnpm exec eslint <files>`（0 error）、`pnpm exec vitest run <tests>`、`pnpm exec tsc --noEmit`（改动模块零新增错误）。
3. 迁移纪律：**先立契约（变体/类+测试）→ 逐文件迁移 → 每批独立验证**；迁移前甄别"真控件 vs 语义装饰"（avatar 选择框、消息横幅、对错标记、聊天气泡不是 Tab/徽章）。

## 10. 关联与历史

- 审计起点与迁移史：`FrontDoc-UIButton.md`（Batch-1~5b：按钮 8 变体收口、输入框/Badge/Tab/Modal/z-index 统一、39 文件散落描边清零）。
- 全局设计语言（颜色/字体/动效）：`FrontDoc-UID.md`。
- 编码规范：`FrontDoc-Conv.md`。
