# Changelog

本文件记录 FZTBU CS 项目的所有显著变更。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [0.9.1] — 2026-07-31

首个预发布版本（1.0 候选）。面向 FZTBU CS 学生的全栈社区平台，功能完整，运维与发布准备进行中。

### Added

#### 功能
- 论坛系统：版块 → 主题 → 回复 → 楼中楼，Markdown 编辑，点赞/收藏，@提及，搜索
- 博客/技术文章系统：Markdown 发布，系列管理，目录导航
- 内网考试系统：选择题 + 自动判分 + 排名，管理员组卷
- 学习资源站：分类浏览，提交审核，文件上传
- 协会任务发布页：任务领取，审核，积分联动
- Auxilio 学习成长 Agent：规则引擎，考试数据 → 薄弱标签 → 资源推荐
- 活动系统：CRUD，报名表单定制，签到码核销，自动归档，月历视图（ADR-016）
- 用户公开主页 + 技术档案：技术方向标签，活动参与记录，论坛/博客统计
- 成员名录/技术墙：按技术方向筛选
- 入社申请线上化：提交 → 审批 → 自动开通账号
- 全站公告/置顶：横幅展示，有效期，角色定向
- 站内通知系统：事件驱动，已读/未读管理

#### 安全
- TOTP 双因素认证（管理员强制，ADR-015）
- GitHub OAuth 登录（已启用 2FA 者强制二次验证，ADR-015）
- 密码策略升级：最小 8 位 + 复杂度校验 + 弱密码黑名单 + 历史密码复用检测（M6）
- 细粒度 RBAC：content_moderator / exam_admin / task_publisher
- 全站安全响应头：CSP nonce 化（F2）/ HSTS / X-Frame-Options / Referrer-Policy / Permissions-Policy
- 速率限制精细化：考试提交 / 资源上传 / 论坛操作 / 2FA 端点
- 敏感数据脱敏：email/phone/name/studentId（M7）
- SQL 注入全面审计（100% prepared statement）
- 统一输入验证框架（zod）
- Markdown 渲染白名单净化（rehype-sanitize）
- 对象级权限（IDOR 防护）
- 登录历史与异常告警（login_history 表）
- 会话管理增强（设备列表、远程登出）
- 高危操作二次确认（密码二次确认守卫）
- 依赖漏洞扫描命令可用（`pnpm audit` 可执行，CI 集成见 Q4）
- 2FA 预认证 token 防重放（消除密码二次传输，ADR-015）
- TOTP 密钥 HKDF-SHA256 派生（由 `AUTH_SESSION_SECRET` 派生，替换硬编码/SHA-256，无需独立加密变量）
- Cookie `__Host-` 前缀（生产 `__Host-auth_session`，防 cookie 注入）
- 论坛图片读取端点 session 访问控制（未登录返回 401）
- 安全审计日志增强

#### 架构与工程质量
- 模块化架构：9 个模块（auth/user/community/events/tools/notification/admin/announcement/shared），server/types/ui 三层自洽
- 事件总线跨模块通信（appBus）
- Litestream 流式备份（PITR < 1s 数据丢失窗口）
- pino 结构化日志（NDJSON + requestId 链路，Q4）
- 健康检查端点（`/api/health`，Q5）
- 请求 ID 注入（server.ts + proxy.ts，Q6）
- 错误率监控告警（error-rate-monitor，1.0 SLO 告警）
- 可选 Sentry 接入（SENTRY_DSN 环境变量驱动，动态 import）
- SLO 定义与 error budget 管理（现合并于 Devdocs-Ops.md Part B）
- 运维 runbook（现合并于 Devdocs-Ops.md Part C）
- Litestream restore drill 脚本（tools/scripts/restore-drill.sh）
- k6 负载测试脚本（tools/tests/load/k6-load-test.js）
- CI 集成 build 验证 + 依赖审计（pnpm audit --prod）
- 业务模块单元测试 308 条（events/exam/resource/task/join/announcement）
- E2E 业务流程断言 25 条（Playwright）
- API 集成测试（安全/权限/积分核心链路）
- 数据库迁移工具（自定义 migration 系统，双 dialect 兼容）
- Repository 抽象层（ADR-009：服务层经 Repository 访问数据，为 PostgreSQL 双引擎切换铺路）
- 用户等级/积分系统（联动任务 + 考试 + 活动）
- 共享审核工作流提取（`shared/workflow` 状态机：pending/approved/rejected/archived）
- 组件扁平化与子目录拆分（primitives/layout/effects/feedback）+ `shared` 子目录 barrel 统一导出
- Git hooks + CI 流水线（build 验证 + 依赖审计 + 密钥缺失即退出）
- 441+ 单元测试全绿

