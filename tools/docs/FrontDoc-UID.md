# FrontDoc-UID｜前端视觉与交互设计规范

> 更新人：3yearsZ
> 更新日：2026-08-21
> 版本：1.0.0
> Diátaxis：R（Reference · 前端视觉规范事实清单，颜色/字体/布局/组件/动效/像素融合层的唯一权威）
> 适用读者：前端开发者、UI 评审、设计者、Code Reviewer
> 变更触发：新增页面 / 组件 / 视觉变更、设计系统 token 调整

> **SSOT 声明**：本文档是「前端视觉与交互设计规范」的唯一权威。组件清单见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md)；编码规范见 [FrontDoc-03-Conv.md](FrontDoc-03-Conv.md)。

> **Stale 信号**：组件清单与实际文件不一致、Checklist 与实际组件不符、设计 token 与 `globals.css` 不同步。

---

## 快速索引

| 章节 | 主题 | 概述 | 代码位置 |
|------|------|------|----------|
| **§0 设计哲学** | 三条不可妥协原则 | 编辑式技术极简：杂志感 + 工业感 + 克制 | — |
| **§1 颜色系统** | CSS 变量双主题 | 6 个核心 token + 用色规则 | `src/app/globals.css` |
| **§2 字体系统** | 三字体栈 + 字号阶梯 | Fraunces / Manrope / JetBrains Mono | `src/app/layout.tsx` |
| **§3 布局系统** | 12 栏栅格 + Token 速查 | 栅格规范、子页面返回键、全局 z-index/duration/radius 表 | `src/app/globals.css` |
| **§4 悬浮折叠胶囊** | Floating Capsule Sidebar | 组件接口、视觉规格、Hero 联动、移动端降级 | `src/components/layout/floating-capsule-sidebar.tsx` |
| **§5 组件规范** | 全局组件体系 + 复用契约 | 5 层组件目录、卡片/按钮/输入框/四态规范、组件全清单 | `src/components/` |
| **§6 动效系统** | 统一缓动 + 动画原语 | Hero 入场时序、StaggerContainer / RevealTitle / RevealItem | `src/components/effects/motion-primitives.tsx` |
| **§7 视觉装饰** | 章节标记 + 工业装饰 | section-marker / ark-divider / ark-corner-bracket / 扫描线 / 噪点 | `src/app/globals.css` |
| **§8 移动端适配** | 断点 + 触控规范 | 4 档断点、触控区 ≥44px、Navbar 汉堡切换 | — |
| **§9 交互规范** | 焦点环 + 链接交互 | focus-ring 语义、active 态、Esc 关闭 | — |
| **§10 代码规范** | — | 已迁至 FrontDoc-03-Conv.md | FrontDoc-03-Conv.md |
| **§11 UI 专属禁止清单** | 8 项禁止 + 圆角白名单 | 禁止硬编码颜色 / 默认阴影 / 自实现动画 | — |
| **§12 新增页面 Checklist** | 15 项自检清单 | 新建页面必须逐项核对 | — |
| **§13 参考文件** | 11 个核心文件索引 | globals.css / layout.tsx / motion-primitives 等 | — |
| **§14 Markdown 编辑器** | 社区模块契约摘要 | 三层组件 + rehype-sanitize | `src/modules/community/ui/` |
| **§15 像素融合层** | Pixel Fusion | DNA 卡、像素按钮、GhostTitle、Title、工作台像素化 | `src/components/primitives/dna-card.tsx` |
| **§16 组件用法统一契约** | SSOT | 按钮/输入框/徽章/Tab/分页/Modal/z-index 的用法权威 | `src/components/primitives/` |

---

## §0 设计哲学

编辑式技术极简 —— 把页面当成杂志版面 + 工业终端的混合体：

- **杂志感**：12 栏栅格、衬线大标题、数字章节标记、发丝线分割
- **工业感**：等宽元数据、`//` 双斜杠、`[ NN ]` 角标、扫描线、毛玻璃
- **克制**：直角无圆角（radius 0.25rem 仅用于输入）、动效慢出无弹跳、颜色低饱和

三条不可妥协的原则：

1. 不发光、不浮起、不渐变背景 —— 卡片只有边框色 + 微透明叠加
2. 数字优先 —— 章节用 `[ 00 ]` 标记，元数据用等宽小字
3. 动效克制 —— 统一 `cubic-bezier(0.16, 1, 0.3, 1)`，无 spring 弹跳

---

