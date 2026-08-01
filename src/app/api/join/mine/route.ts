/**
 * @file 用户自己的入社申请 API — GET /api/join/mine
 *
 * GET: 查询当前登录用户的入社申请列表
 */
import { NextResponse } from 'next/server';
import { listMyJoinApplications } from '@/modules/join/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: '登录已过期' }, { status: 401 });
  }

  const applications = listMyJoinApplications(session.user.id);
  return NextResponse.json({ applications });
}
