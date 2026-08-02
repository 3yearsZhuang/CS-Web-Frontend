/**
 * @file Auxilio Agent API 路由 — GET /api/tools/auxilio
 *
 * GET: 返回当前用户的学习分析结果
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { analyzeLearningProfile } from '@/modules/tools/server';
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

  const analysis = await analyzeLearningProfile(session.user.id);
  return NextResponse.json({ analysis });
}