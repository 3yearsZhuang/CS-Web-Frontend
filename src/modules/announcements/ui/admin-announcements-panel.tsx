/**
 * @file 公告管理面板 — announcement 域唯一实现（GENERAL 2.4 按关注点拆分）
 *
 * 自包含公告的增删改查与表单渲染，供 admin-messages-panel 子 Tab 嵌入。
 * （曾与 admin/announcements-panel.tsx 重复，已收敛至此域单一定位。）
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/shared/utils';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { useTransientMessage } from '@/shared/hooks/use-transient-message';
import { Plus, X, Eye, EyeOff, Save, Trash2, Loader2 } from 'lucide-react';
import { RevealItem } from '@/components/effects/motion-primitives';
import { SectionLoading, Button } from '@/components';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import type { Announcement, AnnouncementLevel } from '@/modules/announcements/types';

interface AnnouncementForm {
  title: string;
  content: string;
  level: AnnouncementLevel;
  isDismissible: boolean;
  priority: number;
  expiresAt: string;
  targetRoles: string[];
}

const emptyForm: AnnouncementForm = {
  title: '',
  content: '',
  level: 'info',
  isDismissible: true,
  priority: 0,
  expiresAt: '',
  targetRoles: [],
};

const levelOptions: { value: AnnouncementLevel; labelKey: string }[] = [
  { value: 'info', labelKey: 'levelInfo' },
  { value: 'warning', labelKey: 'levelWarning' },
  { value: 'success', labelKey: 'levelSuccess' },
  { value: 'error', labelKey: 'levelError' },
];

/** 公告管理子面板 — 列表 + 新建/编辑表单 + 启用/删除 */
export function AnnouncementsPanel() {
  const t = useTranslations('announcementsAdmin');
  const { confirm } = useConfirm();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annError, setAnnError] = useState<string | null>(null);
  const [annSuccess, annShowSuccess] = useTransientMessage();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementForm>({ ...emptyForm });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setAnnLoading(true);
      const r = await apiRequest<{ items: Announcement[] }>('/api/admin/announcements');
      if (!r.ok) throw new Error(r.error ?? t('loadFailed'));
      setAnnouncements(r.data?.items ?? []);
      setAnnError(null);
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setAnnLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (a: Announcement) => {
    setForm({
      title: a.title,
      content: a.content || '',
      level: a.level,
      isDismissible: a.isDismissible,
      priority: a.priority,
      expiresAt: a.expiresAt || '',
      targetRoles: a.targetRoles || [],
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleAnnSubmit = async () => {
    if (!form.title.trim()) {
      setAnnError(t('titleRequired'));
      return;
    }
    setSubmitting(true);
    setAnnError(null);
    try {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        content: form.content.trim() || undefined,
        level: form.level,
        isDismissible: form.isDismissible,
        priority: form.priority,
        expiresAt: form.expiresAt || null,
        targetRoles: form.targetRoles.length > 0 ? form.targetRoles : null,
      };
      let r;
      if (editingId) {
        r = await apiRequest(`/api/admin/announcements/${editingId}`, {
          method: 'PATCH',
          body,
        });
      } else {
        r = await apiRequest('/api/admin/announcements', {
          method: 'POST',
          body,
        });
      }
      if (!r.ok) throw new Error(r.error ?? t('actionFailed'));
      annShowSuccess(editingId ? t('updated') : t('created'));
      resetForm();
      fetchAnnouncements();
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : t('actionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (a: Announcement) => {
    try {
      const r = await apiRequest(`/api/admin/announcements/${a.id}`, {
        method: 'PATCH',
        body: { isActive: !a.isActive },
      });
      if (!r.ok) throw new Error(r.error ?? t('actionFailed'));
      fetchAnnouncements();
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : t('actionFailed'));
    }
  };

  const handleDelete = async (a: Announcement) => {
    const confirmed = await confirm({
      title: t('deleteTitle'),
      message: t('deleteMessage', { title: a.title }),
      variant: 'danger',
      confirmLabel: t('confirmDelete'),
    });
    if (!confirmed) return;
    try {
      const r = await apiRequest(`/api/admin/announcements/${a.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(r.error ?? t('deleteFailed'));
      annShowSuccess(t('deleted'));
      fetchAnnouncements();
    } catch (err) {
      setAnnError(err instanceof Error ? err.message : t('deleteFailed'));
    }
  };

  const levelBadge = (level: AnnouncementLevel) => {
    const colors: Record<string, string> = {
      info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, string> = {
      info: t('levelInfo'), warning: t('levelWarning'), success: t('levelSuccess'), error: t('levelError'),
    };
    return (
      <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${colors[level] || colors.info}`}>
        {labels[level] || level}
      </span>
    );
  };

  return (
    <>
      {/* 操作栏 */}
      <RevealItem>
        <div className="py-5 flex items-center justify-between">
          <div className="meta-mono text-[var(--muted-foreground)]">{t('countLabel', { count: announcements.length })}</div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--foreground)]/5 transition-colors"
          >
            <Plus size={14} />
            {t('newBtn')}
          </button>
        </div>
      </RevealItem>

      {/* 提示信息 */}
      {annSuccess && (
        <div className="p-3 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[11px] font-mono text-[var(--muted-foreground)]">
          {annSuccess}
        </div>
      )}
      {annError && (
        <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
          {annError}
          <button onClick={() => setAnnError(null)} className="ml-2 underline">{t('close')}</button>
        </div>
      )}

      {/* 新建/编辑表单 */}
      {showForm && (
        <div className="mt-4 p-4 border border-[var(--border)] bg-[var(--foreground)]/2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-mono tracking-wider text-[var(--muted-foreground)]">
              {editingId ? t('editTitle') : t('createTitle')}
            </h3>
            <button onClick={resetForm} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-[var(--muted-foreground)] mb-1">{t('fieldTitle')}</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={200}
                className="w-full px-3 py-2 text-[12px] font-mono border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--foreground)]/30"
                placeholder={t('titlePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-[var(--muted-foreground)] mb-1">{t('fieldContent')}</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                maxLength={5000}
                rows={3}
                className="w-full px-3 py-2 text-[12px] font-mono border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:border-[var(--foreground)]/30 resize-none"
                placeholder={t('contentPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-[var(--muted-foreground)] mb-1">{t('fieldLevel')}</label>
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as AnnouncementLevel })}
                  className="w-full px-2 py-2 text-[11px] font-mono border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                >
                  {levelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[var(--muted-foreground)] mb-1">{t('fieldPriority')}</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  className="w-full px-2 py-2 text-[11px] font-mono border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[var(--muted-foreground)] mb-1">{t('fieldExpires')}</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt ? form.expiresAt.slice(0, 16) : ''}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  className="w-full px-2 py-2 text-[11px] font-mono border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]"
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <label className="flex items-center gap-2 text-[11px] font-mono text-[var(--foreground)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDismissible}
                    onChange={(e) => setForm({ ...form, isDismissible: e.target.checked })}
                    className="rounded"
                  />
                  {t('dismissible')}
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" type="button" onClick={resetForm}>{t('cancel')}</Button>
              <Button
                variant="filled"
                size="sm"
                type="button"
                onClick={handleAnnSubmit}
                disabled={submitting || !form.title.trim()}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {editingId ? t('saveChanges') : t('createBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 公告列表 */}
      {annLoading ? (
        <SectionLoading label={t('loading')} />
      ) : announcements.length === 0 ? (
        <div className="py-12 text-center text-[12px] font-mono text-[var(--muted-foreground)]">
          {t('empty')}
        </div>
      ) : (
        <div className="mt-4 border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--foreground)]/3">
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">{t('colTitle')}</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">{t('colLevel')}</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">{t('colStatus')}</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">{t('colPriority')}</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">{t('colExpires')}</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">{t('colCreated')}</th>
                  <th className="px-4 py-2 text-[10px] font-mono text-[var(--muted-foreground)]">{t('colAction')}</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--foreground)]/3 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="text-[12px] font-mono text-[var(--foreground)] truncate max-w-[300px]">{a.title}</div>
                      {a.content && (
                        <div className="text-[10px] font-mono text-[var(--muted-foreground)] truncate max-w-[300px] mt-0.5">
                          {a.content.slice(0, 80)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">{levelBadge(a.level)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[11px] font-mono ${a.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--muted-foreground)]'}`}>
                        {a.isActive ? t('statusActive') : t('statusInactive')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-[var(--muted-foreground)]">{a.priority}</td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-[var(--muted-foreground)]">
                      {a.expiresAt ? formatDate(a.expiresAt) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-[var(--muted-foreground)]">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => startEdit(a)}
                          className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          title={t('editTooltip')}
                        >
                          <Save size={13} />
                        </button>
                        <button
                          onClick={() => toggleActive(a)}
                          className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          title={a.isActive ? t('disableTooltip') : t('enableTooltip')}
                        >
                          {a.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          onClick={() => handleDelete(a)}
                          className="p-1 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                          title={t('deleteTooltip')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
