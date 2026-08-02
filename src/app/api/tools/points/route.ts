/**
 * @file 积分详情 API — GET /api/tools/points
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { getUserPointsProfile } from '@/modules/tools/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const profile = await getUserPointsProfile(session.user.id);
  return NextResponse.json({ profile });
}
