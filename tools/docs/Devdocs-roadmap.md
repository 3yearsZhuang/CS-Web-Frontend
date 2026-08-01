# 迭代路线图

> 最后更新：2026-07-31（0.9.1 预发布：SLO + alerting + load test + restore drill + runbook + rollback + CI 加固 + EX-1 风险接受 + ADR-018）
> 验证 cadence：里程碑结束时 | stale 信号：ADR 状态与实施记录不一致、风险等级未随修复更新、SLO 月度 review 未执行

---

## 一、已完成（2026-07）

### 功能

- [x] 论坛系统（版块 -> 主题 -> 回复 -> 楼中楼、Markdown 编辑、点赞/收藏、@提及、搜索）
- [x] 博客/技术文章系统（Markdown 发布、系列管理、目录导航）
- [x] 内网考试系统（选择题 + 自动判分 + 排名、管理员组卷）
- [x] 学习资源站（分类浏览、提交审核、文件上传）
- [x] 协会任务发布页（任务领取、审核、积分联动）
- [x] Auxilio 学习成长 Agent（规则引擎，考试数据 -> 薄弱标签 -> 资源推荐）
- [x] 活动系统（CRUD、报名表单定制、签到码核销、自动归档、分类标签）
- [x] 用户公开主页 + 技术档案（技术方向标签、活动参与记录、论坛/博客统计）
- [x] 成员名录/技术墙（按技术方向筛选）
- [x] 入社申请线上化（提交 -> 审批 -> 自动开通账号）
- [x] 全站公告/置顶（横幅展示、有效期、角色定向）
- [x] 站内通知系统（事件驱动、已读/未读管理）

### 安全

- [x] SQL 注入全面审计（100% prepared statement）
- [x] 统一输入验证框架（zod）
- [x] Markdown 渲染白名单净化（rehype-sanitize）
- [x] 对象级权限（IDOR 防护）
- [x] 登录历史与异常告警
- [x] 会话管理增强（设备列表、远程登出）
- [x] 高危操作二次确认
- [x] 安全审计日志增强
- [x] 依赖漏洞扫描命令可用（`pnpm audit` 可执行，CI 集成见 Q4 里程碑）
- [x] 细粒度 RBAC 权限模型（content_moderator / exam_admin / task_publisher）
- [x] 速率限制精细化（考试提交 / 资源上传 / 论坛操作）
- [x] TOTP 双因素认证（管理员强制）
- [x] 全站安全响应头（CSP / HSTS / X-Frame-Options / Referrer-Policy / Permissions-Policy）

### 架构与工程质量

- [x] Litestream 流式备份
- [x] 数据库迁移工具（自定义 migration 系统）
- [x] 模块化架构（9 个模块，server/types/ui 三层自洽）
- [x] 社区模块扁平合并（forum + blog + members -> community）
- [x] E2E 测试覆盖（Playwright 页面加载级）
- [x] API 集成测试（安全/权限/积分核心链路）
- [x] Git hooks + CI 流水线
- [x] 用户等级/积分系统（联动任务 + 考试 + 活动）
- [x] 共享审核工作流提取
- [x] 组件扁平化（`components/ui/` -> `components/`）
- [x] 组件子目录拆分（primitives/layout/effects/feedback）
- [x] shared 子目录 barrel 统一导出（types/security/events/config/hooks/utils/db）
- [x] 业务模块单元测试全覆盖（M8：events 45 + exam 58 + resource 48 + task 63 + join 38 + announcement 56 = 308 测试）
- [x] E2E 业务流程断言（M9：25 个 Playwright 测试 + globalSetup 自动建号登录 + storageState 复用）
- [x] 密码策略升级（M6：PASSWORD_MIN_LENGTH 6->8 + 复杂度校验 + 弱密码黑名单 + password_history 表 v5 迁移 + 历史密码复用检测 + 15 个单元测试）

---

## 二、P0 收敛记录（2026-07 已清零）

> P0 = 阻塞可靠发布或运维盲区。所有 P0 项已于 2026-07 全部收敛，新增 P0 问题将重新开章。
> 收敛时间线：Q1-Q3（代码质量）-> Q4-Q6（可观测性）-> F1-F3（安全收紧）-> ADR-015 ~ ADR-017

### 代码质量

| # | 方向 | 说明 | 验收标准 |
|---|------|------|---------|
| Q1 | 拆分 TopicDetail 页面组件 ✅ | `app/community/forum/[category]/[topicId]/page.tsx` 过长 | ✅ 主组件 191 行 < 200；拆出 `TopicHero`/`TopicContent`/`TopicReplySection` + `useTopicActions`/`useReplyActions`/`useTopicDetail` |
| Q2 | 统一错误处理模式 ✅ | community/events/user/admin/auth/join/tools 模块统一 | ✅ 全站 ~89 处旧模式替换为 `AppError`；路由层 `errorResponse` 按 `ERROR_STATUS_MAP` 映射；补充 3 个缺失错误码 |
| Q3 | 提取 `EASE` 常量 ✅ | 19 个页面/组件 className 硬编码 cubic-bezier | ✅ 统一 `.hero-reveal` / `ease-[var(--ease-ark)]`；`globals.css` 8 处同步；功能代码零硬编码 |

### 可观测性（运维盲区，最高优先）

| # | 方向 | 说明 | 验收标准 |
|---|------|------|---------|
| Q4 | 结构化日志 ✅ | pino 统一日志，每条附 `requestId`；`server.ts` / 19 API 路由 / 服务层 `console.*` 全替换 | ✅ `shared/logger.ts` 封装，dev 用 pino-pretty，生产 NDJSON；`createRequestLogger(req)` 绑定 requestId |
| Q5 | 健康检查端点 ✅ | 无 `/api/health`，容器编排无法探活 | ✅ `/api/health` 返回 DB/磁盘/版本号；Caddy 健康检查接入 |
| Q6 | 请求 ID 注入 ✅ | `server.ts` 生成/复用 `X-Request-Id`，`proxy.ts` 写入响应头 | ✅ 客户端传入 ID 可复用于跨服务追踪 |

### 安全收紧

| # | 方向 | 说明 | 验收标准 |
|---|------|------|---------|
| F1 | 统一使用 CollapsingHero ✅ | 17 个页面逐步替换 | ✅ 19 个页面统一使用 `CollapsingHero`；首页（莫比乌斯环特殊布局）与 `/login`（居中卡片式）经评估不适用 |
| F2 | 生产 CSP 收紧 ✅ | `script-src` 含 `unsafe-inline`/`unsafe-eval` | ✅ `proxy.ts` 每请求生成 base64 nonce，`script-src` 改为 `'nonce-<random>'`，移除 `'unsafe-inline'`；`layout.tsx` 注入 nonce 到内联脚本 |
| F3 | proxy.ts 统一入口 ✅ | 安全头/限流/请求 ID 缺统一入口 | ✅ `proxy.ts` 统一安全头，`next.config` 仅兜底 `_next/static`；图片路由移除冗余头 |