## §1 颜色系统

所有颜色必须通过 CSS 变量引用，禁止硬编码十六进制值。

### 1.1 核心 Token

| 变量 | 浅色模式 | 深色模式 | 用途 |
|------|---------|---------|------|
| `--primary` | `#1e40af` 深蓝 | `#d4a574` 琥珀金 | 强调色：链接、active、章节标记 |
| `--background` | `#fdf5f7` 浅粉底 | `#000000` 纯黑 | 页面底色 |
| `--foreground` | `#1e1233` 深黑紫 | `#f5f5f4` 暖白 | 正文文字 |
| `--muted-foreground` | `#6b5572` 紫灰 | `#8a8a85` 中灰 | 次级文字、元数据 |
| `--border` | `rgba(30,18,51,0.08)` | `rgba(255,255,255,0.06)` | 1px 发丝线 |
| `--card` | `#ffffff` | `#0a0a0a` | 卡片背景 |

### 1.2 用色规则

- **MUST** 强调色仅用于关键交互：active 状态、CTA 按钮、focus 描边、章节标记数字
- **MUST** 正文永远用 `--foreground`，次级信息用 `--muted-foreground`
- **MUST NOT** 硬编码十六进制颜色值（破坏主题切换）
- **MAY** 深色模式使用独立的琥珀金强调色（非浅色反色）

---

## §2 字体系统

### 2.1 字体栈

| 语义 | 字体栈 | 用途 |
|------|--------|------|
| 展示衬线 | Fraunces + Noto Serif SC | 大标题、Hero、章节标题 |
| 正文无衬线 | Manrope + Noto Sans SC | 正文、表单、UI |
| 等宽 | JetBrains Mono | 元数据、数字、代码 |

> 字体加载：5 个字体族均由 `src/app/layout.tsx` 的 `next/font/google` 自托管引入 —— build 时下载并本地子集化，Latin 子集预载 + CJK 中文按 unicode-range 按需加载，`display: swap` 不阻塞首屏。各字体以 `--font-*` 变量挂载到 `<body>`。

### 2.2 工具类

```tsx
<h1 className="display-serif">大标题</h1>
<span className="serif-italic">/ 斜体注释</span>
<span className="meta-mono">[ 00 ] Section</span>
<span className="section-marker">[ 00 ]</span>
```

### 2.3 字号阶梯（全部 clamp 自适应）

| 场景 | 类名 |
|------|------|
| Hero 主标题（展开） | `text-[clamp(36px,9vw,120px)]` |
| Hero 主标题（折叠） | `text-[clamp(22px,4vw,36px)]` |
| 次级页 Hero | `text-[clamp(36px,7vw,88px)]` |
| 详情页 Hero / 章节大标题 | `text-[clamp(28px,5vw,56px)]` |
| 正文 | `text-[15px]` 或 `text-[14px]` |
| 元数据 | `text-[10px]` / `text-[11px]` |

---

## §3 布局系统

### 3.1 12 栏栅格

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
- 顶部留白：所有页面 `<main>` MUST 有 `pt-16`（避开 fixed Navbar 64px）
- 章节垂直留白：`py-16 sm:py-24`，章节间用 `border-t border-[var(--border)]` 分割

### 3.3 Navbar

- fixed 顶栏 `h-16`（64px），`z-50`
- 移动端全屏菜单 `z-40`，`pt-16`

### 3.4 子页面返回按键

所有从上级页面进入的子页面 MUST 在 Hero 区域的 `[ 00 ]` section-marker 下方放置返回按键。

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
    {/* 内容 */}
  </div>
