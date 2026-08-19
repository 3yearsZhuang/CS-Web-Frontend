/**
 * @file 管理员活动管理面板 — 活动列表 + 创建/编辑/删除/报名列表（自包含）
 */

'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { RevealItem } from '@/components/effects/motion-primitives';
import { Button, SectionLoading } from '@/components';
import { useToast } from '@/components/feedback/toast';
import {
  type EventItem,
  type EventForm,
  type RegistrationRecord,
} from '@/modules/admin/ui/types';
import { EventModals } from './event-modals';
import { AdminEventsSettings } from './admin-events-settings';
import { EventYearGroups } from './event-list';
import {
  blankEventForm,
  eventToForm,
  splitTags,
  type EventModal,
  type EventStat,
} from './events-panel-utils';

/* ============= 面板组件 ============= */

interface AdminEventsPanelProps {
  onForbidden: () => void;
}

/** 管理员活动管理面板 — 按年份分组管理活动，支持创建/编辑/删除/报名管理/CSV 导出 */
export function AdminEventsPanel({ onForbidden }: AdminEventsPanelProps) {
  const router = useRouter();
  const t = useTranslations('adminEvents');

  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventListLoading, setEventListLoading] = useState(false);
  const [eventListError, setEventListError] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventForm | null>(null);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventDeleteSaving, setEventDeleteSaving] = useState(false);
  const [eventFormTab, setEventFormTab] = useState<'edit' | 'preview'>('edit');
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [eventStatsLoading, setEventStatsLoading] = useState(false);
  const [regManageSaving, setRegManageSaving] = useState<string | null>(null);
  const [modal, setModal] = useState<EventModal>({ type: 'none' });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { pushToast } = useToast();

  /* ============= 数据获取 ============= */

  const fetchEvents = useCallback(async () => {
    setEventListLoading(true);
    setEventListError(null);
    try {
      const r = await apiRequest<{ events: EventItem[] }>('/api/admin/events', { cache: 'no-store' });
      if (r.status === 401) {
        router.replace('/login');
        return;
      }
      if (r.status === 403) {
        onForbidden();
        return;
      }
      if (!r.ok) {
        throw new Error(r.error ?? t('loadFailed'));
      }
      setEvents(r.data?.events ?? []);
    } catch (err) {
      setEventListError(err instanceof Error ? err.message : t('loadFailed'));
    } finally {
      setEventListLoading(false);
    }
  }, [router, onForbidden]);

  const fetchEventStats = useCallback(async () => {
    setEventStatsLoading(true);
    try {
      const r = await apiRequest<{ stats?: EventStat[] }>('/api/admin/events/stats', {
        cache: 'no-store',
      });
      if (r.ok) {
        setEventStats(r.data?.stats ?? []);
      }
    } catch {
      // 静默失败
    } finally {
      setEventStatsLoading(false);
    }
  }, []);

  const fetchRegistrations = useCallback(async (eventId: string) => {
    setRegistrationsLoading(true);
    try {
      const r = await apiRequest<{ registrations?: RegistrationRecord[] }>(
        `/api/admin/events/${eventId}/registrations`,
      );
      if (!r.ok) throw new Error(t('loadFailed'));
      setRegistrations(r.data?.registrations ?? []);
    } catch {
      setRegistrations([]);
    } finally {
      setRegistrationsLoading(false);
    }
  }, []);

  /* ============= 派生数据 ============= */

  const { uncategorizedEvents, yearGroups } = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of events) {
      const y = e.year || '未分类';
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(e);
    }
    const uncategorized = map.get('未分类') ?? [];
    map.delete('未分类');
    const sorted = Array.from(map.entries()).sort(([a], [b]) => {
      return b.localeCompare(a);
    });
    return {
      uncategorizedEvents: uncategorized,
      yearGroups: sorted.map(([year, events]) => ({ year, events })),
    };
  }, [events]);

  const statsMap = useMemo(() => {
    const map = new Map<string, EventStat>();
    for (const s of eventStats) {
      map.set(s.eventId, s);
    }
    return map;
  }, [eventStats]);

  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  // 数据加载后自动展开所有年份
  const prevYearCountRef = useRef(0);
  useEffect(() => {
    if (events.length > 0) {
      const yearSet = new Set(events.map((e) => e.year || '未分类'));
      if (yearSet.size !== prevYearCountRef.current) {
        prevYearCountRef.current = yearSet.size;
        setExpandedYears(yearSet);
      }
    }
  }, [events]);

  // 挂载时拉取
  useEffect(() => {
    fetchEvents();
    fetchEventStats();
  }, [fetchEvents, fetchEventStats]);

  /* ============= 行内操作 ============= */

  const exportRegistrationsCsv = (event: EventItem, records: RegistrationRecord[]) => {
    const fieldDefs = event.registrationFields || [];
    const header =
      '姓名,邮箱,状态,报名时间' +
      (fieldDefs.length > 0 ? ',' + fieldDefs.map((f) => f.label).join(',') : '') +
      '\n';
    const rows = records
      .map((r) => {
        const base = `${r.displayName || '—'},${r.email || '—'},${r.status === 'registered' ? '已报名' : r.status === 'cancelled' ? '已取消' : '候补'},${r.registeredAt}`;
        if (fieldDefs.length > 0) {
          const formVals = fieldDefs.map((f) => r.formData?.[f.key] || '—').join(',');
          return base + ',' + formVals;
        }
        return base;
      })
      .join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${event.title.slice(0, 20)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const adminUpdateRegistration = async (
    eventId: string,
    registrationId: string,
    status: 'cancelled' | 'waitlisted' | 'registered',
  ) => {
    setRegManageSaving(registrationId);
    try {
      const r = await apiRequest(`/api/admin/events/${eventId}/registrations/manage`, {
        method: 'PUT',
        body: { registrationId, status },
      });
      if (!r.ok) {
        throw new Error(r.error ?? t('operationFailed'));
      }
      await fetchRegistrations(eventId);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('operationFailed'));
    } finally {
      setRegManageSaving(null);
    }
  };

  const openEventCreate = () => {
    setEventForm(blankEventForm());
    setEventError(null);
    setModal({ type: 'eventCreate' });
  };

  const openEventEdit = (event: EventItem) => {
    setEventForm(eventToForm(event));
    setEventError(null);
    setModal({ type: 'eventEdit', event });
  };

  const openEventDelete = (event: EventItem) => {
    setEventDeleteSaving(false);
    setEventError(null);
    setModal({ type: 'eventDelete', event });
  };

  const openEventRegistrations = (event: EventItem) => {
    setRegistrations([]);
    setRegistrationsLoading(true);
    setModal({ type: 'eventRegistrations', event });
    fetchRegistrations(event.id);
  };

  const closeModal = () => {
    setModal({ type: 'none' });
    setEventForm(null);
    setEventError(null);
    setEventDeleteSaving(false);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.type !== 'eventCreate' && modal.type !== 'eventEdit') return;
    if (!eventForm) return;

    if (!eventForm.title.trim()) {
      setEventError(t('titleEmpty'));
      return;
    }
    if (eventForm.title.length > 120) {
      setEventError(t('titleTooLong'));
      return;
    }
    if (eventForm.description.length > 500) {
      setEventError(t('descTooLong'));
      return;
    }
    if (eventForm.month.length > 8) {
      setEventError(t('monthTooLong'));
      return;
    }
    if (eventForm.date.length > 32) {
      setEventError(t('dateTooLong'));
      return;
    }
    if (eventForm.year.length > 8) {
      setEventError(t('yearTooLong'));
      return;
    }
    const topics = splitTags(eventForm.topicsStr);
    const tags = splitTags(eventForm.tagsStr);
    if (topics.length > 10) {
      setEventError(t('topicsTooMany'));
      return;
    }
    if (tags.length > 10) {
      setEventError(t('tagsTooMany'));
      return;
    }
    if (topics.some((t) => t.length > 40) || tags.some((t) => t.length > 40)) {
      setEventError(t('tagTooLong'));
      return;
    }

    const payload = {
      month: eventForm.month || null,
      date: eventForm.date || null,
      title: eventForm.title,
      description: eventForm.description || null,
      status: eventForm.status || null,
      year: eventForm.year || null,
      topics,
      tags,
      isPinned: eventForm.isPinned,
      capacity: Number.isFinite(eventForm.capacity) ? eventForm.capacity : 0,
      contentMarkdown: eventForm.contentMarkdown || null,
      registrationFields: eventForm.registrationFields ?? [],
    };

    setEventSaving(true);
    setEventError(null);
    try {
      const url =
        modal.type === 'eventCreate'
          ? '/api/admin/events'
          : `/api/admin/events/${modal.event.id}`;
      const method = modal.type === 'eventCreate' ? 'POST' : 'PUT';
      const r = await apiRequest<{ event?: EventItem }>(url, {
        method,
        body: payload,
      });
      if (!r.ok || !r.data?.event) {
        setEventError(r.error ?? t('saveFailed'));
        return;
      }
      const ev = r.data.event;
      setEvents((prev) => {
        const idx = prev.findIndex((it) => it.id === ev.id);
        if (idx === -1) return [...prev, ev];
        const next = [...prev];
        next[idx] = ev;
        return next;
      });
      pushToast(
        'success',
        modal.type === 'eventCreate' ? t('eventCreated', { title: ev.title }) : t('eventUpdated', { title: ev.title }),
      );
      closeModal();
    } catch {
      setEventError(t('networkError'));
    } finally {
      setEventSaving(false);
    }
  };

  const handleEventDelete = async () => {
    if (modal.type !== 'eventDelete') return;
    const target = modal.event;
    setEventDeleteSaving(true);
    setEventError(null);
    try {
      const r = await apiRequest<{ ok?: boolean }>(`/api/admin/events/${target.id}`, { method: 'DELETE' });
      if (!r.ok || !r.data?.ok) {
        setEventError(r.error ?? t('deleteFailed'));
        return;
      }
      setEvents((prev) => prev.filter((it) => it.id !== target.id));
      pushToast('success', t('eventDeleted', { title: target.title }));
      closeModal();
    } catch {
      setEventError(t('networkError'));
    } finally {
      setEventDeleteSaving(false);
    }
  };

  /* ============= 渲染辅助 ============= */

  const eventActions = {
    onRegistrations: openEventRegistrations,
    onEdit: openEventEdit,
    onDelete: openEventDelete,
  };

  /* ============= 渲染 ============= */

  return (
    <>
      {/* 工具栏：新建按钮 */}
      <RevealItem>
        <div className="border-t border-[var(--border)] border-b border-[var(--border)] py-5 sm:py-6 mb-0">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="col-span-12 md:col-span-7">
              <div className="meta-mono text-[var(--muted-foreground)] mb-2">{t('panelLabel')}</div>
              <p className="text-[13px] text-[var(--foreground)] leading-[1.7]">
                {t('panelDesc')}
              </p>
            </div>
            <div className="col-span-12 md:col-span-5 flex items-center md:justify-end gap-4">
              <Button
                size="sm"
                type="button"
                onClick={openEventCreate}
              >
                <span className="text-[14px] leading-none">+</span>
                New Event
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => setSettingsOpen((v) => !v)}
              >
                Settings
              </Button>
              <button
                type="button"
                onClick={() => fetchEvents()}
                disabled={eventListLoading}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
              >
                {eventListLoading ? 'Loading' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </RevealItem>

      {/* 活动设置（内联可折叠面板） */}
      <AdminEventsSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* 列表区 */}
      <RevealItem>
        {eventListError && (
          <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--destructive)]">
            [ Error ] {eventListError}
            <button
              type="button"
              onClick={() => fetchEvents()}
              className="focus-amber ml-3 underline hover:opacity-80"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {eventListLoading && events.length === 0 && (
          <div className="py-20 flex items-center justify-center">
            <SectionLoading label={t('loadingEvents')} />
          </div>
        )}

        {!eventListLoading && !eventListError && events.length === 0 && (
          <div className="py-20 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">{t('noEvents')}</div>
            <p className="text-[14px] text-[var(--muted-foreground)] mb-6">
              {t('noEventsDesc')}
            </p>
            <Button
              type="button"
              onClick={openEventCreate}
            >
              <span className="text-[14px] leading-none">+</span>
              New Event
            </Button>
          </div>
        )}

        {/* 年份手风琴活动列表 */}
        {!eventListError && events.length > 0 && (
          <EventYearGroups
            uncategorizedEvents={uncategorizedEvents}
            yearGroups={yearGroups}
            expandedYears={expandedYears}
            statsMap={statsMap}
            onToggleYear={toggleYear}
            actions={eventActions}
          />
        )}
      </RevealItem>

      {/* ============ 模态框 ============ */}
      <EventModals
        modal={modal}
        eventForm={eventForm}
        setEventForm={setEventForm}
        eventSaving={eventSaving}
        eventError={eventError}
        eventDeleteSaving={eventDeleteSaving}
        eventFormTab={eventFormTab}
        setEventFormTab={setEventFormTab}
        registrations={registrations}
        registrationsLoading={registrationsLoading}
        regManageSaving={regManageSaving}
        onFormSubmit={handleEventSubmit}
        onDelete={handleEventDelete}
        onClose={closeModal}
        onExportCsv={exportRegistrationsCsv}
        onManageRegistration={adminUpdateRegistration}
      />
    </>
  );
}
