# FZTBUCS-PG-Migration-数据库迁移脚本使用说明

> 文档定位：SQLite -> PostgreSQL 数据迁移脚本的使用与注意事项（how-to + runbook）
> 受众：前端维护者 / 后端迁移实施者 / 发布决策者
> Source of truth：迁移脚本 `tools/scripts/migrate-sqlite-to-pg.mjs` 的唯一权威使用文档
> 关联：数据库双引擎演进与迁移规划见 [FrontDoc-Evo.md](FrontDoc-Evo.md) Part B；运维/回滚见 [FrontDoc-Ops.md](FrontDoc-Ops.md)；架构见 [FrontDoc-Arch.md](FrontDoc-Arch.md)
> 最后更新：2026-08-05（统一 FrontDoc 命名）
> 更新人：3yearsZ
> 变更触发：迁移脚本参数/行为变更、字段映射变更、新增被迁移表
> Stale 信号：脚本路径/参数与本文不一致、表清单与脚本不符

---

## 一、脚本用途

将旧前端单体库 `data/app.db`（SQLite）的业务数据迁移到后端 PostgreSQL（默认库 `domefff`）。

**为什么不能直导**：SQLite 主键为 TEXT/UUID，PG 为 Integer 自增；脚本必须建立「UUID -> Integer」映射、按外键依赖序逐层导入，并处理认证字段与类型转换。详见 [FrontDoc-Evo.md](FrontDoc-Evo.md) Part B。

**文件位置**：`tools/scripts/migrate-sqlite-to-pg.mjs`（Node ESM，依赖 `better-sqlite3` + `postgres`）。

---

## 二、用法

```bash
cd CS-Web-Frontend

# 完整迁移（推荐：RESET=1 清空业务表后重导，保证幂等、结果一致）
PGHOST=localhost PGPORT=5432 PGDATABASE=domefff PGUSER=postgres PGPASSWORD=xxx \
RESET=1 node tools/scripts/migrate-sqlite-to-pg.mjs

# DRY RUN（只打印计划与连接检查，不写库）
PGHOST=localhost ... DRY_RUN=1 node tools/scripts/migrate-sqlite-to-pg.mjs

# 增量/幂等运行（不 RESET，已导入的按唯一约束跳过）
PGHOST=localhost ... node tools/scripts/migrate-sqlite-to-pg.mjs
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SQLITE_DB_PATH` | `data/app.db`（相对脚本） | SQLite 源库路径 |
| `PGHOST` | `localhost` | PG 主机 |
| `PGPORT` | `5432` | PG 端口 |
| `PGDATABASE` | `domefff` | PG 目标库名 |
| `PGUSER` / `PGPASSWORD` | `postgres` / 空 | PG 连接凭据 |
| `DRY_RUN` | 关 | `1` 时只预览不写库 |
| `RESET` | 关 | `1` 时迁移前清空全部业务表（保留 `roles`/`users` 种子）后重导 |

---

## 三、迁移范围与取舍

### 3.1 会迁移的表（业务数据，行数与 SQLite 一致）

| 模块 | 表 |
|------|----|
| 用户/认证 | users、user_roles、two_factor_auth |
| 社区 | community_categories、community_posts、community_comments |
| 活动 | events、event_registrations |
| 考试 | exams、exam_questions、exam_question_options |
| 资源/组件 | resources、component_registry_items / _variants / _guides |
| 其他 | notifications、join_applications、announcements、tasks、task_claims、points_transactions、settings |

### 3.2 明确舍弃（PG 无对应表或低价值）

- `sessions` / `login_history`：PG 用 JWT，无此表，**旧登录态作废，用户需重新登录**
- `admin_actions`：审计操作痕迹，低价值，并入 PG `audit_logs`（不做逐条映射）
- FTS 虚拟表（`community_posts_fts*`）：SQLite 专属，PG 用 ILIKE/GIN，数据在主表已保留
- `resource-files/` 下的 6 个 4 字节空壳文件：无可迁移内容

---

## 四、关键实现与注意事项（踩坑记录）

### 4.1 主键重映射（最高风险）
- 全部 UUID/TEXT 主键 -> PG Integer 自增序列，脚本在内存维护 `UUID->Integer` 映射。
- **19 张表**含 `user_id`/`author_id` 外键，须按映射回填；否则外键悬空。
- 导入顺序严格按外键依赖：roles -> users -> categories -> posts -> comments -> events -> exams -> resources -> component -> 其余。

### 4.2 认证字段差异
- SQLite `users.role` 单列 -> PG `user_roles` 多对多（`admin`->admin、`user`->user）。
- `root` 角色：PG 无此角色 -> 映射为 `is_superuser=true` + 挂 `admin` 角色。
- `username`：SQLite 无此字段，由 email 前缀/display_name 派生，冲突自动加 `_1` 后缀。
- 密码：scrypt 哈希**原样搬移**，登录时后端 `password_compat` 懒升级为 bcrypt（零停机）。

### 4.3 类型转换
- Integer 布尔 0/1 -> PG `boolean`
- ISO / `YYYY-MM-DD HH:MM:SS` 日期 -> PG `timestamptz`
- JSON 文本（`'[]'`）-> PG `jsonb`
- 组件注册表：SQLite `item.id` 是 `cmp-button` 形式（**≠ slug**，slug 是 `button`），variants/guides 的 `item_id` 引用的是 **id** 而非 slug -- 脚本按 `item.id` 回填，勿误用 slug。

### 4.4 论坛图片 URL 重写
- 旧前端论坛图 URL 为 `/api/forum/images/`，后端为 `/api/community/forum/images/`。
- 脚本会自动将 `content_markdown` 中的 `/api/forum/images/` 重写为 `/api/community/forum/images/`。

### 4.5 幂等与 RESET
- users 按 email 去重；component 按 slug/唯一约束去重。
- `RESET=1` 会 `TRUNCATE` 业务表（**仅 PG 中确实存在的表**；`sessions`/`login_history` 不在 RESET 列表，因为它们未迁移到 PG）`RESTART IDENTITY CASCADE`，保留 `roles`/`users` 种子后重导。
- RESET 后必须为「已存在用户」补登记 PG id 映射，否则后续外键悬空（脚本已处理）。

### 4.6 events 列表字段必须为 `[]` 而非 `null`
- PG `events.tags/topics/registration_fields` 为 jsonb 可存 `null`，但后端 `EventOut` 定义为 `List[str] = []`（非 Optional），`null` 会导致活动列表/详情接口响应校验 422。
- 脚本已用 `toJson(e.x, [])` 兜底为空数组；勿改用 `null` 兜底。

---

## 五、静态资源迁移与迁移后验证

> ℹ️ 待办条目（静态资源手动复制、迁移后验证清单）已迁移至根目录 `项目待办事项.md`。

---

## 七、关联文档

- 迁移规划 / 双引擎演进：`tools/docs/FrontDoc-Evo.md` Part B
- 运维 / 回滚流程：`tools/docs/FrontDoc-Ops.md`
- 后端迁移计划与验证：`CS-Web-Backend/docs/BackDoc-MigV.md`（含 Phase 6 迁移脚本规划与执行验证）
- 迁移执行记录：`数据迁移执行记录.md`（仓库根）
