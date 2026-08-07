# FZTBUCS-Markdown-编辑器使用指南

> 文档定位：Markdown 编辑器组件使用指南（how-to）
> 受众：前端开发者 / 需要接入富文本编辑的模块负责人
> Source of truth：编辑器组件架构、接入方式、内容限制的唯一权威位置
> 关联：组件目录见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md)；设计规范见 [FrontDoc-UID.md](FrontDoc-UID.md)
> 最后更新：2026-08-01（修复组件路径与 API 路径重复）
> 更新人：3yearsZ
> cadence：编辑器组件变更时
> Stale 信号：组件路径与实际目录结构不一致 / API 路径与路由 handler 不一致

## 文档结构

- **一、组件架构** — 三层组件树（Renderer / EditorBase / Editor）
- **二、组件详情** — 各组件文件、定位、props
- **三、使用场景对照表** — 何时用哪个组件
- **四、内容长度限制** — 各字段字符上限
- **五、已知待统一项** — 待办
- **六、新增页面接入指南** — 接入步骤

---

## 一、组件架构

项目采用三层架构统一全文的 Markdown 编辑与渲染：

```
MarkdownRenderer              - 只读渲染（react-markdown + 插件链）
    ↑
    ├── MarkdownEditorBase    - 基础编辑器（编辑/预览 Tab 切换）
    │       ↑
    │       └── MarkdownEditor - 完整编辑器（工具栏 + 图片上传）
    │
    └── CommunityReplyItem        - 回复项渲染（主回复 + 楼中楼）
```

所有组件位于 `src/modules/community/ui/` 目录（文件名以 community- 前缀）。

---

## 二、组件详情

### 2.1 MarkdownRenderer - 渲染器

文件：`src/modules/community/ui/community-markdown-renderer.tsx`

定位：只读 Markdown 渲染，用于展示主题正文、回复内容等。

依赖：

| 包 | 用途 |
|----|------|
| `react-markdown` | Markdown 解析与渲染 |
| `remark-gfm` | GFM 扩展（表格、删除线、任务列表等） |
| `rehype-sanitize` | 安全过滤（白名单机制） |
| `rehype-highlight` | 代码语法高亮 |

安全策略：基于 `defaultSchema` 自定义 sanitize schema，允许 `class`、`href`、`src`、`alt` 等属性，禁止所有 `on*` 事件和 `javascript:` 协议。

支持的 Markdown 语法：标题（h1-h6）、段落、强调（粗体/斜体）、行内代码、代码块、引用、列表、链接、图片、表格、水平线、删除线。

Props：

| 参数 | 类型 | 说明 |
|------|------|------|
| `content` | `string` | Markdown 原文 |
| `className` | `string`（可选） | 容器额外样式 |

使用示例：

```tsx
import { MarkdownRenderer } from '@/modules/community/ui/community-markdown-renderer';

<MarkdownRenderer content={topic.contentMarkdown} />
```

---

### 2.2 MarkdownEditorBase - 基础编辑器

文件：`src/modules/community/ui/community-markdown-editor-base.tsx`

定位：纯编辑/预览切换，无工具栏和图片上传。

功能：
- 编辑 / 预览 Tab 切换
- 键盘快捷键：`Cmd/Ctrl+B` 加粗、`Cmd/Ctrl+I` 斜体
- 字数统计（chars）
- 预览模式复用 `MarkdownRenderer`

适用场景：不需要工具栏的 Markdown 编辑场景，如管理后台的活动详情编辑。

Props：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `string` | - | 编辑器内容 |
| `onChange` | `(value: string) => void` | - | 内容变更回调 |
| `placeholder` | `string`（可选） | - | 占位文本 |
| `rows` | `number`（可选） | `12` | 编辑区行数 |
| `textareaClassName` | `string`（可选） | - | textarea 额外样式 |
| `className` | `string`（可选） | - | 容器额外样式 |

使用示例：

