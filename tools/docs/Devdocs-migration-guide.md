# 多语言迁移指南（Python / Java）

> 文档类型：how-to（迁移实施路径）+ explanation（架构决策说明）| 受众：架构师 / 后端迁移实施者
> Source of truth：项目从 Next.js 单体向多语言微服务演进的组件划分、优先级、推荐技术栈、通信契约的权威参考
> 最后更新：2026-08-01 | cadence：每个里程碑结束 / 新增语言服务时即时更新 | Stale 信号：模块迁移清单与代码目录不一致 / 推荐栈与实际依赖冲突 / 通信契约未更新
> 变更触发：新增后端语言、组件模块拆分、数据库切换、鉴权方式变更、模块间通信方式变更

---

## 一、迁移决策原则

```
迁移决策三问：
1. 该组件是否只依赖纯类型（types/）和服务层（server/），不涉及 React UI？
   → 是：可迁移；否：留在 Next.js 端
2. 目标语言生态在该领域是否有压倒性优势？
   → Python：AI / NLP / 数据 / 多媒体
   → Java：安全 / 事务 / 权限 / 并发 / 消息
3. 迁移是否降低长期维护成本？
   → 避免「为了多语言而多语言」；独立 API、可拆模块才迁移
```

### 模块三层划分（决定可迁移性）

每个业务模块 `src/modules/<name>/` 固定三层：

| 层 | 路径 | 可否迁移 | 说明 |
|----|------|----------|------|
| **server 层** | `<module>/server/*.ts` | ✅ **主要迁移对象** | 纯业务逻辑、DB 读写、无 React 依赖 |
| **types 层** | `<module>/types/index.ts` | ✅ 契约同步 | 纯类型定义，迁移时在目标语言生成对应 DTO |
| **ui 层** | `<module>/ui/*.tsx` | ❌ 保留 | React 组件，Next.js SSR/RSC 绑定 |

> 跨模块共享的 `shared/` 下各文件按同一规则判断：无 React 依赖的 `shared/security/*`、`shared/utils/*`、`shared/db/*` 属于迁移候选。

---

## 二、适合迁移到 Python 的组件清单

> **Python 生态优势区**：AI/ML、NLP、多媒体处理、数据分析、爬虫、异步任务队列（Celery）
> **推荐通信方式**：Next.js BFF 通过内部 HTTP（FastAPI）或 gRPC 调用；异步场景用 Redis 队列
> **推荐基础栈**：Python 3.12+、FastAPI 0.115+、Pydantic v2、SQLAlchemy 2.0、Redis、Celery

---

### ⭐ P0 — 极高匹配度（Python 生态优势明显，推荐首批迁移）

#### P0-1. Auxilio Agent — AI 学习助手

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | [src/modules/tools/server/agent/index.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/tools/server/agent/index.ts) |
| **当前职责** | 分析用户考试答题历史 → 统计各技术标签正确率 → 识别薄弱点（阈值 <60%） → 匹配资源库推荐学习资源 |
| **为什么迁移到 Python** | • **LLM 接入**：LangChain / LlamaIndex 原生语言，便于未来扩展对话式辅导、RAG 知识库、题目智能解析<br>• **学习分析**：scikit-learn + pandas 可实现 IRT（项目反应理论）、知识追踪（DKT/BKT）、个性化学习路径推荐<br>• **题目分析**：jieba 分词做题目去重、知识点聚类；BERT-Chinese 做题目相似性检测 |
| **推荐 Python 栈** | FastAPI + Pydantic v2 + SQLAlchemy 2.0 + LangChain + pandas + scikit-learn |
| **Next.js 端变更** | `src/app/api/tools/auxilio/route.ts` 改为内部 HTTP 转发到 `http://auxilio-svc:8000/api/analyze/{userId}` |
| **DB 共享方式** | 直连同一 PostgreSQL/SQLite（SQLAlchemy 与 Drizzle 共享 schema，通过迁移文件统一管理） |
| **最小迁移单元** | 先复制 `calculateWeaknesses()` + `recommendResources()` + `analyzeLearningProfile()` 三个纯函数为 FastAPI endpoint |

