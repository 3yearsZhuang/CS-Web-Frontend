# API 接口参考

> 最后更新：2026-08-01（修复 community 路径重复 + instrumentation 代码片段同步）
> 验证 cadence：API 契约变更时 | Stale 信号：API 端点清单与实际路由不一致

---

## 一、通用约定

### 1.1 基础 URL

```
开发环境：http://localhost:2333
生产环境：https://<your-domain>
```

### 1.2 鉴权机制

| 鉴权级别 | 标识 | 说明 |
|---------|------|------|
| 公开 | - | 无需登录，任何人可访问 |
| 登录 | `requireAuth` | 需携带有效 Session Cookie |
| 管理员 | `requireAdmin` | 需登录 + 角色为 `admin` 或 `root` |
| 超级管理员 | `requireRoot` | 需登录 + 角色为 `root` |

### 1.3 请求/响应格式

- Content-Type：`application/json`
- 成功响应：`{ success: true, data?: ... }`
- 错误响应：`{ error: string }` + 对应 HTTP 状态码

### 1.4 安全措施

所有写操作（POST/PUT/DELETE）均实施：
- Origin 白名单校验
- 速率限制（登录路由：5 次/分钟/IP；写操作：5-10 次/分钟/IP）
- 管理员操作：审计日志记录到 `admin_actions` 表

---

## 二、认证模块（/api/auth/）

### 2.1 基础认证

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 公开 | 用户注册（邮箱 + 密码 + 验证码） |
| POST | `/api/auth/login` | 公开 | 用户登录（邮箱 + 密码） |
| POST | `/api/auth/logout` | 登录 | 登出，销毁 Session |
| GET | `/api/auth/me` | 登录 | 获取当前登录用户信息 |
| POST | `/api/auth/send-code` | 公开 | 发送邮箱验证码（注册/找回密码） |
| POST | `/api/auth/forgot-password` | 公开 | 申请密码重置（发送重置邮件） |
| GET | `/api/auth/oauth/github` | 公开 | GitHub OAuth 登录入口（302 重定向） |
| GET | `/api/auth/oauth/github/callback` | 公开 | GitHub OAuth 回调处理 |

### 2.2 双因素认证（TOTP）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/auth/2fa` | 登录 | 查询 2FA 状态（是否启用 / 是否已设置） |
| POST | `/api/auth/2fa/setup` | 登录 | 初始化 2FA（生成 secret + QR + backup codes，未确认前不生效） |
| POST | `/api/auth/2fa/verify` | 登录 | 验证码（设置确认 / 登录二次验证） |
| POST | `/api/auth/2fa/disable` | 登录 | 禁用 2FA（需验证码） |
| POST | `/api/auth/2fa/backup-codes` | 登录 | 重新生成备用码（需验证码） |

> 备注：TOTP 基于 RFC 6238 自实现，secret 使用 AES-256-GCM 加密存储。管理员可被强制启用 2FA。

---

## 三、个人资料模块（/api/profile/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/profile` | 登录 | 获取当前用户完整资料 |
| PUT | `/api/profile` | 登录 | 更新个人资料（displayName、bio 等） |
| POST | `/api/profile/password` | 登录 | 修改密码（需旧密码验证） |
| POST | `/api/profile/avatar/upload` | 登录 | 上传自定义头像（2MB / JPEG/PNG/WebP） |
| POST | `/api/profile/avatar/preset` | 登录 | 设置预设头像（从预设列表中选择） |
| GET | `/api/avatars/[filename]` | 公开 | 头像静态文件服务 |

---

## 四、活动模块（/api/events/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/events` | 公开 | 活动列表（支持 status/type/page 参数） |
| GET | `/api/events/[id]` | 公开 | 活动详情 |
| POST | `/api/events/[id]/register` | 登录 | 报名活动 |
| GET | `/api/events/[id]/registration` | 登录 | 查询当前用户对某活动的报名状态 |
| GET | `/api/events/me/registered` | 登录 | 获取当前用户已报名的活动列表 |

