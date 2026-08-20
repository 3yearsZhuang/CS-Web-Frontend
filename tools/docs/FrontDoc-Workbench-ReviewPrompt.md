# FrontDoc-Workbench-ReviewPrompt｜工作台代码审查请求模板

> 更新人：3yearsZ
> 更新日：2026-08-21
> 版本：1.0.0
> Diátaxis：R（Reference · 工作台代码审查 prompt 模板，可直接复用的检查清单与输出格式）
> 适用读者：前端贡献者、Reviewer、Code Reviewer
> 变更触发：工作台目录结构 / 组件清单变动时须同步本模板

> **SSOT 声明**：本文件是「工作台（Workbench）代码审查 prompt 模板」的唯一权威。源代码现状以 `src/modules/workbench/` 为准。

> **Stale 信号**：本模板列出的文件名与 `src/modules/workbench/` 实际不符。

---

## 快速索引

| 章节 | 主题 | 概述 |
|------|------|------|
| **§1 审查范围** | 前端 + BFF + 后端全链路文件清单 | 工作台实现分散在三处，审查者 MUST 覆盖全部 |
| **§2 审查维度与检查点** | 5 维度 × 具体检查点 | 性能 / 可维护性 / UX / 代码结构 / 扩展性 |
| **§3 输出格式** | 标准化问题报告模板 | 位置 / 问题 / 影响 / 改进方向 / 优先级 |
| **§4 代码位置映射** | 前/后/端代码精确路径 | 便于审查者快速定位文件 |

---

## §1 审查范围

审查者 MUST 覆盖以下三处实现，不得只看单个文件：

### 1.1 前端（React / Next.js + TypeScript）

| 路径 | 内容 |
|------|------|
| `CS-Web-Frontend/src/app/tools/page.tsx` | `/tools` 页面入口 |
| `CS-Web-Frontend/src/modules/workbench/` | 整个工作台目录 |
| — 重点文件 | `workbench.tsx`（~420 行，组合/备份/布局/dnd）、`widget-registry.ts`（声明→配置→注册）、`types.ts`（尺寸规格系统）、`widgets/` 全部组件 |
| — Hooks | `use-clock`、`use-local-storage`、`use-idb-media` |
| — Lib | `ambient-audio.ts` |

### 1.2 前端 BFF 路由

| 路径 | 内容 |
|------|------|
| `CS-Web-Frontend/src/app/api/workbench/**` | `stats/api-usage`、`stats/pomodoro`、`stats/llm-usage`、`focus-sessions`、`llm-config`、`contributions/github` |

### 1.3 后端（FastAPI + SQLAlchemy async）

| 路径 | 内容 |
|------|------|
| `CS-Web-Backend/app/api/v1/workbench.py` | 工作台 API 路由 |
| `CS-Web-Backend/app/services/workbench_service.py` | 工作台业务逻辑 |
| `CS-Web-Backend/app/models/` | `focus.py`、`llm_config.py`、`api_usage.py`、`llm_usage.py` |

### 1.4 不变量约束

- **MUST NOT** 只审查前端 React 组件而忽略 BFF 和后端
- **MUST** 覆盖所有 widget 组件（greeting-bar、today-tasks、quick-notes、exam-countdown、github-heatmap、llm-widget、llm-usage-stats、assistant-chat、pomodoro）

---

## §2 审查维度与检查点

### 2.1 性能

| 检查点 | 说明 |
|--------|------|
| SSE 流式渲染 | `assistant-chat` 的 `appendDelta` 是否每次 delta 都全量复制消息数组 |
| ResizeObserver | 测量是否节流 |
| dnd-kit 拖拽 | 是否引发不必要的整网格重渲染 |
| 后端聚合查询 | 是否 N+1、缺索引、缺缓存（GitHub 热力图已有 6h 缓存，其余统计是否缺失） |

### 2.2 可维护性

