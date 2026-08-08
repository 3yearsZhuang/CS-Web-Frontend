/**
 * @file 当前用户 API — GET /api/auth/me（BFF 薄转发 → FastAPI）
 */
import { NextResponse } from 'next/server';
import {
  clearAuthCookies,
  proxyBackend,
  setAuthCookies,
  toSafeUserFromBackend,
  type BackendUser,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/auth/me' });

  if (proxy.status !== 200) {
    // 令牌轮换失败（refresh 失败，clearAuth=true）→ 确已登出：保留 401 契约并清除 Cookie。
    if (proxy.clearAuth) {
      const res = NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
      clearAuthCookies(res);
      return res;
    }
    // 后端瞬时错误（非令牌失效，如 5xx / 网络抖动）：返回 401 + SERVER_ERROR 码。
    // 前端 useAuth 的私有 fetcher 据此保留上一帧已登录数据，避免把已登录用户误判为登出
    // （修复「切换几次页面头像掉登录」）。状态仍为 401 以兼容其它直接 fetch 该端点的调用方。
    return NextResponse.json({ error: '服务暂不可用', code: 'SERVER_ERROR' }, { status: 401 });
  }

  const body = proxy.body as { user?: BackendUser; roles?: string[] } | null;
  if (!body?.user) {
    // 确无登录态（无 token / 会话已结束）：返回 401，不清除 Cookie（本就没有有效令牌）。
    return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const user = toSafeUserFromBackend(body.user, body.roles);
  const res = NextResponse.json({ user });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