</div>
```

**各页面返回映射：**

| 子页面 | 返回路由 | 返回文字 |
|--------|---------|---------|
| `/tools/exam` | `/tools` | `← 返回` |
| `/tools/resource` | `/tools` | `← 返回` |
| `/community/community/[category]` | `/community/community` | `← 返回` |
| `/community/community/[category]/[topicId]` | `/community/community/[category]` | `← 返回` |
| `/tools/exam/[id]` | `/tools/exam` | `← 返回` |

### 3.5 全局 Token 速查表

定义于 `src/app/globals.css`，集中管理、禁止 ad-hoc 硬编码。

**z-index 层级：**

| Token | 值 | 用途 |
|-------|-----|------|
| `--z-base` | 10 | 页面主要内容 |
| `--z-sticky` | 30 | 粘性 hero-acrylic / section-nav / 悬浮胶囊 |
| `--z-banner` | 40 | 公告横幅 |
| `--z-header` | 50 | 顶部导航 / 下拉 / Modal |
| `--z-toast` | 60 | Toast |
| `--z-transition` | 70 | 页面过渡遮罩 |
| `--z-overlay` | 9998 | 扫描线 / 噪点 |

**动效时长与缓动：**

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

### 3.6 不变量约束（RFC 2119）

- **MUST** 所有颜色通过 CSS 变量引用
- **MUST NOT** 硬编码十六进制颜色值
- **MUST** 所有可交互元素挂 `focus-ring` 类
- **MUST** 圆角 / 阴影只走白名单 token
- **MUST NOT** 使用白名单外圆角（`rounded-xl` / `rounded-2xl` 等）

---

## §4 悬浮折叠胶囊（Floating Capsule Sidebar）

### 4.1 概述

项目中 `[01] [02] …` 编号式导航统一升级为悬浮折叠胶囊。胶囊以独立形态固定在内容区左侧，完全脱离文档流，折叠时仅显示编号 + active 圆点指示器，hover / 键盘 focus / 首次访问演示时平滑展开显示完整标签。

核心设计理念：
- 最大化内容宽度 —— 胶囊脱离文档流，不占用 12 栏栅格中的任何一栏
- 即时可达 —— 始终悬浮可见，不受页面滚动影响
- 极简美学 —— 折叠态仅编号，展开态才显示完整标签

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

### 4.4 组件接口

```typescript
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

### 4.5 交互补充

- 展开判定三源合一：`expanded = hovered || focused || peeking`。容器 `onFocus/onBlur` 使键盘用户（Tab 导航）同样可以展开，纯键盘可达。
- 首次访问 peek 演示：桌面端（`md+`）且非 `prefers-reduced-motion` 时，胶囊首次出现自动播放一次"展开→回落"演示（约 2.6s）。
- 内层 Tab 按钮焦点类使用 `focus-ring`。

### 4.6 与 useCollapsingHero 的协作

```
Hero 展开 → 胶囊不可见 → 用户向下滚动 → Hero 折叠为 sticky 悬浮态
→ 800ms 后 → capsuleVisible=true → 胶囊淡入

点击折叠态 Hero 标题 → capsuleVisible=false → 胶囊淡出
→ 平滑回顶 → Hero 展开 → 重新挂载 scroll listener
```

### 4.7 移动端降级

- 桌面端（`md+`）：悬浮胶囊固定在左侧，`hidden md:block`
- 移动端（`<md`）：自动降级为 `SectionNav` 编号 Tab 条（`md:hidden`），位于内容区顶部（Hero 下方），flex 自动换行（`flex-wrap`），**始终可见**

### 4.8 各页面 Tab 配置

| 路由 | 页面 | Tab 列表 |
|------|------|---------|
| `/community/community` | 社区首页 | `[01] 最近`, `[02] 发现` |
| `/community/community/[category]` | 版块详情 | `[01] 主题`, `[02] 规则`, `[03] 下一步` |
| `/community/community/[category]/[topicId]` | 主题详情 | `[01] 回复`, `[02] 你的回复` |
| `/about` | 关于 / 加入 | `[01] 信念`, `[02] 方向`, `[03] 期望`, `[04] 流程`, `[05] 加入` |
| `/events` | 活动 | `[01] 时间线`, `[02] 归档`, `[03] 下一步` |
| `/profile` | 个人主页 | `[01] 资料`, `[02] 安全`, `[03] 活动`, `[04] 社区` |
| `/admin` | 管理后台 | `[01] 用户`, `[02] 活动`, `[03] 通知`, `[04] 社区`, `[05] 工具` |
| `/tools` | 工具集 | `[01] 可用`, `[02] 开发中`, `[99] 管理*` |
| `/tools/resource` | 资源站 | `[00] 全部`, `[01] 文章`, `[02] 视频` |

> 新增页面须同步本表，并在 `FloatingCapsuleSidebar` 配置 `CapsuleTab`。

### 4.9 实现文件清单

| 文件 | 用途 |
|------|------|
| `src/components/layout/floating-capsule-sidebar.tsx` | 悬浮胶囊侧边栏组件 |
| `src/shared/hooks/use-collapsing-hero.ts` | Hero 折叠与胶囊显隐联动 hook |
| `src/app/globals.css` | `hero-acrylic` 亚克力材质样式 |

---

## §5 组件规范

### 5.0 全局组件体系与复用契约