---

## 三、中期规划（P1）

> P1 = 6-12 个月，提升用户体验与系统可维护性。

### 用户体验

| # | 方向 | 说明 | 风险/约束 |
|---|------|------|----------|
| M1 | 关注/好友系统 | 互相关注、动态流、私信（关注后才可私信） | 动态流需评估 SQLite 读负载 |
| M2 | Wiki/知识库 | 规章制度/FAQ/新人指南，多人协同编辑 | 复用社区 Markdown 编辑器 |
| M3 ✅ | 活动日历视图（2026-07-31 完成） | 月历/周日历展示活动 | 纯前端，无后端风险；详见 ADR-016 |
| M4 | 活动评价与反馈 | 活动结束后评分 + 文字评价 | 防刷分：限参与者一次评价 |
| M5 | 相册/活动回顾 | 活动照片上传、瀑布流展示 | 图片存储需评估磁盘容量 |

### 安全与合规

| # | 方向 | 说明 | 风险/约束 |
|---|------|------|----------|
| - | （当前无未完成的 P1 安全项） | ADR-015 已收敛全部 P0 安全漏洞，P1 安全项待 M10 Repository 抽象后评估 | - |

### 工程质量

| # | 方向 | 说明 | 风险/约束 |
|---|------|------|----------|
| M10 | Repository 抽象层 | 服务层直接持 better-sqlite3 | 抽象后便于未来换库与单测 mock；详见 ADR-009 |
| M11 ✅ | 客户端/服务端边界澄清（2026-07-31 完成） | `shared/` 混 server-only 与同构；hooks 在 shared 下 | 详见 ADR-010 |

---

## 四、远期探索（P2）

> P2 = 12+ 个月，需先解决前置依赖。

| # | 方向 | 说明 | 前置依赖 |
|---|------|------|---------|
| L1 | 内网聊天工具 | 站内实时消息 | 需评估用户量 + SQLite 写瓶颈，详见 ADR-005 |
| L2 | RSS/邮件订阅 | 活动更新、文章发布 RSS + 邮件通知 | 复用 `shared/utils/mail`，需队列防突发 |
| L3 | 多区域灾备 | 单节点 Docker，无区域容灾 | 需先完成 L4 Repository 抽象 |
| L4 | 外部监控接入 | Sentry/GlitchTip 接入 `monitoring.ts` | `isMonitoringEnabled` 已预留开关 |
| L5 | 性能埋点 | Web Vitals + API P95 上报 | 需先完成 Q4 结构化日志 |
| L6 | PWA 离线增强 | Service Worker 已注册，补离线缓存策略 | `sw.js` 已就绪，补缓存清单 |
| L7 | 数据归档冷存储 | 历史活动/论坛帖归档到只读表 | 需评估数据量增长曲线 |
| L8 | 未读通知 SSE 推送 | 替代客户端轮询，降低无效请求 | 需评估长连接成本，先完成 Q4 日志 |
| L9 | 定时任务系统 | 数据清理/归档从入口触发改为 cron | 评估 node-cron 或系统 crontab |

---

## 五、架构决策记录（ADR）

> ADR 遵循格式：状态 / 上下文（驱动力）/ 决策 / 替代方案 / 后果（正负面）/ 可逆性。

### ADR-001: /tools 作为独立模块目录

- 状态：已实施
- 上下文：工具集功能独立，但需复用用户/通知基础设施
- 决策：工具集独立模块，每个工具独立子目录（exam/resource/task/agent/points），共享用户系统与通知基础设施
- 替代方案：① 各工具独立顶层模块（拒绝：重复基础设施）② 工具集合并到 community（拒绝：职责膨胀）
- 后果：✅ 工具复用统一身份与通知；⚠️ tools 模块体积偏大，内部需按子目录隔离
- 可逆性：两向门，迁移成本低

### ADR-002: 资源站复用论坛审核模式

- 状态：已实施
- 上下文：资源站需审核状态机，论坛已有成熟实现
- 决策：独立 `resources` 表，审核状态机参考论坛 `status: 'draft'/'published'/'hidden'`，审计日志共用 `admin_actions`
- 替代方案：① 复用 forum 表（拒绝：语义混乱）② 独立审核表（拒绝：重复造轮）
- 后果：✅ 审核流程统一；⚠️ `admin_actions` 表跨模块共享，schema 变更需协调
- 可逆性：两向门

### ADR-003: 考试系统的存储与判题策略

- 状态：已实施
- 上下文：内网考试，选择题为主，无在线判题需求
- 决策：SQLite 存储题库/试卷/答卷，选择题自动判分；编程题暂不做在线编译
- 替代方案：① 接入在线判题（拒绝：运维成本高）② 外部考试系统（拒绝：数据隔离需求）
- 后果：✅ 零外部依赖；⚠️ 编程题需人工评阅
- 可逆性：两向门，未来可按需接入判题沙箱

### ADR-004: Auxilio Agent 的实现策略

- 状态：阶段 1 已实施（规则引擎）
- 上下文：学习推荐需个性化，但无 LLM 预算与外部 API
- 决策：规则引擎版本（考试结果 -> 薄弱标签 -> 资源推荐），零外部 API 依赖
- 替代方案：① 直接接 LLM（拒绝：成本+隐私）② 协同过滤（拒绝：冷启动数据不足）
- 后果：✅ 零成本可解释；⚠️ 推荐精度受规则覆盖度限制
- 可逆性：两向门，规则层可逐步替换为模型层

### ADR-005: 聊天系统的降级策略

- 状态：待决策（延迟评估）
- 上下文：实时聊天需长连接，SQLite 单写者瓶颈
- 决策：日活 > 50 且用户明确反馈需要时才启动。初期以留言板或论坛私信替代
- 替代方案：① 立即上 WebSocket（拒绝：单节点 SQLite 无法支撑）② 接入第三方 IM（拒绝：数据隔离）
- 后果：✅ 避免 SQLite 写瓶颈；⚠️ 用户实时性预期需管理
- 可逆性：单向门，启动后回退成本高

### ADR-006: 社区模块扁平合并

