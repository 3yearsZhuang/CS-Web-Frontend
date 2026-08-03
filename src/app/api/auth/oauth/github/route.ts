/**
 * @file GitHub OAuth 入口 — GET /api/auth/oauth/github（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET() {
  const res = await fetch(`${BACKEND_URL}/api/v1/auth/oauth/github`, {
    redirect: 'manual',
    cache: 'no-store',
  });

  const location = res.headers.get('location');
  if (res.status >= 400 || !location) {
    return NextResponse.json({ error: 'GitHub 登录未启用', code: 'NOT_FOUND' }, { status: 404 });
  }
  return NextResponse.redirect(location, { status: 302 });
}