---

## 五、论坛模块（/api/community/forum/）

### 5.1 版块

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/forum/categories` | 公开 | 版块列表 |

### 5.2 主题

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/forum/topics` | 公开 | 主题列表（支持 category/search/page/sort） |
| GET | `/api/community/forum/topics/[id]` | 公开 | 主题详情（含点赞/收藏状态） |
| POST | `/api/community/forum/topics` | 登录 | 创建主题（速率限制 5/min/IP） |
| PUT | `/api/community/forum/topics/[id]` | 作者/管理员 | 编辑主题 |
| DELETE | `/api/community/forum/topics/[id]` | 作者/管理员 | 软删除主题 |

### 5.3 回复

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/forum/topics/[id]/replies` | 公开 | 回复列表（主回复分页） |
| POST | `/api/community/forum/topics/[id]/replies` | 登录 | 创建回复（含楼中楼） |
| GET | `/api/community/forum/replies/[id]/nested` | 公开 | 楼中楼列表 |
| PUT | `/api/community/forum/replies/[id]` | 作者/管理员 | 编辑回复 |
| DELETE | `/api/community/forum/replies/[id]` | 作者/管理员 | 软删除回复 |

### 5.4 互动

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/community/forum/like` | 登录 | 切换点赞（target_type + target_id） |
| POST | `/api/community/forum/favorite` | 登录 | 切换收藏（topic_id） |
| GET | `/api/community/forum/favorites` | 登录 | 收藏列表 |

### 5.5 用户内容

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/forum/users/[id]/topics` | 公开 | 用户发布的主题 |
| GET | `/api/community/forum/users/[id]/replies` | 公开 | 用户发布的回复 |

### 5.6 上传

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/community/forum/upload` | 登录 | 图片上传（5MB / JPEG/PNG/WebP/GIF） |
| GET | `/api/community/forum/images/[filename]` | 公开 | 论坛图片静态服务 |

---

## 六、通知模块（/api/notifications/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/notifications` | 登录 | 通知列表（分页） |
| GET | `/api/notifications/unread-count` | 登录 | 未读通知数量 |
| POST | `/api/notifications/[id]/read` | 登录 | 标记单条通知为已读 |
| POST | `/api/notifications/read-all` | 登录 | 标记全部通知为已读 |

---

## 七、管理后台（/api/admin/）

### 7.1 用户管理（管理员 + 超级管理员）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/users` | 管理员 | 用户列表（含分页/搜索） |
| GET | `/api/admin/users/[id]` | 管理员 | 用户详情 |
| PUT | `/api/admin/users/[id]` | 超级管理员 | 编辑用户资料 |
| POST | `/api/admin/users/[id]/disable` | 管理员 | 禁用用户（仅普通用户） |
| POST | `/api/admin/users/[id]/enable` | 管理员 | 启用用户 |
| POST | `/api/admin/users/[id]/reset-password-default` | 管理员 | 重置密码为默认密码（仅普通用户） |

### 7.2 用户管理（仅超级管理员）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/admin/users/[id]/reset-password` | 超级管理员 | 自定义重置密码 |
| DELETE | `/api/admin/users/[id]` | 超级管理员 | 硬删除用户 |

### 7.3 密码重置审批

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/password-resets` | 管理员 | 密码重置申请列表 |
| POST | `/api/admin/password-resets/[id]/approve` | 管理员 | 批准密码重置申请 |
| POST | `/api/admin/password-resets/[id]/reject` | 管理员 | 拒绝密码重置申请 |

### 7.4 活动管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/events` | 管理员 | 活动列表（含管理字段） |
| POST | `/api/admin/events` | 管理员 | 创建活动 |
| PUT | `/api/admin/events/[id]` | 管理员 | 编辑活动 |
| DELETE | `/api/admin/events/[id]` | 管理员 | 删除活动 |