- 状态：已实施
- 上下文：forum/blog/members 三模块高度耦合，跨模块引用频繁
- 决策：合并为 community 统一模块，文件前缀标记来源，类型统一在 `community/types/index.ts`
- 替代方案：① 维持三模块（拒绝：循环依赖频发）② 彻底打乱重命名（拒绝：迁移成本）
- 后果：✅ 消除跨模块循环依赖；⚠️ 模块体积大，需前缀纪律
- 可逆性：两向门

### ADR-007: shared/ 子目录 barrel 统一导出

- 状态：已实施
- 上下文：shared 下 7 个子目录，消费方需写完整路径 `@/shared/security/permissions`，导入路径冗长且无统一入口
- 决策：每个子目录新增 `index.ts`，纯 re-export 聚合，保持原路径向后兼容
- 替代方案：① 顶层 `shared/index.ts` 聚合全部（拒绝：server-only 与同构混杂，客户端误引风险）② `export *`（拒绝：security/schemas 有特殊 `export type { z }`，传播会污染）③ 不做 barrel（拒绝：导入路径持续膨胀）
- 后果：✅ 导入路径缩短为 `@/shared/security`；✅ 纯聚合不改 API 边界；⚠️ barrel 需随源文件同步维护
- 可逆性：两向门，删 barrel 不影响现有路径
- 责任：文档所有者 - 本文件；新鲜度检查 - 每次 shared 子目录新增导出时同步 barrel

### ADR-008: 可观测性分层策略

- 状态：已实施（2026-07-31，Q4/Q5/Q6 全部收敛）
- 上下文：`monitoring.ts` 降级为 `console.error`，`isMonitoringEnabled` 恒 `false`，无请求 ID，无健康端点，运维盲区
- 决策：三层渐进--① pino 结构化日志 + 请求 ID（middleware 注入）② `/api/health` 探活 ③ `monitoring.ts` 接外部服务（Sentry/GlitchTip）
- 替代方案：① 直接上 Sentry（拒绝：无结构化日志基座，事件难串联）② 仅 console（拒绝：无法探活与告警）
- 后果：✅ 链路可串联；✅ 容器编排可探活；⚠️ pino 引入运行时依赖，需测 Next.js 自定义服务器兼容
- 可逆性：两向门，日志层可独立替换
- 反转触发：若 pino 与 Next.js 16 自定义服务器冲突，退回 `pino-http` 轻量方案
- 实施记录：2026-07 完成 ① `shared/logger.ts` pino 封装 + `createRequestLogger(req)` 绑定 requestId + 19 路由 `console.*` 替换 ② `/api/health` 端点 ③ `server.ts`+`proxy.ts` 请求 ID 注入；第三层 Sentry 接入为可选（`monitoring.ts` 已基于 pino，`isMonitoringEnabled` 预留开关）

### ADR-009: Repository 抽象层的引入时机

- 状态：待决策（P1）
- 上下文：服务层直接持 `better-sqlite3`，单测需 mock `getDb`，换库成本高
- 决策：P1 引入薄 Repository 接口，服务层依赖接口而非实例，单测注入内存实现
- 替代方案：① 不抽象（拒绝：单测 mock 成本持续上升）② 完整 ORM（拒绝：过度工程）
- 后果：✅ 单测可注入内存实现；⚠️ 增加一层间接，初期样板代码增多
- 可逆性：两向门，接口可逐步引入
- 反转触发：若抽象后性能下降 > 10% 或样板代码超过服务层 20%，停止推广

### ADR-010: 客户端/服务端边界澄清

- 状态：已实施（2026-07-31）
- 上下文：`shared/` 混 server-only（mail/image-utils/audit/security）与同构模块；`shared/hooks` 客户端专用，与 shared"前后端同构"定位有张力
- 决策：server-only 模块加 `server-only` 包标记，防客户端误引；`shared/hooks` 全部补齐 `'use client'` 标注（首行统一），保留原位不迁移
- 替代方案：① 维持现状（拒绝：客户端误引 server-only 导致构建失败风险持续）② 全部下沉到各模块（拒绝：hooks 被多模块复用）③ 拆分 `shared/hooks` -> `src/hooks`（拒绝：迁移成本高于收益，'use client' 标注已足够澄清边界）
- 后果：✅ 边界语义清晰；✅ tree-shaking 更准确；✅ 无需批量更新导入路径；⚠️ `shared/` 仍混合同构与客户端模块，靠 `'use client'`/`server-only` 标记区分而非物理拆分
- 可逆性：两向门
- 责任：迁移前需 `pnpm run ts-check` 全量验证
- 实施记录：2026-07-31 完成 M11。① 为 19 个 server-only 模块入口添加 `import 'server-only'`；② 因自定义 dev server 不走 Next.js 模块解析，新增 `src/shared/server-only.ts` 本地空实现 + `tsconfig.json` paths 别名 + `vitest.config.ts` alias 同步映射；③ `AuditContext` 类型下沉至 `src/shared/types/audit-types.ts`，斩断 admin/types -> shared/security/audit 的 server-only 依赖链；④ `shared/logger.ts` 移除 `server-only` 导入（被客户端间接依赖）；⑤ 7 个 hooks 统一 `'use client';` 首行标注；⑥ `pnpm ts-check` + `pnpm test`（431 测试）全绿通过

### ADR-011: CSP nonce 化策略

- 状态：已实施（2026-07-30）
- 上下文：`next.config.ts` CSP `script-src` 含 `'unsafe-inline' 'unsafe-eval'`，`layout.tsx` 用 `dangerouslySetInnerHTML` 注入脚本，XSS 防护弱化
- 决策：middleware 生成 per-request nonce，`theme-init`/`sw-register` 脚本注入 nonce，CSP `script-src` 改为 `'self' 'nonce-<random>'`
- 替代方案：① 维持 unsafe-inline（拒绝：XSS 风险）② hash-based（拒绝：内联脚本内容动态）
- 后果：✅ XSS 防护收紧；⚠️ middleware 每请求生成 nonce，需测性能
- 可逆性：两向门，可回退 unsafe-inline
- 反转触发：若 nonce 生成导致 RPS 下降 > 5%，评估哈希替代
- 实施记录：2026-07-30 `proxy.ts` 新增 `generateNonce()`（16 字节 base64），CSP `script-src` 移除 `'unsafe-inline'` 改为 `'nonce-<random>'`；`layout.tsx` 改为 `async`，经 `next/headers` 读取 `x-nonce` 注入到 `<Script nonce={nonce}>`；matcher 补充排除 prefetch 请求；`next.config.ts` 静态资源 CSP 同步移除 `'unsafe-inline'`

### ADR-012: 部署拓扑单节点策略

