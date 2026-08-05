# src/modules — 业务域模块

> 遵循 `../../docs/RootDoc-FEArch.md`（按业务域模块化，3.4）。
> 每个业务域自包含 `server/ types/ ui/` 三层，域内复用就地建子目录，不往外推。

## 域清单

| 目录 | 业务域 | 说明 |
|------|--------|------|
| `admin/` | 管理员后台 | 用户/角色/事件/公告/日志/消息管理面板（含 `ui/shared` 通用件） |
| `auth/` | 认证 | 2FA、登录相关 UI 与逻辑 |
| `announcement/` | 公告 | 公告管理 UI |
| `community/` | 社区 | 论坛帖子/回复/版块/举报 + 管理员论坛面板（forum-admin） |
| `events/` | 活动 | 活动日历/卡片/筛选 |
| `join/` | 报名 | 加入/报名流程 |
| `notification/` | 通知 | 通知相关 |
| `tools/` | 工具集 | 资源/考试/任务管理（含管理员工具面板） |
| `user/` | 用户 | 用户资料类型与逻辑 |

## 目录即模块约定

- 每域 `server/`（数据访问，与 UI 解耦）`types/`（集中类型）`ui/`（组件）
- 域内复用 Hook 落 `ui/hooks/`；`ui/` 建议补 `index.ts` 桶导出（GENERAL 3.3）
- 复杂面板（如 admin 各 panel）已按 GENERAL 2.4 拆分为独立子组件，主文件 < 500 行

## 约束

- 跨 ≥ 2 域复用才提 `components/`，禁止为单一功能散建新目录（GENERAL 6.1）
- 类型优先 `types/`，避免巨型单文件（GENERAL 3.7）
- 逻辑 > 150 行提为域内 `hooks/` 或 `useXxx.ts`（GENERAL 2.4）