#### P0-2. 论坛内容审核 / 反垃圾管道

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | [src/modules/community/server/forum/moderation.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/community/server/forum/moderation.ts) |
| **当前职责** | 管理员手动 hide/restore 主题与回复；无自动内容审核 |
| **为什么迁移到 Python** | • **NLP 生态**：中文文本处理全靠 Python（jieba 分词、snownlp 情感、THULAC、BERT-Chinese 分类）<br>• **敏感词检测**：DFA 敏感词过滤库 + 自定义词库<br>• **图片审核**：OCR（PaddleOCR/Tesseract）+ NSFW 检测模型（OpenNSFW），防止夹带违规图片上传<br>• **用户画像**：历史违规率 + 主题文本特征构建用户风险分 |
| **推荐 Python 栈** | FastAPI + jieba + snownlp + PaddleOCR + transformers（BERT） |
| **工作模式** | 异步管道：Next.js 发帖 → 发消息到 Redis Stream → Python 消费端异步打分 → 超阈值自动隐藏 + 通知管理员审核 |
| **最小迁移单元** | 先实现 HTTP 接口 `POST /api/moderate/scan`，入参 `{text, image_urls[]}`，出参 `{risk_score, reasons[], should_hide}` |

---

### ⭐ P1 — 高匹配度

#### P1-1. 邮件与多渠道通知服务

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | [src/shared/utils/mail.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/shared/utils/mail.ts)、[src/modules/notification/server/notification-events.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/notification/server/notification-events.ts) |
| **当前职责** | nodemailer SMTP 发送注册验证码 / 忘记密码邮件；站内通知基于进程内事件总线 |
| **为什么迁移到 Python** | • **异步队列**：Celery + Redis 对批量邮件、定时提醒、重试策略的支持远优于 Node<br>• **多渠道扩展**：Python 社区的钉钉/飞书/企业微信/Bark/Server 酱 PushDeer SDK 完整度最高<br>• **模板渲染**：Jinja2 模板做富文本邮件、邮件 inline CSS（premailer 库） |
| **推荐 Python 栈** | FastAPI + Celery + Redis + Jinja2 + premailer + 飞书/钉钉 SDK |
| **工作模式** | 异步解耦：业务事件 → Redis Pub/Sub 或 MQ → Python worker 消费发信/推送 |
| **Next.js 端变更** | `sendVerificationCode()` 改为调用内部 HTTP `POST /api/notify/send-email`，或直接往 Redis `email_queue` 塞任务 |

#### P1-2. 图片处理与上传管道

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | [src/shared/utils/image-utils.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/shared/utils/image-utils.ts)（魔数校验）、[src/modules/community/server/forum/uploads.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/community/server/forum/uploads.ts)、[src/modules/tools/server/resource/upload.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/tools/server/resource/upload.ts) |
| **当前职责** | 文件魔数校验（JPEG/PNG/GIF/WebP 前 12 字节）；头像/论坛图/资源上传 |
| **为什么迁移到 Python** | • **Pillow（PIL）**：压缩、裁剪、缩略图、格式转换（WebP/AVIF）、EXIF 剥离、水印、自适应调色板，一站式解决<br>• **二维码**：`qrcode` 库生成 2FA 二维码、活动签到二维码，与 TOTP secret 生成配合<br>• **头像生成**：未来扩展 Identicon / Dicebear 风格头像生成，Python PIL 实现简单 |
| **推荐 Python 栈** | FastAPI + Pillow + qrcode + python-multipart |
| **Next.js 端变更** | 上传 API `src/app/api/community/forum/upload/route.ts` 改为内部转发到 Python `/api/upload/image`，或采用**预签名 URL 模式**：Python 返回 S3/OSS 预签名，前端直传 |