```tsx
import { MarkdownEditorBase } from '@/modules/community/ui/community-markdown-editor-base';

<MarkdownEditorBase
  value={eventDetailMarkdown}
  onChange={setEventDetailMarkdown}
  placeholder="输入活动详情..."
  rows={10}
/>
```

---

### 2.3 MarkdownEditor - 完整编辑器

文件：`src/modules/community/ui/community-markdown-editor.tsx`

定位：社区发主题 / 回复的完整编辑器。

继承关系：基于 `MarkdownEditorBase`，额外提供工具栏和图片上传。

工具栏按钮：

| 按钮 | 功能 | Markdown 语法 |
|------|------|--------------|
| `B` | 加粗 | `**text**` |
| `I` | 斜体 | `*text*` |
| `S` | 删除线 | `~~text~~` |
| `H` | 标题 | `## text` |
| 链接 | 插入链接 | `[text](url)` |
| `</>` | 行内代码 | `` `code` `` |
| `{ }` | 代码块 | ```` ``` ```` |
| `"` | 引用 | `> text` |
| `-` | 无序列表 | `- item` |
| `1.` | 有序列表 | `1. item` |

图片上传：调用 `/api/community/community/upload`，支持 JPEG / PNG / WebP / GIF，限制 5MB。

Props：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `value` | `string` | - | 编辑器内容 |
| `onChange` | `(value: string) => void` | - | 内容变更回调 |
| `placeholder` | `string`（可选） | - | 占位文本 |
| `minHeight` | `string`（可选） | `'280px'` | 编辑区最小高度 |
| `className` | `string`（可选） | - | 容器额外样式 |

使用示例：

```tsx
import { MarkdownEditor } from '@/modules/community/ui/community-markdown-editor';

<MarkdownEditor
  value={content}
  onChange={setContent}
  placeholder="写下你的想法..."
  minHeight="320px"
/>
```

---

## 三、使用场景对照表

| 场景 | 页面 / 组件 | 使用组件 |
|------|-----------|---------|
| 社区发帖 | `/community/community/new` | `MarkdownEditor` |
| 编辑主题 | `/community/community/[category]/[topicId]` | `MarkdownEditor` |
| 撰写回复 | `/community/community/[category]/[topicId]` | `MarkdownEditor` |
| 活动详情编辑 | `/admin`（活动创建 / 编辑弹窗） | `MarkdownEditorBase` |
| 主题正文渲染 | `/community/community/[category]/[topicId]` | `MarkdownRenderer` |
| 回复内容渲染 | `reply-item.tsx` | `MarkdownRenderer` |

## 四、内容长度限制

内容长度限制统一在 `src/shared/utils/ui-constants.ts` 的 `FORM_LIMITS` 中定义：

| 常量 | 值 | 适用范围 |
|------|-----|---------|
| `COMMUNITY_MARKDOWN_MIN` | `10` | 社区发帖最小长度 |
| `COMMUNITY_MARKDOWN_MAX` | `20000` | 社区主题 / 回复最大长度 |
| `EVENT_MARKDOWN_MAX` | `10000` | 活动详情最大长度 |

## 五、已知待统一项

[events/[id]/page.tsx](../../src/app/events/[id]/page.tsx) 活动详情页当前直接使用原始 `ReactMarkdown` + `remarkGfm`，未使用项目封装的 `MarkdownRenderer`，也没有配置 `rehype-sanitize` 安全过滤。后续迭代建议统一替换为 `MarkdownRenderer`。

## 六、新增页面接入指南

1. 纯展示 Markdown 内容 -> 使用 `MarkdownRenderer`，已含安全过滤和代码高亮
2. 带编辑预览的编辑器 + 不需要工具栏 -> 使用 `MarkdownEditorBase`
3. 完整编辑器 + 工具栏 + 图片上传 -> 使用 `MarkdownEditor`
4. 所有组件均接收 `className` 以适配不同页面的样式需求
