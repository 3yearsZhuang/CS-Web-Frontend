/**
 * @file 公开用户资料 API — GET /api/users/:id
 *
 * GET: 获取用户公开资料（无需登录）
 *   - 基本信息：displayName, bio, avatarUrl, githubUrl, websiteUrl, techTags
 *   - 论坛统计：主题数、回复数
 *   - 考试统计：参加考试数、通过数
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { getPublicUserProfile } from '@/modules/user/server';
import { getCookieValue } from '@/shared/security/security';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { maskEmail } from '@/shared/utils';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  const session = token ? getSession(token) : null;
  const isLoggedIn = session !== null;

  // DB 查询下沉至 user/server 层，返回不含敏感字段的公开资料 + 统计。
  const profile = getPublicUserProfile(id);
  if (!profile) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  // email 仅在登录时返回（并脱敏），未登录时不暴露。
  return NextResponse.json({
    user: {
      id: profile.user.id,
      email: isLoggedIn ? maskEmail(profile.user.email) ?? undefined : undefined,
      displayName: profile.user.displayName,
      bio: profile.user.bio,
      avatarUrl: profile.user.avatarUrl,
      avatarType: profile.user.avatarType,
      githubUrl: profile.user.githubUrl,
      websiteUrl: profile.user.websiteUrl,
      techTags: profile.user.techTags,
      role: profile.user.role,
      createdAt: profile.user.createdAt,
    },
    stats: profile.stats,
  });
}