#### P1-3. 数据统计与报表导出

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | [src/modules/events/server/stats.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/events/server/stats.ts)（活动统计）、[src/modules/admin/server/audit.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/admin/server/audit.ts)（审计日志查询） |
| **当前职责** | 活动报名 / 签到等基础聚合统计；审计日志按条件筛选 |
| **为什么迁移到 Python** | • **pandas**：多维度交叉分析、时间序列重采样、缺失值填充、同比环比，代码量是 SQL + TS 的 1/5<br>• **可视化**：matplotlib / plotly 生成活动趋势图、用户增长曲线，直接嵌入管理员面板或导出 PDF<br>• **报表导出**：openpyxl 生成 Excel（带格式/图表）、python-docx 生成 Word 报告 |
| **推荐 Python 栈** | FastAPI + pandas + plotly + openpyxl |
| **Next.js 端变更** | 管理面板「数据统计」Tab 的 API 调用改为 Python 服务端点 |

---

### P2 — 中等匹配度（可选 / 按需迁移）

#### P2-1. 分布式速率限制器（Redis 版）

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | [src/shared/security/rate-limiter.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/shared/security/rate-limiter.ts) |
| **当前实现** | 进程内 Map 单实例实现；注释已注明「多实例需换 Redis」 |
| **为什么迁移到 Python** | Redis 限流的 Lua 脚本在 Python `redis-py` 侧写起来非常顺手，**但该模块也可直接在 TS 端换 `ioredis` 实现，非强制 Python** |
| **推荐 Python 栈** | FastAPI + redis-py + Lua 脚本（滑动窗口 / 令牌桶） |
| **折中方案**：更简单的做法是 TS 端直接引入 `ioredis` + Lua 脚本，不必独立成 Python 服务 |

#### P2-2. 考试题目导入导出（Excel / Word）

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | [src/modules/tools/server/exam/questions.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/tools/server/exam/questions.ts) |
| **当前职责** | CRUD 题目（单选 / 编程题），无批量导入导出 |
| **为什么迁移到 Python** | `openpyxl` 读 Excel 模板、`python-docx` 解析 Word 题库、图片与公式提取，是 Python 生态最成熟的场景 |
| **推荐 Python 栈** | FastAPI + openpyxl + python-docx |

---

## 三、适合迁移到 Java 的组件清单

> **Java 生态优势区**：企业级安全（Spring Security）、声明式事务（JPA）、高并发、分布式消息、权限 RBAC、批处理
> **推荐通信方式**：Next.js BFF → Java 服务，内部 HTTP / gRPC；异步场景用 RabbitMQ / Kafka
> **推荐基础栈**：JDK 21 LTS + Spring Boot 3.3 + Spring Security 6 + Spring Data JPA / MyBatis-Plus + Redis

---

### ⭐ P0 — 极高匹配度（首批迁移，提升安全与标准化程度）

#### P0-1. 认证与授权体系（Spring Security 全家桶）

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | • 会话：[src/modules/auth/server/session.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/auth/server/session.ts)<br>• 身份：[src/modules/auth/server/identity.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/auth/server/identity.ts)<br>• TOTP 2FA：[src/modules/auth/server/totp.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/auth/server/totp.ts)（自实现 RFC 6238 + AES-256-GCM + HKDF）<br>• OAuth：[src/modules/auth/server/oauth.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/auth/server/oauth.ts)（GitHub OAuth）<br>• 密码：[src/modules/auth/server/password.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/auth/server/password.ts)（自实现 scrypt）<br>• 权限：[src/shared/security/permissions.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/shared/security/permissions.ts) |
| **当前职责** | 自实现：scrypt 哈希、HKDF 密钥派生、AES-256-GCM 加密 TOTP secret、RFC 6238 TOTP 算法、Session Token 生成、6 种角色 × 20+ 权限点矩阵 |
| **为什么迁移到 Java** | • **Spring Security 6**：业界标杆，Session 管理、TOTP（内置 `TOTPTokenGenerator`）、OAuth2 Login、RBAC、Remember-Me、CSRF 防护全部开箱即用<br>• **密码学标准化**：不要再自造 scrypt/HKDF/AES-GCM 轮子 → 用 `Spring Security Crypto` + `BouncyCastle` 标准化实现，减少密码学漏洞风险<br>• **6 角色 RBAC**：`admin / root / content_moderator / exam_admin / task_publisher / user` 正是 `@PreAuthorize("hasRole('ADMIN') and hasPermission(#targetId, 'user', 'edit')")` 的典型用例 |
| **推荐 Java 栈** | Spring Boot 3 + Spring Security 6 + Spring Session Data Redis + JWT（或 Session Cookie）+ Spring Authorization Server（如果以后要做 OAuth Provider） |
| **Next.js 端变更** | • `src/app/api/auth/*` 所有路由改为转发到 Java `/auth/**`<br>• 登录态：Java Set-Cookie 下发 SameSite=Secure; HttpOnly; Session Cookie（由浏览器跨子域携带）<br>• 鉴权：Next.js `middleware.ts` 调用 Java `/auth/me` 校验 Session，拿到用户信息后写入 RSC 上下文 |
| **注意事项** | 迁移前必须导出所有用户的 `(password_hash, totp_secret_encrypted, backup_codes)` 并在 Java 端用相同算法兼容；过渡期建议两种登录态并存（双写） |