前端组件分两层：**全局设计系统**（`src/components/`，零业务依赖）与**模块局部组件**（`src/modules/*/ui/`）。

| 复用层级 | 目录 | 职责 | 代表组件 |
|---------|------|------|---------|
| 原子 primitives | `components/primitives` | 无业务的通用原子件 | button / input / spinner / section-nav / inline-tabs / confirm-dialog / dna-card / ghost-title / title |
| 结构 layout | `components/layout` | 页面骨架与导航 | navbar / footer / collapsing-hero / floating-capsule-sidebar / page-header-background |
| 动效 effects | `components/effects` | 入场/过渡动效原语 | motion-primitives / mobius-ring / page-transition / scroll-indicator |
| 反馈 feedback | `components/feedback` | 加载/空/错/成功四态 | toast / empty-state / fallback / announcement-banner |
| 跨层 root-level | `components/`（顶层） | 跨页面全局件 | avatar / user-menu / notification-bell / theme / tech-tag-selector |

**依赖方向（单向）**：`模块组件 → 全局组件`；全局组件**禁止反向 import 任何 `src/modules/*`**。

**复用契约：**
1. MUST 从 `primitives` 取按钮/输入/焦点环，禁止在模块里重造原子组件
2. MUST NOT 全局组件 import 模块组件
3. SHOULD 模块内组件若被 ≥2 个模块复用，提升为全局 `primitives`

### 5.1 卡片

```tsx
<div className="border border-[var(--border)] card-minimal p-6">
  {/* 内容 */}
</div>
```

- **MUST NOT** `shadow-lg`、`hover:shadow-xl`、`hover:-translate-y-1`、渐变背景

### 5.2 按钮

8 类统一按钮，定义在 `src/app/globals.css`：

```css
.btn-primary          /* 主按钮 - primary 纯色背景 */
.btn-primary-sm       /* 主按钮（小号）- 行内操作 */
.btn-danger           /* 危险操作 - destructive 纯色背景 */
.btn-outline          /* 描边按钮 - 透明背景 + 边框 hover */
.btn-outline-sm       /* 描边按钮（小号）- 行内次要操作 */
.btn-outline-danger   /* 描边危险 - 透明背景 + destructive 边框 */
.btn-ghost            /* 纯文字按钮 - 无边框，primary 文字 */
.btn-xs               /* 紧凑尺寸用于关注 compact / 极小操作 */
.btn-page            /* 分页专用（共享），active 复用 .btn-active */
.btn-active           /* 选中/按下态修饰 */
```

**规格**：`font-mono uppercase tracking-wider`；大按钮 `py-3 px-6`、小按钮 `py-1.5 px-3`；`transition-colors`，`disabled:opacity-30`，焦点环统一 `focus-ring`。

```tsx
<button className="btn-primary focus-ring">Save Changes -></button>
<button className="btn-outline focus-ring">Cancel</button>
{/* 推荐经 components/primitives/button.tsx 封装 */}
<Button variant="outline-danger" size="sm">Delete</Button>
<Button variant="ghost" size="sm">Cancel</Button>
```

**选型矩阵（场景 → 变体）：**

| 场景 | 变体 |
|---|---|
| 主提交/保存（页面主 CTA） | `primary` |
| 取消/中性次操作 | `outline` |
| 新建/编辑/发布类主色描边 | `primary-outline` |
| 删除/驳回/禁言/硬删 | `outline-danger`（危险描边）；破坏性主操作 `danger` |
| 状态切换键（草稿/下架/待审） | `amber` |
| 行内小操作/文本键 | `ghost` |

**按钮禁止项：**
- **MUST NOT** 手写 `border + text-[var(--muted-foreground)] + hover:destructive` 散落描边按钮
- **MUST NOT** 用 `className` 覆盖 `btn-*` 实现 active/危险态
- **MUST NOT** `danger` 变体在 sm/xs 下手动补尺寸

### 5.3 输入框

```tsx
const INPUT_CLASS =
  'w-full px-4 py-3 bg-transparent border border-[var(--border)] text-[14px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-ring transition-colors';
```

### 5.4 头像

- 直角方形（无 `border-radius`）
- Navbar 32 / 移动端汉堡菜单 56 / Profile 128
- 默认首字母回退（`--primary` 底色）

### 5.5 下拉菜单

- 暗色背景 + 发丝线边框 + 交错展开动画
- 菜单项格式：`[序号] 标签 -> 英文`

