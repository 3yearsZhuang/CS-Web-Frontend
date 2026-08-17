/**
 * @file 公告管理子面板 — 从 community-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Badge, Button, SectionLoading } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { formatDateTime } from '@/shared/utils/utils';
import { getError } from './community-admin-utils';

interface AnnouncementItem {
  id: string;
  title: string;
  content: string | null;
  level: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  isDismissible: boolean;
  priority: number;
  expiresAt: string | null;
  createdAt: string;
}

interface AnnouncementsResponse {
  items: AnnouncementItem[];
  total: number;
}

const LEVEL_OPTIONS: { value: AnnouncementItem['level']; label: string }[] = [
  { value: 'info', label: '信息 / Info' },
  { value: 'warning', label: '警告 / Warning' },
  { value: 'success', label: '成功 / Success' },
  { value: 'error', label: '错误 / Error' },
];

/** 公告管理 — 新建/启用/停用/删除公告 */
export function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', content: '', level: 'info' as AnnouncementItem['level'], priority: 0 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { confirm } = useConfirm();
  const t = useTranslations('announcementsAdmin');
  const tc = useTranslations('common');

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/announcements');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getError(data, t('loadFailed')));
      }
      const data = (await res.json()) as AnnouncementsResponse;
      setAnnouncements(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAnnouncements(); }, [loadAnnouncements]);

  const doAction = async (id: string, action: () => Promise<Response>) => {
    setActionError(null);
    setBusyIds((s) => new Set(s).add(id));
    try {
      const res = await action();
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getError(data, t('actionFailed')));
      await loadAnnouncements();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('actionFailed'));
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  const handleToggleActive = (item: AnnouncementItem) => {
    void doAction(item.id, () =>
      fetch(`/api/admin/announcements/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      }),
    );
  };

  const handleDelete = (item: AnnouncementItem) => {
    void (async () => {
      const confirmed = await confirm({
        title: t('deleteTitle'),
        message: t('deleteMessage', { title: item.title }),
        variant: 'danger',
        confirmLabel: t('confirmDelete'),
      });
      if (!confirmed) return;
      doAction(item.id, () =>
        fetch(`/api/admin/announcements/${item.id}`, { method: 'DELETE' }),
      );
    })();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      setCreateError(t('titleEmpty'));
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getError(data, t('createFailed')));
      setShowCreate(false);
      setCreateForm({ title: '', content: '', level: 'info', priority: 0 });
      await loadAnnouncements();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('createFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="px-4 py-3 border border-[var(--destructive)] bg-[var(--destructive)]/5 meta-mono text-[var(--destructive)]">
          {actionError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="meta-mono text-[var(--muted-foreground)]">
          {t('countPrefix')}<span className="text-[var(--foreground)] tabular-nums">{announcements.length}</span>{t('countLabel', { count: announcements.length })}
        </div>
        <Button size="sm" type="button" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? tc('cancel') + ' / Cancel' : t('newBtn') + ' / New'}
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="border border-[var(--border)] p-4 sm:p-6 space-y-4">
          <div className="meta-mono text-[var(--foreground)] mb-2">
            <span className="ark-divider mr-2">{'//'}</span>
            {t('createTitle')}
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('fieldTitle')}</label>
            <input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} placeholder={t('titlePlaceholder')} maxLength={200} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('fieldContent')}</label>
            <textarea value={createForm.content} onChange={(e) => setCreateForm((f) => ({ ...f, content: e.target.value }))} placeholder={t('contentPlaceholder')} maxLength={5000} rows={4} className={`${INPUT_CLASS} px-3 py-2 text-[13px] resize-y`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('fieldLevel')}</label>
              <select value={createForm.level} onChange={(e) => setCreateForm((f) => ({ ...f, level: e.target.value as AnnouncementItem['level'] }))} className={`${INPUT_CLASS} appearance-none pr-8 cursor-pointer`}>
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('fieldPriority')}</label>
              <input type="number" value={createForm.priority} onChange={(e) => setCreateForm((f) => ({ ...f, priority: Number(e.target.value) || 0 }))} min={0} max={100} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
            </div>
          </div>
          {createError && <div className="meta-mono text-[var(--destructive)]">{createError}</div>}
          <Button size="sm" type="submit" disabled={creating}>{creating ? t('creating') : t('createBtn')}</Button>
        </form>
      )}

      {loading ? (
        <SectionLoading label={t('loading')} />
      ) : error ? (
        <div className="py-12 text-center meta-mono text-[var(--destructive)]">{error}</div>
      ) : announcements.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{'// '}{t('noAnnouncements')}</div>
      ) : (
        <div className="border-t border-[var(--border)]">
          <div className="hidden lg:grid grid-cols-12 gap-3 py-3 border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
            <div className="col-span-4">{t('colTitle')} / Title</div>
            <div className="col-span-1">{t('colLevel')} / Level</div>
            <div className="col-span-1">{t('colStatus')} / Status</div>
            <div className="col-span-1">{t('colPriority')} / Priority</div>
            <div className="col-span-3">{t('colCreated')} / Created</div>
            <div className="col-span-2 text-right">{t('colAction')} / Actions</div>
          </div>
          {announcements.map((item) => {
            const busy = busyIds.has(item.id);
            return (
              <div key={item.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 py-4 border-b border-[var(--border)] items-center">
                <div className="lg:col-span-4">
                  <span className="font-mono text-[13px] text-[var(--foreground)] line-clamp-1">{item.title}</span>
                  {item.content && <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 mt-0.5">{item.content}</p>}
                </div>
                <div className="lg:col-span-1">
                  <Badge variant={
                    item.level === 'error' ? 'danger' :
                    item.level === 'warning' ? 'amber' :
                    item.level === 'success' ? 'success' :
                    'muted'
                  }>{item.level.toUpperCase()}</Badge>
                </div>
                <div className="lg:col-span-1">
                  <Badge variant={item.isActive ? 'success' : 'muted'}>
                    {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </div>
                <div className="lg:col-span-1 font-mono text-[12px] text-[var(--foreground)] tabular-nums">{item.priority}</div>
                <div className="lg:col-span-3 meta-mono text-[10px] text-[var(--muted-foreground)]">{formatDateTime(item.createdAt)}</div>
                <div className="lg:col-span-2 flex flex-wrap gap-1.5 lg:justify-end">
                  <Button variant="outline" size="sm" type="button" onClick={() => handleToggleActive(item)} disabled={busy}>
                    {item.isActive ? t('disable') : t('enable')}
                  </Button>
                  <Button variant="outline-danger" size="sm" type="button" onClick={() => handleDelete(item)} disabled={busy}>Del</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