### 7.5 通知管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/notifications` | 管理员 | 通知列表（管理视图） |
| POST | `/api/admin/notifications` | 管理员 | 发送全站通知 |

### 7.6 审计日志（仅超级管理员）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/actions` | 超级管理员 | 管理员操作日志列表 |
| DELETE | `/api/admin/actions/[id]` | 超级管理员 | 删除指定日志条目 |

### 7.7 论坛管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/community/forum/topics` | 管理员 | 论坛主题列表（管理视图） |
| PUT | `/api/admin/community/forum/topics/[id]` | 管理员 | 编辑任意主题 |
| DELETE | `/api/admin/community/forum/topics/[id]` | 管理员 | 删除任意主题 |
| POST | `/api/admin/community/forum/topics/[id]/hide` | 管理员 | 隐藏主题 |
| POST | `/api/admin/community/forum/topics/[id]/restore` | 管理员 | 恢复主题 |
| POST | `/api/admin/community/forum/topics/[id]/pin` | 管理员 | 切换置顶 |
| POST | `/api/admin/community/forum/topics/[id]/feature` | 管理员 | 切换精华 |
| PUT | `/api/admin/community/forum/replies/[id]` | 管理员 | 编辑任意回复 |
| DELETE | `/api/admin/community/forum/replies/[id]` | 管理员 | 删除任意回复 |
| POST | `/api/admin/community/forum/replies/[id]/hide` | 管理员 | 隐藏回复 |
| POST | `/api/admin/community/forum/replies/[id]/restore` | 管理员 | 恢复回复 |
| GET | `/api/admin/community/forum/categories` | 管理员 | 版块列表（管理视图） |
| POST | `/api/admin/community/forum/categories` | 管理员 | 创建版块 |
| PUT | `/api/admin/community/forum/categories/[id]` | 管理员 | 编辑版块 |
| DELETE | `/api/admin/community/forum/categories/[id]` | 管理员 | 删除版块 |

### 7.8 博客管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/admin/community/blog` | 管理员 | 博客管理操作（publish/archive/delete） |

### 7.9 入社审批

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/join` | 管理员 | 入社申请列表（支持状态筛选） |
| PATCH | `/api/admin/join` | 管理员 | 审批入社申请（通过/拒绝） |

### 7.10 工具集管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/tools/exam` | 管理员(exam_admin) | 考试列表（管理视图） |
| POST | `/api/admin/tools/exam` | 管理员(exam_admin) | 创建考试 |
| PUT | `/api/admin/tools/exam/[id]` | 管理员(exam_admin) | 编辑考试 |
| DELETE | `/api/admin/tools/exam/[id]` | 管理员(exam_admin) | 删除考试 |
| POST | `/api/admin/tools/exam/[id]/publish` | 管理员(exam_admin) | 发布考试 |
| POST | `/api/admin/tools/exam/[id]/end` | 管理员(exam_admin) | 结束考试 |
| GET/POST | `/api/admin/tools/exam/[id]/questions` | 管理员(exam_admin) | 题目管理 |
| PUT/DELETE | `/api/admin/tools/exam/[id]/questions/[qid]` | 管理员(exam_admin) | 单题管理 |
| GET | `/api/admin/tools/exam/[id]/ranking` | 管理员(exam_admin) | 考试排名 |
| POST | `/api/admin/tools/resource` | 管理员 | 资源审核（通过/拒绝/下架） |
| POST | `/api/admin/tools/task` | 管理员(task_publisher) | 任务管理操作（create/publish/close/claim 审核） |

