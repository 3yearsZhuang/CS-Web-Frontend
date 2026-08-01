/**
 * @file 博客系列 API — GET/POST /api/blog/series
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { listSeries, createSeries } from '@/modules/community/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, assertAllowedOrigin } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET() {
  const series = listSeries();
  return NextResponse.json({ series });
}

export async function POST(req: NextRequest) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const session = getSession(token);
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const body = await req.json();
    const series = createSeries(session.user.id, body);
    return NextResponse.json({ series }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}