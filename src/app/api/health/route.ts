/**
 * @file 健康检查 API — GET /api/health（BFF 转发）
 */
import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET() {
  const res = await fetch(`${BACKEND_URL}/api/v1/health`, { cache: 'no-store' });
  return NextResponse.json({ ok: res.status === 200 });
}
