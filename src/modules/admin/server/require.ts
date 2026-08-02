/**
 * @file 管理员身份校验守卫 — 请求级身份校验 + 高危操作二次密码确认
 *
 * 每次请求从 DB 实时读取 role/is_active（不依赖 session 缓存）；密码不落盘不记审计。
 */
import { toSafeUser, isAdminRole, type SafeUser } from '@/shared/types';
import { verifyPassword } from '@/shared/security';
import {
  getSession,
  hasModulePermission,
  type AdminModule,
} from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';
import { NextResponse } from 'next/server';
import { getAdminRepository } from '@/shared/db/repositories';

/** 从请求提取管理员身份（admin/root 放行）— 每次从 DB 实时读取 role/is_active；失败返回错误响应 */
export async function requireAdmin(req: Request): Promise<
  | { ok: true; user: SafeUser }
  | { ok: false; response: NextResponse }
> {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }

  const session = await getSession(token);
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: '未登录' }, { status: 401 }) };
  }

  const repo = getAdminRepository();
  const row = await repo.getUserById(session.user.id);
  if (!row) {
    return { ok: false, response: NextResponse.json({ error: '用户不存在' }, { status: 401 }) };
  }

  if (!isAdminRole(row.role)) {
    return { ok: false, response: NextResponse.json({ error: '权限不足' }, { status: 403 }) };
  }

  if (row.is_active === 0) {
    return { ok: false, response: NextResponse.json({ error: '账号已被禁用' }, { status: 403 }) };
  }

  return { ok: true, user: toSafeUser(row) };
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

/** 高危操作二次密码确认 — 每次高危操作重新验证密码（不依赖 session 一次性验证）；密码不落盘 */
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

  const repo = getAdminRepository();
  const row = await repo.getUserPasswordHash(admin.user.id);
  if (!row) {
    return { ok: false, response: NextResponse.json({ error: '用户不存在' }, { status: 401 }) };
  }

  if (!verifyPassword(password, row.password_hash)) {
    return { ok: false, response: NextResponse.json({ error: '密码错误', code: 'WRONG_PASSWORD' }, { status: 403 }) };
  }

  return { ok: true, user: admin.user };
}