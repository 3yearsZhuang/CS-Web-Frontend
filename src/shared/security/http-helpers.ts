/**
 * @file HTTP 响应与请求体校验工具
 *
 * 集中实现 JSON 错误响应构建、服务层错误转 HTTP 响应、请求体解析与 zod 校验。
 * 所有控制服务端强制，不依赖客户端检查。
 */

import { NextResponse } from 'next/server';
import 'server-only';
import { logger } from '@/shared/logger';

import type { ZodSchema, ZodError } from 'zod';

/**
 * 构建通用 JSON 错误响应
 *
 * 第三参数可为错误码（string）或额外响应头（旧用法，向后兼容）。
 */
export function jsonError(
  message: string,
  status: number,
  codeOrHeaders?: string | Record<string, string>,
  extraHeaders?: Record<string, string>,
) {
  const body: { error: string; code?: string } = { error: message };
  let headers: Record<string, string> | undefined;

  if (typeof codeOrHeaders === 'string') {
    body.code = codeOrHeaders;
    headers = extraHeaders;
  } else {
    headers = codeOrHeaders;
  }

  const res = NextResponse.json(body, { status });
  if (headers) {
    for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  }
  return res;
}

/**
 * 解析 JSON body 并校验 Content-Type
 *
 * - 拒绝非 `application/json` 的 Content-Type（防止 text/plain / multipart CSRF）
 * - 拒绝 JSON 解析失败
 *
 * 成功时返回 `{ ok: true, body }`；失败时返回 `{ ok: false, response }`。
 */
export async function parseJsonBody<T = unknown>(req: Request): Promise<
  | { ok: true; body: T }
  | { ok: false; response: NextResponse }
> {
  const ct = req.headers.get('content-type') || '';
  if (!ct.toLowerCase().includes('application/json')) {
    return { ok: false, response: jsonError('请求格式错误', 415) };
  }
  let body: T;
  try {
    body = (await req.json()) as T;
  } catch {
    return { ok: false, response: jsonError('请求格式错误', 400) };
  }
  return { ok: true, body };
}

/**
 * 解析 JSON body 并使用 zod schema 校验
 *
 * 组合 parseJsonBody 和 zod 校验，一步完成 Content-Type 校验、JSON 解析、
 * 结构校验和类型推断。
 *
 * 成功时返回 `{ ok: true, data }`（data 为 schema 推断的类型）；
 * 失败时返回 `{ ok: false, response }`，response 包含具体校验错误消息。
 */
export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<
  | { ok: true; data: T }
  | { ok: false; response: NextResponse }
> {
  const parsed = await parseJsonBody<unknown>(req);
  if (!parsed.ok) return parsed;

  const result = schema.safeParse(parsed.body);
  if (!result.success) {
    const messages = (result.error as ZodError).issues
      .map((e) => e.message)
      .join('; ');
    return { ok: false, response: jsonError(messages, 400) };
  }

  return { ok: true, data: result.data };
}

/**
 * 格式化 zod 校验错误为人类可读字符串
 */
export function formatZodErrors(error: ZodError): string {
  return error.issues.map((e) => e.message).join('; ');
}

/**
 * 服务端错误名 → HTTP 状态码的统一映射
 *
 * 服务层通过 `err.name` 标识错误类型，路由层据此选择 HTTP 状态码。
 * 新增错误类型时在此表追加即可，所有路由自动生效。
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  // 400 Bad Request — 输入校验、状态非法、自我保护
  VALIDATION_ERROR: 400,
  ALREADY_PROCESSED: 400,
  SELF_DEMOTE: 400,
  SELF_DISABLE: 400,
  SELF_DELETE: 400,
  SELF_APPROVE: 400,
  LAST_ADMIN: 400,
  INVALID_PRESET: 400,
  INVALID_PARENT: 400,
  FILE_TOO_LARGE: 400,
  INVALID_TYPE: 400,
  INVALID_STATUS: 400,
  STATE_INVALID: 400,
  STATE_EXPIRED: 400,
  NO_CHANGE: 400,
  // 403 Forbidden — 权限不足
  FORBIDDEN: 403,
  ROOT_PROTECTED: 403,
  ACCOUNT_DISABLED: 403,
  // 404 Not Found
  NOT_FOUND: 404,
  USER_NOT_FOUND: 404,
  // 409 Conflict — 资源已存在或状态冲突
  EMAIL_EXISTS: 409,
  GITHUB_EMAIL_CONFLICT: 409,
  ALREADY_REGISTERED: 409,
  ALREADY_CANCELLED: 409,
  ALREADY_REVIEWED: 409,
  FULL: 409,
  STATUS_CONFLICT: 409,
  SLUG_EXISTS: 409,
  CLAIM_LIMIT: 409,
  ALREADY_CLAIMED: 409,
  ROLE_EXISTS: 409,
  ROLE_IN_USE: 409,
  // 500 Internal Server Error
  SAVE_FAILED: 500,
  OAUTH_ERROR: 500,
};

/**
 * 将服务层抛出的 Error 转为 NextResponse
 *
 * 已知错误名（在 ERROR_STATUS_MAP 中）按映射返回对应状态码；
 * 未知错误返回 500 并打印日志。
 *
 * customMessages 可覆盖特定错误名的响应消息（如固定文案替代 err.message）。
 */
export function errorResponse(
  err: unknown,
  customMessages?: Record<string, string>,
): NextResponse {
  if (err instanceof Error && err.name in ERROR_STATUS_MAP) {
    const message = customMessages?.[err.name] ?? err.message;
    const code = err.name; // AppError 的 name 即为错误码
    return NextResponse.json(
      { error: message, code },
      { status: ERROR_STATUS_MAP[err.name] },
    );
  }
  logger.error({ err }, '未处理的错误');
  return NextResponse.json(
    { error: '请求失败，请稍后再试', code: 'INTERNAL_ERROR' },
    { status: 500 },
  );
}
