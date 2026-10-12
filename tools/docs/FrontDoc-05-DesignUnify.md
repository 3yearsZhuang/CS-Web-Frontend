# FrontDoc-05｜前端设计统一方案（Design Unification Plan）

> 分支：`feat/unified-frontend-design`（根仓 + CS-Web-Frontend 子模块同名分支）
> 日期：2026-10-13
> 类型：P（Plan · 设计方案，验收后拆解为治理波次）
> 关联规范：[FrontDoc-UID.md](FrontDoc-UID.md)（§0 设计哲学 / §11 禁止清单 / §16 用法契约 / §17 Rhine 作用域）

---

## 1. 背景与目标

站点已有一套完整的设计语言 SSOT（FrontDoc-UID）：**编辑式技术极简**（杂志感 12 栏栅格 + 工业终端元数据 + 克制动效），外加两层受控扩展：

- **像素融合层（§15）**：像素字体元数据 + DNA 卡 + 像素按钮，opt-in 于 `.pixel-page`
- **Rhine 终端作用域（§17）**：`/lab` 专用的暖灰杏金视觉域，白名单豁免

但规范落地存在漂移：部分页面未走 primitives 契约、硬编码颜色/圆角/阴影散落、页面间视觉密度不一致。本方案目标是：

1. **收口**：全站视觉回到 UID 规范 + 两层受控扩展，无第三种方言
2. **可见**：用一个演示 demo（`/design-demo`）把「令牌 → 原语 → 页面模板 → 一致性现状」集中呈现，作为评审与回归基准
3. **可执行**：把审计结果拆成分级治理清单，每批可独立验收

## 2. 统一原则（不可妥协）

| # | 原则 | 落地手段 |
|---|------|---------|
| P1 | 颜色只走 CSS 变量（`--primary` 等 6 核心 token） | 清除硬编码十六进制；chart/emerald 等语义色令牌化 |
| P2 | 直角为默认，圆角/阴影只走白名单 token（§3.5/§11） | 清理 `rounded-xl/2xl`、`shadow-lg`、发光阴影 |
| P3 | 控件只用共享契约：`btn-*` / `badge*` / `tab-*` / `<Pagination>` / `<ModalShell>` | 消灭手写漂移实现 |
| P4 | 动效只用 `--ease-ark` + motion-primitives 原语 | 禁止 spring/ease-in-out/自造入场 |
| P5 | 像素层（§15）与 Rhine 层（§17）是唯一合法"方言"，且不得越界 | 作用域白名单评审制 |

## 3. 统一架构：三层模型

```
Layer 0  设计令牌     globals.css（颜色/字体/z-index/时长/缓动/圆角/阴影）— 唯一来源
Layer 1  原语组件     components/primitives + layout + effects + feedback — 唯一契约
Layer 2  页面模板     Hub 总览 / 列表流 / 详情 / 表单 — 四种版式收敛全部页面
          受控方言     .pixel-page（§15 元数据像素化）· .rhine-scope（§17 /lab 专用）
```

页面模板映射（现状 → 目标版式）：

| 版式 | 特征 | 覆盖页面 |
|------|------|---------|
| T-Hero 杂志版 | CollapsingHero + 章节标记 + 12 栏 | `/` `/about` `/events` |
| T-Hub 工作台版 | 问候 Hero + 指标条 + 卡片栅格 + 侧栏 | `/design-demo`（模板）`/tools` |
| T-List 信息流版 | FilterBar + border-b 内容行 + Pagination | `/community` `/notifications` `/search` |
| T-Form 表单版 | 居中窄栏 + Input 契约 + 四态 | `/login` `/join` `/community/new` |
| T-Admin 密度版 | 高密度表格（不接入 pixel-page） | `/admin` |

## 4. 治理波次（按 正确性 > 一致性 > 价值 排序）

> 审计明细见附录 A（由设计审计生成）。

| 波次 | 内容 | 验收标准 | 依赖 |
|------|------|---------|------|
| U-0 | 演示基准：`/design-demo` 扩展为 5 视图验收页（本分支交付物） | 页面可访问，令牌/原语/模板/审计四视图完整 | 无 |
| U-1 | 颜色收口：清除硬编码 hex，语义色（成功/警告/图表）令牌化 | grep 零命中（白名单外）；双主题切换无失色 | U-0 |
| U-2 | 形状收口：圆角/阴影白名单化 | §11 禁止清单 grep 零命中 | U-1 |
| U-3 | 控件收口：手写 button/tab/分页/Modal 迁移到 primitives | 每文件迁移后 eslint+vitest+tsc 全绿 | U-1 |
| U-4 | 版式对齐：偏离页面按 §3 模板表逐页对齐 | 每页过 §12 Checklist 15 项 | U-3 |
| U-5 | 守护：CI 加设计 lint（hex/rounded/shadow 黑名单 grep 门禁） | CI 阻断新漂移 | U-2 |

