# FZTBUCS-前端工具文档索引（tools/docs）

> 最后更新：2026-08-07｜类型：index / map
> 更新人：3yearsZ
> 受众：前端贡献者 / reviewer / oncall
> Source of truth：本目录（`CS-Web-Frontend/tools/docs/`）下所有前端工程文档的**统一入口与命名约束**唯一权威位置。
> 关联：全栈部署/编排见根 [docs/RootDoc-Deploy.md](../../../docs/RootDoc-Deploy.md)；后端文档见 [CS-Web-Backend/docs/](../../CS-Web-Backend/docs/)；工程规则见根级 [docs/Onboarding.md](../../../docs/Onboarding.md#附录-a前端工程规则)
> 变更触发：新增/重命名/废弃本目录下任一文档时，须同步更新本索引。
> Stale 信号：本索引列出的文件不存在 / 存在未列出的 `.md` / 文档"类型"标签与实际不符。

## 命名约束

- 文件名固定前缀 `FrontDoc-`，后缀用 `-<主题>` 表意（如 `-Ops`、`-Sec`、`-Arch`）。
- 每个文档头部须含"最后更新 / 更新人 / 类型 / Source of truth / 关联 / 变更触发 / Stale 信号"八项元信息（参考现有文档）。
- 通用规范（跨仓库）以根级 `docs/RootDoc-*` 为准，本文档**不重复**，仅以链接引用（避免分叉）。
- 后端职责（PG 备份、Alembic、Litestream、后端运维端点等）不在此目录展开，指向 `CS-Web-Backend/docs/`。

## 文档清单

| 文件 | 主题 | 类型 | 说明 |
|------|------|------|------|
| [FrontDoc-Arch.md](FrontDoc-Arch.md) | 架构 | reference | 前端 BFF 架构、分层、数据流 |
| [FrontDoc-Evo.md](FrontDoc-Evo.md) | 演进 / ADR | reference + decision | 重大架构决策记录与演进史 |
| [FrontDoc-i18n.md](FrontDoc-i18n.md) | 国际化 | how-to + reference | next-intl 约定、namespace、翻译流程 |
| [FrontDoc-MDE.md](FrontDoc-MDE.md) | Markdown 编辑 | how-to | 富文本 / Markdown 处理约定 |
| [FrontDoc-Ops.md](FrontDoc-Ops.md) | 运维 / SLO | reference + how-to | BFF 部署、SLO 阈值、回滚 Runbook |
| [FrontDoc-PGMig.md](FrontDoc-PGMig.md) | PG 迁移 | how-to | 与后端 Alembic 对接的迁移操作 |
| [FrontDoc-Sec.md](FrontDoc-Sec.md) | 安全 | reference | 前端安全约束、CSP、Origin 校验 |
| [FrontDoc-UID.md](FrontDoc-UID.md) | UI 设计 | reference | 组件、布局、设计 token 约定 |

## 如何新增文档

1. 以 `FrontDoc-<主题>.md` 命名，放本目录。
2. 复制任一现有文档头部八项元信息并填空。
3. 在本索引"文档清单"追加一行。
4. 若内容涉及跨仓库通用规范，改为链根级 `RootDoc-*` / 后端 `BackDoc-*`，不要在此复制。
