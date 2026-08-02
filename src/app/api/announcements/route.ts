/**
 * @file 公开公告 API — GET /api/announcements
 *
 * 获取当前生效的全站公告列表，在前端以横幅形式展示。
 * 支持按用户角色过滤（targetRoles 字段）。
 */
import { NextResponse } from 'next/server';
import { getActiveAnnouncements } from '@/modules/announcement/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  const session = token ? await getSession(token) : null;

  const announcements = await getActiveAnnouncements(session?.user.role);

  return NextResponse.json({ announcements });
}