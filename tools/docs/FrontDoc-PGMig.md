# FZTBUCS-PG-Migration-数据库迁移记录（已归档）

> 文档定位：SQLite -> PostgreSQL 数据迁移的历史记录与踩坑归档（**迁移已 100% 完成，脚本已删除**）
> 受众：后续维护者 / 历史审计
> 状态：✅ **已归档**（2026-08-07）。迁移已于 2026-08-05 执行完成（19 张表全量入库）；迁移脚本 `tools/scripts/migrate-sqlite-to-pg.mjs` 与前端全部 SQLite 依赖（`better-sqlite3`）已于 2026-08-07 随清理删除。如需重跑（不应发生），可从 git 历史恢复脚本并临时安装依赖。
> 关联：数据库双引擎演进与迁移规划见 [FrontDoc-Evo.md](../../../docs/项目演变历史-0.9.1.md#附录前端演进路线图与迁移文档原-frontdocevomd) Part B；架构见 [FrontDoc-01-Arch.md](FrontDoc-01-Arch.md)
> 最后更新：2026-08-07（归档为历史记录）
> 更新人：3yearsZ

---

## 一、迁移历史概述

旧前端单体库 `data/app.db`（SQLite）的业务数据于 2026-08-05 迁移至后端 PostgreSQL（库 `domefff`）。

**为什么不能直导**：SQLite 主键为 TEXT/UUID，PG 为 Integer 自增；迁移脚本建立了「UUID -> Integer」映射、按外键依赖序逐层导入，并处理认证字段与类型转换。详见 [FrontDoc-Evo.md](../../../docs/项目演变历史-0.9.1.md#附录前端演进路线图与迁移文档原-frontdocevomd) Part B。

**迁移结果**：19 张表全量入库，外键完整、类型转换正确、静态资源已随迁；执行记录见 `数据迁移执行记录.md`（仓库根）。

---

## 二、迁移范围与取舍

### 2.1 会迁移的表（业务数据，行数与 SQLite 一致）

| 模块 | 表 |
|------|----|
| 用户/认证 | users、user_roles、two_factor_auth |
| 社区 | community_categories、community_posts、community_comments |
| 活动 | events、event_registrations |
| 考试 | exams、exam_questions、exam_question_options |
| 资源/组件 | resources、component_registry_items / _variants / _guides |
| 其他 | notifications、join_applications、announcements、tasks、task_claims、points_transactions、settings |

### 2.2 明确舍弃（PG 无对应表或低价值）

- `sessions` / `login_history`：PG 用 JWT，无此表，**旧登录态作废，用户需重新登录**
- `admin_actions`：审计操作痕迹，低价值，并入 PG `audit_logs`（不做逐条映射）
- FTS 虚拟表（`community_posts_fts*`）：SQLite 专属，PG 用 ILIKE/GIN，数据在主表已保留
- `resource-files/` 下的 6 个 4 字节空壳文件：无可迁移内容

---

## 三、关键实现与注意事项（踩坑记录）

### 3.1 主键重映射（最高风险）
- 全部 UUID/TEXT 主键 -> PG Integer 自增序列，脚本在内存维护 `UUID->Integer` 映射。
- **19 张表**含 `user_id`/`author_id` 外键，须按映射回填；否则外键悬空。
- 导入顺序严格按外键依赖：roles -> users -> categories -> posts -> comments -> events -> exams -> resources -> component -> 其余。

### 3.2 认证字段差异
- SQLite `users.role` 单列 -> PG `user_roles` 多对多（`admin`->admin、`user`->user）。
- `root` 角色：PG 无此角色 -> 映射为 `is_superuser=true` + 挂 `admin` 角色。
- `username`：SQLite 无此字段，由 email 前缀/display_name 派生，冲突自动加 `_1` 后缀。
- 密码：scrypt 哈希**原样搬移**，登录时后端 `password_compat` 懒升级为 bcrypt（零停机）。

### 3.3 类型转换
- Integer 布尔 0/1 -> PG `boolean`
- ISO / `YYYY-MM-DD HH:MM:SS` 日期 -> PG `timestamptz`
- JSON 文本（`'[]'`）-> PG `jsonb`
- 组件注册表：SQLite `item.id` 是 `cmp-button` 形式（**≠ slug**，slug 是 `button`），variants/guides 的 `item_id` 引用的是 **id** 而非 slug -- 脚本按 `item.id` 回填，勿误用 slug。

### 3.4 社区图片 URL 重写
- 旧前端社区图 URL 为 `/api/community/images/`，后端为 `/api/community/community/images/`。
- 脚本会自动将 `content_markdown` 中的 `/api/community/images/` 重写为 `/api/community/community/images/`。

### 3.5 幂等与 RESET
- users 按 email 去重；component 按 slug/唯一约束去重。
- `RESET=1` 会 `TRUNCATE` 业务表（**仅 PG 中确实存在的表**；`sessions`/`login_history` 不在 RESET 列表，因为它们未迁移到 PG）`RESTART IDENTITY CASCADE`，保留 `roles`/`users` 种子后重导。
- RESET 后必须为「已存在用户」补登记 PG id 映射，否则后续外键悬空（脚本已处理）。

### 3.6 events 列表字段必须为 `[]` 而非 `null`
- PG `events.tags/topics/registration_fields` 为 jsonb 可存 `null`，但后端 `EventOut` 定义为 `List[str] = []`（非 Optional），`null` 会导致活动列表/详情接口响应校验 422。
- 脚本已用 `toJson(e.x, [])` 兜底为空数组；勿改用 `null` 兜底。

---

## 四、静态资源迁移与迁移后验证

> ℹ️ 待办条目（静态资源手动复制、迁移后验证清单）已迁移至 `docs/项目待办事项.md`。

---

## 五、关联文档

- 迁移规划 / 双引擎演进：`docs/项目演变历史-0.9.1.md` 附录 Part B（原 FrontDoc-Evo.md）
- 运维 / 回滚流程：`tools/docs/FrontDoc-Ops.md`
- 后端迁移计划与验证：`CS-Web-Backend/tools/docs/BackDoc-Infra.md` §六 迁移验证（原 `BackDoc-MigV.md` 已并入）
- 迁移执行记录：`数据迁移执行记录.md`（仓库根）
