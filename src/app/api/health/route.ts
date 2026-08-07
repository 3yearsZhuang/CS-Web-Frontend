/**
 * @file 健康检查 API — GET /api/health（BFF 转发）
 *
 * 后端健康检查为 root 路由 `/health`（root_router，无 /api/v1 前缀，见 backend app/main.py），
 * 此处转发到 `/health`，勿改为 `/api/v1/health`（该路径 404）。
 */
import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET() {
  const res = await fetch(`${BACKEND_URL}/health`, { cache: 'no-store' });
  return NextResponse.json({ ok: res.status === 200 });
}