#### P0-2. 管理员操作审计日志（AOP 无侵入式）

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | [src/shared/security/audit.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/shared/security/audit.ts) |
| **当前职责** | 每个 Service 函数手动调用 `logAdminAction()` 埋点，`maskSensitiveFields()` 脱敏后写 `admin_actions` 表 |
| **为什么迁移到 Java** | • **Spring AOP**：自定义 `@AuditLog(action = "USER_DISABLE", target = "#userId")` 注解，切面无侵入拦截所有管理后台方法，不用每个函数手动写埋点<br>• **一致性**：统一记录操作人、IP、UA、方法入参、返回值、耗时、异常堆栈，绝不漏埋<br>• **脱敏**：Jackson 自定义序列化或 `@Sensitive` 注解统一处理密码、邮箱等字段 |
| **推荐 Java 栈** | Spring Boot AOP + 自定义注解 + Jackson 脱敏序列化器 |
| **使用示例** | ```java<br>@AuditLog(action = "USER_DISABLE")<br>@PreAuthorize("hasRole('ADMIN')")<br>public void disableUser(@AuditTarget String userId) { ... }<br>``` |

---

### ⭐ P1 — 高匹配度

#### P1-1. RBAC 角色与用户管理后台

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | • 角色：[src/modules/admin/server/roles.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/admin/server/roles.ts)<br>• 用户：[src/modules/admin/server/users.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/admin/server/users.ts)<br>• 密码重置：[src/modules/admin/server/password-reset.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/admin/server/password-reset.ts) |
| **当前职责** | 用户/角色/权限的 CRUD、关系维护、条件检索分页、批量操作 |
| **为什么迁移到 Java** | • **JPA 关系映射**：User ↔ Role ↔ Permission 多对多关系，JPA `@ManyToMany` + `@JoinTable` 天然适合<br>• **Spring Data JPA `Pageable`**：多条件复杂检索 + 分页 + 排序，一行代码解决 |
| **推荐 Java 栈** | Spring Boot + Spring Data JPA + QueryDSL / Specification（动态条件） + MapStruct（DTO 转换） |

#### P1-2. 考试系统核心事务（答题提交 / 排名）

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | • 答题记录：[src/modules/tools/server/exam/attempts.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/tools/server/exam/attempts.ts)<br>• 考试 CRUD：[src/modules/tools/server/exam/crud.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/tools/server/exam/crud.ts) |
| **当前职责** | 答题提交（答案写入 + 自动判分）、结束考试（多表更新）、排行榜计算 |
| **为什么迁移到 Java** | • **强一致事务**：「答案写入 + 分数计算 + 排名更新 + 积分发放」是典型多表原子操作，`@Transactional(isolation = REPEATABLE_READ)` + 乐观锁保证一致性<br>• **并发安全**：考试结束瞬间大量提交，用 Spring 并发编程 + Redis 预计算降低 DB 压力<br>• **未来扩展**：防作弊（IP 去重、切题次数检测、雷同卷余弦相似度）适合用 Java 批处理异步跑 |
| **推荐 Java 栈** | Spring Boot + Spring Data JPA + Redis（排行榜 ZSet） + Redisson 分布式锁 |

