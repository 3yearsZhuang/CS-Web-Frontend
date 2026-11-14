/**
 * @file 管理端组织视图 — 峰列表/创建/归档 + 成员检索/调峰/离会/加入
 *
 * 读走 /api/organization/*，写走 /api/admin/organization/*；
 * 角色与账号资料不在组织成员接口内修改（由统一授权中心与用户中心负责）。
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/feedback/toast';
import { Button, Spinner } from '@/components';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';

/* ============= 类型 ============= */

interface OrgPeak {
  id: number;
  code: string;
  name: string;
  fantasyName?: string | null;
  description?: string | null;
  isActive: boolean;
}

interface OrgMember {
  id: number;
  userId: number;
  username: string;
  displayName?: string | null;
  studentId?: string | null;
  peakId?: number | null;
  peakName?: string | null;
  membershipStatus: string;
}

interface HistoryRow {
  id: number;
  action: string;
  actorUsername?: string | null;
  resourceId?: string | null;
  detail?: Record<string, unknown> | null;
  createdAt?: string | null;
}

function peakLabel(peak: OrgPeak): string {
  return peak.fantasyName || peak.name;
}

/* ============= 组件 ============= */

export function AdminOrganizationView() {
  const t = useTranslations('adminOps');
  const { pushToast } = useToast();

  const [peaks, setPeaks] = useState<OrgPeak[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [filterPeakId, setFilterPeakId] = useState<number | ''>('');
  const [moveTargets, setMoveTargets] = useState<Record<number, number | ''>>({});

  const [newPeakName, setNewPeakName] = useState('');
  const [newPeakDesc, setNewPeakDesc] = useState('');
  const [addForm, setAddForm] = useState({ userId: '', peakId: '' as number | '', studentId: '' });
  const [historyTitle, setHistoryTitle] = useState<string | null>(null);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: '200' });
    if (search.trim()) params.set('q', search.trim());
    if (filterPeakId !== '') params.set('peak_id', String(filterPeakId));
    const [peaksRes, membersRes] = await Promise.all([
      apiRequest<{ items: OrgPeak[] }>('/api/organization/peaks?limit=100', { cache: 'no-store' }),
      apiRequest<{ items: OrgMember[] }>(`/api/organization/members?${params.toString()}`, {
        cache: 'no-store',
      }),
    ]);
    if (!peaksRes.ok) {
      setError(peaksRes.error || t('failed'));
    } else {
      setPeaks(peaksRes.data?.items ?? []);
    }
    if (!membersRes.ok) {
      setError(membersRes.error || t('failed'));
    } else {
      setMembers(membersRes.data?.items ?? []);
    }
    setLoading(false);
  }, [search, filterPeakId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const activePeaks = useMemo(() => peaks.filter((p) => p.isActive), [peaks]);

  const handleCreatePeak = useCallback(async () => {
    const name = newPeakName.trim();
    if (!name) return;
    setBusy(true);
    const code = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const result = await apiRequest('/api/admin/organization/peaks', {
      method: 'POST',
      body: { code, name, fantasyName: name, description: newPeakDesc.trim() || undefined },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error || t('failed'));
      return;
    }
    pushToast('success', t('success'));
    setNewPeakName('');
    setNewPeakDesc('');
    await load();
  }, [newPeakName, newPeakDesc, t, load, pushToast]);

  const handleArchivePeak = useCallback(
    async (peak: OrgPeak) => {
      if (!window.confirm(t('confirmArchive'))) return;
      setBusy(true);
      const result = await apiRequest(`/api/admin/organization/peaks/${peak.id}/archive`, {
        method: 'POST',
        body: {},
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error || t('failed'));
        return;
      }
      pushToast('success', t('success'));
      await load();
    },
    [t, load, pushToast],
  );

  const handleMove = useCallback(
    async (member: OrgMember) => {
      const target = moveTargets[member.id];
      if (target === undefined || target === '') return;
      setBusy(true);
      const result = await apiRequest(`/api/admin/organization/members/${member.id}/move`, {
        method: 'POST',
        body: { peakId: target },
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error || t('failed'));
        return;
      }
      pushToast('success', t('success'));
      await load();
    },
    [moveTargets, t, load, pushToast],
  );

  const handleRemove = useCallback(
    async (member: OrgMember) => {
      if (!window.confirm(t('confirmRemove'))) return;
      setBusy(true);
      const result = await apiRequest(`/api/admin/organization/members/${member.id}/remove`, {
        method: 'POST',
        body: {},
      });
      setBusy(false);
      if (!result.ok) {
        setError(result.error || t('failed'));
        return;
      }
      pushToast('success', t('success'));
      await load();
    },
    [t, load, pushToast],
  );

  const openHistory = useCallback(
    async (path: string, title: string) => {
      setHistoryTitle(title);
      setHistoryRows([]);
      setHistoryLoading(true);
      setError(null);
      const result = await apiRequest<{ items?: HistoryRow[] }>(path, { cache: 'no-store' });
      setHistoryLoading(false);
      if (!result.ok) {
        setError(
          result.status === 403
            ? '需要 audit:read 权限'
            : result.error || '读取历史失败',
        );
        return;
      }
      setHistoryRows(result.data?.items ?? []);
    },
    [],
  );

  const handleAddMember = useCallback(async () => {
    const userId = Number.parseInt(addForm.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      setError(t('required'));
      return;
    }
    setBusy(true);
    const result = await apiRequest('/api/admin/organization/members', {
      method: 'POST',
      body: {
        userId,
        peakId: addForm.peakId === '' ? null : addForm.peakId,
        studentId: addForm.studentId.trim() || undefined,
      },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error || t('failed'));
      return;
    }
    pushToast('success', t('success'));
    setAddForm({ userId: '', peakId: '', studentId: '' });
    await load();
  }, [addForm, t, load, pushToast]);

  return (
    <>
      {error && (
        <div className="mb-6 p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] font-mono text-[12px] text-[var(--destructive)]">
          {error}
        </div>
      )}

      {/* 峰管理 */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div className="meta-mono text-[12px] text-[var(--foreground)]">[ {t('peaks')} ]</div>
          <button
            type="button"
            onClick={() => void load()}
            className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
          >
            {t('refresh')}
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-5 p-4 border border-[var(--border)]">
          <div>
            <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
              {t('peakName')}
            </div>
            <input
              value={newPeakName}
              maxLength={20}
              onChange={(e) => setNewPeakName(e.target.value)}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            />
          </div>
          <div className="flex-1 min-w-[160px]">
            <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
              {t('peakDesc')}
            </div>
            <input
              value={newPeakDesc}
              maxLength={200}
              onChange={(e) => setNewPeakDesc(e.target.value)}
              className={`${INPUT_CLASS} w-full px-3 py-2 text-[13px]`}
            />
          </div>
          <Button
            type="button"
            disabled={busy || !newPeakName.trim()}
            onClick={() => void handleCreatePeak()}
          >
            {t('create')}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-[var(--muted-foreground)]">
            <Spinner />
            <span className="meta-mono text-[11px]">{t('loading')}</span>
          </div>
        ) : peaks.length === 0 ? (
          <div className="py-8 meta-mono text-[11px] text-[var(--muted-foreground)]">
            {t('noData')}
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--border)]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
                  <th className="text-left px-4 py-3">{t('peakName')}</th>
                  <th className="text-left px-4 py-3">{t('peakCode')}</th>
                  <th className="text-left px-4 py-3">{t('status')}</th>
                  <th className="text-right px-4 py-3">{t('archive')}</th>
                </tr>
              </thead>
              <tbody>
                {peaks.map((peak) => (
                  <tr key={peak.id} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-4 py-3">{peakLabel(peak)}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[var(--muted-foreground)]">
                      {peak.code}
                    </td>
                    <td className="px-4 py-3 meta-mono text-[11px]">
                      {peak.isActive ? t('active') : t('archived')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {peak.isActive && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleArchivePeak(peak)}
                          className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
                        >
                          {t('archive')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 成员管理 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="meta-mono text-[12px] text-[var(--foreground)]">[ {t('members')} ]</div>
          <button
            type="button"
            onClick={() =>
              void openHistory('/api/admin/organization/history?limit=20', '组织历史')
            }
            className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
          >
            组织历史
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-3 mb-5 p-4 border border-[var(--border)]">
          <div>
            <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
              {t('search')}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            />
          </div>
          <div>
            <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
              {t('peak')}
            </div>
            <select
              value={filterPeakId}
              onChange={(e) => setFilterPeakId(e.target.value ? Number(e.target.value) : '')}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            >
              <option value="">{t('all')}</option>
              {peaks.map((peak) => (
                <option key={peak.id} value={peak.id}>
                  {peakLabel(peak)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
              {t('userId')}
            </div>
            <input
              value={addForm.userId}
              onChange={(e) => setAddForm((f) => ({ ...f, userId: e.target.value }))}
              className={`${INPUT_CLASS} w-28 px-3 py-2 text-[13px]`}
            />
          </div>
          <div>
            <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
              {t('peak')}
            </div>
            <select
              value={addForm.peakId}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, peakId: e.target.value ? Number(e.target.value) : '' }))
              }
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            >
              <option value="">—</option>
              {activePeaks.map((peak) => (
                <option key={peak.id} value={peak.id}>
                  {peakLabel(peak)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
              {t('studentId')}
            </div>
            <input
              value={addForm.studentId}
              onChange={(e) => setAddForm((f) => ({ ...f, studentId: e.target.value }))}
              className={`${INPUT_CLASS} w-32 px-3 py-2 text-[13px]`}
            />
          </div>
          <Button type="button" disabled={busy} onClick={() => void handleAddMember()}>
            {t('add')}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-[var(--muted-foreground)]">
            <Spinner />
            <span className="meta-mono text-[11px]">{t('loading')}</span>
          </div>
        ) : members.length === 0 ? (
          <div className="py-8 meta-mono text-[11px] text-[var(--muted-foreground)]">
            {t('noData')}
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--border)]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
                  <th className="text-left px-4 py-3">{t('userId')}</th>
                  <th className="text-left px-4 py-3">{t('studentId')}</th>
                  <th className="text-left px-4 py-3">{t('peak')}</th>
                  <th className="text-left px-4 py-3">{t('status')}</th>
                  <th className="text-right px-4 py-3">{t('move')}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-4 py-3">
                      <div>{member.displayName || member.username}</div>
                      <div className="font-mono text-[11px] text-[var(--muted-foreground)]">
                        #{member.userId} · {member.username}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px]">{member.studentId || '—'}</td>
                    <td className="px-4 py-3">{member.peakName || '—'}</td>
                    <td className="px-4 py-3 meta-mono text-[11px]">{member.membershipStatus}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            void openHistory(
                              `/api/admin/organization/members/${member.id}/history?limit=20`,
                              member.displayName || member.username,
                            )
                          }
                          className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
                        >
                          历史
                        </button>
                        <select
                          value={moveTargets[member.id] ?? ''}
                          onChange={(e) =>
                            setMoveTargets((prev) => ({
                              ...prev,
                              [member.id]: e.target.value ? Number(e.target.value) : '',
                            }))
                          }
                          className={`${INPUT_CLASS} px-2 py-1 text-[12px]`}
                        >
                          <option value="">—</option>
                          {activePeaks.map((peak) => (
                            <option key={peak.id} value={peak.id}>
                              {peakLabel(peak)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleMove(member)}
                          className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
                        >
                          {t('move')}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleRemove(member)}
                          className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
                        >
                          {t('remove')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historyTitle && (
          <div className="mt-4 border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="meta-mono text-[11px] text-[var(--foreground)]">
                [ 历史 / History ] {historyTitle}
              </div>
              <button
                type="button"
                onClick={() => setHistoryTitle(null)}
                className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
              >
                关闭
              </button>
            </div>
            {historyLoading ? (
              <div className="flex items-center gap-2 py-4 text-[var(--muted-foreground)]">
                <Spinner />
                <span className="meta-mono text-[11px]">{t('loading')}</span>
              </div>
            ) : historyRows.length === 0 ? (
              <div className="py-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                {t('noData')}
              </div>
            ) : (
              <div className="space-y-2">
                {historyRows.map((row) => (
                  <div key={row.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] pb-2">
                    <span className="meta-mono text-[11px] text-[var(--primary)]">{row.action}</span>
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                      #{row.resourceId ?? '—'}
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {row.actorUsername || '—'} ·{' '}
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </span>
                    {row.detail && (
                      <span className="ml-auto max-w-[50%] truncate font-mono text-[10px] text-[var(--muted-foreground)]">
                        {JSON.stringify(row.detail)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