## 5. 演示 Demo 设计（本分支交付物）

路由 `/design-demo`，纯静态数据、零后端依赖，作为统一设计的**活文档 + 验收基准**：

| 视图 | 内容 | 验收点 |
|------|------|--------|
| 01 总览 | 既有 Member Hub 模板（问候 Hero / 指标 / DnaCard / Feed / 侧栏） | T-Hub 版式范式 |
| 02 动态 | 统一内容行信息流 | T-List 版式范式 |
| 03 令牌 | 6 色 token 双主题色板 / 字号阶梯 / z-index·时长·缓动·圆角·阴影 token 表 | Layer 0 可视化 |
| 04 组件 | Button 11 变体 / Badge 5 变体 / Input / InlineTabs / FilterBar / Pagination / ModalShell / ConfirmDialog / Loading / EmptyState / DnaCard / Title 实景 | Layer 1 全覆盖 |
| 05 审计 | 全站一致性评级表 + Top 治理清单（审计数据驱动） | 统一进度可追踪 |

交互约定：视图切换走既有编号 Tab（01/02/03/04/05）；令牌视图支持一键切换 .dark 预览；组件视图所有控件可真实交互。

## 6. 边界与非目标

- **不做**：不改后端；不动 `/lab` Rhine 作用域视觉（§17 另有上游裁决）；不动未提交的工作台 RGL 迁移改动
- **不破坏**：`/design-demo` 现有两视图保留为 01/02，在其上扩展
- **遵守**：`/admin` 不接入 pixel-page；演示页本身全量遵守 §11/§12

## 7. 验收方式

1. `pnpm dev` 后访问 `http://localhost:2333/design-demo`，五视图逐一核对
2. 浅色/深色双主题切换检查 token 一致性
3. 移动端（<md）单列堆叠 + 触控区检查
4. `pnpm validate`（tsc + eslint）零错误

## 附录 A：设计审计摘要

> 2026-10-13 全量审计。范围：`src/app` + `src/modules`（排除 rhine/lab 豁免域与测试文件）。

### A.1 违规统计总表

| 类别 | 命中数 | 文件数 | 代表文件 | 波次 |
|---|---|---|---|---|
| 硬编码 hex 颜色 | 4 | 2 | workbench/widgets/pomodoro/constants.ts ×3、workbench/schema/schema-widget-renderer.tsx ×1 | U-1 |
| 白名单外圆角 | ~16 | ~10 | tools/auxilio/page.tsx ×5、assistant-chat.tsx、workbench.tsx | U-2 |
| 违规阴影/发光 | 6 | 3 | workbench.tsx ×3、assistant-chat.tsx、events ×2 | U-2 |
| hover 浮起/弹跳 | 3 | 2 | workbench.tsx（scale/wiggle）、event-card.tsx | U-2 |
| 原生 `<button>` 未走原语 | 228 | ~40 | admin/user-list-view ×16、two-factor-settings ×9、month-calendar ×8 | U-3 |
| 原生 `<input>` 未走原语 | ~60 | ~20 | community/categories-manager ×10、admin/event-modals ×7、about ×5 | U-3 |

> 合法不计：globals.css 的 99 处 hex 为 token 定义本身；.btn-pixel/.dna-card 硬阴影为 §15 白名单例外。

### A.2 页面风格评级

| 评级 | 页面 |
|---|---|
| ✅ 符合（7） | / /about /events /tools /profile /login |
| ⚠️ 轻微偏离（3） | /community（页宽 1320≠1600、gap-8≠gap-0、原生按钮）· /admin（原生控件密度最高）· /tools/auxilio（圆角+下拉阴影） |
| ❌ 重度偏离（1） | workbench（阴影+圆角+动效三项集中违规，且与未提交的 RGL 迁移改动交织，治理时须先合流） |
| — 豁免 | /lab（§17 Rhine 作用域） |

### A.3 总体结论

骨架层（CollapsingHero / pt-16 / 章节标记 / CSS 变量颜色 / 像素融合层）执行良好；漂移集中在 **workbench 编辑模式视觉** 与 **admin/auxilio 原生控件** 两个治理域，按 U-1 → U-5 波次逐批收口即可收敛。演示 demo（/design-demo 视图 05）内置本表，作为治理进度追踪基准。