### 7.11 活动签到与统计

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/admin/events/[id]/checkin` | 管理员 | 活动签到核销 |
| POST | `/api/admin/events/[id]/registrations/manage` | 管理员 | 报名管理 |
| POST | `/api/admin/events/batch` | 管理员 | 活动批量操作 |
| GET | `/api/admin/events/stats` | 管理员 | 活动统计 |

### 7.12 公告管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/admin/announcements` | 管理员 | 公告列表 |
| POST | `/api/admin/announcements` | 管理员 | 创建公告 |
| GET | `/api/admin/announcements/[id]` | 管理员 | 公告详情 |
| PATCH | `/api/admin/announcements/[id]` | 管理员 | 编辑公告 |
| DELETE | `/api/admin/announcements/[id]` | 管理员 | 删除公告 |

---

## 八、博客模块（/api/community/blog/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/blog` | 公开 | 已发布文章列表（支持分类筛选/搜索/分页） |
| POST | `/api/community/blog` | 登录 | 创建草稿 |
| GET | `/api/community/blog/[slug]` | 公开 | 文章详情（含目录导航/点赞状态） |
| PUT | `/api/community/blog/[slug]` | 作者/管理员 | 编辑文章 |
| DELETE | `/api/community/blog/[slug]` | 作者/管理员 | 删除文章 |
| POST | `/api/community/blog/[slug]/like` | 登录 | 点赞/取消点赞 |
| GET | `/api/community/blog/series` | 公开 | 系列列表 |
| POST | `/api/community/blog/series` | 登录 | 创建系列 |

---

## 九、工具集模块（/api/tools/）

### 9.1 考试

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tools/exam` | 公开 | 题库列表（按标签筛选） |
| GET | `/api/tools/exam/[id]` | 登录 | 考试详情 |
| POST | `/api/tools/exam/[id]/submit` | 登录 | 提交答卷（自动判分） |
| GET | `/api/tools/exam/[id]/my-results` | 登录 | 我的成绩 |

### 9.2 资源

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tools/resource` | 公开 | 资源列表 |
| POST | `/api/tools/resource/upload` | 登录 | 上传资源（审核后公开） |

### 9.3 任务

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tools/task` | 公开 | 任务列表 |
| GET | `/api/tools/task/[id]` | 公开 | 任务详情 |
| POST | `/api/tools/task/[id]/claim` | 登录 | 认领任务 |
| DELETE | `/api/tools/task/[id]/claim` | 登录 | 取消认领 |
| GET | `/api/tools/task/[id]/claims` | 公开 | 任务认领列表 |
| GET | `/api/tools/task/claims` | 登录 | 我的认领 |

### 9.4 积分

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tools/points` | 登录 | 个人积分 |
| GET | `/api/tools/points/leaderboard` | 公开 | 排行榜 |

### 9.5 Auxilio 学习助手

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tools/auxilio` | 登录 | 学习分析（薄弱点画像 + 资源推荐） |

### 9.6 开发文档（/api/dev-docs/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/dev-docs` | admin+ | 列出 tools/docs 下所有 .md 文档（slug/标题/大小/修改时间） |
| GET | `/api/dev-docs/[slug]` | admin+ | 读取文档内容（返回 readOnly 字段标识是否可编辑） |
| PUT | `/api/dev-docs/[slug]` | root | 写入文档内容（1MB 限制，审计日志） |
| DELETE | `/api/dev-docs/[slug]` | root | 删除文档（审计日志） |

安全：路径穿越防护（slug 禁止 `/`、`..`、`\`）+ assertAllowedOrigin + adminActionsLimiter 限流。

---

## 十、成员与入社模块

### 10.1 成员名录

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/community/members` | 公开 | 成员名录（按技术方向筛选） |

### 10.2 入社申请

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/join` | 公开 | 提交入社申请（姓名/学号/专业/技术方向/联系方式） |

---

## 十一、会话管理模块（/api/sessions/）

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/sessions` | 登录 | 活跃会话列表（设备/IP/最后活跃时间） |
| DELETE | `/api/sessions` | 登录 | 远程登出指定会话 |

---

## 十二、速率限制参考

