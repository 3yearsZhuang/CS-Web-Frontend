'use client';

/**
 * @file useTeams — 组队与邀请状态
 *
 * 数据源：统一后端原生 /api/teams（BFF 已做 Cookie 身份与幂等键注入）。
 * 团队执行期名单锁定由后端保证，前端只负责展示与触发。
 */

import { useCallback, useState } from 'react';
import { apiRequest } from '@/shared/hooks/use-api-request';

export interface TeamMemberView {
  userId: string;
  displayName: string;
  role: string;
  status: string;
}

export interface TeamView {
  id: string;
  name: string;
  captainUserId: string;
  status: string;
  members: TeamMemberView[];
  version: number;
}

export interface InvitationView {
  id: string;
  teamId: string;
  inviteeUserId: string;
  inviterUserId: string;
  status: string;
  expiresAt: string | null;
}

type Raw = Record<string, unknown>;

function toTeam(raw: unknown): TeamView {
  const team = (raw ?? {}) as Raw;
  const members = Array.isArray(team.members) ? (team.members as Raw[]) : [];
  return {
    id: String(team.id ?? ''),
    name: String(team.name ?? ''),
    captainUserId: String(team.captainUserId ?? ''),
    status: String(team.status ?? 'forming'),
    version: Number(team.version ?? 1),
    members: members.map((member) => ({
      userId: String(member.userId ?? ''),
      displayName: String(member.displayName ?? member.display_name ?? ''),
      role: String(member.role ?? 'member'),
      status: String(member.status ?? 'active'),
    })),
  };
}

function toInvitation(raw: unknown): InvitationView {
  const row = (raw ?? {}) as Raw;
  return {
    id: String(row.id ?? ''),
    teamId: String(row.teamId ?? ''),
    inviteeUserId: String(row.inviteeUserId ?? ''),
    inviterUserId: String(row.inviterUserId ?? ''),
    status: String(row.status ?? 'pending'),
    expiresAt: (row.expiresAt as string | null) ?? null,
  };
}

export function useTeams() {
  const [teams, setTeams] = useState<TeamView[]>([]);
  const [invitations, setInvitations] = useState<InvitationView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const [teamResult, inviteResult] = await Promise.all([
        apiRequest<{ items?: unknown[] }>('/api/teams?limit=50'),
        apiRequest<{ items?: unknown[] }>('/api/teams/invitations/me?limit=50'),
      ]);
      if (!teamResult.ok) throw new Error(teamResult.error ?? '加载队伍失败');
      setTeams((teamResult.data?.items || []).map(toTeam));
      setInvitations(
        inviteResult.ok ? (inviteResult.data?.items || []).map(toInvitation) : [],
      );
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  /** 建队：inviteeUserIds 为数字用户 ID 列表 */
  const createTeam = useCallback(
    async (name: string, inviteeUserIds: number[]) => {
      setActingId('create');
      try {
        const r = await apiRequest('/api/teams', {
          method: 'POST',
          body: { name, inviteeUserIds },
        });
        if (!r.ok) throw new Error(r.error ?? '创建队伍失败');
        await loadTeams();
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setActingId(null);
      }
    },
    [loadTeams],
  );

  const respondInvitation = useCallback(
    async (invitationId: string, accept: boolean) => {
      setActingId(invitationId);
      try {
        const r = await apiRequest(
          `/api/teams/invitations/${invitationId}/${accept ? 'accept' : 'reject'}`,
          { method: 'POST' },
        );
        if (!r.ok) throw new Error(r.error ?? '处理邀请失败');
        await loadTeams();
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setActingId(null);
      }
    },
    [loadTeams],
  );

  const invite = useCallback(
    async (teamId: string, inviteeUserId: number) => {
      setActingId(`invite-${teamId}`);
      try {
        const r = await apiRequest(`/api/teams/${teamId}/invitations`, {
          method: 'POST',
          body: { inviteeUserId },
        });
        if (!r.ok) throw new Error(r.error ?? '邀请失败');
        await loadTeams();
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setActingId(null);
      }
    },
    [loadTeams],
  );

  const leaveTeam = useCallback(
    async (teamId: string) => {
      setActingId(`leave-${teamId}`);
      try {
        const r = await apiRequest(`/api/teams/${teamId}/leave`, { method: 'POST' });
        if (!r.ok) throw new Error(r.error ?? '退出队伍失败');
        await loadTeams();
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setActingId(null);
      }
    },
    [loadTeams],
  );

  return {
    teams,
    invitations,
    loading,
    error,
    actingId,
    loadTeams,
    createTeam,
    respondInvitation,
    invite,
    leaveTeam,
  };
}
