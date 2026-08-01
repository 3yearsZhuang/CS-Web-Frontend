/**
 * @file 权限点定义 — 三段式 module.resource.action，代码常量不进 DB；client + server 纯常量
 */

/**
 * 权限点定义
 */
export interface PermissionPoint {
  /** 权限点 key，三段式 `module.resource.action` */
  key: string;
  /** 中文标签 */
  label: string;
  /** 权限说明 */
  description: string;
  /** 是否仅 root 拥有（true 时不存 DB，硬编码在 hasPermission 中） */
  rootOnly?: boolean;
}

/**
 * 权限模块分组（用于 UI 展示）
 */
export interface PermissionModule {
  /** 模块 key */
  key: string;
  /** 模块中文标签 */
  label: string;
  /** 模块下的权限点 */
  permissions: PermissionPoint[];
}

/* ============= 权限模块与权限点 ============= */

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: 'forum',
    label: '论坛管理',
    permissions: [
      { key: 'forum.topic.update', label: '编辑任意主题', description: '修改其他用户发布的主题内容' },
      { key: 'forum.topic.delete', label: '硬删除主题', description: '永久删除主题（不可恢复）' },
      { key: 'forum.topic.hide', label: '隐藏主题', description: '将主题标记为隐藏，前台不展示' },
      { key: 'forum.topic.restore', label: '恢复主题', description: '取消隐藏状态' },
      { key: 'forum.topic.pin', label: '置顶主题', description: '切换主题置顶状态' },
      { key: 'forum.topic.feature', label: '加精主题', description: '切换主题精华状态' },
      { key: 'forum.reply.update', label: '编辑任意回复', description: '修改其他用户的回复内容' },
      { key: 'forum.reply.delete', label: '硬删除回复', description: '永久删除回复' },
      { key: 'forum.reply.hide', label: '隐藏回复', description: '将回复标记为隐藏' },
      { key: 'forum.reply.restore', label: '恢复回复', description: '取消回复隐藏状态' },
      { key: 'forum.category.create', label: '创建版块', description: '新增论坛分类' },
      { key: 'forum.category.update', label: '编辑版块', description: '修改分类名称、描述、排序' },
      { key: 'forum.category.delete', label: '删除版块', description: '删除论坛分类' },
    ],
  },
  {
    key: 'exam',
    label: '考试管理',
    permissions: [
      { key: 'exam.create', label: '创建考试', description: '新建考试场次' },
      { key: 'exam.update', label: '编辑考试', description: '修改考试信息' },
      { key: 'exam.delete', label: '删除考试', description: '永久删除考试' },
      { key: 'exam.publish', label: '发布考试', description: '将考试状态改为进行中' },
      { key: 'exam.end', label: '结束考试', description: '结束考试并锁定答案' },
      { key: 'exam.question.create', label: '创建题目', description: '新增考试题目' },
      { key: 'exam.question.update', label: '编辑题目', description: '修改题目内容' },
      { key: 'exam.question.delete', label: '删除题目', description: '永久删除题目' },
      { key: 'exam.ranking.view', label: '查看排名', description: '查看考试排名与成绩' },
    ],
  },
  {
    key: 'task',
    label: '任务管理',
    permissions: [
      { key: 'task.create', label: '创建任务', description: '新建任务' },
      { key: 'task.update', label: '编辑任务', description: '修改任务内容' },
      { key: 'task.delete', label: '删除任务', description: '永久删除任务' },
      { key: 'task.publish', label: '发布任务', description: '将任务状态改为进行中' },
      { key: 'task.close', label: '关闭任务', description: '结束任务并锁定认领' },
      { key: 'task.claim.review', label: '审核认领', description: '通过或拒绝用户的任务认领申请' },
    ],
  },
  {
    key: 'event',
    label: '活动管理',
    permissions: [
      { key: 'event.create', label: '创建活动', description: '新增活动' },
      { key: 'event.update', label: '编辑活动', description: '修改活动信息' },
      { key: 'event.delete', label: '删除活动', description: '永久删除活动' },
      { key: 'event.batch_update', label: '批量更新', description: '批量修改活动状态' },
      { key: 'event.registration.manage', label: '报名管理', description: '管理员代报名、修改报名状态' },
      { key: 'event.checkin.generate', label: '生成签到码', description: '为活动生成签到码' },
      { key: 'event.checkin.verify', label: '现场签到', description: '核销签到码完成签到' },
    ],
  },
  {
    key: 'blog',
    label: '博客管理',
    permissions: [
      { key: 'blog.post.update', label: '编辑任意文章', description: '修改其他用户的博客文章' },
      { key: 'blog.post.publish', label: '发布审核', description: '审核并发布待发布文章' },
      { key: 'blog.post.archive', label: '归档文章', description: '将文章标记为归档状态' },
      { key: 'blog.post.delete', label: '删除文章', description: '永久删除博客文章' },
    ],
  },
  {
    key: 'resource',
    label: '资源站管理',
    permissions: [
      { key: 'resource.review', label: '资源审核', description: '审核用户上传的资源' },
    ],
  },
  {
    key: 'notification',
    label: '通知与公告',
    permissions: [
      { key: 'notification.broadcast', label: '群发通知', description: '向全体用户或指定角色发送站内通知' },
      { key: 'announcement.create', label: '创建公告', description: '新增系统公告' },
      { key: 'announcement.update', label: '编辑公告', description: '修改已有公告' },
      { key: 'announcement.delete', label: '删除公告', description: '永久删除公告' },
    ],
  },
  {
    key: 'join',
    label: '入社审批',
    permissions: [
      { key: 'join.review', label: '审批入社申请', description: '通过或拒绝入社申请' },
    ],
  },
  {
    key: 'password_reset',
    label: '密码重置审批',
    permissions: [
      { key: 'password_reset.list', label: '查看申请列表', description: '查看忘记密码重置申请' },
      { key: 'password_reset.approve', label: '批准重置', description: '批准密码重置申请' },
      { key: 'password_reset.reject', label: '拒绝重置', description: '拒绝密码重置申请' },
    ],
  },
  {
    key: 'user',
    label: '用户管理',
    permissions: [
      { key: 'user.list', label: '查看用户列表', description: '查看全体用户列表' },
      { key: 'user.view', label: '查看用户详情', description: '查看单个用户详细信息' },
      { key: 'user.disable', label: '禁用用户', description: '禁用普通用户账号' },
      { key: 'user.enable', label: '启用用户', description: '启用被禁用的账号' },
      { key: 'user.reset_password_default', label: '默认重置密码', description: '将用户密码重置为默认密码' },
      { key: 'user.update', label: '编辑用户资料', description: '修改用户资料、角色、标签', rootOnly: true },
      { key: 'user.delete', label: '硬删除用户', description: '永久删除用户账号', rootOnly: true },
      { key: 'user.reset_password_custom', label: '自定义重置密码', description: '将用户密码重置为自定义值', rootOnly: true },
    ],
  },
  {
    key: 'audit',
    label: '日志管理',
    permissions: [
      { key: 'audit.view', label: '查看审计日志', description: '查询管理员操作审计记录', rootOnly: true },
      { key: 'audit.delete', label: '删除审计日志', description: '删除单条或批量清理过期审计日志', rootOnly: true },
    ],
  },
  {
    key: 'role',
    label: '角色权限管理',
    permissions: [
      { key: 'role.manage', label: '管理角色权限', description: '访问 [ 00 ] 角色权限管理面板', rootOnly: true },
      { key: 'role.assign', label: '分配用户角色', description: '修改用户的角色字段', rootOnly: true },
    ],
  },
];

/**
 * 所有权限点（扁平化，便于查找）
 */
export const ALL_PERMISSIONS: PermissionPoint[] = PERMISSION_MODULES.flatMap(
  (m) => m.permissions,
);

/**
 * 所有权限点 key 集合（用于校验）
 */
export const ALL_PERMISSION_KEYS = new Set(ALL_PERMISSIONS.map((p) => p.key));

/**
 * root_only 权限 key 集合
 *
 * 这些权限不存 DB，仅 root 角色拥有；其他角色即使在 role_permissions 表中被授予也无效。
 */
export const ROOT_ONLY_PERMISSIONS = new Set(
  ALL_PERMISSIONS.filter((p) => p.rootOnly).map((p) => p.key),
);

/**
 * 判断权限点是否为 root 专属
 */
export function isRootOnlyPermission(key: string): boolean {
  return ROOT_ONLY_PERMISSIONS.has(key);
}

/**
 * 校验权限点 key 是否合法
 */
export function isValidPermissionKey(key: string): boolean {
  return ALL_PERMISSION_KEYS.has(key);
}