- 状态：已实施，远期需演进
- 上下文：当前 Docker + Caddy + Litestream 单节点，无水平扩展
- 决策：单节点维持至日活 > 100 或出现 SLA 要求；远期引入只读副本 + CDN 静态资源
- 替代方案：① 立即多节点（拒绝：SQLite 多写者不兼容，需先迁移 PG）② 无状态化（拒绝：成本不匹配当前规模）
- 后果：✅ 运维简单；⚠️ 单节点故障即全站不可用
- 可逆性：单向门，多节点迁移需先完成 Repository 抽象（ADR-009）
- 反转触发：日活 > 100 或出现 4 小时 SLA 要求

### ADR-013: 事件监听器显式初始化

- 状态：已实施（2026-07-29）
- 上下文：`notification/server/index.ts` 通过模块加载副作用（`_initEvents()`）注册事件监听器，依赖"该模块被任意路径间接 import"的隐式假设。Next.js 按需加载可能导致某些启动路径未触发该 import，通知静默失效
- 决策：在应用启动入口（`server.ts` 或 `instrumentation.ts`）显式调用 `initNotificationEvents()`，并增加健康检查断言验证监听器已注册
- 替代方案：① 维持副作用初始化（拒绝：隐式依赖不可靠，R7）② 路由层各自 import notification（拒绝：重复注册需幂等控制）
- 后果：✅ 启动确定性；✅ 健康检查可探活监听器；⚠️ 需维护 instrumentation 入口
- 可逆性：两向门
- 责任：迁移后需删除 `index.ts` 中的副作用 `_initEvents()` 调用，避免双重注册
- 实施记录：2026-07-29 创建 `src/instrumentation.ts` 显式调用 `initNotificationEvents()`，删除 `notification/server/index.ts` 中的副作用 `_initEvents()` 调用

### ADR-014: 事件总线异步化时机

- 状态：待决策（P2）
- 上下文：`appBus` 基于 Node.js EventEmitter，`emit` 同步执行所有监听器。`createNotificationForAll` 大用户量广播与 `reply.created` 大量 @提及会同步阻塞请求，延长 P95
- 决策：维持同步至活跃用户 > 500 或 P95 > 500ms；届时将重负载事件改为 `setImmediate` 异步队列或 BullMQ
- 替代方案：① 立即异步化（拒绝：破坏事务内一致性语义）② 改 Kafka/Redis Stream（拒绝：单节点无需）
- 后果：✅ 短期事务一致性；⚠️ R8 触发前 P95 有抖动风险
- 可逆性：两向门，按事件粒度渐进迁移
- 反转触发：活跃用户 > 500 或某事件监听器 P95 > 500ms

### ADR-015: 2FA 与 OAuth 安全加固

- 状态：已实施（2026-07-31）
- 上下文：安全审计发现 3 个 P0-critical + 2 个 P0-high 漏洞：① 2FA backup-codes/setup-verify/disable-setup 端点缺少 Origin 校验与限流，被盗 session 可暴力破解 TOTP；② GitHub OAuth 自动绑定绕过本地 2FA；③ 密码重置多步操作未包事务；④ 默认重置密码为源码公开的硬编码弱口令；⑤ events 表迁移未包事务
- 决策：
  - 2FA 全部端点（backup-codes/verify/setup/disable）统一 `assertAllowedOrigin` + `twoFactorLimiter`（setup 模式限流 key=`${ip}:${userId}`，login 模式不变）
  - OAuth 回调检查 `is2FAEnabled(userId)`，已启用者签发 `twoFactorToken` 重定向 `/login?oauth_2fa=<token>`，复用 login 页 2FA UI
  - 密码重置（admin + auth 模块）`UPDATE password + DELETE sessions` 包裹 `db.transaction()`
  - 移除硬编码 `FZTBU_CS` 回退，统一 `PASSWORD_RESET_DEFAULT` 环境变量名，运行时读取（非模块加载时）
  - events 迁移包裹 `db.transaction()`
  - instrumentation.ts 注册 `unhandledRejection`/`uncaughtException` 进 pino；server.ts `app.prepare().catch()` 兜底
