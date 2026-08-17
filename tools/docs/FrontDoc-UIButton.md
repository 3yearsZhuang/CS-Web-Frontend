# FZTBUCS-按钮样式统一设计（审计 + 扩展方案）

> 最后更新：2026-08-17｜类型：reference + decision｜状态：基础设施已落地（button.tsx 扩展 + globals.css 新增类 + 共享 Pagination 替换 topics/users-manager 两处 + 测试 15 passed）；39 文件迁移待分批
> 更新人：3yearsZ
> 受众：前端贡献者 / reviewer
> Source of truth：本文与 `FrontDoc-UID.md §5.2 按钮` 互为补充（本文为 §5.2 的"落地收紧"细则）；按钮类最终定义以 `src/app/globals.css` 为准。
> 关联：`FrontDoc-UID.md`（全局 UI 规范）、`components/primitives/button.tsx`（按钮组件）、`src/app/globals.css`（按钮类实现）
> 变更触发：本文任何按钮令牌 / 变体变更须同步到 `globals.css` 与 `button.tsx`
> Stale 信号：§5.2 与本文变体清单不一致；某模块仍出现未登记的散落描边按钮写法

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
