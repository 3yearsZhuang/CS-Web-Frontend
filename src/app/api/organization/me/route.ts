/**
 * @file 本人组织信息 BFF — GET /api/organization/me。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/organization/me' });
  if (proxy.status !== 200) {
    const res = NextResponse.json(proxy.body ?? { error: '组织信息读取失败' }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const b = (proxy.body ?? {}) as Record<string, unknown>;
  const member = b.member as Record<string, unknown> | null | undefined;
  const res = NextResponse.json({
    userId: b.user_id,
    username: b.username,
    displayName: b.display_name,
    authorizationVersion: b.authorization_version,
    member: member
      ? {
          id: member.id,
          userId: member.user_id,
          username: member.username,
          displayName: member.display_name,
          studentId: member.student_id,
          peakId: member.peak_id,
          peakName: member.peak_name,
          membershipStatus: member.membership_status,
        }
      : null,
    bindings: ((b.bindings ?? []) as Record<string, unknown>[]).map((x) => ({
      roleName: x.role_name,
      displayName: x.display_name,
      fantasyDisplayName: x.fantasy_display_name,
      scopeType: x.scope_type,
      scopePeakId: x.scope_peak_id,
    })),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
