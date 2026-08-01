/**
 * @file 用户成绩查询 API — GET /api/tools/exam/:id/my-results
 *
 * GET: 获取当前用户在该考试中的答题记录
 *
 * 安全控制：
 *   - 必须登录
 */
import { NextResponse } from 'next/server';
import { getUserAttempts } from '@/modules/tools/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';
import { createRequestLogger } from '@/shared/logger';

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

  const log = createRequestLogger(req);
  try {
    const attempts = getUserAttempts(session.user.id, id);
    return NextResponse.json({ attempts });
  } catch (err) {
    log.error({ err }, '获取成绩失败');
    return NextResponse.json({ error: '获取成绩失败' }, { status: 500 });
  }
}