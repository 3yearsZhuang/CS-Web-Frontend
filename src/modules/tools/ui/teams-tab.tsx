'use client';

/**
 * @file TeamsTab — 组队（Tab 03）：我的队伍、入队邀请、建队与邀请
 *
 * 仅负责渲染；状态与动作由 `useTeams` 提供。团队任务奖励全额进入队长余额，
 * 页面明确提示「由队长自行分配」，不在此处做二次分配。
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { EmptyState, Button, SectionLoading, Title } from '@/components';
import { useTeams, type TeamView } from './hooks/use-teams';
import { TASK_INPUT_CLASS } from './task-shared';

export function TeamsTab() {
  const t = useTranslations('toolsTask');
  const {
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
  } = useTeams();
  const [name, setName] = useState('');
  const [invitees, setInvitees] = useState('');

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ids = invitees
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((id) => Number.isInteger(id) && id > 0);
    const ok = await createTeam(trimmed, ids);
    if (ok) {
      setName('');
      setInvitees('');
    }
  };

  return (
    <div>
      <Title level={2} className="mb-10 sm:mb-16">
        {t('tabTeams')}
      </Title>

      {error && <p className="mb-6 text-sm text-[var(--destructive)]">{error}</p>}

      {/* 建队 */}
      <div className="mb-12 border border-[var(--border)] p-5 sm:p-8">
        <h3 className="mb-4 text-sm tracking-[0.2em] uppercase text-[var(--muted-foreground)]">
          {t('teamCreate')}
        </h3>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('teamName')}
            className={`${TASK_INPUT_CLASS} flex-1`}
            maxLength={100}
          />
          <input
            value={invitees}
            onChange={(e) => setInvitees(e.target.value)}
            placeholder={t('teamInviteeHint')}
            className={`${TASK_INPUT_CLASS} flex-1`}
          />
          <Button onClick={handleCreate} disabled={actingId === 'create' || !name.trim()}>
            {actingId === 'create' ? t('teamLoading') : t('teamCreateAction')}
          </Button>
        </div>
      </div>

      {/* 入队邀请 */}
      <div className="mb-12">
        <h3 className="mb-4 text-sm tracking-[0.2em] uppercase text-[var(--muted-foreground)]">
          {t('teamInvitations')}
        </h3>
        {invitations.length === 0 ? (
          <EmptyState label="[ No Invitation ]" message={t('teamNoInvitations')} className="py-8" />
        ) : (
          <div className="border-t border-[var(--border)]">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-4"
              >
                <span className="text-sm">
                  {t('teamInvitedBy')} #{invitation.inviterUserId} · {t('teamId')} #{invitation.teamId}
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => respondInvitation(invitation.id, true)}
                    disabled={actingId === invitation.id}
                  >
                    {t('teamAccept')}
                  </Button>
                  <Button
                    onClick={() => respondInvitation(invitation.id, false)}
                    disabled={actingId === invitation.id}
                  >
                    {t('teamReject')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 我的队伍 */}
      {loading ? (
        <SectionLoading label="Loading..." />
      ) : teams.length === 0 ? (
        <EmptyState label="[ No Team ]" message={t('teamEmpty')} className="py-12 border-t border-[var(--border)]" />
      ) : (
        <div className="border-t border-[var(--border)]">
          {teams.map((team) => (
            <TeamRow
              key={team.id}
              team={team}
              actingId={actingId}
              onInvite={invite}
              onLeave={leaveTeam}
              labels={{
                captain: t('teamCaptain'),
                members: t('teamMembers'),
                invite: t('teamInvite'),
                leave: t('teamLeave'),
                invitePlaceholder: t('teamUserId'),
                leaderPays: t('teamLeaderPays'),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TeamRow({
  team,
  actingId,
  onInvite,
  onLeave,
  labels,
}: {
  team: TeamView;
  actingId: string | null;
  onInvite: (teamId: string, userId: number) => Promise<boolean>;
  onLeave: (teamId: string) => Promise<boolean>;
  labels: {
    captain: string;
    members: string;
    invite: string;
    leave: string;
    invitePlaceholder: string;
    leaderPays: string;
  };
}) {
  const [invitee, setInvitee] = useState('');

  const handleInvite = async () => {
    const id = Number(invitee.trim());
    if (!Number.isInteger(id) || id <= 0) return;
    const ok = await onInvite(team.id, id);
    if (ok) setInvitee('');
  };

  return (
    <div className="border-b border-[var(--border)] py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg">{team.name}</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {labels.captain} #{team.captainUserId} · {labels.members} {team.members.length}
          </p>
        </div>
        <span className="text-xs tracking-[0.2em] uppercase text-[var(--muted-foreground)]">
          {team.status}
        </span>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {team.members.map((member) => (
          <li
            key={member.userId}
            className="border border-[var(--border)] px-2 py-1 text-xs"
          >
            {member.displayName || `#${member.userId}`}
            {member.role === 'captain' ? ` · ${labels.captain}` : ''}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-[var(--muted-foreground)]">{labels.leaderPays}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={invitee}
          onChange={(e) => setInvitee(e.target.value)}
          placeholder={labels.invitePlaceholder}
          className={`${TASK_INPUT_CLASS} w-40`}
        />
        <Button onClick={handleInvite} disabled={actingId === `invite-${team.id}`}>
          {labels.invite}
        </Button>
        <Button onClick={() => onLeave(team.id)} disabled={actingId === `leave-${team.id}`}>
          {labels.leave}
        </Button>
      </div>
    </div>
  );
}
