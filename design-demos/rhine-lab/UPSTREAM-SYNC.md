# RhineLabUI 上游同步记录

> 上游：https://github.com/LBEILC/RhineLabUI
> 本次同步 HEAD：`d9ecb6c`（2026-09-12，`chore: make performance experiments portable across repositories`）
> 上一次参考快照：2026-09-08（`df7da0f` 公开源码分发准备）
> 同步方式：`git clone --depth 1` 到临时目录盘点（未把上游代码并入本站依赖）

## 1. 自 2026-09-08 以来的主要增量

| 上游增量 | 代表提交 / 模块 | 对本项目的价值 |
|---|---|---|
| **主题分层 + 深色档**（graphite dark、cascading archive transitions） | `src/theme.css`、`theme-ui.ts`、`theme-material.ts`、`theme-motion.ts`、`[data-dark-surface]` | 高：我们 §17 `.rhine-scope` 目前只有浅色纸底，可直接照抄其「paper/ink/muted/accent/line/panel/field」令牌分层与深色档切换 |
| **画质 / 性能分级**（high/medium/low/super、自定义质量） | `render-quality.ts`、`quality-renderer.ts`、`quality-settings.ts` | 高：C3「设置面板·画质」有现成参照，且与本站 reduced-motion 守卫天然衔接 |
| **音效与音频设置** | `audio.ts`、`audio-settings.ts`、`public/audio/*` | 中：设置面板「界面音效」开关；音效素材可占位复用 |
| **滚动数字复用**（页脚时钟、媒体更新共用 reels） | `workbench-rolling.ts` | 高：C3 的 RollingNumber 原语化有了「一处实现、多处复用」的上游证据 |
| **HUD 投影与屏幕效果**（视差、屏幕后处理） | `hud-projection.ts`、`screen-finish.ts`、`wallpaper-effects.ts` | 高（B 阶段）：3D 场景与 DOM 信息层对齐的关键技术 |
| **启动字母定型**（SVG 字型数据驱动 + 稳定性修复） | `boot-lettering.ts`、`boot-lettering-art.json` | 中：C1 的标志/字母绘制可从手写 SVG 升级为数据驱动 |
| **阅读层新动效**（解密、文档解密、玻璃揭示） | `decryption.ts`、`document-decryption.ts`、`glass-reveal.ts` | 中：档案柜详情页的「读取/揭示」动效素材 |
| **渲染性能**（离屏剔除、渲染复用、视口自适应） | `archive-visibility.ts`、`shared-depth.ts`、`viewport-layout.ts` | 高（B 阶段）：three.js 落地的性能护栏 |

> 壁纸引擎分支（`wallpaper/*`）已合入 main，但其目标运行环境（Wallpaper Engine）与本站无关，**不纳入复用范围**。

## 2. 可复用素材清单（占位用途，上线前须替换原创）

| 资产 | 体积 | 说明与建议 |
|---|---|---|
| `public/assets/archive-cassette.glb` | 3.4 MB | 主档案盒模型（透射盖板 + 内部结构）：B 阶段 3D 阵列的占位首选 |
| `public/assets/archive-assembly.glb` | 3.1 MB | 六组拆解模型：仅「360° 拆解查看器」需要，可延后 |
| `reference/model-precision/low.glb` / `medium.glb` | 816 KB / 3.2 MB | 画质分级对照：可直接作为我们 high/medium/low 三档的实测依据 |
| `public/fonts/misans-webfont-4.3.1/` | 目录 25 MB（**按 unicode-range 分片，单片 30–50 KB**） | 非一次性 25 MB；仅取 Latin + 常用 CJK 分片时增量极小。需随附 `MiSans-license.pdf` 与 `NOTICE.txt` |
| `public/audio/*`（motif/atmosphere/pulse/typing/preview） | 小 | 界面音效占位；需确认其许可后再上线 |

## 3. 许可与 IP 边界（不变，重申）

- 上游**自写代码为 MIT**（`LICENSE`，版权 LBEILC 2026）；第三方：rolling-number（MIT，许可存于 `public/licenses/`）。
- **GLB 模型属对《明日方舟》官方视觉的复刻，仓库明确声明不随 MIT 授权**——仅可作开发期占位，**公开上线前必须替换为原创模型**。
- MiSans 需保留许可 PDF 与 NOTICE；上游新增的 Novecento 字体亦须核实其授权范围后再用。
- 本站约定：Rhine 素材仅用于 `.rhine-scope` 白名单作用域（`/lab`、`/tools/resource?view=archive`），见 FrontDoc-UID §17。

## 4. 对本站落地状态的映射

| 上游能力 | 本站状态 |
|---|---|
| 终端开场时间轴 | ✅ C1 已落地（`components/effects/boot-sequence.tsx`）；字母绘制可升级为数据驱动（待办） |
| 档案柜 / 检索 / 收藏 | ✅ C2-1、C2-2 已落地（`/lab/archive`、`/tools/resource?view=archive`） |
| 编号滚动 reels | ⚠️ 已内嵌于档案柜侧栏，**待原语化**（C3） |
| 设置面板（音效 / 减动效 / 画质 / 全屏 / 重播） | ⬜ 未落地（C3，上游已有成熟参照） |
| 深色档 | ⬜ 未落地（本站为双主题站点，需评审是否让 Rhine 作用域跟随全局深色） |
| 3D 档案阵列 / HUD 投影 | ⬜ 未落地（方案 B，需 three.js + GLB 占位） |
