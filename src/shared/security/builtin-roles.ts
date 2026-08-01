/**
 * @file 系统内置角色定义（root 全权限硬编码，user 无管理权限；client + server 纯常量）
 */

import { ALL_PERMISSIONS } from './permission-points';

/**
 * 系统内置角色定义
 *
 * - isSystem: true 表示系统内置，不可删除
 * - isProtected: true 表示权限不可修改（root 永远全权限，user 永远无管理权限）
 * - defaultPermissions: 该角色的默认权限点 key 列表（首次迁移时写入 DB）
 */
export interface RoleDefinition {
  /** 角色 key（对应 users.role 字段值） */
  key: string;
  /** 中文标签 */
  label: string;
  /** 角色描述 */
  description: string;
  /** 是否系统内置（不可删除） */
  isSystem: boolean;
  /** 是否受保护（权限不可修改） */
  isProtected: boolean;
  /** 排序权重（数字越小越靠前） */
  sortOrder: number;
  /** 默认权限点 key 列表 */
  defaultPermissions: string[];
}

/* ============= 系统内置角色定义 ============= */

/**
 * 系统内置角色清单（迁移 v2 写入 DB roles 表，可在 [ 00 ] 面板创建自定义角色）
 */
export const BUILTIN_ROLES: RoleDefinition[] = [
  {
    key: 'root',
    label: '超级管理员',
    description: '系统最高权限，拥有所有管理能力。账号唯一，仅通过 CLI 创建。',
    isSystem: true,
    isProtected: true,
    sortOrder: 0,
    defaultPermissions: [], // root 永远全权限，不需要存 DB
  },
  {
    key: 'admin',
    label: '管理员',
    description: '通用管理员，拥有除 root 专属外的全部管理权限。',
    isSystem: true,
    isProtected: false,
    sortOrder: 1,
    // 默认拥有所有非 root_only 权限
    defaultPermissions: ALL_PERMISSIONS.filter((p) => !p.rootOnly).map((p) => p.key),
  },
  {
    key: 'content_moderator',
    label: '内容管理员',
    description: '论坛模块专项管理员，仅可管理论坛主题、回复与版块。',
    isSystem: true,
    isProtected: false,
    sortOrder: 2,
    defaultPermissions: [
      'forum.topic.update',
      'forum.topic.delete',
      'forum.topic.hide',
      'forum.topic.restore',
      'forum.topic.pin',
      'forum.topic.feature',
      'forum.reply.update',
      'forum.reply.delete',
      'forum.reply.hide',
      'forum.reply.restore',
      'forum.category.create',
      'forum.category.update',
      'forum.category.delete',
    ],
  },
  {
    key: 'exam_admin',
    label: '考试管理员',
    description: '考试模块专项管理员，仅可管理考试与题目。',
    isSystem: true,
    isProtected: false,
    sortOrder: 3,
    defaultPermissions: [
      'exam.create',
      'exam.update',
      'exam.delete',
      'exam.publish',
      'exam.end',
      'exam.question.create',
      'exam.question.update',
      'exam.question.delete',
      'exam.ranking.view',
    ],
  },
  {
    key: 'task_publisher',
    label: '任务发布者',
    description: '任务模块专项管理员，仅可发布与审核任务认领。',
    isSystem: true,
    isProtected: false,
    sortOrder: 4,
    defaultPermissions: [
      'task.create',
      'task.update',
      'task.delete',
      'task.publish',
      'task.close',
      'task.claim.review',
    ],
  },
  {
    key: 'user',
    label: '普通用户',
    description: '站点普通用户，无任何管理权限。',
    isSystem: true,
    isProtected: true,
    sortOrder: 99,
    defaultPermissions: [],
  },
];

/**
 * 所有内置角色 key 集合
 */
export const BUILTIN_ROLE_KEYS = new Set(BUILTIN_ROLES.map((r) => r.key));

/**
 * 判断角色 key 是否为内置角色
 */
export function isBuiltinRole(key: string): boolean {
  return BUILTIN_ROLE_KEYS.has(key);
}

/**
 * 受保护角色（权限不可修改）：root 和 user
 */
export const PROTECTED_ROLE_KEYS = new Set(
  BUILTIN_ROLES.filter((r) => r.isProtected).map((r) => r.key),
);

/**
 * 判断角色是否受保护（权限不可修改）
 */
export function isProtectedRole(key: string): boolean {
  return PROTECTED_ROLE_KEYS.has(key);
}

/**
 * 内置管理员角色 key 集合（用于 isAdminRole 判断）
 *
 * 与 BUILTIN_ROLES 中 isSystem=true 且非 user 的角色一致。
 * 自定义角色不自动算作管理员，需通过角色配置中的权限点判断。
 */
export const BUILTIN_ADMIN_ROLE_KEYS = new Set(
  BUILTIN_ROLES.filter((r) => r.isSystem && r.key !== 'user').map((r) => r.key),
);
