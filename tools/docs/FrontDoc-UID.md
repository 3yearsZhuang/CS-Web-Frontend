# FZTBUCS-UI-设计规范（编辑式技术极简）

> 文档定位：前端视觉与交互设计规范（reference）
> 受众：前端开发者 / UI 评审 / 设计者
> Source of truth：颜色、字体、布局、组件、动效、交互规范的唯一权威位置
> 关联：组件清单见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md)；前端编码规范见 [FrontDoc-Conv.md](FrontDoc-Conv.md)；新页面接入见根级 [docs/Onboarding.md](../../../docs/Onboarding.md#附录-a前端工程规则)
> 2026-08-09 重构：§14 Markdown 编辑器契约下沉至 Arch §2.5.7；§4.8 Tab 配置表与未采用方案迁出至 `capsule-tabs.md`；新增 §5.0 全局组件体系与复用契约；§10 代码规范整体迁出至新文档 `FrontDoc-Conv.md`
> 最后更新：2026-08-18（新增 §15 像素融合层；§15.9 列表选型落地 / §15.10 标题虚影提炼 `<GhostTitle>` 并全站主标题落地；§11 登记像素融合白名单例外；`/join` 合并入 `/about` 加入子区块并删除路由；process 标签页移除 C 流程行、步骤与报名表全屏左右布局；§15.11 统一标题组件 `<Title>`/`<SectionMarker>`/`<ArkDivider>` 全站主标题/章节标记/分隔落地；§15.12 工作台像素化——Workbench 9 widget DNA 卡 + 今日任务索引铁路 + 顶部 CTA 像素化 + 新增 `pixel-danger` 变体）
> 更新人：3yearsZ
> 维护人：@3yearszhuang
> 变更触发：新增页面 / 组件 / 视觉变更
> Stale 信号：组件清单与实际文件不一致 / Checklist 与实际组件不符




## 章节速查（导航）

- [文档结构](#文档结构)
- [0. 设计哲学](#0-设计哲学)
- [1. 颜色系统](#1-颜色系统)
- [2. 字体系统](#2-字体系统)
- [3. 布局系统](#3-布局系统)
- [4. 悬浮折叠胶囊（Floating Capsule Sidebar）](#4-悬浮折叠胶囊floating-capsule-sidebar)
- [5. 组件规范](#5-组件规范)
- [6. 动效系统](#6-动效系统)
- [7. 视觉装饰](#7-视觉装饰)
- [8. 移动端适配](#8-移动端适配)
- [9. 交互规范](#9-交互规范)
- [10. 代码规范](#10-代码规范)
- [11. UI 专属禁止清单](#11-ui-专属禁止清单)
- [12. 新增页面 Checklist](#12-新增页面-checklist)
- [13. 参考文件](#13-参考文件)
- [14. Markdown 编辑器](#14-markdown-编辑器)
- [15. 像素融合层（Pixel Fusion / Kimi 风格）](#15-像素融合层pixel-fusion--kimi-风格)
- [变更记录](#变更记录)

## 文档结构

- **§0 设计哲学** — 三条不可妥协原则
- **§1–3** 颜色 / 字体 / 布局系统
- **§4** 悬浮折叠胶囊（Floating Capsule Sidebar；Tab 配置见 [capsule-tabs.md](capsule-tabs.md)）
- **§5.0** 全局组件体系与复用契约（新增）
- **§5–7** 组件规范 / 动效系统 / 视觉装饰
- **§8–9** 移动端适配 / 交互规范（代码规范已迁至 [FrontDoc-Conv.md](FrontDoc-Conv.md)）
- **§11–12** UI 专属禁止清单 / 新增页面 Checklist
- **§13** 参考文件
- **§14** Markdown 编辑器（契约下沉至 Arch §2.5.7）

---

## 0. 设计哲学

编辑式技术极简 - 把页面当成杂志版面 + 工业终端的混合体：

- 杂志感：12 栏栅格、衬线大标题、数字章节标记、发丝线分割
- 工业感：等宽元数据、`//` 双斜杠、`[ NN ]` 角标、扫描线、毛玻璃
- 克制：直角无圆角（radius 0.25rem 仅用于输入）、动效慢出无弹跳、颜色低饱和

三条不可妥协的原则：

1. 不发光、不浮起、不渐变背景 - 卡片只有边框色 + 微透明叠加
2. 数字优先 - 章节用 `[ 00 ]` 标记，元数据用等宽小字
3. 动效克制 - 统一 `cubic-bezier(0.16, 1, 0.3, 1)`，无 spring 弹跳

---

## 1. 颜色系统

所有颜色必须通过 CSS 变量引用，禁止硬编码十六进制值。

| 变量 | 浅色模式 | 深色模式 | 用途 |
|------|---------|---------|------|
| `--primary` | `#1e40af` 深蓝 | `#d4a574` 琥珀金 | 强调色：链接、active、章节标记 |
| `--background` | `#fdf5f7` 浅粉底 | `#000000` 纯黑 | 页面底色 |
| `--foreground` | `#1e1233` 深黑紫 | `#f5f5f4` 暖白 | 正文文字 |
| `--muted-foreground` | `#6b5572` 紫灰 | `#8a8a85` 中灰 | 次级文字、元数据 |
| `--border` | `rgba(30,18,51,0.08)` | `rgba(255,255,255,0.06)` | 1px 发丝线 |
| `--card` | `#ffffff` | `#0a0a0a` | 卡片背景 |

用色规则：
- 强调色仅用于关键交互：active 状态、CTA 按钮、focus 描边、章节标记数字
- 正文永远用 `--foreground`，次级信息用 `--muted-foreground`
- 深色模式不是浅色反色 - 强调色从深蓝切到琥珀金，是两套独立设计

---

## 2. 字体系统

| 语义 | 字体栈 | 用途 |
|------|--------|------|
| 展示衬线 | Fraunces + Noto Serif SC | 大标题、Hero、章节标题 |
| 正文无衬线 | Manrope + Noto Sans SC | 正文、表单、UI |
| 等宽 | JetBrains Mono | 元数据、数字、代码 |

> 字体加载（2026-08-06 起）：5 个字体族均由 `src/app/layout.tsx` 的 `next/font/google` 自托管引入——build 时下载并本地子集化，Latin 子集预载 + CJK 中文按 unicode-range 按需加载，`display: swap` 不阻塞首屏。各字体以 `--font-*` 变量挂载到 `<body>`，本文件的 `--font-sans/mono/serif` 组合栈引用它们。**禁止再以 CSS `@import` 拉取 Google Fonts。**

### 工具类

```tsx
<h1 className="display-serif">大标题</h1>
<span className="serif-italic">/ 斜体注释</span>
<span className="meta-mono">[ 00 ] Section</span>
<span className="section-marker">[ 00 ]</span>
```

### 字号阶梯（全部 clamp 自适应）

| 场景 | 类名 |
|------|------|
| Hero 主标题（展开） | `text-[clamp(36px,9vw,120px)]` |
| Hero 主标题（折叠） | `text-[clamp(22px,4vw,36px)]` |
| 次级页 Hero | `text-[clamp(36px,7vw,88px)]` |
| 详情页 Hero | `text-[clamp(28px,5vw,56px)]` |
| 章节大标题 | `text-[clamp(28px,5vw,56px)]` |
| 正文 | `text-[15px]` 或 `text-[14px]` |
| 元数据 | `text-[10px]` / `text-[11px]` |

---

## 3. 布局系统

### 3.1 12 栏栅格

所有页面主体使用 12 栏栅格，左侧 2 栏放章节标记，右侧 10 栏放内容：

```tsx
<div className="grid grid-cols-12 gap-0">
  <div className="col-span-12 md:col-span-2">
    <div className="section-marker">[ 01 ]</div>
  </div>
  <div className="col-span-12 md:col-span-10">
    {/* 内容 */}
  </div>
</div>
```

### 3.2 页面宽度与边距

- 最大宽度：`max-w-[1600px] mx-auto`
- 水平边距：`px-4 sm:px-6 md:px-8`
- 顶部留白：所有页面 `<main>` 必须有 `pt-16`（避开 fixed Navbar 64px）
- 章节垂直留白：`py-16 sm:py-24`，章节间用 `border-t border-[var(--border)]` 分割

### 3.3 Navbar

- fixed 顶栏 `h-16`（64px），`z-50`
- 移动端全屏菜单 `z-40`，`pt-16`

### 3.4 子页面返回按键

所有从上级页面进入的子页面（如 `/tools/exam`、`/tools/resource`、`/community/community/[category]`），必须在 Hero 区域的 `[ 00 ]` section-marker 下方放置返回按键，链接回上级页面。

位置：`[ 00 ]` section-marker 的正下方，12 栏栅格左侧 2 栏内

样式：

```tsx
<Link
  href="/tools"  {/* 上级页面路由 */}
  className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px]"
>
  ← 返回
</Link>
```

完整示例：

```tsx
<div className="grid grid-cols-12 gap-0">
  <div className="col-span-12 md:col-span-2">
    <div className="section-marker">[ 00 ]</div>
    <Link
      href="/tools"
      className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px]"
    >
      ← 返回
    </Link>
  </div>
  <div className="col-span-12 md:col-span-10">
    {/* 标题等内容 */}
  </div>
</div>
```

适用场景：
- 所有有明确上级页面的子页面
- Hero 折叠时返回按键不隐藏，始终保持可见
- 交互式页面（如考试答题页）可在 sticky header 中使用相同样式的返回按键

各页面返回映射：

| 子页面 | 返回路由 | 返回文字 |
|--------|---------|---------|
| `/tools/exam` | `/tools` | `← 返回` |
| `/tools/resource` | `/tools` | `← 返回` |
| `/community/community/[category]` | `/community/community` | `← 返回` |
| `/community/community/[category]/[topicId]` | `/community/community/[category]` | `← 返回` |
| `/tools/exam/[id]` | `/tools/exam` | `← 返回` |

### 3.5 全局 Token 速查表

定义于 `src/app/globals.css`，集中管理、禁止 ad-hoc 硬编码。

**z-index 层级**：

| Token | 值 | 用途 |
|-------|-----|------|
| `--z-base` | 10 | 页面主要内容 |
| `--z-sticky` | 30 | 粘性 hero-acrylic / section-nav / 悬浮胶囊 |
| `--z-banner` | 40 | 公告横幅 |
| `--z-header` | 50 | 顶部导航 / 下拉 / Modal |
| `--z-toast` | 60 | Toast |
| `--z-transition` | 70 | 页面过渡遮罩 |
| `--z-overlay` | 9998 | 扫描线 / 噪点 |

**动效时长与缓动**：

| Token | 值 | 用途 |
|-------|-----|------|
| `--duration-fast` | 200ms | hover 过渡、微交互 |
| `--duration-base` | 300ms | 标准过渡 |
| `--duration-cinematic` | 800ms | Hero 折叠 / 焦点拉近 |
| `--duration-epic` | 1400ms | 首页莫比乌斯环入场 |
| `--ease-ark` | `cubic-bezier(0.16, 1, 0.3, 1)` | 全站统一缓动 |

**圆角 / 阴影**（例外白名单见 §11）：

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius` | 0.25rem | 输入框、行内代码、图片 |
| `--radius-capsule` | 28px | 悬浮胶囊容器 |
| `--radius-capsule-item` | 22px | 胶囊内 Tab 项 |
| `--shadow-popover` | `0 4px 24px rgba(0,0,0,0.04)` | 下拉浮层 / hero-acrylic |
| `--shadow-modal` | `0 8px 40px rgba(0,0,0,0.08)` | Modal / 抽屉 |

---

## 4. 悬浮折叠胶囊（Floating Capsule Sidebar）

### 4.1 概述

项目中 [01] [02] … 编号式导航统一升级为悬浮折叠胶囊（Floating Capsule Sidebar）。胶囊以独立形态固定在内容区左侧，完全脱离文档流，折叠时仅显示编号 + active 圆点指示器，hover / 键盘 focus / 首次访问演示时平滑展开显示完整标签（见 §4.5 交互补充）。

核心设计理念：
- 最大化内容宽度 - 胶囊脱离文档流，不占用 12 栏栅格中的任何一栏
- 即时可达 - 始终悬浮可见，不受页面滚动影响
- 极简美学 - 折叠态仅编号，展开态才显示完整标签

### 4.2 视觉规格

| 特性 | 折叠态 | 展开态（hover） |
|------|--------|----------------|
| 容器圆角 | `rounded-[var(--radius-capsule)]`（28px） | `rounded-[16px]` |
| 标签宽度 | `max-w-0 opacity-0` | `max-w-[140px] opacity-100` |
| 编号 | 11px 等宽，始终可见 | 同左 |
| active 指示 | 顶部 5px 圆点（primary 色） | `primary-dim` 背景（`rgba(212,167,116,0.12)`） |
| 背景材质 | `hero-acrylic` 亚克力毛玻璃 | 同左 |
| 阴影 | `0 4px 24px rgba(0,0,0,0.04)` | 同左 |

### 4.3 亚克力材质

```css
.hero-acrylic {
  background: color-mix(in srgb, var(--background) 60%, transparent);
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
}
```

### 4.4 内容留白

```tsx
<div className="relative max-w-4xl mx-auto pb-32 md:pl-24">
  {/* 内容区 - md:pl-24 为胶囊展开态预留空间 */}
</div>
```

### 4.5 组件接口

```typescript
import { FloatingCapsuleSidebar, type CapsuleTab } from '@/components/floating-capsule-sidebar';

interface CapsuleTab {
  key: string;    // 唯一标识
  num: string;    // 编号显示，如 "01"
  label: string;  // 标签文字，如 "用户 / Users"
}

interface FloatingCapsuleSidebarProps {
  tabs: CapsuleTab[];
  activeKey: string;
  onTabChange: (key: string) => void;
  visible?: boolean;   // 控制淡入/淡出动画，默认 true
}
```

> 交互补充（2026-08-06）：
> - 展开判定三源合一：`expanded = hovered || focused || peeking`。容器 `onFocus/onBlur` 使**键盘用户（Tab 导航）同样可以展开**，纯键盘可达，不再依赖 hover。
> - **首次访问 peek 演示**：桌面端（`md+`）且非 `prefers-reduced-motion` 时，胶囊首次出现自动播放一次"展开→回落"演示（约 2.6s），帮助用户发现折叠态承载完整标签；`localStorage['capsule-peek-seen']` 记忆，仅一次。
> - 内层 Tab 按钮焦点类使用 `focus-ring`（`focus-amber` 语义别名，见 §9）。

### 4.6 与 useCollapsingHero 的协作

所有带 Hero 区域的页面中，胶囊的显示/隐藏与 Hero 折叠态联动：

```
Hero 展开 -> 胶囊不可见 -> 用户向下滚动 -> Hero 折叠为 sticky 悬浮态
-> 800ms 后（CSS transition 结束）-> capsuleVisible=true -> 胶囊淡入

点击折叠态 Hero 标题 -> capsuleVisible=false -> 胶囊淡出
-> 平滑回顶 -> Hero 展开 -> 重新挂载 scroll listener
```

通过 `use-collapsing-hero.ts` hook 统一管理 `capsuleVisible` 状态，通过 `AnimatePresence` + `motion.div` 实现淡入/淡出动画。

### 4.7 移动端降级

- 桌面端（`md+`）：悬浮胶囊固定在左侧，`hidden md:block`
- 移动端（`<md`）：自动降级为 `SectionNav` 编号 Tab 条（`md:hidden`），位于内容区顶部（Hero 下方），flex 自动换行（`flex-wrap`），**始终可见，不受 `visible` 控制**

### 4.8 各页面 Tab 配置

各页面的 `tabs` 配置随功能增减高频变动，统一维护在独立数据文件 [capsule-tabs.md](capsule-tabs.md#1-各页面-tab-配置表)；新增页面须同步该表并在 `FloatingCapsuleSidebar` 传入 `CapsuleTab[]`（接口见 §4.5）。

### 4.9 实现文件清单

| 文件 | 用途 |
|------|------|
| `src/components/layout/floating-capsule-sidebar.tsx` | 悬浮胶囊侧边栏组件 |
| `src/shared/hooks/use-collapsing-hero.ts` | Hero 折叠与胶囊显隐联动 hook |
| `src/app/globals.css` | `hero-acrylic` 亚克力材质样式 |

---

## 5. 组件规范

### 5.0 全局组件体系与复用契约

前端组件分两层：**全局设计系统**（`src/components/`，零业务依赖，全站复用）与**模块局部组件**（`src/modules/*/ui/`，仅本模块使用）。全局组件按职责分四层 + 顶层跨层，复用层级见 §5.7：

| 复用层级 | 目录 | 职责 | 代表组件 |
|---------|------|------|---------|
| 原子 primitives | `components/primitives` | 无业务的通用原子件 | button / input / spinner / section-nav / inline-tabs / confirm-dialog |
| 结构 layout | `components/layout` | 页面骨架与导航 | navbar / footer / collapsing-hero / floating-capsule-sidebar |
| 动效 effects | `components/effects` | 入场/过渡动效原语 | motion-primitives / mobius-ring / page-transition / scroll-indicator |
| 反馈 feedback | `components/feedback` | 加载/空/错/成功四态 | toast / empty-state / fallback / announcement-banner |
| 跨层 root-level | `components/`（顶层） | 跨页面全局件 | avatar / user-menu / notification-bell / theme / tech-tag-selector |

**依赖方向（单向）**：`模块组件 → 全局组件`；全局组件**禁止反向 import 任何 `src/modules/*`**（保持零业务依赖，详见 Arch Part A §1.2.3 依赖矩阵）。

**复用契约（新增页面/组件必须遵守）**：
1. 一律从 `primitives` 取按钮/输入/焦点环，禁止在模块里重造原子组件（补充进 §11 禁止清单）。
2. 模块组件可 import 全局组件；全局组件不得 import 模块组件。
3. 模块内组件若被 ≥2 个模块复用，应评审后提升为全局 `primitives`（新增全局原语须评审）。

### 5.1 卡片

```tsx
<div className="border border-[var(--border)] card-minimal p-6">
  {/* 内容 */}
</div>
```

禁止：`shadow-lg`、`hover:shadow-xl`、`hover:-translate-y-1`、渐变背景

### 5.2 按钮

8 类统一按钮，定义在 `src/app/globals.css`（详见 [`FrontDoc-UIButton.md`](FrontDoc-UIButton.md)）：

```css
.btn-primary          /* 主按钮 - primary 纯色背景 */
.btn-primary-sm       /* 主按钮（小号）- 行内操作 */
.btn-danger           /* 危险操作 - destructive 纯色背景 */
.btn-outline          /* 描边按钮 - 透明背景 + 边框 hover */
.btn-outline-sm       /* 描边按钮（小号）- 行内次要操作 */
.btn-outline-danger   /* 描边危险 - 透明背景 + destructive 边框，hover 转危险色（替代手搓 hover:text-[var(--destructive)]） */
.btn-ghost            /* 纯文字按钮 - 无边框，primary 文字，hover 转 foreground */
.btn-xs               /* 紧凑尺寸（11px→10px 视觉）用于关注 compact / 极小操作 */
.btn-page            /* 分页专用（共享），active 复用 .btn-active */
.btn-active           /* 选中/按下态修饰（与 outline/ghost/page 组合，solid 变体勿用） */
```

规格：`font-mono uppercase tracking-wider`；大按钮 `py-3 px-6`、小按钮 `py-1.5 px-3`（**outline-sm 字号 11px**，非 12px）、紧凑 `py-0.25rem px-0.5rem 10px`；`transition-colors`，`disabled:opacity-30`，焦点环统一 **`focus-ring`**（`focus-amber` 为历史别名，已废弃）。

```tsx
<button className="btn-primary focus-ring">Save Changes -></button>
<button className="btn-primary-sm focus-ring">+ New Event</button>
<button className="btn-danger focus-ring">Delete</button>
<button className="btn-outline focus-ring">Cancel</button>
<button className="btn-outline-sm focus-ring">Pin</button>
{/* 推荐经 components/primitives/button.tsx 封装：自动附加 focus-ring、支持 active/loading、outline-danger/ghost/xs */}
<Button variant="outline-danger" size="sm">Delete</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="outline" size="sm" active={pinned}>Pinned</Button>
<Button variant="outline" size="xs">Follow</Button>
<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
```

推荐经 `src/components/primitives/button.tsx` 封装使用（自动附加 `focus-ring` 并处理 loading 态）。

> 落地收紧细则见 [`FrontDoc-UIButton.md`](FrontDoc-UIButton.md)：扩展变体（`outline-danger` / `ghost` / `xs` / `active`）、分页共享件、规范↔代码字体/焦点环漂移修订、39 文件迁移映射与反模式。

不变的部分：文字按钮（`underline-grow`、`meta-mono` 文字链接）、主题切换、通知铃铛、筛选标签、悬浮胶囊 Tab 保持原有设计；分页按钮允许保留方形描边视觉，但重复出现须抽成共享 `.btn-page`（禁止多处复制手搓）。

### 5.3 输入框

```tsx
const INPUT_CLASS =
  'w-full px-4 py-3 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[14px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-ring transition-colors';
```

### 5.4 头像

- 直角方形（无 `border-radius`）
- Navbar 32 / 移动端汉堡菜单 56 / Profile 128
- 默认首字母回退（`--primary` 底色）

### 5.5 下拉菜单

- 暗色背景 + 发丝线边框 + 交错展开动画
- 菜单项格式：`[序号] 标签 -> 英文`

### 5.6 四态规范（加载 / 空 / 错误 / 成功）

所有列表与表单必须显式处理以下四种状态，禁止"无状态裸渲染"：

| 状态 | 规范 | 组件 |
|------|------|------|
| 加载 | 等宽细点动画或 spinner，禁止整页白屏 | `primitives/loading.tsx`、`primitives/spinner.tsx` |
| 空 | 有教育意义的引导文案 + 建议动作（如"创建第一个活动 ->"），禁止只写"暂无数据" | `feedback/empty-state.tsx` |
| 错误 | 非指责语气 + 可执行的恢复路径（重试/返回），禁止裸 500 文本 | `feedback/fallback.tsx`（ErrorBoundary） |
| 成功 | 明确确认 + 下一步指引；破坏性操作需先经确认弹窗 | `primitives/confirm-dialog.tsx`、`feedback/toast.tsx` |

补充约定：
- 所有可交互控件（按钮/链接/输入/开关）必须可见焦点环（`focus-ring`）
- 表单提交中 `disabled` + 文案变"提交中..."；提交失败保留用户输入
- 页面级错误由 `feedback/fallback.tsx` 兜底；组件级局部错误就地展示 + 重试按钮

### 5.7 组件全清单（复用层级）

与 `src/components/` 目录一一对应（新增组件须同步更新本清单，Stale 信号见文档头）。各组件文件路径与参考实现见 §13；分层与复用边界见 §5.0。

| 复用层级 | 组件 |
|---------|------|
| 根级 root-level | `avatar` · `user-menu` · `notification-bell` · `theme-toggle` · `theme-provider` · `tech-tag-selector` · `swr-provider` |
| effects | `motion-primitives` · `mobius-ring` · `page-transition` · `scroll-indicator` |
| layout | `navbar` · `footer` · `collapsing-hero` · `floating-capsule-sidebar` · `use-collapsing-hero` · `language-switcher` · `page-header-background` |
| primitives | `button` · `input` · `spinner` · `loading` · `section-nav` · `inline-tabs` · `filter-bar` · `confirm-dialog` |
| feedback | `announcement-banner` · `toast` · `empty-state` · `fallback` |

---

## 6. 动效系统

### 6.1 统一缓动

所有动效使用 `cubic-bezier(0.16, 1, 0.3, 1)`（慢出，无回弹）。禁止 `ease-in-out`、`linear`、spring 弹跳。

### 6.2 Hero 入场时序

所有带 Hero 的页面使用 `useCollapsingHero` + `StaggerContainer`：

```tsx
const { collapsed, onRevealComplete, onTitleClick } = useCollapsingHero();

<StaggerContainer onComplete={onRevealComplete}>
  <RevealTitle><h1>标题</h1></RevealTitle>
  <RevealItem><p>描述</p></RevealItem>
</StaggerContainer>
```

时序链路（事件驱动）：

```
挂载 + 锁滚
  -> LOAD_DELAY 500ms 缓冲
  -> 字体浮现（StaggerContainer 子项逐个完成）
  -> onComplete -> 解锁滚动 + 挂载 scroll listener
  -> 用户首次滚动（scrollY > 4px）-> 折叠为 sticky 悬浮态
  -> 用户点击标题 -> 平滑回顶 -> 展开
```

### 6.3 动画原语

| 组件 | 用途 | 参数 |
|------|------|------|
| `StaggerContainer` | 交错容器，控制子项时序 | `onComplete`、`delay`、`stagger` |
| `RevealTitle` | 大标题入场（scale 1.015 + blur 12px） | `duration` 默认 1.1s |
| `RevealItem` | 通用项入场（y 16 + blur 6px） | `duration` 默认 0.7s |

禁止自行实现入场动画，必须复用这三个原语。

### 6.4 CSS 动画类

| 类名 | 用途 | 时长 |
|------|------|------|
| `ark-cinematic-reveal` | 影院级焦点拉近 | 1.8s |
| `ark-wipe-in` | 横向擦除揭示 | 1s |
| `char-reveal` | 字符级 clip-path 升起 | 0.8s |
| `underline-grow` | 链接下划线从左滑出 | 0.4s hover |

---

## 7. 视觉装饰

- 章节标记：`<div className="section-marker">[ 00 ]</div>`，从 00 递增
- 工业双斜杠：`<span className="ark-divider">3yearsZ Design</span>`
- 角标：`<div className="ark-corner-bracket">内容</div>`
- 扫描线：`.ark-scanline` - `opacity 0.04`，`z-9998`
- 噪点：`.noise-overlay` - `opacity 0.008`，`z-9999`

---

## 8. 移动端适配

| 断点 | 用途 |
|------|------|
| 默认 <640px | 移动端基础样式 |
| `sm:` ≥640px | 大手机/小平板 |
| `md:` ≥768px | 平板/桌面端分界（Navbar 切换、栅格切换） |
| `lg:` ≥1024px | 桌面端 |

规则：Navbar `<md` 显示汉堡按钮；栅格 `<md` 单列堆叠；字号全部 `clamp()`；触控区 ≥44px（WCAG 2.5.5，navbar 移动端抽屉已实测 44×44）

---

## 9. 交互规范

- 导航链接 active 态：`--primary` 色 + 1px 底部下划线
- 普通链接 hover：用 `underline-grow` 或 `ark-link`
- 下拉/浮层：点击外部关闭 + Esc 键关闭
- 表单提交中显示 `disabled` + 文字变"提交中..."
- 所有可交互元素必须有 `focus-ring` 类（语义焦点环；`focus-amber` 为历史别名，行为一致，新代码禁用）

---

## 10. 代码规范

> 前端编码规范（TS/React/Next.js 约定、React Compiler 红线、文件头 JSDoc、样式实现、客户端/服务端边界、`'use client'` 位置、组件复用契约、widget 注册表、i18n、测试、Git、编码侧禁止项）已整体迁至 [FrontDoc-Conv.md](FrontDoc-Conv.md)，本文档只保留视觉与交互规范。中文排版规则见根 [`RootDoc-EngConv.md`](../../../docs/RootDoc-EngConv.md) §九。

---

## 11. UI 专属禁止清单

| 禁止 | 原因 |
|------|------|
| 硬编码颜色十六进制值 | 破坏主题切换 |
| 默认阴影 `shadow-lg` / `shadow-2xl` / `hover:shadow-*` | 浮层阴影必须走 `--shadow-popover` / `--shadow-modal` token |
| 发光阴影（`0 0 12px` 类） | 违背"不发光"原则，改用 ring 描边（`0 0 0 Npx`） |
| 白名单外圆角（`rounded-xl` / `rounded-2xl` 等） | 编辑式风格用直角 |
| `ease-in-out` / spring 弹跳动画 | 统一用慢出缓动 |
| `hover:-translate-y-1` 浮起 | 卡片只有边框变色 |
| 渐变背景（logo 装饰例外） | 违背极简原则 |
| 自行实现入场动画 | 必须复用 motion-primitives |

> 编码侧禁止项（`console.log` 留生产代码、中文间加空格、不写 JSDoc、CSS `@import` 拉 Google Fonts、`.sh` 脚本、react-dev-inspector、Vite 依赖等）已迁至 [FrontDoc-Conv.md §12](FrontDoc-Conv.md#12-禁止事项汇总)，**本 §11 仅保留 UI 视觉专属禁止**，此处不重复。

**圆角例外白名单**（仅限以下语义，新增须评审）：

| 元素 | 允许值 |
|------|--------|
| 输入框 / 行内代码 / 长文图片 | `--radius`（0.25rem） |
| 悬浮胶囊容器 / 胶囊内 Tab 项 | `--radius-capsule`（28px）/ `--radius-capsule-item`（22px） |
| 圆形元素：头像、状态点、spinner、角标徽章、胶囊 active 指示点 | `rounded-full` |

**像素融合层例外（§15，2026-08-18）**：DNA 卡（`.dna-card`）与像素按钮（`.btn-pixel*`）的硬阴影、hover `translate` 位移与 `steps()` 跳变属**白名单例外**，仅限这些像素融合类使用；普通卡片/按钮仍遵守上表（仅边框变色、禁浮起、禁阴影）。

---

## 12. 新增页面 Checklist

- [ ] `<main className="relative pt-16">` 顶部留白
- [ ] `max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8`
- [ ] 12 栏栅格 + `[ 00 ]` 章节标记
- [ ] Hero 区用 `useCollapsingHero` + `StaggerContainer` + `RevealTitle`
- [ ] 折叠态 sticky + `hero-acrylic` + `cursor-pointer`
- [ ] 所有颜色用 `var(--xxx)`
- [ ] 所有标题用 `clamp()` 自适应
- [ ] 所有动效用 `cubic-bezier(0.16, 1, 0.3, 1)`
- [ ] 文件头 JSDoc 完整，`'use client'` 在 JSDoc 之后（见 [FrontDoc-Conv.md §3.2/§6](FrontDoc-Conv.md#6-文件头注释jsdoc)）
- [ ] 所有可交互元素挂 `focus-ring`
- [ ] 圆角/阴影只走 §3.5 / §11 白名单 token
- [ ] 列表/表单四态显式处理（加载/空/错误/成功，见 §5.6）
- [ ] 移动端 `<md` 单列堆叠，触控区 ≥44px
- [ ] `tsc --noEmit` + `eslint` 0 错误（编码侧自查见 [FrontDoc-Conv.md §10/§13](FrontDoc-Conv.md#13-检查清单提交前自查)）
- [ ] 如需 Tab 切换，使用 `FloatingCapsuleSidebar` 组件
- [ ] 如有 Hero，胶囊与 `useCollapsingHero` 联动
- [ ] 如是子页面，`[ 00 ]` 下方放 `← 返回` 按键（见 §3.4）

---

## 13. 参考文件

| 文件 | 内容 |
|------|------|
| `src/app/globals.css` | 颜色变量、字体组合栈、工具类、token（z-index/时长/圆角/阴影）、动画 keyframes |
| `src/app/layout.tsx` | 根布局 + next/font/google 字体自托管声明（--font-* 变量） |
| `src/components/effects/motion-primitives.tsx` | StaggerContainer / RevealTitle / RevealItem |
| `src/components/layout/floating-capsule-sidebar.tsx` | 悬浮胶囊侧边栏组件（focus 展开 + 首次 peek 演示） |
| `src/components/primitives/section-nav.tsx` | 胶囊移动端降级 Tab 条 |
| `src/shared/hooks/use-collapsing-hero.ts` | Hero 折叠 hook |
| `src/components/layout/navbar.tsx` | 全局导航 |
| `src/app/page.tsx` | 首页（Hero 折叠参考实现） |
| `src/app/about/page.tsx` | 关于页（章节标记参考） |
| `tools/docs/FrontDoc-UID.md` | 本文档 - 视觉与交互设计规范 |
| `tools/docs/FrontDoc-Conv.md` | 前端编码规范（JSDoc / 样式实现 / 客户端服务端边界 / 组件契约，§10 迁出） |

---

## 14. Markdown 编辑器

> Markdown 编辑器契约已下沉为社区模块契约（避免全局 UI 规范膨胀）。完整组件架构 / Props / 使用场景 / 安全策略见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md) §2.5.7。

本规范仅保留结论：社区 Markdown 编辑/渲染统一使用 `src/modules/community/ui/` 下的三层组件——`MarkdownRenderer`（只读渲染）/ `MarkdownEditorBase`（基础编辑）/ `MarkdownEditor`（完整编辑，含工具栏 + 图片上传）；安全渲染走 `rehype-sanitize`；内容长度限制统一在 `src/shared/utils/ui-constants.ts` 的 `FORM_LIMITS`。新增页面接入见 Arch §2.5.7。

---

## 15. 像素融合层（Pixel Fusion / Kimi 风格）

> 2026-08 引入：从 careers.kimi.com（月之暗面招聘站）提取视觉语言，与「编辑式技术极简」做**平衡融合**。
> 核心原则：像素语言只注入**元数据层与交互**（标签 / 编号 / 角标 / 按钮 / 卡片皮肤），**不动** Fraunces 衬线标题与正文栈。全站像素化与 scroll-jacking 不采用。
> 参照 demo：`tools/demo/kimi-pixel-style-demo.html`（风格 DNA + 融合示范）、`tools/demo/cards-pixel-options.html`（卡片方案对照）。

### 15.1 字体令牌

| 令牌 | 值 | 说明 |
|------|-----|------|
| `--font-fusion-pixel` | `src/app/fonts/fusion-pixel-zh_hans.woff2`（layout.tsx `localFont` 自托管） | Fusion Pixel 12px Mono zh_hans，OFL-1.1 |
| `--font-pixel` | `var(--font-fusion-pixel), ui-monospace, ...` | 像素元数据组合栈（globals.css 双写：`@theme inline` + `:root`） |

### 15.2 页面作用域（像素元数据层）

统一 opt-in：在页面根节点 `<main>` 加 `.pixel-page` 即把元数据层切换为像素字体（globals.css 作用域选择器，特异度 (0,2,0) 高于 `.meta-mono` 等 (0,1,0)）；历史 `.about-page` / `.events-page` 一并兼容：

```css
.pixel-page .meta-mono, .pixel-page .tag-badge, .pixel-page .font-mono,
.about-page .meta-mono, .about-page .tag-badge, .about-page .font-mono,
.events-page .meta-mono, .events-page .tag-badge, .events-page .font-mono {
  font-family: var(--font-pixel);
}
```

- **接入新页面**：给 `<main>` 加 `pixel-page` 即可（已覆盖 join / login / profile / users/[id] / notifications / events/[id] / community* / tools*）。**不要**在无关页面全局替换 `.meta-mono`
- **排除**：管理员后台 `/admin` 不接入，保持其高密度数据表格可读性（Fusion Pixel 为 12px 位图字体，不利长数字密集排版）
- 首页是特例：用内联 `style={{ fontFamily: 'var(--font-pixel)' }}` 选择性像素化（本项目自定义类优先级高于 Tailwind 工具类，改字体族用内联 style，勿用 `font-pixel` 工具类）

### 15.3 DNA 卡（共享组件）

参照 demo「风格四要素拆解」DNA 卡 +「融合示范」fusion-frame。**已提炼为共享组件** `src/components/primitives/dna-card.tsx` 的 `<DnaCard>`（props：`corner?: string|number` 自动补零两位、`className?`、`as?: 'article'|'div'`、children），皮肤样式全局生效（不再限页面作用域）：

| 类 | 用途 | 规格 |
|----|------|------|
| `.dna-card` | 卡片皮肤 | 表面 `color-mix(fg 8%, bg)`；边框 `color-mix(fg 14%, bg)`；**默认硬阴影** `4px 4px 0 color-mix(fg 10%, transparent)`；hover `translate(-3px,-3px)` + `7px 7px 0 color-mix(primary 30%)` + 边框主色 45%，`transition: transform/box-shadow .15s steps(3)`；padding 26px 24px |
| `.dna-corner` | 右上角像素编号 | `position:absolute; top:14px; right:16px`；`--font-pixel` 11px；muted，hover 转 primary；`aria-hidden`（装饰性编号） |
| `.dna-meta` | 元数据行 | flex wrap；`--font-pixel` 11px；`.dna-tag` = primary / `.dna-dim` = muted |

使用方（均经 `<DnaCard>` 或直接 `.dna-card` 类）：
- `/about` 方向卡片（`<DnaCard corner={d.num}>` 无链接）
- `/events` 活动时间轴卡片（`<DnaCard corner={index+1}>` 内嵌 `Link`，`isLeft` 交替 + archived 透明度降级）
- `/community` 精选横滑卡 `featured-topic-strip`（盒装卡 → `dna-card`）
- `/tools` 工具卡（`dna-card`，available 态保留 `hover:bg` 微染）
- `/tools` 工作台（Workbench）9 个 widget 盒装卡（`greeting-bar`/`today-tasks`/`github-heatmap`/`llm-widget`/`quick-notes`/`pomodoro`/`exam-countdown`/`llm-usage-stats`/`assistant-chat`）统一经 `<DnaCard corner={…}>`：角标语义 `HI`(问候) / `TSK`(任务) / `GIT`(GitHub) / `AUX`(LLM) / `NOTE`(便签) / `FCS`(番茄钟) / `EXM`(考试) / `MEM`(用量) / `CHAT`(对话)；布局设置面板 `card-minimal`→`<DnaCard corner="CFG">`；非嵌入态独立卡仍保留 `card-minimal`（避免 DnaCard 嵌套）
- **不适用**：Feed / 主题列表项 `feed-item-card` / `community-topic-item` 是「列表行」（`border-b` 分隔 + 紧凑 padding），非盒装卡，保持列表样式、由 `.pixel-page` 像素化其元数据即可，勿套 `.dna-card`（会撑大行高、破坏列表密度）

### 15.4 像素按钮

`Button` 组件新增 `pixel` / `pixel-outline` / `pixel-danger` 变体（映射 `.btn-pixel*` / `.btn-pixel-danger*`）：实色硬阴影 `4px 4px 0 var(--muted-foreground)`（主/次按钮统一）、hover `translate(-2px,-2px)`、active `translate(2px,2px)`、`transition steps(2)`、全令牌适配双主题。`pixel-danger` 用 `var(--destructive)` 底 + `var(--destructive-foreground)` 字 + `3px 3px 0` 硬阴影（破坏性操作，如工作台「清空」、删除类 CTA）；首页 CTA、`/about` 与 `/events` 的 CTA 使用 `pixel`/`pixel-outline`，工作台破坏性 CTA 使用 `pixel-danger`。

### 15.5 首页 Hero 像素层

- `TypewriterTitle`（`effects/motion-primitives`）：字符级 `steps(6)` 逐字入场 + `▌` 闪烁光标（`.typewriter-cursor`，`var(--primary)`）；遵守 StaggerContainer register/unregister/notifyComplete 协议；SSR 渲染原文
- `StarfieldCanvas`（`effects/starfield-canvas`）：像素点星空，叠于 `MobiusRing` 之下；DPR≤2、`prefers-reduced-motion` 静态帧、`document.hidden` 暂停 RAF、星色跟随主题
- 标题字重：像素标题用内联 `fontWeight: 300` 覆盖 `.display-serif` 350（CJK 350 会落到 400 显粗）

### 15.6 活动页同屏双视图（/events）

时间线 + 日历**同屏**展示（2026-08-18 起，替代原「时间轴 / 日历」切换）：

```tsx
{/* 日历列收窄为固定 320px，时间线占剩余空间；显式分层避免 sticky 日历覆盖卡片 hover */}
<div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12 lg:gap-12 items-start">
  <div className="relative z-0 lg:sticky lg:top-24"><MonthCalendar events={events} /></div>
  <div className="relative z-10"><YearAccordionTimeline ... /></div>
</div>
```

- 移动端（单列）：DOM 顺序日历在前 → **日历在上、时间线在下**
- 桌面（`lg:grid-cols-[320px_1fr]`）：**左日历、右时间线**（保持「日历优先」阅读顺序）；日历列固定 320px（进一步压缩占比，时间线主导），`lg:sticky lg:top-24` 随滚动固定（需栅格容器 `items-start` 配合）
- **分层与 hover 安全（2026-08-18 修订）**：日历列 `relative z-0`、时间线列 `relative z-10` 显式分层，保证 sticky 日历**永不覆盖**时间轴 DNA 卡的 `translate(-3px,-3px)` 抬升与 `7px 7px` 硬阴影（§15.3/§15.7）；`lg:gap-12`（48px）留白进一步隔离两列，左列卡片 hover 位移亦不会触及日历
- 顶部筛选栏同时驱动两个视图（共享 `events` 状态）；若调整桌面比例/左右对调，改栅格与 `order-*` 即可

### 15.7 与既有规范的豁免（必读）

像素融合层的**硬阴影、hover translate、steps() 跳变**违反 §0「不浮起」与 §11「禁止 hover:-translate-y-1 / 默认阴影」，属**有意引入的白名单例外**，仅限以下类：`.dna-card`、`.dna-corner`（hover 变色）、`.btn-pixel*`、`.typewriter-ch/.typewriter-cursor`。其余卡片/按钮仍受 §0/§11 约束（§11 已登记例外）。

### 15.8 组件化决策（更新 2026-08-18）

- **按钮**：像素按钮 `pixel` / `pixel-outline` 变体已沉淀于共享 `Button` 组件（`primitives/button.tsx`，映射 `.btn-pixel*`），全站 CTA 均经此组件，无需额外封装。
- **卡片**：已按用户要求**提炼为共享组件** `<DnaCard>`（`primitives/dna-card.tsx`，见 §15.3）；`/about` 与 `/events` 现经该组件渲染，新增盒装卡直接复用 `<DnaCard corner={…}>`。皮肤仍由 `globals.css` 单点定义，组件只负责结构 + 角标，符合「样式单点 + 结构复用」的复用契约。
- **范围边界**：列表行（Feed / 主题项）不套 `<DnaCard>`，见 §15.3「不适用」；管理员后台不接入像素层，见 §15.2「排除」。

### 15.9 列表（列表行）选型落地

像素融合列表三档（`tools/demo/list-and-title-demos.html`）已按页面选型落地。列表行（border-b 密度优先）**不套 `<DnaCard>`**（§15.3 边界）；各档对应共享 CSS 类（均全局生效、双主题自适应）：

| 页面 | 选型 | 共享类 | 视觉特征 |
|------|------|--------|----------|
| `/about`（信念 / 期望索引列表） | **A 索引铁路** | `.idx-rail`（`.idx` / `.idx-ttl` / `.idx-mt` / `.idx-arw`） | 左像素编号 `// 01` + 贯穿发丝铁路线 + 衬线标题 + 像素元数据行 + hover 转主色/箭头右移 |
| `/about`（加入流程，由 `/join` 合并而来） | **B DNA 行卡** | `.lst-dna`（`.dna-corner` / `.dna-ttl` / `.dna-mt` / `.dna-arw`） | 左主色硬边条 + 右上角像素编号 + 同款 `steps(3)` 抬升硬阴影；复用 about 四步流程语义 |
| `/tools` 工作台「今日任务」列表 | **A 索引铁路** | `.idx-rail`（`.idx` / `.idx-ttl` / `.idx-mt` / `.idx-arw`） | 左像素编号 `// 01` + 贯穿发丝铁路线 + 衬线标题 + 像素元数据行 + hover 转主色/箭头右移；逾期/到期状态仍保留红/琥珀色（在 `.idx-mt` 元数据行呈现），`idx-rail` 内置于 DnaCard 时编号遮罩跟随卡面（见 §15.12） |
| （待定） | C 像素终端 | `.lst-term` | 全像素字体 + 状态点 + 游标，适合数据/日志型列表 |

- **选型边界**：盒装卡 → `<DnaCard>`（§15.3）；列表行 → A/B/C 三档之一（不套 DnaCard）。`/about` 的「六大方向」仍为 DNA **盒装卡**（B 卡片，非列表），二者**不在**本列表选型范围。
- **C 流程行已移除**：原 `/about` process 标签内的「详细步骤文章（C 流程行，`STEPS` 大卡片文章）」已于 2026-08-18 删除——`STEPS` 数据与 `StepItem` 接口一并移除；该标签页仅保留「加入流程」**B DNA 行卡**作为步骤呈现，与报名表同屏。
- **步骤 / 表单同屏双栏**：process 标签页内，左栏「加入流程（步骤 · B DNA 行卡，`.lg:col-span-5`）」与右栏「报名表（`.lg:col-span-7`）」在 `lg+` 采用 `grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start` **左右布局**；移动端单列（步骤在上、表单在下）。对应栅格代码位于 `src/app/about/page.tsx` 的 process 分支。
- 原 `/join` 页面已于 2026-08-18 合并入 `/about` 的「加入 / Join」标签页（process 标签 → 加入子区块）：其「加入流程」DNA 行卡与**完整报名表填写逻辑**（认证检查 / 已有申请状态 / 校验 / 提交 / 成功·待审态）全部迁入 `src/app/about/page.tsx`，随后删除 `src/app/join/`。`JOIN_STEPS` 复用 about 的 `step1~4Title/Desc` + `duration` 文案（`useTranslations('about')`）；报名表字段沿用 `join` 命名空间（`useTranslations('join')`）。`/profile` 的 `join-tab` 链接由 `/join` 改为 `/about`。

### 15.10 标题底部虚影（全站主标题）

- **选型**：**A 像素错位虚影**——衬线真标题背后叠一份像素同文副本，向右下硬偏移、低透明度（衬线 × 像素的错位，最贴切「融合」表达）。
- **共享组件**：已提炼为 `<GhostTitle>`（`src/components/primitives/ghost-title.tsx`，桶导出 `src/components/index.ts`）。API：`as`（默认 `h2`）、`className`、`children`（**纯字符串时自动复用为虚影**）、`echo`（复杂节点显式传虚影内容，如含 `<br/>`/彩色 `span`/`TypewriterTitle`）、`wrapContent`（默认 `true`，把 children 包进 `.ghost-title__content` 抬到虚影之上；块级子节点如 `TypewriterTitle` 渲染的 h1 传 `false`，靠 CSS `:last-child` 保证层级）、`...rest` 透传 `onClick` 等 HTML 属性以支持折叠 Hero。
- **落地范围**：**全站主标题**——所有页面 Hero 主标题（`/`、`/about`、`/events`、`/community*`、`/tools*`、`/profile`、`/users/[id]`、`/notifications`、`/login`、`/events/[id]`、`/tools/task` 等）+ 大号章节标题（section h2、`/tools/task` 三个 tab 区标题等）。虚影由 `.ghost-title` 通用工具类承载。
- **排除项**：admin 后台、卡片 / 列表项标题、统计数字、navbar、弹窗内小标题、markdown 生成标题——避免显噪且违背「虚影仅大号衬线主标题」原则。
- **安全约束**：虚影 `z-index` 低于真标题、`pointer-events:none`、`aria-hidden`，纯装饰；颜色走 `--muted-foreground` 低透明度、双主题自适应；`clamp()` 控字号、小偏移 `translate(8px,12px)` 避免移动端显脏；折叠态标题虚影随真标题同步收缩。
- **CSS**：`globals.css` 中 `.ghost-title{position:relative}`、`.ghost-title__echo`（绝对定位 z-0、像素字体、offset、opacity 0.2）、`.ghost-title__content`（z-1）、`.ghost-title > :last-child`（z-1）。

### 15.11 统一标题组件（`<Title>` / `<SectionMarker>` / `<ArkDivider>`）

- **背景**：§15.10 已把「像素错位虚影」沉淀为 `<GhostTitle>` 并全站主标题落地。在此之上，进一步把**主标题 + 章节标记 + 英文副标题 + 工业分隔**四类排印元素统一为共享组件，消除零散内联 `<span>` 标题与手写 `section-marker`/`ark-divider` 类的不一致。
- **共享组件**（均桶导出 `src/components/index.ts`）：
  - `<Title>`（`primitives/title.tsx`，构建于 `<GhostTitle>`）：`level`（1–4 字号预设，默认 2）、`as`（默认 `h{level}`）、`className`、`children`、`eyebrow`（可选眉标）、`subtitle`（**内联** muted 斜体英文后缀，渲染在标题内 `align-baseline`，与既有 Hero 内联英文 span 视觉一致）、`ghost`（默认 `level<=2` 启用虚影）、`collapsed`/`collapsedSize`/`expandedSize`（Hero 折叠动画，尺寸串原样透传以像素级保真）、`echo`、`wrapContent`、`...rest`（透传 `onClick`）。
    - **尺寸守卫**：调用方 `className` 已含 `text-*` 字号工具类时，`<Title>` **不**追加 `LEVEL_PRESET`（避免自定义字号标题上的 Tailwind 字号冲突）。
    - **Hero 迁移范式**：把内联英文后缀 `<span className="display-serif italic text-[var(--muted-foreground)] ...">` 抽为 `subtitle={...}`；折叠态尺寸串原样传入 `collapsedSize`/`expandedSize`。
  - `<SectionMarker>`：包裹 `.section-marker` 数字章节标记（`[ 01 ]` 风）。**仅替换 `<div className="section-marker">`**——`.section-marker` 未设 `display`，span→div 会改变行内/块级；首页 `[ 00 ] — Index` 因是 `<span>` 行内标记，保持原样。
  - `<ArkDivider>`：包裹 `.ark-divider` 工业双斜杠分隔（`//` 风）。`.ark-divider` 强制 `inline-flex`，故 span↔div 包裹视觉一致。
- **落地范围**：所有页面 Hero h1（`collapsed` 模式）+ 章节 h2（`level={2}`），以及页面级 `section-marker`/`ark-divider` 标记为对应组件（`/notifications`、`/about`、`/community/new`(+`compose-form`)、`/events/[id]`、`/profile`(+`security-tab`/`profile-tab`)、`/tools/resource`(+`submit-resource-modal`)、`/admin`、首页 ark-divider 等）；`tools/exam` 列表区 `ark-divider` 英文后缀改 `<ArkDivider>` 子节点（保留工业分隔视觉，不转 muted 斜体 subtitle）。
- **排除项**：46 处零散卡片 `<h3>` 一次性标题（保持原样，不在统一范围）；共享组件 `section-nav`/`feed-item-card`/`community-topic-item`/`collapsing-hero`/`admin-events-settings` 内的 `section-marker`/`ark-divider` 不触碰；首页 `GhostTitle as="div"` Hero（含 `TypewriterTitle` 块级子节点）保持 `<GhostTitle>`。
- **校验**：`ts-check` 持基线 10 错、`lint` 持基线 3 错，无新增回归。

### 15.12 工作台像素化（Workbench / `/tools`）

`/tools` 页面根 `<main>` 已带 `pixel-page`（元数据层早前接入，§15.2），本次（2026-08-18）把**可见工作台**整体推入融合层（方案 A 完整融合：盒装 widget 转 DNA 卡 + 任务列表转索引铁路 + CTA 转像素按钮 + 可见 SectionMarker）：

- **widget 卡片**：9 个 widget 的 `card-minimal` 盒装容器统一经共享 `<DnaCard corner={…}>`（角标语义见 §15.3 使用方）；均在嵌入态（嵌于 `llm-widget` 的 DnaCard，或 workbench 直接渲染）套 DnaCard；非嵌入态独立分支保留 `card-minimal`（LLM 用量/对话仅在嵌入态渲染，避免 DnaCard 嵌套 DnaCard）
- **任务列表**：`today-tasks` 的 `<ul>/<li>` 行卡改为 **A 索引铁路** `.idx-rail`（`.idx` 序号 + `.idx-ttl` 标题 + `.idx-mt` 元数据行含逾期/到期态 + `.idx-arw` 箭头）；`idx-rail` 内置于 DnaCard 时，`.idx` 编号遮罩由 `var(--background)` 改为跟随 `.dna-card` 表面（`globals.css` 新增 `.dna-card .idx-rail .idx` 作用域覆盖，双主题自适应）
- **CTA 按钮**：workbench 顶部 4 个操作（导出/导入/布局设置）转 `pixel-outline`、「清空」（破坏性）转 `pixel-danger`（新增变体，见 §15.4）；各 widget 内按钮（github 刷新、llm 用量入口/保存、对话 newChat/发送、番茄钟 开始/暂停/重置、便签新增）统一转 `pixel`/`pixel-outline`
- **可见 SectionMarker**：`workbench.tsx` 顶部 section 显式加 `<SectionMarker>[ 01 ] 工作台</SectionMarker>`，与既有 `<Title level={2}>` + `.meta-mono` 副标题并列
- **新增 CSS 类**：`globals.css` 新增 `.btn-pixel-danger` / `.btn-pixel-danger-sm`（destructive 令牌 + `3px 3px 0` 硬阴影 + `steps(2)`），及 `.dna-card .idx-rail .idx` 作用域覆盖
- **校验**：`ts-check` 持基线 10 错、`lint` 持基线 3 错，无新增回归；`pnpm next build` 通过

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-08-18 | **统一标题组件 `<Title>`/`<SectionMarker>`/`<ArkDivider>` + 全站主标题/章节标记/分隔统一**：① 新建 `<Title>`（`primitives/title.tsx`，构建于 `<GhostTitle>`，`level` 1–4、`subtitle` 内联英文后缀、`collapsed`+`collapsedSize`/`expandedSize` Hero 折叠动画、`ghost` 默认 `level<=2`、`...rest` 透传 `onClick`；含**尺寸守卫**——调用方 `className` 已含 `text-*` 时不追加预设）并桶导出；② 所有页面 Hero h1（`collapsed` 模式）+ 章节 h2（`level={2}`）迁移到 `<Title>`，内联英文后缀抽为 `subtitle`；③ 页面级 `section-marker` `<div>`→`<SectionMarker>`、`ark-divider`→`<ArkDivider>`（`.ark-divider` 强制 `inline-flex` 故 span↔div 视觉一致；`.section-marker` 未设 `display` 故仅替换 `<div>`，首页行内 `[ 00 ]` span 保持）；④ 排除 46 处零散卡片 `<h3>` 与共享组件内标记。`ts-check` 持基线 10 错、`lint` 持基线 3 错，无新增回归（§15.11 新增） |
| 2026-08-18 | **标题虚影全量应用 + 提炼共享组件 `<GhostTitle>`**：① 新建 `<GhostTitle>`（`primitives/ghost-title.tsx`，桶导出 `src/components/index.ts`），支持纯文本自动虚影 / 复杂节点 `echo` / 块级 `wrapContent=false` / `...rest` 透传 `onClick`（折叠 Hero）；② 虚影由 Hero 专用扩展至**全站主标题**——所有页面 Hero 主标题与大号章节标题（`/`、`/about`、`/events`、`/community*`、`/tools*`、`/profile`、`/users/[id]`、`/notifications`、`/login`、`/events/[id]`、`/tools/task` 各 tab 区等）；`globals.css` `.ghost-title` 去掉强制 `inline-block`、新增 `.ghost-title__content`；③ 排除 admin / 卡片·列表项 / 统计数字 / navbar / 弹窗小标题 / markdown 标题。`ts-check` 持基线 10 错、`lint` 持基线 3 错，无新增回归（§15.10 已更新） |
| 2026-08-18 | **`/about` process 标签页精简 + 步骤/表单左右布局**：① 删除「详细步骤文章（C 流程行）」——`STEPS` 常量与 `StepItem` 接口一并移除，`processSection` 子标题不再渲染；② 仅保留「加入流程」**B DNA 行卡**（`JOIN_STEPS`）作为步骤呈现；③ process 标签页改为 `grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start` 同屏双栏——左栏「加入流程（`.lg:col-span-5`）」、右栏「报名表（`.lg:col-span-7`）」，移动端单列（步骤在上、表单在下）。`ts-check` 持基线 10 错、`lint` 持基线 3 错，无新增回归（§15.9 选型边界 / 双栏说明已更新） |
| 2026-08-18 | 列表选型落地（§15.9）：`/about` 信念与期望索引列表选 **A 索引铁路**（`.idx-rail`）；`/join`（现已并入 `/about`）的「加入流程」选 **B DNA 行卡**（`.lst-dna`，复用 about 四步流程语义）。标题底部虚影选 **A 像素错位虚影**并落地首页 Hero（`src/app/page.tsx` `.ghost-title` + `.ghost-title__echo`，仅 Hero）。`globals.css` 新增 `.idx-rail` / `.lst-dna` / `.ghost-title` 三套共享类（双主题自适应）。`ts-check` 持基线 10 错，无新增回归 |
| 2026-08-18 | 新增 §15 像素融合层（Pixel Fusion / Kimi 风格）：`--font-pixel` 令牌、页面作用域（about/events 像素元数据层）、DNA 卡（`.dna-card`/`.dna-corner`/`.dna-meta`）、像素按钮 variant、首页 `TypewriterTitle`/`StarfieldCanvas`、`/events` 同屏双视图；§11 登记像素融合白名单例外；§15.8 记录 DNA 卡组件化决策（暂不提炼，保持 CSS 类契约，列出提升条件） |
| 2026-08-18 | 像素融合全站化：① 新建共享组件 `<DnaCard>`（`primitives/dna-card.tsx`），`/about`、`/events` 重构其使用，DNA 卡皮肤改全局生效（§15.3/§15.8 更新）；② 像素元数据层 opt-in 统一为 `.pixel-page`（兼容 about/events），覆盖 join/login/profile/users/[id]/notifications/events/[id]/community*/tools*，`/admin` 排除（§15.2）；③ 上述页面主 CTA 切 `pixel`/`pixel-outline`；④ 盒装卡 `featured-topic-strip`、tools 工具卡转 `dna-card`，Feed/主题列表行保持列表样式 |
| 2026-08-09 | §10 代码规范（JSDoc / 样式实现 / 客户端服务端边界 / 中文文本规则）整体迁出至新建 `FrontDoc-Conv.md`（前端编码规范，对标后端 BackDoc-Conv.md），UID 收窄为纯视觉与交互规范；§11 编码侧禁止项同步迁出、§12 Checklist / §13 参考文件相应更新 |
| 2026-08-09 | 文档瘦身重构：① §14 Markdown 编辑器契约下沉至 Arch §2.5.7，UID 仅留结论；② §4.8 各页面 Tab 配置表 + 附录 A 未采用方案迁出至 `capsule-tabs.md`；③ 新增 §5.0 全局组件体系与复用契约（分层 + 单向依赖 + 复用契约）；④ §5.7 精简为复用层级表，与 §13 去重。文档由 815→626 行 |
| 2026-08-06 | 规范收口迭代：① 圆角/阴影 token 化（`--radius-capsule` / `--radius-capsule-item` / `--shadow-popover` / `--shadow-modal`），浮层阴影与发光全部归一；② 胶囊可发现性增强（focus 展开 + 首次 peek 演示 + §4.7 移动端描述对齐实现）；③ 字体迁移 next/font 自托管（移除 CSS @import Google Fonts）；④ §5 补全四态规范与组件全清单，§3.5 新增 Token 速查表；⑤ `focus-amber` → `focus-ring` 语义化；⑥ 修复文档自身错误（5 种按钮、44px 触控区、`'use client'` 位置约定、本变更记录表） |
| 2026-07-26 | 新增 §3.4 子页面返回按键规范；为 `/tools/exam`、`/tools/resource` 添加 `← 返回` 按键 |
