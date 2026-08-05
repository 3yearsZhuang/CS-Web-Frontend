/**
 * @file 管理员身份校验守卫（纯 BFF 版，无 server 依赖）— 请求级身份校验 + 模块权限判定
 *
 * 从请求解析后端身份（/auth/me），以角色实时判定 admin/module 权限。
 * 不依赖 src/modules 下各模块的 server 层与 src/shared/db（纯 BFF 收口，B1 阶段1），
 * RBAC 纯函数 hasModulePermission 来自 src/modules/auth/types（无 DB 依赖）。
 */
import { type SafeUser, isAdminRole } from '@/shared/types';
import { hasModulePermission, type AdminModule } from '@/modules/auth/types';
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
