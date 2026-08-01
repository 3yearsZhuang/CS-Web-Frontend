/**
 * @file 活动报名状态 API — GET /api/events/[id]/registration
 *
 * 查询当前登录用户在某活动中的报名状态。
 * 返回是否已报名以及报名记录详情。
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { getUserRegistration } from '@/modules/events/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;
  const registration = getUserRegistration(session.user.id, id);
  const registered = registration?.status === 'registered';

  return NextResponse.json({
    registered,
    registration,
  });
}