### 5.6 四态规范（加载 / 空 / 错误 / 成功）

所有列表与表单 MUST 显式处理以下四种状态：

| 状态 | 规范 | 组件 |
|------|------|------|
| 加载 | 等宽细点动画或 spinner，禁止整页白屏 | `primitives/loading.tsx`、`primitives/spinner.tsx` |
| 空 | 有教育意义的引导文案 + 建议动作，禁止只写"暂无数据" | `feedback/empty-state.tsx` |
| 错误 | 非指责语气 + 可执行的恢复路径，禁止裸 500 文本 | `feedback/fallback.tsx`（ErrorBoundary） |
| 成功 | 明确确认 + 下一步指引；破坏性操作需先经确认弹窗 | `primitives/confirm-dialog.tsx`、`feedback/toast.tsx` |

**补充约定：**
- **MUST** 所有可交互控件（按钮/链接/输入/开关）可见焦点环
- **MUST** 表单提交中 `disabled` + 文案变"提交中..."
- **MUST** 提交失败保留用户输入

### 5.7 组件全清单（复用层级）

| 复用层级 | 组件 |
|---------|------|
| 根级 root-level | `avatar` · `user-menu` · `notification-bell` · `theme-toggle` · `theme-provider` · `tech-tag-selector` · `swr-provider` |
| effects | `motion-primitives` · `mobius-ring` · `page-transition` · `scroll-indicator` |
| layout | `navbar` · `footer` · `collapsing-hero` · `floating-capsule-sidebar` · `use-collapsing-hero` · `language-switcher` · `page-header-background` |
| primitives | `button` · `input` · `spinner` · `loading` · `section-nav` · `inline-tabs` · `filter-bar` · `confirm-dialog` · `dna-card` · `ghost-title` · `title` · `badge` · `pagination` · `modal-shell` |
| feedback | `announcement-banner` · `toast` · `empty-state` · `fallback` |

---

## §6 动效系统

### 6.1 统一缓动

所有动效使用 `cubic-bezier(0.16, 1, 0.3, 1)`（慢出，无回弹）。

- **MUST NOT** `ease-in-out`、`linear`、spring 弹跳

### 6.2 Hero 入场时序

```tsx
const { collapsed, onRevealComplete, onTitleClick } = useCollapsingHero();

<StaggerContainer onComplete={onRevealComplete}>
  <RevealTitle><h1>标题</h1></RevealTitle>
  <RevealItem><p>描述</p></RevealItem>
</StaggerContainer>
```

时序链路：
```
挂载 + 锁滚 → LOAD_DELAY 500ms → 字体浮现 → onComplete → 解锁滚动
→ 用户首次滚动 → 折叠为 sticky 悬浮态
→ 用户点击标题 → 平滑回顶 → 展开
```

### 6.3 动画原语

| 组件 | 用途 | 参数 |
|------|------|------|
| `StaggerContainer` | 交错容器，控制子项时序 | `onComplete`、`delay`、`stagger` |
| `RevealTitle` | 大标题入场（scale 1.015 + blur 12px） | `duration` 默认 1.1s |
| `RevealItem` | 通用项入场（y 16 + blur 6px） | `duration` 默认 0.7s |

- **MUST** 复用这三个原语，**MUST NOT** 自行实现入场动画

### 6.4 CSS 动画类

| 类名 | 用途 | 时长 |
|------|------|------|
| `ark-cinematic-reveal` | 影院级焦点拉近 | 1.8s |
| `ark-wipe-in` | 横向擦除揭示 | 1s |
| `char-reveal` | 字符级 clip-path 升起 | 0.8s |
| `underline-grow` | 链接下划线从左滑出 | 0.4s hover |

---

## §7 视觉装饰

- 章节标记：`<div className="section-marker">[ 00 ]</div>`，从 00 递增
- 工业双斜杠：`<span className="ark-divider">3yearsZ Design</span>`
- 角标：`<div className="ark-corner-bracket">内容</div>`
- 扫描线：`.ark-scanline` — `opacity 0.04`，`z-9998`
- 噪点：`.noise-overlay` — `opacity 0.008`，`z-9999`

---

## §8 移动端适配

| 断点 | 用途 |
|------|------|
| 默认 <640px | 移动端基础样式 |
| `sm:` ≥640px | 大手机/小平板 |
| `md:` ≥768px | 平板/桌面端分界（Navbar 切换、栅格切换） |
| `lg:` ≥1024px | 桌面端 |

