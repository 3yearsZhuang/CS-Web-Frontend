# 工作台模块（src/modules/workbench）

个人化信息聚合工作中心，挂在 `/tools` 页顶部（Hero 之后）。对照
[`docs/RootDoc-FEArch.md`](../../../../docs/RootDoc-FEArch.md) 分层准则组织。

## 组件清单

| 层级 | 文件 | 职责 |
|------|------|------|
| 组合 | `workbench.tsx` | 组装全部 widget；数据备份（导出/导入/清空）；布局显隐设置（问候条顶部全宽 + Auxilio v1 左主列 + 其余右栏） |
| 外壳 | `workbench-card.tsx` | 卡片统一外壳：DnaCard corner + meta-mono 标题头 + 右上操作区 + loading/empty/error 三态；children 在 flex-1 容器内透传 |
| 注册表 | `widget-registry.ts` | widget 声明 → 配置 → 注册（§2.6），slot 分组渲染（full / primary / main+side） |
| 桶导出 | `index.ts` | 模块对外出口（§3.3） |
| widget | `widgets/greeting-bar.tsx` | 问候条：当前时间 / 日期 / 本次会话在线时长（顶部全宽状态条，双行横排布局，**例外：不套 WorkbenchCard**，保留 DnaCard 定制结构） |
| widget | `widgets/tasks-and-notes.tsx` | 任务与便签（合并卡）：今日待办 + 快捷便签双区共存（各自持久化 wb_tasks/wb_notes；便签可一键转今日任务） |
| widget | `widgets/exam-countdown.tsx` | 考试倒计时（后端 exams 数据） |
| widget | `widgets/github-heatmap.tsx` | GitHub 贡献热力图（后端缓存 6h） |
| widget | `widgets/llm-widget.tsx` | Auxilio v1 卡片（primary 槽位）：对话优先左主列布局，头部「用量与设置」统一入口展开用量统计 + 模型接入设置面板；取代旧 /tools/auxilio 分析页 |
| widget | `widgets/llm-usage-stats.tsx` | LLM 用量统计（调用次数/token 消耗/模型分布）+ 模型接入设置（embedded 时无内部按钮、设置表单常显） |
| 跨域 | `modules/auxilio/ui/assistant-chat.tsx` | 学习助手对话 UI（SSE 流式 + 工具调用状态；`mode="lite"` 纯轻聊内嵌于 llm-widget，`mode="full"` 全量能力供 /tools/auxilio 页） |
| 模块 | `widgets/pomodoro/` | 番茄钟×播放器（目录即模块：use-pomodoro 状态机 + settings/music 面板） |
| schema | `schema/widget-schema.ts` | Schema 配置驱动卡类型 + 校验器（count/list/progress/countdown/note/link；api 白名单防契约漂移） |
| schema | `schema/use-schema-data.ts` | Schema 卡数据源 hook（local/api/static 三源统一） |
| schema | `schema/use-schema-widgets.ts` | Schema 卡配置集合（localStorage `wb_schema_widgets`，读写过校验器） |
| schema | `schema/schema-widget-renderer.tsx` | Schema 管理卡：表单 + 实时预览 + 已建卡列表三合一（六卡型复用 WorkbenchCard；复杂卡走手写） |
| schema | `schema/schema-card-form.tsx` | Schema 卡表单（受控）：标题/类型/数据源三要素，随管理卡渲染 |
| hook | `hooks/use-clock.ts` | 时钟 + 会话时长 |
| hook | `hooks/use-local-storage.ts` | localStorage 持久化 state |
| hook | `hooks/use-idb-media.ts` | IndexedDB 音频库（上传音乐） |
| lib | `lib/ambient-audio.ts` | WebAudio 环境音合成引擎（雨/海浪/篝火/白噪音/提示音） |
| types | `types.ts` | 工作台共享类型 |

## 设计约定（自检对照）

- 颜色只用项目令牌（`var(--primary/--muted-foreground/--destructive/--chart-*)`）与
  Tailwind 语义色板（emerald/amber/red/blue），**无散落硬编码 hex**（§6.3.2）；
  SVG stroke 无法用类名，集中收在 `widgets/pomodoro/constants.ts` 并注释色板来源
- 输入框 / 按钮复用项目原子件 `@/components/primitives/{Input,Button}`（§6.2.1）
- 状态逻辑抽 hook（`use-pomodoro`），组件 < 500 行（§2.4）
- 布局由 `widget-registry` 配置驱动，用户显隐偏好存 `wb_widget_prefs`（§2.3）

## 数据存储（localStorage 前缀 `wb_`）

| key | 内容 |
|-----|------|
| `wb_tasks` / `wb_notes` | 今日任务 / 便签 |
| `wb_pomodoro_settings` / `wb_pomodoro_state` | 番茄钟配置与计时状态 |
| `wb_github_username` | GitHub 用户名绑定 |
| `wb_widget_prefs` | 布局显隐偏好 |
| `wb_schema_widgets` | Schema 配置驱动卡集合（JSON 声明数组） |
| `wb_session_started_at`（sessionStorage） | 会话开始时间 |
