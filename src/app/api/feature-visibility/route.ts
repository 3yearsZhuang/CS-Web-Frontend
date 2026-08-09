/**
 * @file 功能模块可见性 — 公开读取 BFF
 *
 * GET /api/feature-visibility → 透传后端 GET /api/v1/feature-visibility
 * 公开（无需鉴权）：可见性规则本身不含敏感信息，供全站导航渲染。
 */

import { NextResponse } from 'next/server';
import {
  clearAuthCookies,
  normalizeError,
  proxyBackend,
  setAuthCookies,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, {
    path: '/feature-visibility',
    skipAuth: true,
  });

  if (proxy.status !== 200) {
    const res = NextResponse.json(
      normalizeError(proxy.body, '加载可见性配置失败'),
      { status: proxy.status },
    );
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.json(proxy.body);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