**规则：**
- Navbar `<md` 显示汉堡按钮
- 栅格 `<md` 单列堆叠
- 字号全部 `clamp()`
- **MUST** 触控区 ≥44px（WCAG 2.5.5）

---

## §9 交互规范

- 导航链接 active 态：`--primary` 色 + 1px 底部下划线
- 普通链接 hover：用 `underline-grow` 或 `ark-link`
- 下拉/浮层：点击外部关闭 + Esc 键关闭
- 表单提交中显示 `disabled` + 文字变"提交中..."
- **MUST** 所有可交互元素有 `focus-ring` 类（`focus-amber` 为历史别名，新代码禁用）

---

## §10 代码规范

前端编码规范（TS/React/Next.js 约定、React Compiler 红线、文件头 JSDoc、样式实现、客户端/服务端边界等）已整体迁至 [FrontDoc-03-Conv.md](FrontDoc-03-Conv.md)，本文档只保留视觉与交互规范。中文排版规则见根 [`RootDoc-EngConv.md`](../../../docs/RootDoc-EngConv.md) §九。

---

## §11 UI 专属禁止清单

| 禁止 | 原因 |
|------|------|
| 硬编码颜色十六进制值 | 破坏主题切换 |
| 默认阴影 `shadow-lg` / `shadow-2xl` / `hover:shadow-*` | 浮层阴影必须走 `--shadow-popover` / `--shadow-modal` token |
| 发光阴影（`0 0 12px` 类） | 违背"不发光"原则，改用 ring 描边 |
| 白名单外圆角（`rounded-xl` / `rounded-2xl` 等） | 编辑式风格用直角 |
| `ease-in-out` / spring 弹跳动画 | 统一用慢出缓动 |
| `hover:-translate-y-1` 浮起 | 卡片只有边框变色 |
| 渐变背景（logo 装饰例外） | 违背极简原则 |
| 自行实现入场动画 | 必须复用 motion-primitives |

**圆角例外白名单（仅限以下语义，新增须评审）：**

| 元素 | 允许值 |
|------|--------|
| 输入框 / 行内代码 / 长文图片 | `--radius`（0.25rem） |
| 悬浮胶囊容器 / 胶囊内 Tab 项 | `--radius-capsule`（28px）/ `--radius-capsule-item`（22px） |
| 圆形元素：头像、状态点、spinner、角标徽章 | `rounded-full` |

**像素融合层例外（§15）**：DNA 卡（`.dna-card`）与像素按钮（`.btn-pixel*`）的硬阴影、hover `translate` 位移与 `steps()` 跳变属白名单例外，仅限这些像素融合类使用。

---

## §12 新增页面 Checklist

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
- [ ] 列表/表单四态显式处理（加载/空/错误/成功）
- [ ] 移动端 `<md` 单列堆叠，触控区 ≥44px
- [ ] `tsc --noEmit` + `eslint` 0 错误
- [ ] 如需 Tab 切换，使用 `FloatingCapsuleSidebar` 组件
- [ ] 如有 Hero，胶囊与 `useCollapsingHero` 联动
- [ ] 如是子页面，`[ 00 ]` 下方放 `← 返回` 按键

---

## §13 参考文件

| 文件 | 内容 |
|------|------|
| `src/app/globals.css` | 颜色变量、字体组合栈、工具类、token、动画 keyframes |
| `src/app/layout.tsx` | 根布局 + next/font/google 字体自托管声明 |
| `src/components/effects/motion-primitives.tsx` | StaggerContainer / RevealTitle / RevealItem |
| `src/components/layout/floating-capsule-sidebar.tsx` | 悬浮胶囊侧边栏组件 |
| `src/components/primitives/section-nav.tsx` | 胶囊移动端降级 Tab 条 |
| `src/shared/hooks/use-collapsing-hero.ts` | Hero 折叠 hook |
| `src/components/layout/navbar.tsx` | 全局导航 |
| `src/app/page.tsx` | 首页（Hero 折叠参考实现） |
| `src/app/about/page.tsx` | 关于页（章节标记参考） |

---

## §14 Markdown 编辑器

Markdown 编辑器契约已下沉为社区模块契约。完整组件架构 / Props / 使用场景 / 安全策略见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md) §2.5.7。

