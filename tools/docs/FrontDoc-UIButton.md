# FZTBUCS-按钮样式统一设计（审计 + 扩展方案）

> 最后更新：2026-08-17｜类型：reference + decision｜状态：**全量收口完成（2026-08-17）**——基础设施 + Batch-1（app/components 段）+ Batch-2（modules 段）+ Batch-3（danger-sm 尺寸契约 + 透明边框盒模型）+ Batch-4（primary-outline/amber/filled/btn-icon 变体 + Pagination 扩展）+ Batch-5（输入框/Badge/Tab/Modal/z-index 控件收口）+ Batch-5b（ModalShell 全局化 + FilterBar 同源）均已迁移并验证；**最终用法规范见 [FrontDoc-UIStandard.md](FrontDoc-UIStandard.md)（SSOT）**，本文仅保留审计与迁移史。
> 更新人：3yearsZ
> 受众：前端贡献者 / reviewer
> Source of truth：**用法规范以 `FrontDoc-UIStandard.md` 为准**；实现以 `src/app/globals.css` 与 `components/primitives/*` 为准；本文为审计与迁移决策记录。
> 关联：`FrontDoc-UIStandard.md`（组件统一规范 SSOT）、`FrontDoc-UID.md`（全局 UI 规范）、`components/primitives/*`（组件实现）、`src/app/globals.css`（类实现）
> 变更触发：任何按钮 / 控件令牌变更须同步 `globals.css`、`primitives/*` 组件与 `FrontDoc-UIStandard.md`
> Stale 信号：`FrontDoc-UIStandard.md` 变体清单与 `button.tsx`/`globals.css` 不一致；本文迁移史与代码现状不符

## 0. 摘要

项目已有一套官方按钮系统（`FrontDoc-UID.md §5.2` + `globals.css` 的 `btn-*` + `button.tsx` 封装）。**现状并非"没有统一系统"，而是"系统已定义，但落地有漂移"**。

通过全量扫描（`src/`，440 个 ts/tsx）：

- `<Button>` 组件实例：**109 处**（走统一系统，良好）
- 裸 `<button>` 实例：**276 处**（含 2 处组件定义 + confirm-dialog 内部）
- 其中**散落描边小按钮**写法（手搓 `border + muted-foreground`，应统一为 `btn-outline-sm` 却未用）：**39 个文件**
- 文本 / 链接型按钮（`underline-grow` / `meta-mono text-[var(--primary)]`）：**53 个文件**（§5.2 规定"保持原有设计"，非本次统一目标）
- `<Link>` 被当主按钮用：**0 处**（无）

**结论**：真正需要统一的是 ① 散落描边小按钮的写法漂移、② active/危险态的 ad-hoc 覆盖、③ 分页按钮未共享、④ §5.2 规范与 `globals.css` 的字体/焦点环描述漂移。其余（文字按钮、主题切换、通知铃铛、筛选标签、悬浮胶囊 Tab）按 §5.2 属"有意保留"，本文仅做收口约束，不强行并入 `btn-*`。

---

## 1. 现状盘点（四类）

### 1.1 已统一（✅ 无需动）
- 所有 `<Button variant="primary|outline|danger" size="sm|md">` 用法（109 处）。
- `confirm-dialog` 的确认按钮走 `<Button>`（取消按钮为文本型，见 §1.2）。

### 1.2 文本 / 链接型按钮（§5.2 规定保留，本文仅约束内部一致性）
`underline-grow`、`meta-mono text-[var(--primary)] hover:text-[var(--primary)]` 等，出现在 53 个文件（登录切换、忘记密码、弹窗取消、关注文案链接等）。**保留原设计**，但建议抽成 `.btn-text` 原子类以保证 hover/underline 行为一致（可选，非强制）。

### 1.3 图标 / 工具按钮（保留，建议抽 `.btn-icon`）
Navbar 汉堡、ThemeToggle、NotificationBell、UserMenu、各类关闭按钮：多使用 `p-2 / min-h-[44px] / focus-amber / hover:text-[var(--foreground)]`。**保留圆形/方形图标按钮语义**，但建议统一为一个 `.btn-icon` 原子类（padding、focus、hover 三处一致），消除各文件手搓差异。