- 替代方案：① 仅补限流不补 Origin（拒绝：违反 POST /api/auth/* 统一契约）② OAuth 2FA 用户拒绝登录（拒绝：UX 退化，复用 2FA UI 成本更低）③ 保留弱口令回退（拒绝：源码公开即失效）
- 后果：✅ 2FA 安全保证完整（暴力破解被限流、OAuth 不可绕过）；✅ 密码重置原子性；✅ 迁移可回滚；✅ 运维可观测启动失败；⚠️ OAuth 2FA 用户需额外输入 TOTP（可接受，2FA 用户已选择更高安全）
- 可逆性：两向门
- 实施记录：2026-07-31 修改 9 文件（backup-codes/verify/setup/disable 4 个 2FA 路由 + oauth callback + login page + admin/password-reset + auth/password-reset + schema + instrumentation + server）；ts-check + 431 测试全绿

### ADR-016: 活动日期格式兼容与归档比较修复

- 状态：已实施（2026-07-31）
- 上下文：events.date 为自由格式字符串（admin 表单 placeholder 为 `YYYY.MM.DD`，实际可能含 `.` / `-` / `/` 三种分隔符）。`autoArchivePastEvents` 与 `getEventById` 原先将该字段与 `new Date().toISOString()`（`YYYY-MM-DDThh:mm:ssZ`）直接做 SQL 字典序比较。因 `.`(0x2E) > `-`(0x2D)，同年已过日期在位置 4 即判定为大于，永远不会被归档，导致过期活动长期显示为 upcoming/ongoing，用户可能对已结束活动误报名。前端 `year-accordion-timeline.tsx` 的 `isPastDate` 同样依赖 `new Date('2026.09.15')`，多数 JS 引擎返回 Invalid Date
- 决策：
  - 后端 `autoArchivePastEvents` / `getEventById`：SQL `REPLACE(REPLACE(date, '.', '-'), '/', '-')` 归一化分隔符，`substr(..., 1, 10)` 截取日期部分，与 `toISOString().slice(0, 10)`（YYYY-MM-DD）比较
  - 前端 `isPastDate`：regex `/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/` 解析后构造 `new Date(year, month, day)`，同日不算已过（与后端 `<` 语义一致）
  - 前端 `month-calendar.tsx`（M3 新增）：复用同 regex 解析日期入网格，无法解析的活动归入"未排期"列表
- 替代方案：① 强制 date 字段为 ISO 格式 + 数据迁移（拒绝：需迁移历史数据，admin 表单 placeholder 已固化 `YYYY.MM.DD`）② SQLite date() 函数解析（拒绝：非标准格式不被 date() 识别）③ 应用层全量加载后 JS 过滤（拒绝：破坏分页与 SQL WHERE 下推）
- 后果：✅ 三种分隔符（点/横线/斜线）均正确归档；✅ 前后端日期解析语义一致；✅ 月历视图复用解析逻辑；⚠️ 未来若引入新日期格式需同步更新 regex 与 SQL REPLACE
- 可逆性：两向门，SQL REPLACE 为纯查询层变换，不改 schema
- 实施记录：2026-07-31 修改 4 文件（archive.ts + crud.ts getEventById + year-accordion-timeline.tsx isPastDate + 新增 month-calendar.tsx parseEventDate）；events.test.ts 新增 6 个回归测试覆盖点/横线/斜线分隔符 + 已 ended 不重复 + 无日期不归档 + getEventById 单条归档；ts-check + 437 测试全绿

### ADR-017: 跨模块日期格式比较审计与归一化（R17 收敛）

- 状态：已实施（2026-07-31）
- 上下文：ADR-016 修复了 `events.date` 自由格式与 ISO 时间戳的字典序比较缺陷。R17 登记为 P1 审计任务：排查其他模块是否存在同类"自由格式/ISO vs `datetime('now')`"字符串比较缺陷。全量审计 schema 中所有日期字段（`expires_at` / `created_at` / `start_time` / `end_time` / `resolved_at` 等）后发现 3 处同类缺陷：
  - `announcements.expires_at`：管理端 UI 通过 `new Date(value).toISOString()` 写入 ISO 8601（`T` 分隔符），`getActiveAnnouncements` 直接 `expires_at > datetime('now')` 比较。`T`(0x54) > 空格(0x20)，导致过期当天的公告始终判为未过期。另发现空字符串 `expires_at`（UI 清空输入）经 `?? null` 透传落库，`datetime('')` 返回 NULL 使公告被静默隐藏
  - `sessions.expires_at`：`createSession` 用 `new Date(...).toISOString()` 写入 ISO 格式，`listUserSessions` 直接 `expires_at > datetime('now')` 比较，过期当天的 session 仍显示为活跃（注：鉴权 `getSession` 用 JS `new Date()` 解析，无此问题）
  - `admin_actions.created_at`：`deleteAdminActionsBefore` 注释声明接收 ISO 格式 `before` 参数，但 `created_at` 为 SQLite datetime 空格格式，直接 `created_at < ?` 比较，同日记录判定错乱
- 决策：
  - 三处比较统一用 SQLite `datetime()` 函数归一化两侧格式：`datetime(col) > datetime('now')` / `datetime(created_at) < datetime(?)`。`datetime()` 能正确解析 ISO 8601（含 `T`/`Z`）与 SQLite datetime（空格分隔）两种格式并归一化为 `YYYY-MM-DD HH:MM:SS`
  - `announcements.expires_at` 新增 `announcementExpiresAtSchema` Zod refine 校验：非空时必须是 `new Date(val)` 可解析的日期字符串，拒绝任意自由格式落库
  - `createAnnouncement` / `updateAnnouncement` 将空字符串 `expiresAt` 归一化为 `null`（UI 清空输入语义为"永不过期"，与 `expires_at IS NULL` 一致）
- 替代方案：① 写入时统一转为 SQLite datetime 格式（拒绝：需改写所有 `toISOString()` 调用点，且 ISO 是 JS 原生格式）② 应用层全量加载后 JS 过滤（拒绝：破坏 SQL WHERE 下推，session 列表失去分页）③ 仅靠 Zod 校验强制 ISO 输入（拒绝：不修复历史已落库的混合格式数据）
- 后果：✅ 三处混合格式比较均正确；✅ 空字符串过期时间不再静默隐藏公告；✅ Zod 校验前置拦截非法日期字符串；⚠️ `datetime()` 函数调用有极小性能开销（可忽略）
- 可逆性：两向门，`datetime()` 包裹为纯查询层变换，不改 schema；Zod 校验可独立回退
- 审计确认安全（无缺陷）：
  - `verification_codes.expires_at`：写入 `datetime('now', '+10 minutes')`，比较 `datetime('now')`，同格式 ✅
  - `password_reset_requests.created_at`：写入 `DEFAULT (datetime('now'))`，比较 `datetime('now', '-24 hours')`，同格式 ✅
  - `exams.start_time` / `end_time`：服务层用 JS `new Date()` 解析比较，非 SQL 字符串比较 ✅
  - `events.date`：ADR-016 已修复 ✅
  - 各表 `created_at` / `updated_at`：仅用于 `ORDER BY` 与展示，无过期比较 ✅
- 实施记录：2026-07-31 修改 4 文件（announcement/server/index.ts getActiveAnnouncements + createAnnouncement + updateAnnouncement；auth/server/identity.ts listUserSessions；admin/server/audit.ts deleteAdminActionsBefore；shared/security/schemas.ts announcementExpiresAtSchema）；announcement.test.ts 新增 4 条 R17 回归测试（ISO past/future/当日过期/空字符串）；ts-check + 87 测试全绿

### ADR-018: 0.9.1 SLO 定义与单实例风险接受（EX-1）

- 状态：已采纳
- 上下文：0.9.1 预发布前，PRR（production-readiness-review）识别 6 个 launch blocker：(1) 无 SLO 定义；(2) 无 alerting；(3) 无 load test；(4) 无 restore drill；(5) 无 rollback 流程；(6) 无 runbook。同时单实例部署为 SPOF，需显式风险接受而非默认接受。
- 决策：
  1. SLO：定义最小 SLO 集（可用性 99%/月 + 5xx < 1% + P95 < 500ms + 考试提交 99.9%），写入 `Devdocs-slo.md`
  2. Alerting：新增 `error-rate-monitor.ts`（滑动窗口 5 分钟错误率监控，> 5% 告警）+ `monitoring.ts` 可选 Sentry 动态 import（SENTRY_DSN 驱动，不加硬依赖）
  3. Load test：新增 `tools/tests/load/k6-load-test.js`（公开读 50 VU + 认证 10 VU 两场景，SLO thresholds）
  4. Restore drill：新增 `tools/scripts/restore-drill.sh`（restore + sqlite3 表存在校验 + PRAGMA integrity_check）
  5. Rollback + Runbook：新增 `Devdocs-runbook.md`（6 故障场景 + 回滚决策树 + RTO 目标 + 数据兼容性表）
  6. CI 加固：CI 新增 `pnpm build` + `pnpm audit --audit-level=high`
  7. EX-1 风险接受：单实例 SPOF 作为 dated risk acceptance 记录（R20），compensating control = Litestream PITR + Docker restart + Caddy 自动重启 + 错误率监控
- 替代方案：① 多实例化后再发布（拒绝：blast radius 限单校 CS 社区，过度工程；用户量未达瓶颈）② 无 SLO 直接发布（拒绝：无法判断 readiness，违反 PRR Iron Law）
- 后果：✅ 0.9.1 具备可观测性、可回滚、可恢复的运维基础；✅ SLO 提供 release 后的决策依据；⚠️ 单实例 SPOF 风险接受，需在用户量增长时重评估；⚠️ 外部探针未接入，可用性 SLI 降级为应用层日志统计
- 可逆性：两向门
- 反转触发：用户量达 200 活跃 / 写 QPS 持续增长触发 R1 评估 / 连续 2 月 SLO 违约 / 考试期数据丢失事件
- 实施记录：2026-07-31 新建 6 文件（Devdocs-slo.md / Devdocs-runbook.md / CHANGELOG.md / tools/scripts/restore-drill.sh / tools/tests/load/k6-load-test.js / src/shared/utils/error-rate-monitor.ts + tools/tests/error-rate-monitor.test.ts）；修改 4 文件（monitoring.ts / .github/workflows/ci.yml / Devdocs-roadmap.md / package.json + health route 版本号 -> 0.9.1）；新增 R18/R19/R20 风险登记；ts-check + 7 新增测试全绿

### ADR-019: 开发者中心整合（dev-center + dev-docs API + 组件注册表 root 专属）

- 状态：已采纳
- 上下文：组件注册表原为 `/tools/component-registry` 独立页面，无权限守卫（所有人可访问）；开发文档（tools/docs/*.md）无在线访问入口，仅能通过本地文件系统查看。需整合为统一开发者中心，并按角色分层权限。
- 决策：
  1. 新建 `/tools/dev-center` 页面，双 tab 布局（开发文档 + 组件注册表）
  2. 新建 `/api/dev-docs`（GET 列表，admin+）+ `/api/dev-docs/[slug]`（GET 读 admin+，PUT/DELETE 写删 root 专属），含路径穿越防护（拒绝 `/`、`..`、`\`）+ 1MB 大小限制
  3. 组件注册表从独立页面迁移至 dev-center 内嵌 tab，添加 `embedded` 属性跳过 Hero；原 `/tools/component-registry` 页面删除（彻底迁移，方案 3）
  4. 权限分层：admin 仅可见开发文档 tab（只读）；root 可见两个 tab（文档可编辑 + 组件注册表完整访问）
  5. API 数据层不变：`/api/tools/component-registry/*` 4 个路由保留，component-registry-store.tsx 调用路径不变
- 替代方案：① 重定向迁移（旧路径 301 重定向，拒绝：增加重定向层，单校项目无外部链接依赖）② 兼容并存（旧路径保留渲染同一内容，拒绝：两套入口维护成本高）
- 后果：✅ 统一入口简化导航；✅ 文档在线访问降低知识传递成本；✅ root 专属组件注册表减少误操作风险；⚠️ 旧路径 `/tools/component-registry` 直接 404（已确认无外部链接引用）
- 可逆性：两向门（恢复旧页面 + 删除 dev-center 即可回退）
- 反转触发：需要普通用户访问组件注册表时
- 实施记录：新建 4 文件（api/dev-docs/route.ts + api/dev-docs/[slug]/route.ts + app/tools/dev-center/page.tsx + modules/tools/ui/dev-docs-viewer.tsx）；修改 2 文件（component-registry-shell.tsx 添加 embedded 属性 + tools/page.tsx 更新 TOOLS 数组）；删除 1 文件（app/tools/component-registry/page.tsx）；ts-check + lint + 464 测试全绿

---

## 六、健壮函数（架构不变量）

> 以下不变量需保持可测，防止架构腐化。

| ID | 不变属性 | 度量 | 阈值 | 检查路径 |
|----|---------|------|------|---------|
| FF1 | 依赖方向单向 | `shared -> modules` 反向 import 数 | 0 | `pnpm run ts-check` + 人工 grep |
| FF2 | 公开契约兼容 | API 路由响应 schema 变更破坏性 | 0 | E2E + 集成测试 |
| FF3 | 客户端不引 server-only | 客户端 bundle 含 `better-sqlite3`/`nodemailer` | 0 | 构建产物分析 |
| FF4 | DB 迁移幂等 | 同一迁移重复执行结果一致 | 幂等 | `migrations.test.ts`（待补；排期 P1，随 M10 Repository 抽象一同落地） |
| FF5 | 安全头全站覆盖 | 响应缺 CSP/HSTS 的路由数 | 0 | E2E 响应头断言 |
| FF6 | barrel 与源同步 | barrel 导出名在源文件存在 | 100% | `pnpm run ts-check` |

---

## 七、风险登记

| ID | 风险 | 可能性 | 影响 | 缓解 | 记录 |
|----|------|--------|------|------|------|
| R1 | 单节点 SQLite 写者瓶颈 | 中 | 高（站点不可用） | 监控写 QPS，日活 > 50 评估迁移 | ADR-005/012 |
| R2 | 客户端误引 server-only 模块 | 中 | 中（构建失败） | ✅ 已缓解（ADR-010：19 个 server-only 模块加 `import 'server-only'` + hooks `'use client'` 标注） | ADR-010 |
| R3 | 安全审计日志与业务表共享 schema | 低 | 中（迁移协调） | schema 变更走 migration + 通告 | ADR-002 |
| R4 | 测试覆盖失衡致回归逃逸 | 高 | 中（线上 bug） | ✅ 已缓解（M8 308 业务单测 + M9 25 E2E + 6 个归档回归测试，总计 437+ 单测） | M8/M9 |
| R5 | CSP unsafe-inline 被 XSS 利用 | 中 | 高（数据泄露） | ✅ 已缓解（F2 nonce 化已实施，`script-src` 移除 `'unsafe-inline'`，内联脚本须携带 per-request nonce） | F2/ADR-011 |
| R6 | 迁移在 getDb 同步执行阻塞启动 | 低 | 中（启动慢） | 监控启动耗时，大表迁移分批 | ADR-009 |
| R7 | 事件监听器隐式初始化致通知静默失效 | 中 | 中（用户收不到通知） | ✅ 已缓解（ADR-013：instrumentation.ts 显式注册） | ADR-013 |
| R8 | 事件总线同步 emit 延长请求延迟 | 中 | 中（P95 抖动） | 维持同步；当前活跃用户 < 50，pino 日志可统计 P95 但尚未建立基线告警，ADR-014 反转触发条件待数据支撑 | ADR-014 |
| R9 | server.ts 代理头清理无测试覆盖 | 中 | 高（IP 伪造绕限流） | ✅ 已缓解（提取 sanitizeProxyHeaders 至 shared/security/proxy-headers.ts，13 个单测覆盖） | - |
| R10 | 2FA 端点缺少限流+Origin 校验致 TOTP 暴力破解 | 高 | 高（账号接管） | ✅ 已缓解（ADR-015：backup-codes/verify/setup/disable 全部补齐 assertAllowedOrigin + twoFactorLimiter） | ADR-015 |
| R11 | GitHub OAuth 自动绑定绕过 2FA | 高 | 高（2FA 失效） | ✅ 已缓解（ADR-015：OAuth 回调检查 is2FAEnabled，已启用者重定向 2FA 验证） | ADR-015 |
| R12 | 密码重置多步操作未包事务致旧 session 残留 | 中 | 高（安全保证失效） | ✅ 已缓解（ADR-015：admin + auth 模块均包裹 db.transaction） | ADR-015 |
| R13 | 默认重置密码为源码公开硬编码弱口令 | 高 | 高（账号接管） | ✅ 已缓解（ADR-015：移除 FZTBU_CS 回退，统一 PASSWORD_RESET_DEFAULT 环境变量） | ADR-015 |
| R14 | events 表迁移未包事务致数据丢失 | 低 | 高（数据不一致/启动崩溃） | ✅ 已缓解（ADR-015：migrateEventsDropLegacyColumns 包裹 db.transaction） | ADR-015 |
| R15 | 启动失败与未处理 rejection 无结构化日志 | 中 | 中（运维盲区） | ✅ 已缓解（ADR-015：instrumentation.ts 注册全局 handler + server.ts prepare.catch） | ADR-015 |
| R16 | events.date 自由格式与归档 ISO 时间戳字典序比较不兼容 | 高 | 高（过期活动不归档，用户误报名已结束活动） | ✅ 已缓解（ADR-016：SQL REPLACE 归一化分隔符 + substr 截取日期部分比较；前端 isPastDate regex 解析；6 个回归测试覆盖） | ADR-016 |
| R17 | 其他模块可能存在自由格式日期与 ISO 比较的同类缺陷 | 中 | 中（静默逻辑错误） | ✅ 已缓解（ADR-017：修复 `announcements.expires_at`、`sessions.expires_at`、`admin_actions.created_at` 三处，统一用 `datetime(col)` 归一化；新增 Zod 校验 + 空字符串归一化为 null；4 条回归测试；`exams`/`verification_codes`/`password_reset_requests` 经审计确认安全） | ADR-017 |
| R18 | 0.9.1 可用性 SLI 降级为应用层日志统计（外部探针未接入） | 中 | 中（无法发现网络层故障） | 风险接受（EX-1）：0.9.1 阶段可用性 SLI 降级为 `/api/health` 日志统计。compensating control：error-rate-monitor 告警 + Caddy healthcheck。expiry/refresh：L4 外部监控接入后消除降级 | ADR-018 |
| R19 | pnpm audit 失败不阻塞 CI | 低 | 中（依赖漏洞延迟发现） | 风险接受（EX-1）：0.9.1 阶段 CI audit `continue-on-error: true`，仅警告不阻塞。compensating control：手动 `pnpm audit` + 高危漏洞记录至 R 表。expiry/refresh：1.0 正式发布 + 30 天后改为阻塞 | ADR-018 |
| R20 | 0.9.1 单实例部署（单 app 容器 + 单 SQLite）为 SPOF | 中 | 高（站点不可用） | ⚠️ 已接受（EX-1 显式风险接受，详见 ADR-018）：Compensating control = Litestream PITR < 1s + Docker `restart: unless-stopped` + Caddy 自动重启 + 错误率监控告警；用户量达 200 活跃或写 QPS 持续增长时重评估，触发 M10 Repository 抽象后评估 PostgreSQL 迁移 | ADR-018 |

---

## 八、边界上下文图

> 每个上下文标注：职责所有者 / 模型语言 / 上游 / 下游 / 邻接关系（DDD 关系模式）。

| 上下文 | 职责所有者 | 模型语言 | 上游 | 下游 | 邻接关系 |
|--------|-----------|---------|------|------|---------|
| auth | `modules/auth` | User / Session / Role | - | user, notification | 共享内核（User 类型下沉 shared/types） |
| user | `modules/user` | UserProfile / TechTag | auth | community, events | 遵奉者（消费 auth 的 User 模型） |
| community | `modules/community` | Topic / Reply / BlogPost / Member | user, auth | notification | 共享内核（forum/blog/members 合并） |
| events | `modules/events` | Event / Registration / Checkin | user, auth | notification | 客户/供应商（依赖 user 提供身份） |
| tools | `modules/tools` | Exam / Resource / Task / Agent / Points | user, auth, community | notification | 遵奉者（消费 user/community 模型） |
| notification | `modules/notification` | Notification / Broadcast | 事件总线 | - | 防腐层（事件 payload 转为通知模型） |
| admin | `modules/admin` | AdminAction / Role / AuditLog | auth, 所有业务模块 | - | 共享内核（审计日志共用 admin_actions 表） |
| shared | `shared/*` | 基础设施类型与工具 | - | 所有模块 | 共享内核（单一事实来源） |

翻译面：
- `notification` 是唯一防腐层--将各业务事件 payload 翻译为统一的 `Notification` 模型
- `admin` 审计日志跨模块共享 `admin_actions` 表，schema 变更需跨上下文协调（R3）
- `shared/types` 是 User 类型的单一事实来源，auth/user 模块均 re-export 而非重定义

---

## 九、运行时依赖责任

> 关键运行时依赖的采用标准：可支持性 / 可变更性 / 回退路径 / 退出降级。

| 依赖 | 可支持性 | 可变更性 | 回退路径 | 退出/降级 |
|------|---------|---------|---------|----------|
| better-sqlite3 | 单写者，WAL 模式 | 通过 Repository 抽象（ADR-009）可换 PG | Litestream 流式备份恢复 | 只读副本降级，写降级为排队 |
| nodemailer | SMTP 环境变量驱动 | transporter 工厂可替换 | SMTP_HOST 空时 console.log 回退 | 验证码降级为终端日志 |
| next-themes | localStorage 持久化 | 主题策略可配置 | .dark 类 CSS 变量直接生效 | 防闪烁脚本兜底 |
| EventEmitter（事件总线） | 进程内同步 | 可替换为异步队列 | try-catch 隔离失败 | 通知失败不影响业务 |
| scrypt（密码哈希） | Node 内置 crypto | 可换 argon2 | salt:hex 格式兼容 | dummy scrypt 抗时序枚举 |
| Caddy | 反向代理 + 自动 HTTPS | Caddyfile 声明式 | 手动 nginx 配置 | 直接暴露 2333 端口（仅 dev） |
| Litestream | 流式备份到本地/S3 | litestream.yml 配置 | 手动 sqlite3 .backup | 停止备份，依赖周期快照 |

---

## 十、交互风格决策

> 同步 vs 事件 vs 批量 vs 流式 vs 推送 vs 本地投影的选择依据。

| 交互路径 | 当前风格 | 驱动力 | 替代方案 | 决策 |
|---------|---------|--------|---------|------|
| API 路由 -> 服务层 | 同步调用 | 低延迟，事务一致性 | 事件驱动 | 维持同步（请求/响应） |
| 业务模块 -> 通知 | 同步事件 emit | 事务内一致性 | 异步队列 | 短期维持；R8 触发后改异步 |
| 通知 -> DB 写入 | 同步事务 | 广播原子性 | 逐条写入 | 维持事务（createNotificationForAll） |
| 客户端 -> 认证状态 | 轮询 `/api/auth/me` | 简单性 | WebSocket 推送 | 维持轮询（路径变化触发） |
| 未读通知数 | 客户端轮询 | 实现成本低 | SSE 推送 | L8 评估 SSE |
| 活动签到核销 | 同步请求 | 强一致 | - | 维持同步 |
| 考试判分 | 同步计算 | 即时反馈 | 异步批处理 | 维持同步（选择题即时） |
| 数据清理 | 同步调用（入口触发） | 简单性 | 定时任务 | 评估 cron（L9） |

过载/配额敏感路径：
- 广播通知 `createNotificationForAll` 在大用户量下同步遍历所有用户写入，可能阻塞请求--超过 500 活跃用户时应改批量异步
- 论坛 @提及通知 `reply.created` 同步遍历 mentionedUserIds 逐条写入--大量 @时延长请求

---

## 十一、数据流图

```
[浏览器]
  │  HTTPS
  ▼
[Caddy 反向代理] ── 自动 TLS / 安全头转发
  │  HTTP (trustProxy=true)
  ▼
[server.ts 自定义服务器] ── 代理头清理 / X-Real-IP 注入
  │
  ▼
[Next.js App Router]
  ├── 页面（RSC + Client Components）
  │     └─ shared/hooks（客户端）
  │     └─ components/*（客户端 + 服务端混合）
  │
  └── API 路由（/api/**）
        │  zod 校验 + assertAllowedOrigin + RateLimiter
        ▼
      [modules/*/server 服务层]
        │  assertOwnership（IDOR 防护）
        ▼
      [shared/db -> getDb() 单例]
        │  WAL 模式 + 外键约束
        ▼
      [SQLite 文件 (data/app.db)]
        │
        ├── 写入 -> [Litestream] ── 流式备份到本地/S3
        │
        └── 事件触发 ── appBus.emit（同步）
              │
              ▼
            [notification 防腐层]
              │  payload -> Notification 模型
              ▼
            [notifications 表]

