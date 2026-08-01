/**
 * @file 权限点与角色元数据聚合 re-export（保持 @/shared/security/permissions 路径兼容）
 */

export {
  PERMISSION_MODULES,
  ALL_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  ROOT_ONLY_PERMISSIONS,
  isRootOnlyPermission,
  isValidPermissionKey,
} from './permission-points';
export type { PermissionPoint, PermissionModule } from './permission-points';

export {
  BUILTIN_ROLES,
  BUILTIN_ROLE_KEYS,
  isBuiltinRole,
  PROTECTED_ROLE_KEYS,
  isProtectedRole,
  BUILTIN_ADMIN_ROLE_KEYS,
} from './builtin-roles';
export type { RoleDefinition } from './builtin-roles';
