# 悬浮折叠胶囊 · Tab 配置与设计决策（capsule-tabs）

> 类型：data + decision｜更新人：3yearsZ｜最后更新：2026-08-09
> 关联：胶囊设计规范见 [FrontDoc-UID.md](FrontDoc-UID.md) §4；组件接口见 §4.5；与 Hero 联动见 §4.6。
> 变更触发：新增/下线带胶囊导航的页面时，须同步更新 §1 表格。
> Stale 信号：§1 表格与实际页面 `tabs` 配置不一致。

本文件承载随页面增减**高频变动**的 Tab 配置数据，以及胶囊设计决策的「未采用」备选方案，避免膨胀 UID 主文档。

---

## 1. 各页面 Tab 配置表

各页面在 `FloatingCapsuleSidebar` 传入 `CapsuleTab[]`（接口见 UID §4.5）。下表为当前全站配置：

| 路由 | 页面 | Tab 列表 |
|------|------|---------|
| `/community/community` | 社区首页 | `[01] 最近 / Latest`, `[02] 发现 / Discover` |
| `/community/community/[category]` | 版块详情 | `[01] 主题 / Topics`, `[02] 规则 / Rules`, `[03] 下一步 / Next` |
| `/community/community/[category]/[topicId]` | 主题详情 | `[01] 回复 / Replies`, `[02] 你的回复 / Reply` |
| `/about` | 关于 / 加入 | `[01] 信念 / Belief`, `[02] 方向 / Directions`, `[03] 期望 / Expectation`, `[04] 流程 / Process`, `[05] 加入 / Join` |
| `/events` | 活动 | `[01] 时间线 / Timeline`, `[02] 归档 / Archive`, `[03] 下一步 / Next` |
| `/profile` | 个人主页 | `[01] 资料 / Profile`, `[02] 安全 / Security`, `[03] 活动 / Activity`, `[04] 社区 / Community` |
| `/admin` | 管理后台 | `[01] 用户 / Users`, `[02] 活动 / Activities`, `[03] 通知 / Notifications`, `[04] 社区 / Community`, `[05] 工具 / Tools` |
| `/tools` | 工具集 | `[01] 可用`, `[02] 即将上线`, `[03] 规划中` |
| `/tools/resource` | 资源站 | `[00] 全部`, `[01] 文章`, `[02] 视频`, … |

> 新增页面须同步本表，并在 `FloatingCapsuleSidebar` 配置 `CapsuleTab`（编号 `num` + 标签 `label` + 唯一 `key`）。

---

## 2. 设计决策：未采用备选方案

胶囊导航在定型前评估过两种备选方案，记录如下以备追溯（最终采用 Floating Capsule Sidebar，见 UID §4）。

### 2.1 Scheme A - 可伸缩抽屉式（Sliding Drawer）

折叠态 56px 仅显示编号，hover 展开至 200px。
- 优点：实现极简，直觉性强，不破坏 12 栏栅格
- 缺点：仍占用布局空间，hover 触发展开在移动端无效
- 适用：Tab 较多（≥5 项）、需要快速识别当前区域

### 2.2 Scheme C - 磁吸边缘标签（Magnetic Edge Tabs）

标签吸附在左边缘，仅露出半截编号 pill（~28px），hover 时标签向外弹出。
- 优点：极致节省空间
- 缺点：标签太小（28px），移动端几乎无法触控
- 适用：极简主义工具型页面，桌面端为主

> 结论：Scheme A/C 均因「占用布局空间」或「移动端不可触控」被否决；Floating Capsule Sidebar 脱离文档流、始终悬浮可达、折叠态仅编号，兼顾极简美学与键盘可达性（UID §4.1）。