限制器集中定义于 [src/shared/security/security.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/shared/security/security.ts) 的 `RATE_LIMIT_CONFIG`。默认值可通过环境变量覆盖：`RATE_LIMIT_<NAME>_MAX`（窗口内最大次数）与 `RATE_LIMIT_<NAME>_WINDOW_MS`（窗口时长毫秒），`<NAME>` 为下表「限制器」列的大写形式（如 `RATE_LIMIT_LOGIN_MAX=20`）。

| 限制器 | 默认值 | 窗口 | key 维度 | 主要路由 |
|--------|:------:|:----:|---------|---------|
| `login` | 10 | 60s | IP+邮箱 | `POST /api/auth/login` |
| `register` | 5 | 60s | IP | `POST /api/auth/register` |
| `sendCode` | 3 | 60s | IP+email | `POST /api/auth/send-code` |
| `forgotPassword` | 3 | 60s | IP | `POST /api/auth/forgot-password` |
| `twoFactor` | 5 | 60s | IP+用户 | `POST /api/auth/2fa/verify`、`/disable`、`/backup-codes` |
| `twoFactorSetup` | 3 | 60s | IP+用户 | `POST /api/auth/2fa/setup`（防资源消耗 DoS） |
| `auth` | 20 | 60s | IP | `/api/auth/oauth/*` |
| `profileUpdate` | 10 | 60s | IP | `PATCH /api/profile`、`/api/profile/password`、`/api/sessions` |
| `avatarPreset` | 10 | 60s | IP | `POST /api/profile/avatar/preset` |
| `avatarUpload` | 5 | 60s | IP | `POST /api/profile/avatar/upload` |
| `adminActions` | 30 | 60s | IP | `/api/admin/*`、`/api/tools/component-registry/*` |
| `forumPost` | 5 | 60s | IP | `POST /api/community/forum/topics` |
| `forumReply` | 10 | 60s | IP | `POST /api/community/forum/topics/[id]/replies`、`/api/tools/exam/[id]/submit` |
| `forumLike` | 30 | 60s | IP | `POST /api/community/forum/like`、`/favorite` |
| `forumUpload` | 10 | 60s | IP | `POST /api/community/forum/upload`、`/api/tools/resource/upload` |
| `eventCheckin` | 10 | 60s | IP | `POST /api/admin/events/[id]/checkin` |
| `resourceSubmit` | 5 | 60s | IP | 已定义预留（当前路由复用 `forumUpload`/`forumReply`） |
| `resourceUpload` | 5 | 60s | IP | 已定义预留（当前路由复用 `forumUpload`） |
| `joinApplication` | 3 | 60s | IP | 已定义预留（入社申请审核走 `adminActions`） |
| 读操作 | - | - | - | 无硬限制 |

> 限制器为单进程内存实现（`Map`），适合单实例部署；多实例部署前必须迁移到 Redis 等共享存储。响应头 `Retry-After` 与 `X-RateLimit-Remaining` 标识剩余配额。

---

## 十三、状态码约定

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 302 | 重定向（OAuth） |
| 400 | 请求参数错误 |
| 403 | 401 |
| 401 | 未登录 / Session 过期 |
| 404 | 403 |
| 409 | 冲突（如重复注册、重复报名） |
| 413 | 上传文件过大 |
| 429 | 速率限制 |
| 500 | 服务器内部错误 |

---

## 十四、错误响应扩展

### 14.1 标准错误响应格式

所有 API 错误响应统一格式：

```json
{
  "error": "string",
  "code": "string",
  "details": {}
}
```

| 字段 | 必填 | 说明 |
|------|:---:|------|
| `error` | ✅ | 人类可读的错误消息（已映射，不泄露内部信息）|
| `code` | ✅ | 机器可读的错误码（见下表）|
| `details` | ❌ | 字段级错误详情（仅 Zod 校验失败时返回）|

### 14.2 错误码清单