本规范仅保留结论：社区 Markdown 编辑/渲染统一使用 `src/modules/community/ui/` 下的三层组件 —— `MarkdownRenderer`（只读渲染）/ `MarkdownEditorBase`（基础编辑）/ `MarkdownEditor`（完整编辑，含工具栏 + 图片上传）；安全渲染走 `rehype-sanitize`；内容长度限制统一在 `src/shared/utils/ui-constants.ts` 的 `FORM_LIMITS`。

---

## §15 像素融合层（Pixel Fusion）

2026-08 引入：从第三方招聘站提取视觉语言，与「编辑式技术极简」做**平衡融合**。核心原则：像素语言只注入**元数据层与交互**（标签 / 编号 / 角标 / 按钮 / 卡片皮肤），**不动** Fraunces 衬线标题与正文栈。

### 15.1 字体令牌

| 令牌 | 值 | 说明 |
|------|-----|------|
| `--font-fusion-pixel` | `src/app/fonts/fusion-pixel-zh_hans.woff2`（`localFont` 自托管） | Fusion Pixel 12px Mono zh_hans，OFL-1.1 |
| `--font-pixel` | `var(--font-fusion-pixel), ui-monospace, ...` | 像素元数据组合栈 |

### 15.2 页面作用域

统一 opt-in：在页面根节点 `<main>` 加 `.pixel-page` 即把元数据层切换为像素字体。

- **接入新页面**：给 `<main>` 加 `pixel-page` 即可（已覆盖 join / login / profile / users/[id] / notifications / events/[id] / community* / tools*）
- **排除**：管理员后台 `/admin` 不接入（高密度数据表格可读性）
- 首页是特例：用内联 `style={{ fontFamily: 'var(--font-pixel)' }}` 选择性像素化

### 15.3 DNA 卡（共享组件）

已提炼为共享组件 `<DnaCard>`（`src/components/primitives/dna-card.tsx`），props：`corner?: string|number` 自动补零两位、`className?`、`as?: 'article'|'div'`。

| 类 | 用途 | 规格 |
|----|------|------|
| `.dna-card` | 卡片皮肤 | 表面 `color-mix(fg 8%, bg)`；边框 `color-mix(fg 14%, bg)`；默认硬阴影 `4px 4px 0`；hover `translate(-3px,-3px)` + `7px 7px 0` |
| `.dna-corner` | 右上角像素编号 | `position:absolute; top:14px; right:16px`；11px；hover 转 primary |
| `.dna-meta` | 元数据行 | flex wrap；11px；`.dna-tag` = primary / `.dna-dim` = muted |

**使用方：** `/about` 方向卡片、`/events` 活动时间轴卡片、`/community` 精选横滑卡、`/tools` 工具卡、`/tools` 工作台 9 个 widget 盒装卡

**不适用：** Feed / 主题列表项（`border-b` 分隔 + 紧凑 padding），保持列表样式

### 15.4 像素按钮

`Button` 组件新增 `pixel` / `pixel-outline` / `pixel-danger` 变体：实色硬阴影 `4px 4px 0 var(--muted-foreground)`、hover `translate(-2px,-2px)`、active `translate(2px,2px)`、`transition steps(2)`。

### 15.5 首页 Hero 像素层

- `TypewriterTitle`（`effects/motion-primitives`）：字符级 `steps(6)` 逐字入场 + `▌` 闪烁光标
- `StarfieldCanvas`（`effects/starfield-canvas`）：像素点星空，叠于 `MobiusRing` 之下

### 15.6 活动页同屏双视图（/events）

```tsx
<div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12 items-start">
  <div className="relative z-0 lg:sticky lg:top-24"><MonthCalendar events={events} /></div>
  <div className="relative z-10"><YearAccordionTimeline ... /></div>
</div>
```

- 移动端（单列）：日历在上、时间线在下
- 桌面：左日历（固定 320px）、右时间线；显式分层 `z-0` / `z-10`

### 15.7 与既有规范的豁免

像素融合层的硬阴影、hover translate、`steps()` 跳变违反 §0「不浮起」与 §11「禁止 hover:-translate-y-1 / 默认阴影」，属有意引入的白名单例外，仅限：`.dna-card`、`.dna-corner`（hover 变色）、`.btn-pixel*`、`.typewriter-ch/.typewriter-cursor`。

### 15.8 统一标题组件

- `<Title>`（`primitives/title.tsx`，构建于 `<GhostTitle>`）：`level`（1–4 字号预设）、`subtitle`（内联英文后缀）、`ghost`（默认 `level<=2` 启用虚影）、`collapsed`/`collapsedSize`/`expandedSize`（Hero 折叠动画）
- `<SectionMarker>`：包裹 `.section-marker` 数字章节标记
- `<ArkDivider>`：包裹 `.ark-divider` 工业双斜杠分隔