### 1.4 散落描边小按钮（❌ 本次统一核心，39 文件）
本应复用 `btn-outline-sm`，却手搓了 4 种近似写法，构成可见不一致：

| 写法簇 | 关键差异 | 命中文件数（非互斥） | 代表文件 |
|---|---|---|---|
| `font-mono text-[10px] uppercase tracking-wider` | 字号 10px、font-mono、大写 | 3 | categories-manager、announcements-manager、follow-button(compact) |
| `text-[11px] font-mono` | 字号 11px（接近规范，但无 uppercase、手写 border/hover） | 18 | admin-*、community-*、tools-* 多数 |
| `meta-mono px-3 py-1.5 border` | 用 meta-mono 而非 font-mono、padding 与规范不一致 | 7 | follow-button、topics-manager(分页)、users-manager(分页) |
| `font-mono text-[12px] px-3 py-1.5 border` | 字号 12px、手写 active 态 `bg-[var(--primary)]/5` | 5 | topics-manager(分页)、users-manager(分页) |

**39 个文件完整清单**（均含 `border-[var(--border)] text-[var(--muted-foreground)]`）：
```
app/community/new/compose-form.tsx        app/profile/join-tab.tsx
app/community/page.tsx                    app/tools/exam/page.tsx
app/notifications/notification-center.tsx app/tools/page.tsx
app/tools/resource/page.tsx               app/tools/resource/resource-card.tsx
app/tools/resource/submit-resource-modal.tsx  app/tools/task/board-tab.tsx
app/tools/task/task-shared.tsx            components/tech-tag-selector.tsx
modules/admin/ui/admin-feature-visibility-panel.tsx  modules/admin/ui/admin-join-panel.tsx
modules/admin/ui/admin-logs-panel.tsx     modules/admin/ui/event-modals.tsx
modules/admin/ui/user-list-view.tsx       modules/admin/ui/user-modals.tsx
modules/admin/ui/user-resets-view.tsx     modules/announcement/ui/admin-announcements-panel.tsx
modules/auth/ui/two-factor-settings.tsx   modules/community/ui/announcements-manager.tsx
modules/community/ui/categories-manager.tsx   modules/community/ui/community-markdown-editor.tsx
modules/community/ui/community-profile-tab.tsx  modules/community/ui/community-topic-replies.tsx
modules/community/ui/follow-button.tsx    modules/community/ui/reports-manager.tsx
modules/community/ui/topics-manager.tsx   modules/community/ui/users-manager.tsx
modules/events/ui/month-calendar.tsx      modules/tools/ui/component-registry-detail.tsx
modules/tools/ui/component-registry-drawer.tsx  modules/tools/ui/component-registry-shell.tsx
modules/tools/ui/component-registry-variant-renderer.tsx  modules/tools/ui/dev-docs-viewer.tsx
modules/tools/ui/tool-exam-manage.tsx     modules/tools/ui/tool-resource-review.tsx
modules/tools/ui/tool-task-manage.tsx
```

---

## 2. 真实不一致点（已确认）

1. **写法漂移（§1.4）**：同一语义的"描边小按钮"出现 font-mono/meta-mono、10/11/12px、有无 uppercase、hover 目标（primary / foreground / destructive）四种组合，肉眼可辨的不统一。
2. **active / 选中 / pinned 态靠覆盖**：`topics-manager`、`users-manager` 在 `<Button variant="outline" size="sm">` 上用 `className="border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5"` 表示选中，写法散落、不可复用。
3. **危险态靠覆盖**：`user-resets-view`、`topics-manager`（hide）、`users-manager`（disable）用 `className="hover:text-[var(--destructive)] hover:border-[var(--destructive)]"` 把 outline 变危险色，应成体系。
4. **分页按钮重复手搓**：`topics-manager` 与 `users-manager` 的分页 `← / 页码 / →` 完全复制同一段手搓样式（含 active `bg-[var(--primary)]/5`），应抽成共享 `.btn-page` 或 `<Pagination>` 原子件。
5. **规范↔实现漂移**：
   - §5.2 写 `btn-outline-sm` 为 `text-[12px]`，但 `globals.css` 实际 `font-size: 11px` → 以代码为准，修订规范。
   - §5.2 示例使用 `focus-ring`，但 `button.tsx` 实际追加 `focus-amber`（globals.css 中 `focus-amber` 是 `focus-ring` 的历史别名，功能等价）。建议组件改回 `focus-ring` 并废弃 `focus-amber` 别名。