| 检查点 | 说明 |
|--------|------|
| `workbench.tsx` 职责 | 是否过重（组合/备份/布局/dnd 混在一起） |
| `widget-registry.ts` | 每个 widget 的 `titleKey` 是否与 i18n key 一致且存在（重点核查 `github-heatmap` 的 `titleKey`） |
| 类型安全 | 类型是否安全 |
| 重复逻辑 | 是否存在重复逻辑 |

### 2.3 用户体验

| 检查点 | 说明 |
|--------|------|
| 移动端拖拽体验 | — |
| SSR/CSR hydration | 是否闪烁 |
| 数据备份 | 导出/导入/清空的提示与二次确认是否到位 |
| 四态处理 | 空状态 / 加载态 / 错误态是否齐全 |
| 可访问性 | 键盘可达、aria 属性 |

### 2.4 代码结构

| 检查点 | 说明 |
|--------|------|
| widget 注册表模式 | 「声明→配置→注册」是否真正做到「新增 widget 零改动骨架」 |
| slot 分组 | full / primary / main+side 是否清晰 |
| hooks 抽取 | 是否到位 |

### 2.5 扩展性

| 检查点 | 说明 |
|--------|------|
| 新增 widget 成本 | 实际需要改哪几处 |
| 尺寸规格系统 | 是否够用 |
| 后端新增统计端点 | 是否需要复制粘贴大量样板 |

### 2.6 不变量约束（RFC 2119）

- **MUST** 每个维度落实到具体检查点，**MUST NOT** 泛泛而问"可维护性"
- **MUST** 输出按严重度分级（P0 / P1 / P2）
- **MUST NOT** 将"位置"误写为 `CS-Web-Frontend/tools/`（那是部署脚本目录，不是工作台实现）

---

## §3 输出格式

每个问题 MUST 按以下结构输出：

```
【位置】文件:行号
【问题】一句话描述
【影响】对性能 / 可维护 / UX / 结构 / 扩展性的具体后果
【改进方向】具体、可执行的改法
【优先级】P0（正确性 / 安全，必须修）/ P1（明显技术债）/ P2（锦上添花）
```

### 3.1 最终交付物

- **MUST** 一张「问题清单总表」
- **MUST** 一张「Top 5 优先修复项」

---

## §4 代码位置映射

### 4.1 前端实现

| 目录 | 说明 |
|------|------|
| `src/modules/workbench/` | 工作台核心模块 |
| `src/modules/workbench/widgets/` | 9 个 widget 组件 |
| `src/modules/workbench/hooks/` | 自定义 hooks |
| `src/modules/workbench/lib/` | 工具函数 |
| `src/app/tools/page.tsx` | `/tools` 页面入口 |

### 4.2 BFF 路由

| 路径 | 说明 |
|------|------|
| `src/app/api/workbench/stats/api-usage/route.ts` | API 用量统计 |
| `src/app/api/workbench/stats/pomodoro/route.ts` | 番茄钟统计 |
| `src/app/api/workbench/stats/llm-usage/route.ts` | LLM 用量统计 |
| `src/app/api/workbench/focus-sessions/route.ts` | 专注会话 |
| `src/app/api/workbench/llm-config/route.ts` | LLM 配置 |
| `src/app/api/workbench/contributions/github/route.ts` | GitHub 贡献 |

### 4.3 后端实现

| 路径 | 说明 |
|------|------|
| `app/api/v1/workbench.py` | 工作台路由 |
| `app/services/workbench_service.py` | 工作台服务层 |
| `app/models/focus.py` | 专注模型 |
| `app/models/llm_config.py` | LLM 配置模型 |
| `app/models/api_usage.py` | API 用量模型 |
| `app/models/llm_usage.py` | LLM 用量模型 |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-08-21 | **P4-3 重写**：补充 6 行元数据、快速索引、RFC 2119 约束、代码位置映射 |
| 2026-08-20 | 初始版本：基于原请求问题诊断重写为可复用审查模板 |

---

> ↩ **文档索引**：[Frontend README](README.md) · **工作台实现**：[FrontDoc-01-Arch.md](FrontDoc-01-Arch.md) · **变更记录**：[CHANGELOG.md](../../../CHANGELOG.md)