#### P1-3. 事件总线 / 通知分发（异步解耦）

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | • 总线：[src/shared/events/event-bus.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/shared/events/event-bus.ts)（进程内发布订阅）<br>• 事件：[src/modules/notification/server/notification-events.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/notification/server/notification-events.ts) |
| **当前职责** | 进程内 `EventEmitter` 实现事件扇出：`UserRegisteredEvent → 发送邮件 + 发送站内信 + 记录审计 + 发放注册积分` |
| **为什么迁移到 Java** | • **MQ 标准化**：RabbitMQ / Kafka / RocketMQ 的 Spring 客户端（Spring AMQP / Spring Kafka）最成熟<br>• **可靠性**：消息持久化、ACK 机制、死信队列、延迟队列（到期自动关闭考试）<br>• **解耦**：未来 Python / Java / TS 各服务都能订阅同一事件总线 |
| **推荐 Java 栈** | Spring Boot + Spring Kafka 或 Spring AMQP（RabbitMQ） + 领域事件（`ApplicationEventPublisher`） |

---

### P2 — 中等匹配度

#### P2-1. 活动报名 / 签到核销（高并发场景）

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | • 报名：[src/modules/events/server/registration.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/events/server/registration.ts)<br>• 签到：[src/modules/events/server/checkin.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/events/server/checkin.ts) |
| **当前职责** | 活动限额报名、二维码签到核销 |
| **为什么迁移到 Java** | 高并发签到「超卖防重」是经典场景：Redis 预扣库存 + Redisson 分布式锁 + DB 最终一致性 + MQ 异步落库，Java 方案非常成熟 |

#### P2-2. 论坛积分与排行榜（批处理刷榜）

| 项 | 说明 |
|----|------|
| **当前 TS 源文件** | [src/modules/tools/server/points.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/Fztbu-CS-WebProject/src/modules/tools/server/points.ts) |
| **当前职责** | 按行为事件累计积分，返回用户总积分；排行榜现算 |
| **为什么迁移到 Java** | • **Spring Batch**：每日跑批刷新日榜 / 周榜 / 月榜，写入 Redis ZSet，Top-N 查询 O(1)<br>• **流式计算**：未来接入 Flink / Kafka Streams 做实时积分窗口 |

---

## 四、**不建议迁移**的组件清单（留在 Next.js 端）

| 组件 | 路径 | 原因 |
|------|------|------|
| 全部 `ui/` 目录 | `src/modules/<name>/ui/*.tsx` | React + Tailwind 专属，无对应 Python/Java 同构方案 |
| 全部 SSR 页面 | `src/app/*/page.tsx` | Next.js App Router 强绑定（RSC / Server Actions / 流式 SSR），移出会失去核心优势 |
| 动效组件 | `src/components/effects/*`（mobius-ring / motion-primitives / scroll-indicator） | Motion / Canvas 粒子动画，纯前端领域 |
| React Hooks | `src/shared/hooks/*`（use-auth / use-debounce 等） | 前端状态逻辑，无后端等价概念 |
| 通用 UI 原子组件 | `src/components/primitives/*`、`src/components/layout/*` | 悬浮胶囊导航、编辑式极简美学设计系统，与 React 深度绑定 |
| 路由层（`app/api/*`） | `src/app/api/*/route.ts` | Next.js 路由与 Node 运行时绑定；迁移只需把 route handler 内部逻辑改为内部 HTTP 转发即可，不必重写路由本身 |

---

## 五、目标架构：多语言微服务化全景