---

## 3. 统一设计方案

### 3.1 扩展 `Button` 组件 API（`components/primitives/button.tsx`）

```ts
type ButtonVariant = 'primary' | 'outline' | 'danger' | 'outline-danger' | 'ghost';
type ButtonSize = 'md' | 'sm' | 'xs';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;   // 新增 outline-danger / ghost
  size?: ButtonSize;         // 新增 xs（紧凑/关注 compact/分页）
  active?: boolean;          // 新增：选中/按下态（渲染 aria-pressed），替代散落覆盖
  loading?: boolean;
}
```

- `outline-danger`：透明底 + 边框，hover 变 `destructive`（替代 §2.3 的 ad-hoc 覆盖）。
- `ghost`：纯文字按钮（替代 §1.2 中"作为操作"的文本按钮，如登录切换/忘记密码/弹窗取消）；仍保留 `underline-grow` 用于纯导航链接。
- `xs`：padding `0.25rem 0.5rem`、font `10px`，对齐 §1.4 的 compact/follow 紧凑写法。
- `active`：自动套用选中样式（`border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5`），替代 `topics-manager`/`users-manager` 的覆盖。

### 3.2 新增 / 修订 CSS 类（`globals.css`）

```css
/* 选中/按下态修饰（与 active prop 联动） */
.btn-active { border-color: var(--primary); color: var(--primary); background: color-mix(in srgb, var(--primary) 5%, transparent); }

/* 描边危险（替代 hover:text-[var(--destructive)] 覆盖） */
.btn-outline-danger { /* 同 btn-outline，hover border/color → var(--destructive) */ }

/* 纯文字按钮 */
.btn-ghost { /* 无边框无背景，font-mono uppercase tracking-wider，hover color → var(--primary) */ }

/* 紧凑尺寸 */
.btn-xs { padding: 0.25rem 0.5rem; font-size: 10px; /* 其余同 btn-outline-sm */ }

/* 分页专用（内部一致，§5.2 允许"保持原有设计"但须共享，不各自手搓） */
.btn-page { /* 方形、border、font-mono、active 复用 .btn-active */ }
```

### 3.3 图标按钮收口（§1.3）
新增 `.btn-icon` 原子类（固定 `p-2 min-h-[44px] min-w-[44px] focus-ring hover:text-[var(--foreground)]`），Navbar/ThemeToggle/Bell/UserMenu/关闭键统一引用，删除各文件手搓。

### 3.4 规范修订（`FrontDoc-UID.md §5.2`）
- 按钮类清单补全：`btn-outline-danger`、`btn-ghost`、`btn-xs`、`btn-active`、`btn-page`、`btn-icon`。
- `btn-outline-sm` 字号由"12px"更正为"11px"（对齐代码）。
- `focus-ring` 为唯一焦点环；`focus-amber` 标记为废弃别名，`button.tsx` 改回 `focus-ring`。
- 明确"保持原有设计"清单（文字/主题/铃铛/筛选标签/胶囊 Tab）**仍允许存在**，但重复出现 2 次以上的（如分页）必须抽成共享类。

### 3.5 反模式（写入 §11 禁止清单）
- 禁止在模块内手搓 `border-[var(--border)] text-[var(--muted-foreground)] ... hover:text-[var(--primary)]` 描边按钮（必须用 `btn-outline-sm` 或 `<Button variant="outline" size="sm">`）。
- 禁止用 `className` 覆盖 `btn-*` 实现 active/危险态（必须走 `active` / `outline-danger`）。
- 禁止分页/筛选/标签在多处复制同一段手搓样式。

---

