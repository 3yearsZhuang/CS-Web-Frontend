# 工作台模块（src/modules/workbench）

个人化信息聚合工作中心，挂在 `/tools` 页顶部（Hero 之后）。对照
[`docs/RootDoc-FEArch.md`](../../../docs/RootDoc-FEArch.md) 分层准则组织。

## 组件清单

| 层级 | 文件 | 职责 |
|------|------|------|
| 组合 | `workbench.tsx` | 组装全部 widget；数据备份（导出/导入/清空）；视图切换（工作台/学习助手）；布局显隐设置 |
| 注册表 | `widget-registry.ts` | widget 声明 → 配置 → 注册（§2.6），slot 分组渲染 |
| 桶导出 | `index.ts` | 模块对外出口（§3.3） |
| widget | `widgets/greeting-bar.tsx` | 问候条：当前时间 / 日期 / 本次会话在线时长 |
| widget | `widgets/today-tasks.tsx` | 今日任务：个人待办（localStorage），逾期置顶标红 |
| widget | `widgets/quick-notes.tsx` | 快捷便签（localStorage） |
| widget | `widgets/exam-countdown.tsx` | 考试倒计时（后端 exams 数据） |
| widget | `widgets/github-heatmap.tsx` | GitHub 贡献热力图（后端缓存 6h） |
| widget | `widgets/llm-usage-stats.tsx` | LLM 用量统计（调用次数/token 消耗/模型分布）+ 模型接入设置（API Key 加密存储） |
| widget | `widgets/assistant-chat.tsx` | 学习助手对话 UI（SSE 流式 + 工具调用状态） |
| 模块 | `widgets/pomodoro/` | 番茄钟×播放器（目录即模块：use-pomodoro 状态机 + settings/music 面板） |
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
| `wb_session_started_at`（sessionStorage） | 会话开始时间 |