```
┌─────────────────────────────────────────────────────────────────┐
│                        浏览器 / 小程序 / App                     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
             ┌───────────────▼──────────────────┐
             │   Next.js 16 BFF + SSR 网关       │ ← 保留全部 SSR + RSC + 路由
             │   (src/app/* 全部 page + route)   │   UI 渲染层永远在此
             │   middleware.ts 做统一鉴权转发    │
             └───┬───────────┬──────────────────┘
                 │           │
         REST/HTTP      REST/HTTP (内部 gRPC 可选)
                 │           │
   ┌─────────────▼──┐   ┌────▼───────────────────────────────┐
   │  Python 微服务  │   │  Java 微服务 (Spring Boot 3 / JDK21)│
   │  Port: 8000    │   │  Port: 8080                         │
   │                │   │                                      │
   │  ✦ Auxilio AI  │   │  ✦ 认证授权 (Spring Security 6)     │
   │    - LLM + RAG │   │    - Session / JWT / TOTP / OAuth   │
   │    - 学习分析  │   │  ✦ RBAC 权限后台 (6 角色 × 20+ 权限)│
   │    - 薄弱点识别│   │  ✦ 管理员审计 (AOP @AuditLog)        │
   │  ✦ 内容审核    │   │  ✦ 考试事务核心 (答题/排名)          │
   │    - NLP + OCR │   │  ✦ 事件总线 + MQ (Kafka/RabbitMQ)    │
   │    - 图片鉴黄   │   │  ✦ 活动签到 + 排行榜 (Redis ZSet)   │
   │  ✦ 邮件/推送   │   │                                      │
   │    - Celery 队列│   │                                      │
   │  ✦ 图片处理    │   │                                      │
   │    - Pillow    │   │                                      │
   │  ✦ 数据分析    │   │                                      │
   │    - pandas    │   │                                      │
   └──────┬─────────┘   └──────────────┬──────────────────────┘
          │                            │
          └──────────────┬─────────────┘
                         │ 共用
           ┌─────────────▼──────────────────┐
           │   数据层 / 中间件               │
           │   ├── PostgreSQL (主库)         │ ← DDL 用 Drizzle Kit / Flyway 统一管理
           │   ├── Redis (缓存 + 队列)       │ ← 跨服务共享：Session / RateLimit / 排行榜
           │   ├── Kafka / RabbitMQ (MQ)     │ ← Python ↔ Java ↔ TS 异步事件总线
           │   └── MinIO / OSS (文件存储)    │ ← 头像 / 论坛图 / 资源文件
           └─────────────────────────────────┘
```

### 统一通信契约（跨语言必须遵守）

| 场景 | 通信方式 | 契约定义 |
|------|----------|----------|
| 同步请求 | REST/HTTP (JSON) 优先，性能敏感用 gRPC | OpenAPI v3 / Proto3 维护于共享仓库 `api-contracts/` |
| 异步事件 | Kafka Topic（领域事件） | JSON Schema 定义事件 envelope：`{event_id, type, timestamp, payload, source}` |
| 鉴权 | Session Cookie (SameSite=Secure) + `/auth/me` 内部校验 | Java 端签发；Next.js middleware 透明转发 |
| 数据一致性 | 数据库：各服务直连同一 PG，schema 前缀隔离（`auth_*` / `exam_*` / ...）；跨服务事务用 Saga + MQ |

---

## 六、迁移优先级路线图（10 个阶段，价值最高 / 风险最小优先）

