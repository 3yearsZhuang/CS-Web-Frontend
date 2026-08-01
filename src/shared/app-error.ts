/**
 * @file 应用错误类与权限校验工具
 *
 * 错误码与 HTTP 语义对齐，便于 API 路由层映射状态码；assertOwnership 集中处理作者/管理员权限校验。
 */

/**
 * 应用错误基类 — 通过 error.code 标识错误类型，路由层据此映射 HTTP 状态码
 *
 * VALIDATION_ERROR→400 / NOT_FOUND→404 / FORBIDDEN,NOT_OWNER→403 / CONFLICT,ALREADY_EXISTS→409
 */
export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = code;
    this.code = code;
  }
}

/** 权限校验：非作者且非管理员则抛 FORBIDDEN 错误 */
export function assertOwnership(
  currentUserId: string,
  authorId: string,
  isAdmin: boolean,
  resourceName: string,
  action: string,
): void {
  if (isAdmin || currentUserId === authorId) return;
  throw new AppError(`无权${action}他人${resourceName}`, 'FORBIDDEN');
}