### Changed
- 统一错误处理模式：全站服务层抛 `AppError`，路由层 `errorResponse` 映射状态码（Q2）
- 提取 EASE 动画常量（Q3）
- 19 个页面统一使用 CollapsingHero（F1）
- 安全头迁移至 proxy.ts 统一入口（F3）
- server-only 边界澄清：19 个模块加标记 + 本地空实现兼容自定义 dev server（ADR-010）
- `AuditContext` 类型下沉至 shared/types，斩断 server-only 依赖链
- 论坛/博客/成员模块合并为 community（flat 结构，server/types/ui 三层自洽）
- App 路由重组：`/forum/*`→`/community/forum/*`、`/blog/*`→`/community/blog/*`、`/members`→`/community/members`
- API 路由重组：`/api/forum/*`→`/api/community/forum/*` 等
- 类型统一定义：ForumTopic/BlogPost/MemberItem/FeedItem 收敛至 `community/types/index.ts`
- 文件结构精简：`tests/scripts/deploy/dev-docs`→`tools/`；`shared/ui/`→`components/ui/`
- Sentry 依赖移除：`@sentry/nextjs` 未安装，`monitoring.ts` 基于 pino，可选接入
- `template.tsx` 删除（无实际逻辑的直通透传）
- `security.test.ts` 迁移：`shared/`→`tools/tests/`
- 未使用 import 清理：`resource/index.ts` 移除冗余 `TECH_TAGS`
- Q1 TopicDetail 拆分：主组件 < 200 行，拆出 `TopicHero`/`TopicContent`/`TopicReplySection` + `useTopicActions`/`useReplyActions`
- 生产启动强制校验：`AUTH_SESSION_SECRET`/`ALLOWED_ORIGINS` 缺失即 `process.exit(1)` 拒绝启动（2FA TOTP 密钥由 `AUTH_SESSION_SECRET` 经 HKDF-SHA256 派生，无需独立变量）
- 模块级权限守卫 `requireModuleAdmin(req, module)` 落地（forum/exam/task 共 19 路由）

### Fixed
- events.date 自由格式与 ISO 时间戳字典序比较缺陷（ADR-016）
- 跨模块日期格式比较缺陷：announcements.expires_at / sessions.expires_at / admin_actions.created_at（ADR-017）
- 2FA 端点缺少限流 + Origin 校验（ADR-015）
- GitHub OAuth 绕过 2FA（ADR-015）
- 密码重置多步操作未包事务致旧 session 残留（ADR-015）
- 默认重置密码硬编码弱口令（ADR-015）
- events 表迁移未包事务（ADR-015）
- 启动失败与未处理 rejection 无结构化日志（ADR-015）
- 事件监听器隐式初始化致通知静默失效（ADR-013）

### Infrastructure
- Docker + Caddy 部署方案（自动 HTTPS）
- Litestream 本地/S3 备份
- Cloudflare Tunnel 内网穿透（开发调试）

### Documentation
- Devdocs-Ops.md（合并原 Devdocs-slo.md + Devdocs-runbook.md + Devdocs-deployment-guide.md：部署指南 + SLO 与错误预算 + 运维 Runbook）
- Devdocs-onboarding-guide.md（合并原 Devdocs-project-rules.md，含「反复出现的错误与防再犯清单」7 类根因）
- ADR 记录 19 条（ADR-001 ~ ADR-019），全部已实施
  - ADR-019：内容审核工作流抽象（pending/approved/rejected/archived，2026-07-31）
- 风险登记表 R1-R20
- Devdocs-Arch.md：整合架构文档与 API 接口参考（合并 Devdocs-architecture.md + Devdocs-api-reference.md）

### Known Limitations
- 单实例部署（EX-1 风险接受：用户量 < 200 活跃时接受单点故障）
- 外部监控探针未接入（R18：可用性 SLI 降级为应用层日志统计）
- 数据保留策略需手动执行（L9 定时任务待实现）
- audit 失败不阻塞 CI（R19：1.0 阶段仅警告）

---

## 版本号规则

- **主版本号（X.0.0）**：不兼容的 API 变更或重大架构调整
- **次版本号（0.X.0）**：向下兼容的功能新增
- **修订号（0.9.X）**：向下兼容的 bug 修复

## 链接

[0.9.1]: https://github.com/your-org/fztbucs-projects/releases/tag/v0.9.1