| 阶段 | 模块 | 目标语言 | 迁移复杂度 | 业务价值 | 依赖前置 |
|------|------|----------|------------|----------|----------|
| **T1** | **Auxilio Agent 学习助手**（独立 API，无依赖） | Python | ⭐ 低（3 个纯函数 → FastAPI） | ⭐⭐⭐⭐⭐ 极高（打开 AI 能力空间） | 无，可独立运行 |
| **T2** | **认证/授权体系**（Spring Security 全家桶） | Java | ⭐⭐⭐ 中（涉及全站登录态） | ⭐⭐⭐⭐⭐ 极高（安全标准化，去掉自研密码学） | T1 完成即可并行启动；需双写过渡期 |
| **T3** | **审计日志 AOP**（正交横切，零业务侵入） | Java | ⭐ 低（注解 + AOP 切面） | ⭐⭐⭐⭐ 高 | T2（与 Java 权限后台一起部署） |
| **T4** | **RBAC 权限后台**（用户/角色/权限 CRUD） | Java | ⭐⭐⭐ 中（大量 CRUD + 关系） | ⭐⭐⭐⭐ 高 | T2 + T3 |
| **T5** | **邮件 + 多渠道通知**（独立服务） | Python | ⭐ 低 | ⭐⭐⭐⭐ 高 | Redis；可与 T1 同服务部署 |
| **T6** | **图片处理管道**（头像/论坛图/资源上传） | Python | ⭐ 低 | ⭐⭐⭐ 中 | MinIO/OSS；可与 T1 同服务部署 |
| **T7** | **考试核心事务**（答题/排名/防作弊） | Java | ⭐⭐⭐⭐ 高（答题流程复杂，事务边界多） | ⭐⭐⭐⭐ 高 | T2（需要 Spring Security 鉴权）+ Redis |
| **T8** | **论坛内容审核（NLP）**（异步管道） | Python | ⭐⭐⭐ 中（模型部署需要 GPU 或推理 API） | ⭐⭐⭐ 中 | T5（发消息到 Redis 流）；可延后 |
| **T9** | **活动签到 / 排行榜** | Java | ⭐⭐⭐ 中 | ⭐⭐⭐ 中 | T7（Redis 排行榜经验复用） |
| **T10** | **数据统计报表**（管理面板增强） | Python | ⭐ 低 | ⭐⭐ 低（锦上添花） | 任何阶段，可最晚 |

---

## 七、迁移步骤模板（每个阶段通用 SOP）

```
1. 契约先行
   ├── 从 src/modules/<name>/types/index.ts 提取 DTO，生成目标语言等价类型
   ├── 定义 OpenAPI v3 / Proto3 接口契约
   └── 写入 api-contracts/<module>.yaml，提交代码仓库

2. 影子部署（Shadow Mode）
   ├── 新服务按契约实现 endpoint
   ├── Next.js 端 route handler 双写：既跑原 TS 逻辑，又异步发 HTTP 到新服务
   ├── 收集 7 天日志，对比两边返回值一致性（字段、排序、数量）
   └── 一致性 ≥ 99.9% 进入下一步

3. 流量切分（Canary Release）
   ├── 引入 1% → 10% → 50% → 100% 的流量灰度
   ├── 旧 TS 逻辑保留作为 fallback（请求失败自动降级）
   └── 指标：P99 延迟、错误率、业务指标（登录成功率、答题提交成功率）

4. 下线旧代码
   ├── 100% 流量稳定运行 7 天后
   ├── 删除 TS 端对应 server/*.ts 业务逻辑
   ├── route handler 改为「薄转发」，仅做参数校验 + 转发
   └── 更新本文档迁移状态清单
```

---

## 八、风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 认证体系迁移导致用户全部登出 / 无法登录 | P0 阻断 | 双写过渡期：TS + Java 共用 Redis Session，两边 Set-Cookie，兼容 30 天；分批灰度管理员 → 版主 → 普通用户 |
| 跨服务分布式事务不一致 | 数据错乱 | Saga 编排 + MQ 补偿；不要跨服务强一致，仅保证最终一致；DB 用单实例 + schema 前缀隔离 |
| 多语言联调成本高 | 迭代变慢 | 强制 OpenAPI / Proto 契约版本化 + 自动化契约测试（Pact / Spring Cloud Contract） |
| 运维部署复杂度上升 | 排障困难 | 统一 Docker 镜像 + docker-compose 一键本地启动；OpenTelemetry 全链路追踪 |
| TOTP secret 加密算法不兼容 | 2FA 全部失效 | 迁移前用旧算法解密所有 secret，用新算法重加密；或 Java 端实现与 TS 端完全相同的 HKDF + AES-256-GCM |