> 对应 [Devdocs-security.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-security.md) 发现 15「错误响应不泄露内部信息」。

| code | HTTP | 触发场景 |
|------|:----:|---------|
| `INVALID_ORIGIN` | 403 | Origin/Referer 不在白名单 |
| `INVALID_CONTENT_TYPE` | 400 | Content-Type 非 application/json |
| `VALIDATION_FAILED` | 400 | Zod schema 校验失败（含 `details`）|
| `UNAUTHORIZED` | 401 | 未登录或 Session 过期 |
| `FORBIDDEN` | 403 | 权限不足（角色不够 / 非作者）|
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 状态冲突（重复操作）|
| `RATE_LIMITED` | 429 | 触发速率限制（含 `retryAfter` 字段）|
| `FILE_TOO_LARGE` | 413 | 上传文件超限 |
| `INVALID_FILE_TYPE` | 400 | 文件类型不在白名单 |
| `ACCOUNT_DISABLED` | 403 | 用户已被禁用 |
| `2FA_REQUIRED` | 403 | 需要完成 2FA 验证 |
| `2FA_FAILED` | 403 | 2FA 验证码错误 |
| `PASSWORD_CONFIRMATION_REQUIRED` | 403 | 高危操作需密码二次确认 |
| `LAST_ADMIN_PROTECTED` | 403 | 试图降级/删除最后一个管理员 |
| `INTERNAL_ERROR` | 500 | 未知错误（记录日志，返回通用消息）|

### 14.3 Zod 校验错误详情示例

```json
{
  "error": "请求参数错误",
  "code": "VALIDATION_FAILED",
  "details": {
    "email": "请输入有效的邮箱地址",
    "password": "密码至少 8 位"
  }
}
```

---

## 十五、事件总线接口

> 事件总线为进程内通信，非 HTTP 接口。此处记录事件契约，供模块开发参考。
>
> 对应 [Devdocs-project-rules.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-project-rules.md) 模块协作规范、[Devdocs-roadmap.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-roadmap.md) ADR-013/014。

### 15.1 事件总线 API

```typescript
import { appBus } from '@/shared/events';

// 发布事件
appBus.emit('event.created', { eventId, title, description, adminId });

// 订阅事件
appBus.on('reply.created', (data) => { ... });

// 取消订阅
appBus.off('reply.created', handler);
```

运行时特性：
- 同步 emit：Node.js EventEmitter 默认同步执行所有监听器（对应 ADR-014）
- 类型安全：通过 `AppEventMap` 约束事件名和 payload
- 单例：模块级导出 `appBus`，全进程共享

### 15.2 事件清单

所有事件类型定义于 [src/shared/events/event-types.ts](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/src/shared/events/event-types.ts)。

| 事件名 | 发布方 | 订阅方 | Payload |
|--------|--------|--------|---------|
| `event.created` | events 模块 | notification | `{ eventId, title, description, adminId }` |
| `event.registered` | events 模块 | notification | `{ userId, eventId, eventTitle }` |
| `event.cancelled` | events 模块 | notification | `{ userId, eventId, eventTitle }` |
| `event.checkin.generated` | admin 模块 | notification | `{ eventId, adminId, generated }` |
| `reply.created` | community 模块 | notification | `{ replyId, topicId, authorId, contentMarkdown, mentionedUserIds }` |
| `user.registered` | auth 模块 | notification | `{ userId }` |
| `task.claim.approved` | tools 模块 | notification | `{ userId, taskId, taskTitle, points }` |
| `exam.passed` | tools 模块 | notification | `{ userId, examId, examTitle, score, points }` |

### 15.3 新增事件流程

1. 在 `src/shared/events/event-types.ts` 的 `AppEventMap` 接口添加事件类型
2. 发布方调用 `appBus.emit('event.name', payload)`
3. 订阅方调用 `appBus.on('event.name', handler)`，handler 内部 try-catch
4. 更新本章节的事件清单表格
5. 更新 [Devdocs-architecture.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-architecture.md) 依赖矩阵（如新增模块间依赖）