## 4. 迁移映射（39 文件 → 统一系统）

| 当前写法 | 统一目标 | 影响文件（示例） |
|---|---|---|
| `meta-mono px-3 py-1.5 border ...` 普通操作 | `<Button variant="outline" size="sm">` | categories-manager、follow-button、announcements-manager |
| `text-[11px] font-mono border ...` 操作 | `<Button variant="outline" size="sm">` | admin-*、community-*、tools-* 多数 |
| `hover:text-[var(--destructive)]` 覆盖 | `<Button variant="outline-danger" size="sm">` | user-resets-view、topics-manager(hide)、users-manager(disable) |
| active `bg-[var(--primary)]/5` 覆盖 | `<Button variant="outline" size="sm" active={...}>` | topics-manager(pin/feature)、follow-button(已关注) |
| 分页 `←/页码/→` 手搓 | 共享 `<Pagination>` 或 `.btn-page`（含 `.btn-active`） | topics-manager、users-manager |
| `report-button` 覆盖 `btn-outline` 的 padding/font | 改用 `size="sm"` 或新增语义尺寸，移除覆盖 | report-button.tsx |

> 文本按钮（§1.2，53 文件）与图标按钮（§1.3）**不在本次强制迁移范围**，仅按 §3.3 / §3.4 做原子类收口。

---

## 5. 风险与回滚

- **范围可控**：仅改按钮 class/组件，不涉及业务逻辑；每文件改动为纯 className 替换。
- **视觉回归**：统一后描边小按钮字号会从 10/12px 收敛到 11px、字体统一 font-mono，可能引发极个别布局位移 → 改后需目视抽查 3~5 个管理后台页面。
- **`focus-amber` 废弃**：需确认无其它位置依赖该别名（grep 已确认仅 `button.tsx` 与别名定义本身使用）。
- **回滚**：纯样式/类名改动，git revert 单文件即可；建议按"先 button.tsx + globals.css 基础设施，再逐模块迁移"的顺序分批提交。
- **测试**：`button.test.tsx` 需补充 `outline-danger` / `ghost` / `xs` / `active` 用例；`pnpm test` 全绿后再合入。

---

## 6. 建议实施顺序（待确认后执行）

1. 基础设施：`button.tsx` 扩展 API + `globals.css` 新增类 + `focus-ring` 收口。
2. 规范：`FrontDoc-UID.md §5.2` 修订 + 反模式写入 §11。
3. 分页共享件：抽 `<Pagination>` 或 `.btn-page`，替换 topics-manager / users-manager。
4. 逐模块迁移 39 文件（按 admin / community / tools / app 分组，每组可独立 review）。
5. 图标按钮收口 `.btn-icon`（低优先级，可后续）。
6. 补测试 + 目视抽查 + 提交。

---

## 7. 迁移进度（Batch 跟踪）

### Batch-1 — app/components 段（已完成）
- `community/page.tsx`、`community-profile-tab.tsx`、`modules/community/ui/topics-manager.tsx`、`users-manager.tsx`：4 处重复手搓分页 → 共享 `<Pagination>`（移除各自 `pageNums` IIFE）。
- `notifications/notification-center.tsx`：标记全部已读 → `<Button variant="outline" size="sm">`。
- `tools/resource/submit-resource-modal.tsx`：移除文件 → `outline-danger xs`、上传 → `outline sm`（保留图标 flex）。
- `tools/task/board-tab.tsx`：拒绝 → `outline-danger sm`、claim 尺寸覆盖 → `size="sm"`。

