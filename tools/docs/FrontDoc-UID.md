# FZTBUCS-UI-设计规范（编辑式技术极简）

> 文档定位：前端视觉与交互设计规范（reference）
> 受众：前端开发者 / UI 评审 / 设计者
> Source of truth：颜色、字体、布局、组件、动效、交互规范的唯一权威位置
> 关联：组件清单见 [FrontDoc-Arch.md](FrontDoc-Arch.md)；新页面接入见根级 [docs/Onboarding.md](../../../docs/Onboarding.md#附录-a前端工程规则)
> 最后更新：2026-08-06（规范收口迭代：圆角/阴影 token 化 + 胶囊可发现性增强 + next/font 字体自托管 + §5 组件清单/四态规范补全）
> 更新人：3yearsZ
> 维护人：@3yearszhuang
> 变更触发：新增页面 / 组件 / 视觉变更
> Stale 信号：组件清单与实际文件不一致 / Checklist 与实际组件不符

## 文档结构

- **§0 设计哲学** — 三条不可妥协原则
- **§1–3** 颜色 / 字体 / 布局系统
- **§4** 悬浮折叠胶囊（Floating Capsule Sidebar）
- **§5–7** 组件规范 / 动效系统 / 视觉装饰
- **§8–10** 移动端适配 / 交互规范 / 代码规范
- **§11–12** 禁止清单 / 新增页面 Checklist
- **§13 / 附录 A** 参考文件 / 侧边栏备选方案（未采用）

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

所有从上级页面进入的子页面（如 `/tools/exam`、`/tools/resource`、`/community/forum/[category]`），必须在 Hero 区域的 `[ 00 ]` section-marker 下方放置返回按键，链接回上级页面。

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
| `/community/forum/[category]` | `/community/forum` | `← 返回` |
| `/community/forum/[category]/[topicId]` | `/community/forum/[category]` | `← 返回` |
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

> 原 sidebar-design.md 全量内容，合并后作为第 4 章。

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

| 路由 | 页面 | Tab 列表 |
|------|------|---------|
| `/community/forum` | 论坛首页 | `[01] 最近 / Latest`, `[02] 发现 / Discover` |
| `/community/forum/[category]` | 版块详情 | `[01] 主题 / Topics`, `[02] 规则 / Rules`, `[03] 下一步 / Next` |
| `/community/forum/[category]/[topicId]` | 主题详情 | `[01] 回复 / Replies`, `[02] 你的回复 / Reply` |
| `/about` | 关于 / 加入 | `[01] 信念 / Belief`, `[02] 方向 / Directions`, `[03] 期望 / Expectation`, `[04] 流程 / Process`, `[05] 加入 / Join` |
| `/events` | 活动 | `[01] 时间线 / Timeline`, `[02] 归档 / Archive`, `[03] 下一步 / Next` |
| `/profile` | 个人主页 | `[01] 资料 / Profile`, `[02] 安全 / Security`, `[03] 活动 / Activity`, `[04] 论坛 / Forum` |
| `/admin` | 管理后台 | `[01] 用户 / Users`, `[02] 活动 / Activities`, `[03] 通知 / Notifications`, `[04] 论坛 / Forum`, `[05] 工具 / Tools` |
| `/tools` | 工具集 | `[01] 可用`, `[02] 即将上线`, `[03] 规划中` |
| `/tools/resource` | 资源站 | `[00] 全部`, `[01] 文章`, `[02] 视频`, … |

### 4.9 实现文件清单

| 文件 | 用途 |
|------|------|
| `src/components/layout/floating-capsule-sidebar.tsx` | 悬浮胶囊侧边栏组件 |
| `src/shared/hooks/use-collapsing-hero.ts` | Hero 折叠与胶囊显隐联动 hook |
| `src/app/globals.css` | `hero-acrylic` 亚克力材质样式 |

---

## 5. 组件规范

### 5.1 卡片

```tsx
<div className="border border-[var(--border)] card-minimal p-6">
  {/* 内容 */}
</div>
```

禁止：`shadow-lg`、`hover:shadow-xl`、`hover:-translate-y-1`、渐变背景

### 5.2 按钮

5 种统一按钮类，定义在 `src/app/globals.css`：

```css
.btn-primary          /* 主按钮 - primary 纯色背景 */
.btn-primary-sm       /* 主按钮（小号）- 行内操作 */
.btn-danger           /* 危险操作 - destructive 纯色背景 */
.btn-outline          /* 描边按钮 - 透明背景 + 边框 hover */
.btn-outline-sm       /* 描边按钮（小号）- 行内次要操作 */
```

规格：`font-mono text-[12px] uppercase tracking-wider`，大按钮 `py-3 px-6`，小按钮 `py-1.5 px-3`，`transition-opacity/colors`，`disabled:opacity-30`，必须追加 `focus-ring`

```tsx
<button className="btn-primary focus-ring">Save Changes -></button>
<button className="btn-primary-sm focus-ring">+ New Event</button>
<button className="btn-danger focus-ring">Delete</button>
<button className="btn-outline focus-ring">Cancel</button>
<button className="btn-outline-sm focus-ring">Pin</button>
```

推荐经 `src/components/primitives/button.tsx` 封装使用（自动附加 `focus-ring` 并处理 loading 态）。

不变的部分：文字按钮（`underline-grow`、`meta-mono` 文字链接）、主题切换、通知铃铛、分页按钮、筛选标签、悬浮胶囊 Tab 保持原有设计。

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

### 5.7 组件全清单

与 `src/components/` 目录一一对应（新增组件须同步更新本清单，Stale 信号见文档头）。

| 分类 | 组件 | 说明 |
|------|------|------|
| 根级 | `avatar` | 方形头像，首字母回退 |
| 根级 | `user-menu` / `notification-bell` | 用户下拉 / 通知铃铛（浮层阴影走 `--shadow-popover`） |
| 根级 | `theme-toggle` / `theme-provider` | 主题切换（`.dark` 类） |
| 根级 | `tech-tag-selector` / `swr-provider` | 标签选择 / SWR 全局配置 |
| effects | `motion-primitives` | StaggerContainer / RevealTitle / RevealItem |
| effects | `mobius-ring` / `page-transition` / `scroll-indicator` | 首页粒子 / 路由过渡 / 横向滚动提示 |
| layout | `navbar` / `footer` | 全局导航 / 页脚 |
| layout | `collapsing-hero` / `floating-capsule-sidebar` / `use-collapsing-hero` | 折叠 Hero / 悬浮胶囊 / 联动 hook |
| layout | `language-switcher` / `page-header-background` | 语言切换 / 页头背景装饰 |
| primitives | `button` / `input` / `spinner` / `loading` | 基础控件封装 |
| primitives | `section-nav` / `inline-tabs` / `filter-bar` | 编号导航 / 内联 Tab / 筛选条 |
| primitives | `confirm-dialog` | 确认弹窗（Modal） |
| feedback | `announcement-banner` / `toast` / `empty-state` / `fallback` | 四态与提示 |

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

### 10.1 文件头注释

每个组件/页面必须有 JSDoc 头注释：

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

补充约定：`'use client'` 指令位于文件头 JSDoc 之后（注释允许出现在指令之前，指令仍被正确识别）；禁止 `'use client'` 出现在 import 语句之后。

### 10.2 样式实现

- 必须用 Tailwind 工具类，禁止内联 `style`（动态计算例外）
- CSS 变量通过 `var(--xxx)` 在 Tailwind 任意值中引用
- 动态 className 用模板字符串 + 三元，不引入 `clsx`/`classnames`

### 10.3 客户端/服务端边界

- `'use client'` 仅用于需要 hooks/交互的组件
- 数据获取在客户端 `useEffect` 中用 `fetch`
- API 路由遵循 Next.js App Router 约定

### 10.4 中文文本规则

> 通用中文排版规则（汉字间不留空格、中英文间留空格、中文与数字间留空格）已提炼到根仓库 [`RootDoc-EngConv.md`](../../../docs/RootDoc-EngConv.md) §九，此处不再重复。

---

## 11. 禁止清单

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
| `console.log` 留在生产代码 | 用专门日志或删除 |
| 中文之间加空格 | 排版规范 |
| 不写文件头 JSDoc | 工程规范 |
| CSS `@import` 拉取 Google Fonts | 字体必须走 next/font 自托管 |
| 用 `.sh` 脚本 | 用 `.mjs` Node 脚本 |
| 引入 react-dev-inspector | 与 Turbopack 不兼容 |
| 引入 Vite 依赖 | 使用 Next.js + Turbopack |

**圆角例外白名单**（仅限以下语义，新增须评审）：

| 元素 | 允许值 |
|------|--------|
| 输入框 / 行内代码 / 长文图片 | `--radius`（0.25rem） |
| 悬浮胶囊容器 / 胶囊内 Tab 项 | `--radius-capsule`（28px）/ `--radius-capsule-item`（22px） |
| 圆形元素：头像、状态点、spinner、角标徽章、胶囊 active 指示点 | `rounded-full` |

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
- [ ] 文件头 JSDoc 完整，`'use client'` 在 JSDoc 之后
- [ ] 所有可交互元素挂 `focus-ring`
- [ ] 圆角/阴影只走 §3.5 / §11 白名单 token
- [ ] 列表/表单四态显式处理（加载/空/错误/成功，见 §5.6）
- [ ] 移动端 `<md` 单列堆叠，触控区 ≥44px
- [ ] `tsc --noEmit` + `eslint` 0 错误
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
| `tools/docs/FrontDoc-UID.md` | 本文档 - 完整设计规范 |

---

## 附录 A：侧边栏备选方案（未采用）

### A.1 Scheme A - 可伸缩抽屉式（Sliding Drawer）

折叠态 56px 仅显示编号，hover 展开至 200px。
- 优点：实现极简，直觉性强，不破坏 12 栏栅格
- 缺点：仍占用布局空间，hover 触发展开在移动端无效
- 适用：Tab 较多（≥5 项）、需要快速识别当前区域

### A.2 Scheme C - 磁吸边缘标签（Magnetic Edge Tabs）

标签吸附在左边缘，仅露出半截编号 pill（~28px），hover 时标签向外弹出。
- 优点：极致节省空间
- 缺点：标签太小（28px），移动端几乎无法触控
- 适用：极简主义工具型页面，桌面端为主

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-08-06 | 规范收口迭代：① 圆角/阴影 token 化（`--radius-capsule` / `--radius-capsule-item` / `--shadow-popover` / `--shadow-modal`），浮层阴影与发光全部归一；② 胶囊可发现性增强（focus 展开 + 首次 peek 演示 + §4.7 移动端描述对齐实现）；③ 字体迁移 next/font 自托管（移除 CSS @import Google Fonts）；④ §5 补全四态规范与组件全清单，§3.5 新增 Token 速查表；⑤ `focus-amber` → `focus-ring` 语义化；⑥ 修复文档自身错误（5 种按钮、44px 触控区、`'use client'` 位置约定、本变更记录表） |
| 2026-07-26 | 新增 §3.4 子页面返回按键规范；为 `/tools/exam`、`/tools/resource` 添加 `← 返回` 按键 |