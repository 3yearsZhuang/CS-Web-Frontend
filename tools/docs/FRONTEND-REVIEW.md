# 前端结构审查报告

> 审查依据：`CS-Web-Frontend/tools/docs/GENERAL.md`（原子→有机体 / 职责→模块 / 单块→聚合 / 变量→优先级）
> 审查对象：`CS-Web-Frontend/src`（Next.js 16 + React 19 + Tailwind v4）
> 审查方式：全目录结构化扫描 + 关键文件核对（只读，未改任何代码）

---

## 总评

该项目整体**高度贴合 GENERAL.md**：已落地 `components/` 分层 + `modules/` 按业务域自包含（server/types/ui）+ `shared/` 跨域复用三层结构，桶导出、设计令牌、复用阈值均有执行痕迹。未发现目录按技术/后缀分组等结构性反模式，`!important` 仅 1 处且为无障碍降级动画（合规）。

但存在 **3 个高危问题**（重复实现、桶导出缺口、超限 Hook）与若干中等/低危可收敛项，详见下文。

---

## 一、高危问题（应优先修复）

### 1.1 公告管理面板三份重复实现
| 文件 | 组件 | 行数 | 使用方 |
|---|---|---|---|
| `modules/admin/ui/announcements-panel.tsx` | `AnnouncementsPanel` | 425 | `admin-messages-panel` |
| `modules/announcement/ui/admin-announcements-panel.tsx` | `AdminAnnouncementsPanel` | 451 | 仅被 component-seeds 注册，疑似遗留冗余 |
| `modules/community/ui/announcements-manager.tsx` | `AnnouncementsManager` | 10.9KB | `forum-admin-panel` |

三份高度雷同（`Announcement` 类型 / `emptyForm` / `levelOptions` / `levelBadge` 颜色映射 / 列表+表单+启停+删除），各维护一份 CRUD。**违反 GENERAL 3.4「跨 ≥2 域复用才提 common」与 2.4 复用阈值。**

> 建议：公告逻辑收敛到 `announcement` 域唯一实现，另两处改为复用或删除冗余。

### 1.2 三个原子件未入桶导出
`components/index.ts` 缺失，README 明确列为 primitives 却无法统一 `@/components` 引入：
- `primitives/filter-bar.tsx`（`FilterBar`）
- `primitives/inline-tabs.tsx`（`InlineTabs`）
- `primitives/section-nav.tsx`（`SectionNav`）

三个文件注释均写明「统一替代 XX 重复实现」，说明作者已抽取但漏登记，**违反 GENERAL 2.6 接入仪式「声明→配置→注册 三处缺一不可」**。

### 1.3 `use-admin-users.ts` 超限
`modules/admin/ui/use-admin-users.ts`（**538 行**）为全项目唯一超 500 行文件。虽已从组件拆为 Hook，但列表/搜索/筛选/多类模态框/审批全部 handler 挤在一个 Hook，仍超「逻辑 >150 行提为 Hook 后再细分」的量化红线（GENERAL 2.4）。

> 建议：按关注点拆分为 `useUserList` / `useUserModals` / `usePasswordResets`。

---

## 二、中危问题

### 2.1 `FilterBar` primitives 反向依赖业务域
`primitives/filter-bar.tsx` 第 8-9 行 `import type { EventStatus } from '@/modules/events/types'`、`import { EventStatusDot } from '@/modules/events/ui/...'`。原子件被活动状态圆点污染为业务耦合，**破坏「atoms 无业务语义」隔离原则**。

> 建议：将 `EventStatusDot` 泛化为通用原子件，或让 dot 渲染通过 props 注入解耦。