### Batch-2 — modules 段（已完成）
| 文件 | 改动 |
|---|---|
| community/ui/announcements-manager | 删除 → `outline-danger sm` |
| community/ui/categories-manager | 编辑 → `outline sm`、删除 → `outline-danger sm` |
| community/ui/topics-manager | 隐藏 → `outline-danger sm`（去 hover 覆盖）、硬删 → `outline-danger sm` |
| community/ui/users-manager | 禁言 → `outline-danger sm`（去 hover 覆盖） |
| community/ui/community-topic-replies | 楼中楼分页（prev/next）→ `<Pagination>`（新增导入） |
| community/ui/reports-manager | 处理 → `outline sm`、驳回 → `outline-danger sm`（新增导入） |
| admin/ui/user-resets-view | 驳回 → `outline-danger sm`（去 hover 覆盖 ×2） |
| admin/ui/role-permission-matrix | 编辑 → `outline sm`、删除 → `outline-danger sm`（新增导入） |
| admin/ui/user-list-view | 用户列表 prev/next 分页 → `<Pagination>`（新增导入） |
| tools/ui/tool-task-manage | 删除（表格 + 卡片）×2 → `outline-danger sm`（新增导入） |
| tools/ui/component-registry-detail | 回退 / 变体预设 / 编辑全部变体 → `outline sm`（新增导入） |
| tools/ui/component-registry-drawer | 关闭 → `outline sm`（新增导入） |
| auth/ui/two-factor-settings | 关闭 2FA → `outline-danger sm`（保留图标 flex） |
| announcement/ui/admin-announcements-panel | 取消 → `outline sm`（新增 Button 导入；保存 filled 键保留） |

### Batch-3 — 尺寸契约修复（已完成，2026-08-17）
**问题**：用户反馈工作台「导出备份」(`outline`+`sm`) 与「清空」(`danger`+`sm`) 尺寸不一致。
**根因**：`variantClass` 映射中 `danger` 的 `sm`/`xs` 误指向 MD 类 `btn-danger`（缺 `btn-danger-sm`），而 `outline`/`primary`/`outline-danger` 均有独立 `-sm` 类（`padding: 0.375rem 0.75rem` vs MD `0.75rem 1.5rem`）。故 `danger`+`sm` 静默渲染为 MD 尺寸，比同排 `outline`+`sm` 更高更宽。
**修复（源头契约，非逐按钮打补丁）**：
- `globals.css`：新增 `.btn-danger-sm`（对齐 `btn-primary-sm` 的 padding/gap/font-size，配 destructive 色 + hover/disabled opacity）。
- `button.tsx`：`danger: { md:'btn-danger', sm:'btn-danger-sm', xs:'btn-danger-sm' }`。
- `button.test.tsx`：新增 `danger`+`sm`/`xs` 回归测试（断言 `btn-danger-sm` 且不再含 `btn-danger`）。
- **二次修复（18:48）**：消除残留 ~2px 高度差——`.btn-outline-sm` 带 `1px` 可见边框而 `.btn-danger-sm`（及 `primary`/`danger`/`primary-sm`）无边框，盒模型高度差 2px。给四个实色变体补 `border: 1px solid transparent`，使实色/描边变体盒模型高度完全一致（透明边框不影响外观）。
**影响面**：仅 `workbench.tsx:172`「清空」显式 `danger`+`sm`；其余 `danger`（无 size 或默认 md）不受影响。修复后全站 `danger`+`sm`/`xs` 尺寸与同排其他变体一致（含边框对齐）。
**验证**：ESLint 0 error；button.test 12 passed（原 11）；tsc 改动模块零新增错误（既有 baseline 错误在 navbar/component-registry-store/两处 test，与本批无关）。

### Batch-4 — 变体收口（Step1–4，已完成 2026-08-17）
**Step1 `primary-outline` 主色描边收口**：
- `button.tsx` 新增 `variant="primary-outline"`；`globals.css` 新增 `.btn-primary-outline` / `.btn-primary-outline-sm`（尺寸/padding/font 对齐 outline，颜色 primary，hover `primary 5%` 底）。
- 迁移 11 文件 16 处：dev-docs-viewer（编辑/保存）、tool-exam-manage（新建/创建）、create-role-form（创建）、role-modals（保存）、admin-feature-visibility-panel（确认）、admin-roles-panel（新建角色）、submit-resource-modal（关闭/提交）、community/page（选中标签）、role-permission-matrix（保存变更）、tool-task-manage（发布 ×2）、community-actions（点赞/收藏 active 态：去掉手写 `border-[var(--primary)] !text-... bg-.../5` 覆盖，改用 `active` prop 联动 `.btn-active`）。
- `button.test.tsx` 新增 primary-outline 回归（md/sm/xs）。