### 15.9 工作台像素化

`/tools` 页面根 `<main>` 已带 `pixel-page`。9 个 widget 的盒装容器统一经 `<DnaCard>`；任务列表改为 A 索引铁路 `.idx-rail`；CTA 按钮转 `pixel`/`pixel-outline`/`pixel-danger`。

---

## §16 组件用法统一契约（SSOT）

本文件为按钮与 UI 控件的用法唯一权威。实现层以 `src/app/globals.css` 与 `src/components/primitives/*` 为准。

### 16.1 总则

全站 UI 控件遵循「共享契约优先，禁止手写漂移」：

1. 优先使用共享组件与共享类（`btn-*` / `badge*` / `tab-*`）
2. **MUST** 样式令牌引用共享常量与 CSS 变量，**MUST NOT** 裸魔法值
3. **MUST** 实色变体一律 `border: 1px solid transparent`
4. 新增共享 UI 的流程：先立契约（组件/类 + 回归测试）→ 逐文件迁移 → 每批验证

### 16.2 输入框（`INPUT_CLASS` / `<Input>`）

- `INPUT_CLASS`（`src/shared/utils/ui-constants.ts`）是输入框基础样式唯一权威
- **MUST NOT** 复制粘贴输入框样式字符串
- **MUST NOT** 在模块内定义同名 `INPUT_CLASS` 覆盖全局

### 16.3 徽章（`<Badge>` + `badge*`）

组件：`src/components/primitives/badge.tsx`｜类：`.badge` + `.badge-muted|primary|success|amber|danger`。

- 统一视觉：直角、等宽 10px、uppercase、无圆角
- **MUST NOT** 手写 `meta-mono px-2 py-0.5 border ${三元色}` 徽章

### 16.4 Tab / 筛选（`tab-*` + `FilterBar`）

全站 Tab 仅两套形态：**胶囊描边**（`.tab-chip`）与**下划线**（`.tab-underline`）。

- **MUST NOT** 手写选中态三元（`bg-primary/8`、`border-b-2`、实心填充混用）

### 16.5 分页（`<Pagination>`）

组件：`src/components/primitives/pagination.tsx`。

- Props：`page` / `totalPages` / `onPageChange` / `variant` / `activeVariant`
- **MUST NOT** 手写 `← / 页码 / →` 描边按钮组

### 16.6 Modal（`ModalShell`）

组件：`src/components/primitives/modal-shell.tsx`。

- 能力：focus trap、Escape 关闭、点击遮罩关闭、滚动锁定
- **MUST NOT** 手写 `fixed inset-0` 遮罩骨架

### 16.7 z-index（`Z` / `--z-*`）

两层镜像：JS `Z` 常量与 CSS `--z-*` 变量，数值一致。

- **MUST** JSX 用 CSS 变量引用：`z-[var(--z-header)]`
- **MUST NOT** 裸写 `z-50`/`z-40`

### 16.8 质量门禁（新增/修改共享 UI 必须）

1. 组件/类变更 MUST 配套回归测试
2. 每批迁移验证：`eslint` 0 error、`vitest` 全绿、`tsc --noEmit` 零新增错误
3. 迁移纪律：先立契约 → 逐文件迁移 → 每批独立验证

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-08-21 | **P4-3 重写**：补充 6 行元数据、快速索引、RFC 2119 约束、代码位置索引 |
| 2026-08-20 | **合并前端 UI 文档（P1）**：原 UIStandard 组件用法并入 §16；UIButton 按钮并入 §5.2；本文成为 UI 规范唯一权威 |
| 2026-08-18 | 像素融合全站化、统一标题组件（Title/SectionMarker/ArkDivider）、GhostTitle 虚影、工作台像素化 |
| 2026-08-09 | §10 代码规范迁出至 FrontDoc-03-Conv.md；文档瘦身重构 |
| 2026-08-06 | 规范收口迭代：圆角/阴影 token 化、胶囊可发现性增强、字体自托管、四态规范 |
| 2026-07-26 | 新增子页面返回按键规范 |

---

> ↩ **文档索引**：[Frontend README](README.md) · **编码规范**：[FrontDoc-03-Conv.md](FrontDoc-03-Conv.md) · **变更记录**：[CHANGELOG.md](../../../CHANGELOG.md)