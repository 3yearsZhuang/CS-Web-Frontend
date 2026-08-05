# src/components — 通用 UI 组件库

> 遵循 `tools/docs/GENERAL.md`（Atomic Design 分层 + 目录即模块）。
> 新增组件前先查下方清单；满足「重复 ≥ 2 次 / 职责单一 / 可独立存在 / 可配置化」才新建（GENERAL 2.4）。

## 分层

| 目录 | 层级 | 说明 |
|------|------|------|
| `primitives/` | atoms | 无业务语义的通用原子件：Button / Input / Loading / Spinner / ConfirmDialog / FilterBar / InlineTabs / SectionNav |
| `layout/` | organisms | 页面级骨架：Navbar / Footer / FloatingCapsuleSidebar / CollapsingHero / PageHeaderBackground |
| `effects/` | 特效 | 视觉动画：MobiusRing / PageTransition / ScrollIndicator / motion-primitives |
| `feedback/` | 反馈 | 用户反馈：Toast / Fallback / AnnouncementBanner |
| 根级 | 混合 | 跨域通用件：Avatar / UserMenu / NotificationBell / TechTagSelector / ThemeProvider / ThemeToggle |

## 桶导出

统一从 `src/components/index.ts` 导出（含类型），业务组件一律 `import { Button, Input } from '@/components'`。

## 复用阈值（GENERAL 2.4）

- 重复 UI 结构 ≥ 2 次 → 抽为 primitives 原子件
- 组件总行数 > 500 → 必须拆分
- 样式 > 200 行 / 逻辑 > 150 行 → 拆出

## 约定

- 组件文件 `PascalCase.tsx`；`'use client'`（如含交互）
- 样式用设计令牌（`var(--primary)` 等）或 Tailwind 工具类，禁止硬编码颜色（GENERAL 6.3.2）
- 复杂组件「目录即模块」：自带 `types.ts` / `hooks/` / `index.ts` 桶导出（GENERAL 3.3）