**Step2 `amber` + `filled` 变体收口**：
- 新增变体与 `.btn-amber`/`.btn-amber-sm`（`#f59e0b` 主色，50% 描边 + 10% hover 底）、`.btn-filled`/`.btn-filled-sm`（`bg-foreground` 反色，`border:1px solid transparent` 对齐盒模型）。
- 迁移：tool-task-manage「关闭」×2 → `amber sm`；admin-announcements-panel「保存」→ `filled sm`（保留 Loader2/Save 图标）。
- 甄别保留（非按钮）：amber 状态徽章 `<span>`（tool-exam-manage / tools/page / exam/page / admin-join-panel）、component-registry-shell 筛选 chip 选中态、assistant-chat 聊天气泡。

**Step3 `.btn-icon` 图标按钮收口**：
- 新增 `.btn-icon`（2rem×2rem 方形、居中、描边 + hover 主色）。
- community-markdown-editor 工具栏 2 个图标键（含图片上传）→ `btn-icon focus-ring`（去掉手写 `w-8 h-8` + `focus-amber`）。

**Step4 特殊分页并入共享 `<Pagination>`**：
- 扩展 `Pagination`：`variant: 'window'(默认)|'ellipsis'|'all'`、`activeVariant: 'outline'(默认)|'filled'`、`showTopBorder?: boolean`；省略号逻辑抽 `buildEllipsisPages`。
- resource/page → `<Pagination variant="all" />`；notification-center → `<Pagination variant="ellipsis" activeVariant="filled" showTopBorder={false} className="mt-10" />`。
- `pagination.test.tsx` 新增 3 用例（all 全量 / ellipsis 首尾+省略号 / filled 实色选中）。

**验证**：ESLint 0 error（仅既有 warning：exhaustive-deps / 个别 unused）；button.test 15 + pagination.test 7 = **22 passed**；tsc 改动模块零新增错误。改动未提交（按协议）。

### Batch-5 — 控件收口（输入框/Badge/Tab/Modal/z-index，2026-08-17 完成）
**Step1 输入框统一（INPUT_CLASS 唯一权威）**：14 处手写 `bg-transparent border border-[var(--border)]...` 字符串 → 引用 `INPUT_CLASS` + 各自覆盖类（padding/字号/tracking 保留）；`<Input>` 组件维持（内部即 INPUT_CLASS，分层无冲突）。覆盖：auth-form×4、forgot-password-form、two-factor-form、two-factor-settings（本地 CODE_INPUT_CLASS 改基于 INPUT_CLASS）、tool-resource-review、admin-feature-visibility-panel、community-topic-edit-form、report-button、user-list-view、community/page、submit-resource-modal×4、event-filter-bar。**修复命名冲突**：`task-shared.tsx` 本地导出同名 `INPUT_CLASS`（内容不同）→ 改为 `TASK_INPUT_CLASS = INPUT_CLASS + px-4 py-2.5 text-[13px]`，board-tab 6 处引用同步。
**Step2 共享 `<Badge>` 徽章**：新增 `components/primitives/badge.tsx`（variant: muted/primary/success/amber/danger，统一 10px 等宽 uppercase 直角）+ `.badge*` CSS 类 + 测试；迁移 14 文件（PIN/FEAT 标签 ×6、用户角色/状态、公告 level/active、考试/工具/申请状态、event-status-badge 改造为基于 Badge）。色名统一：`green`→success、`amber-500/40|/50|实色`→amber、`red-400/40`→danger。保留：admin-announcements-panel levelBadge（填充圆角徽章，全站唯一风格）、event-list/component-registry-detail 的 `primary/30` 半透明弱化标签、github-heatmap/dev-center rounded-full 胶囊徽章。
**Step3 Tab/筛选控件**：新增 `.tab-chip`/`.tab-chip-active`/`.tab-chip-danger-active`（胶囊描边选中式）与 `.tab-underline`/`.tab-underline-active`（下划线式）；迁移 13 文件——描边胶囊 6（user-list-view、user-modals、event-modals×4、admin-logs-panel、admin-join-panel）、实心填充 3 统一为描边式（topics-manager×2、resource/page×3、board-tab×2）、下划线 2（notification-center、admin-messages-panel）。保留：component-registry-shell 反色实心筛选（域内自洽）、FilterBar/InlineTabs 共享组件不变。**顺带补漏**：tool-resource-review 手写全量分页 → `<Pagination variant="all">`（Batch-4 遗漏）。
**Step4 Modal 遮罩对齐 ModalShell 规范**：submit-resource-modal / report-button 遮罩 `bg-black/50` → `bg-black/70 backdrop-blur-sm`；component-registry-drawer 遮罩 `z-40 bg-black/40` → `z-[var(--z-header)] bg-black/70`（**修复层级 bug**：原 z-40 低于 navbar z-50，遮罩盖不住顶部导航）。动画/布局特色保留，不强换组件。
**Step5 z-index 改用 CSS 变量**：JSX 裸写 `z-50` → `z-[var(--z-header)]`、`z-40` → `z-[var(--z-banner)]`，共 13 处（navbar、notification-bell、user-menu、announcement-banner、confirm-dialog、ModalShell、event-modals、question-list、exam/[id]/page、drawer×2、submit-resource-modal、report-button）。保留：navbar 汉堡遮罩 `z-[45]`（有注释的刻意例外：盖 banner 留 header，体系无 45 档）。`ui-constants.ts` Z 常量与 globals.css `--z-*` 变量为同一体系镜像。
**验证**：ESLint 0 error（仅既有 warning）；button 15 + pagination 7 + badge 3 + input 6 = **31 passed**；tsc 改动模块零新增错误（navbar `UserClass` 为既有基线）。改动未提交（按协议）。

