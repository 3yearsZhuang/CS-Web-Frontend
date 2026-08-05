/**
 * @file 管理员身份校验守卫 — 请求级身份校验 + 高危操作二次密码确认
 *
 * 鉴权统一走后端 JWT（BFF HttpOnly Cookie 中的 access/refresh token），
 * 通过 /auth/me 实时读取用户与角色。前身为前端 SQLite session（auth_session），
 * 在 SQLite → PostgreSQL 数据迁移后该 session 已与后端登录解耦、登录不再创建，
 * 继续依赖会导致开发者中心等 requireAdmin 守卫的接口永远 401。
 */
import { type SafeUser } from '@/shared/types';
import { isAdminRole } from '@/shared/types';
import { hasModulePermission, type AdminModule } from '@/modules/auth/server';
import { NextResponse } from 'next/server';
import { proxyBackend, toSafeUserFromBackend, type BackendUser } from '@/shared/backend-client';

/**
 * 从请求解析后端身份。返回 (safeUser, rawUser, roles)。
 * 失败时返回错误响应（401 未登录 / 403 无权限）。
 */
async function resolveBackendUser(
  req: Request,
): Promise<
  | { ok: true; user: SafeUser; raw: BackendUser; roles: string[] }
  | { ok: false; response: NextResponse }
> {
  const me = await proxyBackend(req, { path: '/auth/me' });
  if (me.status === 401) {
    return { ok: false, response: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }
  if (me.status !== 200 || !me.body || typeof me.body !== 'object') {
    return { ok: false, response: NextResponse.json({ error: '身份校验失败' }, { status: 401 }) };
  }
  const body = me.body as { user?: BackendUser; roles?: string[] };
  const raw = body.user;
  if (!raw) {
    return { ok: false, response: NextResponse.json({ error: '用户不存在' }, { status: 401 }) };
  }
  const roles = body.roles ?? [];
  const user = toSafeUserFromBackend(raw, roles);
  return { ok: true, user, raw, roles };
}

/** 从请求提取管理员身份（admin/root 放行）— 以 /auth/me 实时读取 role/is_active；失败返回错误响应 */
export async function requireAdmin(req: Request): Promise<
  | { ok: true; user: SafeUser }
  | { ok: false; response: NextResponse }
> {
  const resolved = await resolveBackendUser(req);
  if (!resolved.ok) return resolved;

  if (!isAdminRole(resolved.user.role)) {
    return { ok: false, response: NextResponse.json({ error: '权限不足' }, { status: 403 }) };
  }
  if (!resolved.user.isActive) {
    return { ok: false, response: NextResponse.json({ error: '账号已被禁用' }, { status: 403 }) };
  }
  return { ok: true, user: resolved.user };
}

/** 从请求提取超级管理员身份（仅 root 放行）— 保护 root 专属端点 */
export async function requireRoot(req: Request): Promise<
  | { ok: true; user: SafeUser }
  | { ok: false; response: NextResponse }
> {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin;
  if (admin.user.role !== 'root') {
    return { ok: false, response: NextResponse.json({ error: '需要超级管理员权限' }, { status: 403 }) };
  }
  return { ok: true, user: admin.user };
}

/** 从请求提取具有指定模块权限的管理员身份 — admin/root 全放行，细粒度角色按模块校验 */
export async function requireModuleAdmin(req: Request, module: AdminModule): Promise<
  | { ok: true; user: SafeUser }
  | { ok: false; response: NextResponse }
> {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin;
  if (!hasModulePermission(admin.user.role, module)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `无权限：此操作需要 ${module} 模块管理权限`, code: 'MODULE_FORBIDDEN' },
        { status: 403 },
      ),
    };
  }
  return { ok: true, user: admin.user };
}

/**
 * 高危操作二次密码确认 — 以 /auth/me 校验身份；密码二次确认需由后端完成。
 * 注意：前端 SQLite 的 password_hash 在迁移后不再与后端同步，这里不再本地比对密码，
 * 保留签名以兼容尚未接入的调用方。
 */
export async function requirePasswordConfirmation(
  req: Request,
  password: string,
): Promise<
  | { ok: true; user: SafeUser }
  | { ok: false; response: NextResponse }
> {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin;

  if (!password) {
    return { ok: false, response: NextResponse.json({ error: '高危操作需要输入密码确认', code: 'PASSWORD_REQUIRED' }, { status: 403 }) };
  }

  // 迁移后前端 SQLite 密码哈希不再可信，密码二次确认应由后端鉴权端点承担。
  // 当前无调用方接入，这里返回明确错误，避免走无效的本地比对路径。
  return {
    ok: false,
    response: NextResponse.json(
      { error: '密码确认需通过后端鉴权，当前端点未支持', code: 'NOT_SUPPORTED' },
      { status: 501 },
    ),
  };
}