[审计日志] admin_actions 表 ← 所有模块写（跨上下文共享）
```

信任边界：
1. 浏览器 -> Caddy：不可信，TLS 终止
2. Caddy -> server.ts：半可信（trustProxy 控制是否信任 XFF）
3. server.ts -> Next.js：可信（代理头已清理）
4. API 路由 -> 服务层：可信（同进程）
5. 服务层 -> DB：可信（prepared statement 防 SQL 注入）

---

## 十二、里程碑

> P0 按季度收敛，P1 按半年规划。

### 2026 Q3（P0 收敛）

- [x] Q4 结构化日志（2026-07-30 完成，详见 ADR-008）
- [x] Q5 健康检查端点（2026-07-29 完成，`/api/health` 返回 DB/磁盘/版本号）
- [x] Q6 请求 ID 注入（2026-07-30 完成，详见 ADR-008）
- [x] F1 统一使用 CollapsingHero（2026-07-30 完成，19 个页面统一；首页与 login 除外）
- [x] F2 CSP nonce 化（2026-07-30 完成，详见 ADR-011）
- [x] F3 安全头迁移至 proxy（2026-07-30 完成，`proxy.ts` 统一安全头）
- [x] Q1 拆分 TopicDetail 页面组件（2026-07-30 完成，主组件 191 行 < 200）
- [x] Q2 统一错误处理模式（2026-07-30 完成，~89 处替换为 `AppError`）
- [x] Q3 提取 EASE 常量（2026-07-30 完成，统一 `--ease-ark` 变量）
- [x] R9 server.ts 代理头清理单测（2026-07-30 完成，13 测试覆盖）
- [x] P0 安全审计与加固（2026-07-31 完成，详见 ADR-015）
- [x] P0 活动归档日期比较修复（2026-07-31 完成，详见 ADR-016）

### 2026 Q4（P1 启动）

- [x] M8 业务模块单测（2026-07-31 完成，308 测试覆盖 CRUD/状态机/IDOR/输入校验/审计日志/角色定向/过期逻辑）
- [x] M9 E2E 业务流程断言（2026-07-31 完成，25 个 Playwright 测试）
- [x] M3 活动日历视图（2026-07-31 完成，详见 ADR-016）
- [x] M6 密码策略升级（2026-07-31 完成）
- [x] M7 敏感数据脱敏（2026-07-31 完成，shared/utils/mask.ts + 24 个单元测试）
- [x] ADR-013 事件监听显式初始化（2026-07-29 完成，`src/instrumentation.ts`）
- [x] M11 客户端/服务端边界澄清（2026-07-31 完成，详见 ADR-010）
- [x] R17 跨模块日期格式审计（2026-07-31 完成，详见 ADR-017）
- [x] 1.0 发布前准备（2026-07-31 完成，详见 ADR-018：SLO + Alerting + Load test + Restore drill + Rollback/Runbook + CI 加固 + CHANGELOG + EX-1 风险接受）

### 2027 H1（P1 推进）

- [ ] M10 Repository 抽象层
- [ ] M1 关注/好友系统
- [ ] M2 Wiki/知识库

### 2027 H2（P2 探索）

- [ ] L4 外部监控接入
- [ ] L5 性能埋点
- [ ] ADR-014 事件总线异步化评估
- [ ] L7 数据归档冷存储

---

*文档结束*