### Batch-5b — 收尾：ModalShell 全局化 + FilterBar 同源（2026-08-17 完成）
- **ModalShell 提升为全局原语**：新建 `components/primitives/modal-shell.tsx`（focus trap / Escape / 遮罩关闭 / 滚动锁定，z 用 `--z-header`）；`admin/ui/shared.tsx` 改为 re-export 兼容（admin 7 处引用零改动）；`components/index.ts` barrel 导出。**report-button 手写 modal → `<ModalShell>`**（拿到 focus trap/Escape/遮罩关闭）。submit-resource-modal 保留 AnimatePresence 动画特色（记录，不强迁）。
- **FilterBar 视觉同源 `.tab-chip`**：内部按钮从"实心填充式"（`bg-[var(--primary)]` 选中）收敛为 `tab-chip`/`tab-chip-active` 描边选中式——共享组件与全站手写 Tab 同源，events 筛选栏视觉与全局一致；测试断言同步更新（`tab-chip-active`）。label/showNumber/dotClassName/wrap/ScrollIndicator 功能不变。
- 验证：ESLint 0 error；filter-bar 6 passed；tsc 零新增（ModalShell 提升后 admin 引用经 re-export 全通）。未提交。

### 保留 / 延后（剩余，非本次强制迁移范围）
- **半透明主色描边/标签**（`border-[var(--primary)]/30`，component-registry-detail「advance」、event-list 标签）：刻意弱化的次要键/标签，并入全色会改变视觉，保留。
- **导航类图标按钮**（Navbar/ThemeToggle/Bell/UserMenu 关闭键等）：未并入 `.btn-icon`，保留（导航语义）。
- **填充圆角徽章**（admin-announcements-panel levelBadge：`bg-blue-100 rounded` 等）：全站唯一填充式徽章风格，与 Badge 直角描边不同，保留。
- **rounded-full 胶囊徽章**（github-heatmap、dev-center）：圆形徽章形态，保留。
- **反色实心筛选**（component-registry-shell 分类/状态）：域内自洽（6 处同模式），保留。
- **navbar 汉堡遮罩 `z-[45]`**：刻意例外（盖 banner z-40、留 header z-50 汉堡可点），体系无 45 档，注释说明保留。
- **`<span>` 徽章 / 文本链接（underline-grow）/ FilterBar/InlineTabs 共享组件**：§5.2 保留。