### 15.4 事件监听器初始化

> 对应 [ADR-013](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-roadmap.md#adr-013-事件监听器显式初始化)（已实施 2026-07-29）。

通知模块事件监听器迁移至 `src/instrumentation.ts` 显式初始化（逻辑委托给 `src/instrumentation-node.ts`，server-only，使用 pino logger），不再依赖模块加载副作用：

```typescript
// src/instrumentation.ts - Next.js instrumentation 入口
// 实际初始化逻辑委托给 instrumentation-node.ts（server-only，使用 pino logger）
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@/instrumentation-node');
  }
}
```

`instrumentation-node.ts` 显式调用 `initNotificationEvents()` 注册通知事件监听器，并注册 `unhandledRejection`/`uncaughtException` 全局处理器写入 pino 结构化日志（ADR-013 + ADR-015）。`initNotificationEvents()` 内部有幂等保护（`initialized` 标志），重复调用安全。基础健康检查 `/api/health` 已就绪；事件监听器状态探活端点 `/api/health/events` 规划中。

---

## 十六、版本化与兼容性策略

### 16.1 API 版本策略

当前 API 无版本前缀（如 `/api/v1/...`），采用向后兼容演进策略：

| 变更类型 | 策略 |
|---------|------|
| 新增端点 | 直接添加，无需版本 |
| 新增可选请求字段 | 允许，客户端忽略未知字段 |
| 新增响应字段 | 允许，客户端不应假设响应只有已知字段 |
| 修改字段语义 | 🚫 禁止，必须新增字段替代 |
| 移除字段 | 🚫 禁止，先标记废弃，下个大版本移除 |
| 改变鉴权要求 | 必须在 [Devdocs-security.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-security.md) 记录并通告 |

### 16.2 破坏性变更处理

当必须引入破坏性变更时：

1. 评估必要性：能否通过新增字段避免？对应 [Devdocs-roadmap.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-roadmap.md) FF2（公开契约兼容）
2. 记录 ADR：在 roadmap 新增 ADR 说明变更原因和影响
3. 双写过渡：新旧字段同时返回，旧字段标记 `@deprecated`
4. 客户端迁移：通告所有已知客户端，提供迁移窗口
5. 移除旧字段：确认无客户端依赖后移除

### 16.3 响应字段稳定性

以下字段为稳定契约，客户端可依赖：

- `success: boolean` - 成功响应固定字段
- `error: string` - 错误响应固定字段
- `code: string` - 错误响应机器可读码（见第十四章）
- 分页响应的 `items` / `total` / `page` / `pageSize` 字段

其他业务字段（如 `displayName`、`bio`）可能随业务演进调整，客户端应做容错处理。

---

## 十七、健康检查端点

### 17.1 公开健康检查

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 公开 | 基础存活检查，返回 `{ status, timestamp, version, runtime, checks: { database, disk } }`；DB 异常时返回 503 |

响应示例（200）：

```json
{
  "status": "ok",
  "timestamp": "2026-07-29T10:00:00.000Z",
  "version": "0.1.0",
  "runtime": "nodejs",
  "checks": {
    "database": "ok",
    "disk": { "available": 5368709120, "free": 10737418240 }
  }
}
```

> 对应 roadmap Q5（已完成 2026-07-29）。不返回敏感信息（DB 路径、环境变量、用户数）。

### 17.2 安全健康检查（规划中）

> 对应 [Devdocs-security.md](file:///Users/3yearszhuang/Documents/Zhuang's_Projects/fztbucs-projects/tools/docs/Devdocs-security.md) 第十一章。

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health/events` | 超级管理员 | 事件监听器注册状态 |
| GET | `/api/health/security` | 超级管理员 | 速率限制器状态、会话统计、迁移状态 |