### 2.2 join / user / notification 三域缺 `ui/` 层
`modules/README.md` 声明「每域自包含 server/types/ui 三层」，但 `join`、`user`、`notification` 三域**无 ui/**，UI 散落在 `app/` 页面或 `components/` 根级（如 `notification-bell.tsx`）。

### 2.3 modules 各域 ui/ 缺 index.ts 桶
所有 `modules/<域>/ui/` 均无桶导出（README 该项为"建议"，GENERAL 3.3），跨域引用被迫写长相对路径。

### 2.4 `shared/config` 桶聚合形同虚设
`shared/config/index.ts` 已聚合 4 个配置块，但**全库无一处 `from '@/shared/config'` 导入**，业务全部直接引子文件，削弱统一出口意义（对比 components 桶被广泛使用）。

---

## 三、低危 / 可收敛项

- 状态徽章/圆点着色逻辑在多个 admin panel 内各自内联（`admin-join-panel`、`topics-manager` 等），未通用化。
- 错误/成功提示条（`border-l-2 border-[var(--destructive)]`）模式在多数 panel 与模态框重复，可抽 `feedback` 原子件。
- 筛选按钮组 active 样式大量重复（`FilterBar` 已抽但未被普遍复用）。
- `event-modals.tsx` 手写整套模态框结构，未复用已抽出的 `admin/ui/shared.tsx` `ModalShell`。
- `EventCard` 在 `admin/event-list` 与 `events/event-card` 两域同名异义（可接受，但命名易混淆）。

---

## 四、合规亮点（无需改动）

- `components/` 仅按 `primitives / layout / effects / feedback` + 根级分组，**无技术后缀分组**。
- `components/index.ts` 桶导出覆盖绝大多数组件并广泛使用。
- `shared/config / hooks` 均有桶导出；`shared/hooks` 9 个 hook 职责清晰。
- 全库 tsx **无硬编码颜色**，均走设计令牌（`var(--primary)` 等），符合 6.3.2。
- `!important` 全库仅 1 处（globals.css 无障碍降级动画），属规范允许的例外。
- 大文件基本已被正确拆分（多数 < 500 行，含 README 点名的复杂 admin panel）。
- `packageManager: pnpm@9.0.0` 已锁包管理器，符合 3.8 工程化闭环。

---

## 五、修复优先级建议

1. **合并三份公告面板** → 收敛到 `announcement` 域（高，消除重复实现）
2. **`FilterBar` / `InlineTabs` / `SectionNav` 补入 `components/index.ts`**（高，接入仪式缺口）
3. **拆分 `use-admin-users.ts`（538 行）**（高，超量化红线）
4. **`FilterBar` 解耦 events 业务域**（中，原子件隔离）
5. **补 `shared/config` 桶引用**（中，统一出口）
6. **可选**：为缺 `ui/` 的域补层、为 modules ui 补桶、收敛重复的状态徽章/提示条/筛选组

---

## 六、修复记录（2026-08-05）

已按优先级修复第 1-4 项，全部通过 `npx tsc -p tsconfig.json --noEmit` 与改动文件 ESLint 校验：

| 项 | 修复内容 | 涉及文件 |
|---|---|---|
| 1 | 公告面板收敛到 `announcement` 域唯一实现：`announcement/ui/admin-announcements-panel.tsx` 成为唯一表格风格公告管理面板（`AnnouncementsPanel`）；`admin-messages-panel` 改为从该域导入；删除冗余 `admin/ui/announcements-panel.tsx`；同步 `component-seeds.ts` 元数据（`AdminAnnouncementsPanel` → `AnnouncementsPanel`，status → done） | `announcement/ui/admin-announcements-panel.tsx`（改写）、`admin/ui/admin-messages-panel.tsx`（改 import）、`admin/ui/announcements-panel.tsx`（删除）、`shared/db/seeds/component-seeds.ts` |
| 2 | `FilterBar` / `InlineTabs` / `SectionNav` 及其类型补入 `components/index.ts` primitives 桶导出 | `components/index.ts` |
| 3 | `use-admin-users.ts`（538 行）按关注点拆为三 Hook：新增 `use-user-list.ts`（列表/搜索/筛选/分页 + `setUsers`/`setTotal`）、`use-user-resets.ts`（重置申请列表）、`use-admin-users.ts` 收敛为组合层（模态框 + 权限 + 子视图切换）。公共返回契约不变，面板组件零改动 | `admin/ui/use-user-list.ts`（新增）、`admin/ui/use-user-resets.ts`（新增）、`admin/ui/use-admin-users.ts`（重构） |
| 4 | `FilterBar` 解耦 events 业务域：`FilterBarOption.dot`（`EventStatus`）→ `dotClassName?: string`（由业务域自行提供着色），删除对 `@/modules/events` 的反向 import；事件状态色映射留在 events 域内 | `components/primitives/filter-bar.tsx`、`modules/events/ui/event-filter-bar.tsx` |

**说明 / 取舍**：
- 第 3 项拆分为「列表 / 重置申请 / 组合」三 Hook，而非报告的 `useUserList`/`useUserModals`/`usePasswordResets` 完全三态拆分——因模态框操作与 `setUsers`、`fetchPasswordResets` 高度耦合，且需保持 `useAdminUsers` 对外扁平返回契约不变以零改动面板，故将模态框 handlers 留在组合层，符合 GENERAL 6.5（最小改动、避免无关重构）。
- 第 1 项中 `community/ui/announcements-manager.tsx`（论坛管理网格/英文风格）**未合并**：其视觉体系与表格风格公告面板完全不同，合并将改动 forum-admin 既有 UI 观感，违反 GENERAL 6.5.3「现有实现已满足需求则复用而非重写」。真正的重复（admin 表格版 vs announcement 死代码版）已收敛为单一定位。

### 追加修复（2026-08-05 · 第二轮）

| 项 | 修复内容 | 涉及文件 |
|---|---|---|
| 5 | `shared/config` 桶接入业务：补全桶缺失的 auth-constants 导出（`OAUTH_2FA_COOKIE_NAME` / `OAUTH_2FA_COOKIE_MAX_AGE` / `PASSWORD_COMPLEXITY` / `PASSWORD_HISTORY_LIMIT`），并将全部 10 处直接子文件导入改为 `@/shared/config`，统一出口 | `shared/config/index.ts`、`modules/auth/server/password.ts`、`modules/auth/types/constants.ts`、`shared/security/schemas/auth-schemas.ts`、`shared/security/origin-guard.ts`、`components/layout/page-header-background.tsx`、`modules/user/server/profile.ts`、`app/page.tsx`、`app/login/page.tsx`、`app/profile/page.tsx` |

### 决定不做的项（原报告第 6-8 项 · 可选/低优先级）

- **缺 `ui/` 域的补层（join/user/notification）**：`notification` 的 UI（如 `components/notification-bell.tsx`）是**跨域复用**件（出现在导航栏），本应留在 `components/`；强行塞入 `notification/ui/` 反而破坏「跨 ≥2 域复用才提 components」约定（GENERAL 3.4），且需移动现有文件违反 6.1。
- **modules ui/ 补 index.ts 桶**：全库已统一使用干净的 `@/modules/<域>/ui/<文件>` 直接导入（37 处），为桶重导出而改 37 个导入点属「为分层而分层」，且对 30 文件的 `community/ui` 建桶有循环依赖风险；README 中此项标注为「建议」而非强约束。
- **重复状态徽章/提示条/筛选组/模态框壳收敛**：这些分散在多处大型 admin 面板中，逐一收敛是跨面广改动，违反 6.5.1 最小范围与 6.5.3「现有实现已满足则复用」；已有 primitives（`FilterBar`/`ErrorFallback`/`ModalShell`）可供后续新代码按需选用，老面板保持稳定优先。

以上决定遵循 GENERAL 六、协作约束（6.1 禁止擅自新建目录/拆分文件；6.5 最小范围、禁止顺手重构无关代码）。若需强制执行其中某项，请明确指定，我会在说明影响面后实施。
