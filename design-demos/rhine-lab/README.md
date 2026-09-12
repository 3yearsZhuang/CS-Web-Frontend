# Rhine Lab × FZTBU·CS 设计 Demo（预研参考）

> 分支：`feature/rhine-lab-integration`
> 目的：在正式实施「先 C 后 B」集成前，提供可交互的设计方向参考。
> 风格裁决：设计冲突以 https://github.com/LBEILC/RhineLabUI 仓库为准（暖灰 `#eae5e1` / 杏金 `#e07b39` / MiSans 后备栈 / 细线紧凑排字）。
> 豁免：本目录 demo 复用该仓库的 3D 物理透射 / 折射 / 景深与摄像机编排 + spring 物理，经授权不视为违反 FrontDoc-UID §11 禁止清单（仅限本目录与后续 /lab 作用域）。

## Demo 清单

| 文件 | 对应方案 | 内容 | 操作 |
|------|---------|------|------|
| `01-boot-sequence.html` | C · 模式① | 终端开场：逐字输入 → 标志绘制 → 身份接入 → 权限扫描 → 欢迎转场 | `Enter`/`Esc` 跳过，ENTER SYSTEM 进入 |
| `02-archive-index.html` | C · 模式②③④ | 2D 档案柜：5 类×8 资源、检索、收藏、导出、编号滚动、标题快切闪动 | `←→` 切类 `↑↓` 翻阅 `Enter` 详情 `/` 检索 `S` 收藏 |
| `03-archive-scene-3d.html` | B · 可行性预览 | three.js 0.183 原创几何档案阵列：透射盖板、镜头编排、选中波浪、抽取详情 | `←→↑↓` 选择 `Enter` 抽取 拖动旋转 `Esc` 归位 |

## 说明

- 全部为**零构建自包含 HTML**（Demo 03 经 CDN import map 加载 three.js，需联网与 WebGL2）。
- 3D 几何为程序化原创（未使用上游 GLB / 莱茵标志），规避 IP 风险；数据为本站资源站映射的演示数据。
- 三 demo 均遵循 `prefers-reduced-motion` 降级。
- 选型确认后再进入正式实施：C 模式 → `components/effects` + `/tools/resource` 改造；B → `/lab` 特色页（three.js 进依赖评审）。
- **上游同步**：最新一次对齐见 [UPSTREAM-SYNC.md](UPSTREAM-SYNC.md)（HEAD `d9ecb6c` / 2026-09-12：主题分层与深色档、画质分级、音效设置、滚动数字复用、HUD 投影、渲染性能等增量，及可复用资产与许可边界）。
