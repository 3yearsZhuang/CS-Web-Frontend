/**
 * @file 管理员活动管理面板 — 活动列表 + 创建/编辑/删除/报名列表（自包含）
 */

'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { RevealItem } from '@/components/effects/motion-primitives';
import { Button, SectionLoading } from '@/components';
import { MarkdownEditorBase } from '@/modules/community/ui/forum-markdown-editor-base';
import { MarkdownRenderer } from '@/modules/community/ui/forum-markdown-renderer';
import { useToast } from '@/components/feedback/toast';
import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { ConfirmDialog } from '@/components/primitives/confirm-dialog';
import {
  type EventItem,
  type EventForm,
  type RegistrationRecord,
  type YearGroup,
} from '@/modules/admin/ui/types';
import { INPUT_CLASS, EASE } from '@/shared/utils/ui-constants';
import { formatDate } from '@/shared/utils/utils';

/* ============= 类型定义 ============= */

type EventModal =
  | { type: 'none' }
  | { type: 'eventCreate' }
  | { type: 'eventEdit'; event: EventItem }
  | { type: 'eventDelete'; event: EventItem }
  | { type: 'eventRegistrations'; event: EventItem };

interface EventStat {
  eventId: string;
  title: string;
  capacity: number;
  total: number;
  registered: number;
  cancelled: number;
  waitlisted: number;
}

/* ============= 工具函数 ============= */

function eventStatusLabel(s: EventItem['status']): string {
  return s === 'upcoming' ? '即将开始' : s === 'ongoing' ? '进行中' : s === 'ended' ? '已结束' : '—';
}

function blankEventForm(): EventForm {
  return {
    month: '',
    date: '',
    title: '',
    description: '',
    status: '',
    year: '',
    topicsStr: '',
    tagsStr: '',
    isPinned: false,
    capacity: 0,
    contentMarkdown: '',
  };
}

function eventToForm(e: EventItem): EventForm {
  return {
    month: e.month ?? '',
    date: e.date ?? '',
    title: e.title,
    description: e.description ?? '',
    status: e.status ?? '',
    year: e.year ?? '',
    topicsStr: e.topics.join(', '),
    tagsStr: e.tags.join(', '),
    isPinned: e.isPinned,
    capacity: e.capacity ?? 0,
    contentMarkdown: e.contentMarkdown ?? '',
    registrationFields: e.registrationFields ?? [],
  };
}

function splitTags(s: string): string[] {
  return Array.from(
    new Set(
      s
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

/* ============= 面板组件 ============= */

interface AdminEventsPanelProps {
  onForbidden: () => void;
}

/** 管理员活动管理面板 — 按年份分组管理活动，支持创建/编辑/删除/报名管理/CSV 导出 */
export function AdminEventsPanel({ onForbidden }: AdminEventsPanelProps) {
  const router = useRouter();

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

  const { pushToast } = useToast();

  /* ============= 数据获取 ============= */

  const fetchEvents = useCallback(async () => {
    setEventListLoading(true);
    setEventListError(null);
    try {
      const res = await fetch('/api/admin/events', { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (res.status === 403) {
        onForbidden();
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || '加载失败');
      }
      const data = (await res.json()) as { events: EventItem[] };
      setEvents(data.events ?? []);
    } catch (err) {
      setEventListError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setEventListLoading(false);
    }
  }, [router, onForbidden]);

  const fetchEventStats = useCallback(async () => {
    setEventStatsLoading(true);
    try {
      const res = await fetch('/api/admin/events/stats', {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setEventStats(data.stats ?? []);
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
      const res = await fetch(`/api/admin/events/${eventId}/registrations`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setRegistrations(data.registrations ?? []);
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
      const res = await fetch(`/api/admin/events/${eventId}/registrations/manage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '操作失败');
      }
      await fetchRegistrations(eventId);
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
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
      setEventError('标题不能为空');
      return;
    }
    if (eventForm.title.length > 120) {
      setEventError('标题不能超过 120 字符');
      return;
    }
    if (eventForm.description.length > 500) {
      setEventError('描述不能超过 500 字符');
      return;
    }
    if (eventForm.month.length > 8) {
      setEventError('月份不能超过 8 字符');
      return;
    }
    if (eventForm.date.length > 32) {
      setEventError('日期不能超过 32 字符');
      return;
    }
    if (eventForm.year.length > 8) {
      setEventError('年份不能超过 8 字符');
      return;
    }
    const topics = splitTags(eventForm.topicsStr);
    const tags = splitTags(eventForm.tagsStr);
    if (topics.length > 10) {
      setEventError('主题数量不能超过 10');
      return;
    }
    if (tags.length > 10) {
      setEventError('标签数量不能超过 10');
      return;
    }
    if (topics.some((t) => t.length > 40) || tags.some((t) => t.length > 40)) {
      setEventError('单个主题 / 标签不能超过 40 字符');
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
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as {
        event?: EventItem;
        error?: string;
      } | null;
      if (!res.ok || !data?.event) {
        setEventError(data?.error || '保存失败，请稍后再试');
        return;
      }
      setEvents((prev) => {
        const idx = prev.findIndex((it) => it.id === data.event!.id);
        if (idx === -1) return [...prev, data.event!];
        const next = [...prev];
        next[idx] = data.event!;
        return next;
      });
      pushToast(
        'success',
        modal.type === 'eventCreate' ? `已创建活动「${data.event.title}」` : `已更新活动「${data.event.title}」`,
      );
      closeModal();
    } catch {
      setEventError('网络错误，请稍后再试');
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
      const res = await fetch(`/api/admin/events/${target.id}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setEventError(data?.error || '删除失败，请稍后再试');
        return;
      }
      setEvents((prev) => prev.filter((it) => it.id !== target.id));
      pushToast('success', `已删除活动「${target.title}」`);
      closeModal();
    } catch {
      setEventError('网络错误，请稍后再试');
    } finally {
      setEventDeleteSaving(false);
    }
  };

  /* ============= 渲染辅助 ============= */

  const renderEventRow = (ev: EventItem, keyPrefix: string) => (
    <tr key={`${keyPrefix}-${ev.id}`} className="border-b border-[var(--border)] card-minimal align-middle">
      <td className="py-4 pr-4">
        <div className="text-[14px] text-[var(--foreground)] truncate font-mono break-all">
          {ev.title}
        </div>
        {ev.description && (
          <div className="meta-mono mt-1 text-[var(--muted-foreground)] line-clamp-2 break-all">
            {ev.description}
          </div>
        )}
        {(ev.topics.length > 0 || ev.tags.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {ev.topics.map((t) => (
              <span
                key={`t-${t}`}
                className="meta-mono px-1.5 py-0.5 border border-[var(--border)] text-[10px] text-[var(--muted-foreground)]"
              >
                {t}
              </span>
            ))}
            {ev.tags.map((t) => (
              <span
                key={`g-${t}`}
                className="meta-mono px-1.5 py-0.5 border border-[var(--primary)]/30 text-[10px] text-[var(--primary)]"
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="py-4 pr-4 meta-mono">
        {ev.date || ev.month || ev.year || '—'}
      </td>
      <td className="py-4 pr-4">
        <span
          className={`meta-mono ${
            ev.status === 'upcoming'
              ? 'text-[var(--primary)]'
              : ev.status === 'ongoing'
                ? 'text-[var(--foreground)]'
                : ev.status === 'ended'
                  ? 'text-[var(--muted-foreground)]'
                  : 'text-[var(--muted-foreground)]'
          }`}
        >
          {ev.status === 'upcoming'
            ? '● Upcoming'
            : ev.status === 'ongoing'
              ? '● Ongoing'
              : ev.status === 'ended'
                ? '● Ended'
                : '—'}
        </span>
      </td>
      <td className="py-4 pr-4 meta-mono">{formatDate(ev.updatedAt)}</td>
      <td className="py-4 pr-4 meta-mono">
        {(() => {
          const s = statsMap.get(ev.id);
          if (!s) return <span className="text-[var(--muted-foreground)]">—</span>;
          const cap = s.capacity > 0 ? `/${s.capacity}` : '';
          return (
            <span className={`${s.total > 0 ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
              {s.total}{cap}
            </span>
          );
        })()}
      </td>
      <td className="py-4 pl-4">
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => openEventRegistrations(ev)}
            className="focus-amber meta-mono text-[var(--primary)] hover:text-[var(--primary)]/70 underline-grow"
          >
            报名
          </button>
          <button
            type="button"
            onClick={() => openEventEdit(ev)}
            className="focus-amber meta-mono text-[var(--foreground)] hover:text-[var(--primary)] underline-grow"
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => openEventDelete(ev)}
            className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
          >
            删除
          </button>
        </div>
      </td>
    </tr>
  );

  const renderEventCard = (ev: EventItem, keyPrefix: string) => (
    <div key={`${keyPrefix}-${ev.id}`} className="p-4 card-minimal">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-[14px] text-[var(--foreground)] truncate font-mono break-all">
          {ev.title}
        </div>
      </div>
      {ev.description && (
        <div className="meta-mono mb-3 text-[var(--muted-foreground)] line-clamp-2 break-all">
          {ev.description}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="meta-mono text-[var(--muted-foreground)]">Date</div>
          <div className="meta-mono mt-1 text-[var(--foreground)]">
            {ev.date || ev.month || ev.year || '—'}
          </div>
        </div>
        <div>
          <div className="meta-mono text-[var(--muted-foreground)]">状态 / Status</div>
          <div
            className={`meta-mono mt-1 ${
              ev.status === 'upcoming'
                ? 'text-[var(--primary)]'
                : ev.status === 'ended'
                  ? 'text-[var(--muted-foreground)]'
                  : 'text-[var(--foreground)]'
            }`}
          >
            {eventStatusLabel(ev.status)}
          </div>
        </div>
        <div>
          <div className="meta-mono text-[var(--muted-foreground)]">更新 / Updated</div>
          <div className="meta-mono mt-1 text-[var(--foreground)]">
            {formatDate(ev.updatedAt)}
          </div>
        </div>
        <div>
          <div className="meta-mono text-[var(--muted-foreground)]">报名 / Regs</div>
          <div className="meta-mono mt-1">
            {(() => {
              const s = statsMap.get(ev.id);
              if (!s) return <span className="text-[var(--muted-foreground)]">—</span>;
              const cap = s.capacity > 0 ? `/${s.capacity}` : '';
              return (
                <span className={`${s.total > 0 ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
                  {s.total}{cap}
                </span>
              );
            })()}
          </div>
        </div>
      </div>
      {(ev.topics.length > 0 || ev.tags.length > 0) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {ev.topics.map((t) => (
            <span
              key={`m-t-${t}`}
              className="meta-mono px-1.5 py-0.5 border border-[var(--border)] text-[10px] text-[var(--muted-foreground)]"
            >
              {t}
            </span>
          ))}
          {ev.tags.map((t) => (
            <span
              key={`m-g-${t}`}
              className="meta-mono px-1.5 py-0.5 border border-[var(--primary)]/30 text-[10px] text-[var(--primary)]"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => openEventRegistrations(ev)}
          className="focus-amber meta-mono text-[var(--primary)] hover:text-[var(--primary)]/70 underline-grow"
        >
          报名
        </button>
        <button
          type="button"
          onClick={() => openEventEdit(ev)}
          className="focus-amber meta-mono text-[var(--foreground)] hover:text-[var(--primary)] underline-grow"
        >
          编辑
        </button>
        <button
          type="button"
          onClick={() => openEventDelete(ev)}
          className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow ml-auto"
        >
          删除
        </button>
      </div>
    </div>
  );

  /* ============= 渲染 ============= */

  return (
    <>
      {/* 工具栏：新建按钮 */}
      <RevealItem>
        <div className="border-t border-[var(--border)] border-b border-[var(--border)] py-5 sm:py-6 mb-0">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="col-span-12 md:col-span-7">
              <div className="meta-mono text-[var(--muted-foreground)] mb-2">[ 活动管理 / Events ]</div>
              <p className="text-[13px] text-[var(--foreground)] leading-[1.7]">
                按年份分组管理活动 · 已结束的计划将自动归档
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
              重试
            </button>
          </div>
        )}

        {eventListLoading && events.length === 0 && (
          <div className="py-20 flex items-center justify-center">
            <SectionLoading label="加载活动中 / Loading..." />
          </div>
        )}

        {!eventListLoading && !eventListError && events.length === 0 && (
          <div className="py-20 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 暂无活动 / No Event ]</div>
            <p className="text-[14px] text-[var(--muted-foreground)] mb-6">
              还没有任何活动，点击下方按钮创建第一条。
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
          <div>
            {/* 未分类活动 — 直接平铺，不包裹年份手风琴 */}
            {uncategorizedEvents.length > 0 && (
              <div>
                <div className="border-b border-[var(--border)] py-4">
                  <span className="display-serif text-[clamp(20px,3vw,28px)] text-[var(--primary)]">
                    Unclassified
                  </span>
                  <span className="meta-mono text-[11px] text-[var(--muted-foreground)] ml-3">
                    {uncategorizedEvents.length} 活动
                  </span>
                </div>
                <div className="hidden md:block">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left meta-mono py-3 pr-4 w-[25%]">Title</th>
                        <th className="text-left meta-mono py-3 pr-4">Date</th>
                        <th className="text-left meta-mono py-3 pr-4">Status</th>
                        <th className="text-left meta-mono py-3 pr-4">Updated</th>
                        <th className="text-left meta-mono py-3 pr-4">Regs</th>
                        <th className="text-right meta-mono py-3 pl-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uncategorizedEvents.map((ev) => renderEventRow(ev, 'uncat'))}
                    </tbody>
                  </table>
                </div>
                {/* 移动端卡片列表 */}
                <div className="md:hidden divide-y divide-[var(--border)]">
                  {uncategorizedEvents.map((ev) => renderEventCard(ev, 'uncat'))}
                </div>
                {yearGroups.length > 0 && (
                  <div className="border-b border-[var(--border)] py-2" />
                )}
              </div>
            )}

            {yearGroups.map((group) => {
              const isExpanded = expandedYears.has(group.year);
              const pastCount = group.events.filter(
                (e) => e.status === 'ended',
              ).length;
              const activeCount = group.events.length - pastCount;

              return (
                <div key={group.year}>
                  {/* 年份分割线 */}
                  <button
                    type="button"
                    onClick={() => toggleYear(group.year)}
                    className="w-full flex items-center gap-4 py-5 group cursor-pointer focus-amber border-b border-[var(--border)]"
                  >
                    <span className="display-serif text-[clamp(20px,3vw,28px)] transition-colors duration-300 text-[var(--foreground)] group-hover:text-[var(--primary)]">
                      {group.year}
                    </span>
                    <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                      {group.events.length} 活动
                    </span>
                    {activeCount > 0 && (
                      <span className="meta-mono text-[10px] text-[var(--primary)] px-2 py-0.5 border border-[var(--primary)]/30">
                        {activeCount} active
                      </span>
                    )}
                    {pastCount > 0 && (
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)] px-2 py-0.5 border border-[var(--border)]">
                        {pastCount} archived
                      </span>
                    )}
                    <span
                      className={`meta-mono text-[10px] ml-auto transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {/* 手风琴展开内容 */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="overflow-hidden"
                      >
                        {/* 桌面表格 */}
                        <div className="hidden md:block">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-[var(--border)]">
                                <th className="text-left meta-mono py-3 pr-4 w-[25%]">Title</th>
                                <th className="text-left meta-mono py-3 pr-4">Date</th>
                                <th className="text-left meta-mono py-3 pr-4">Status</th>
                                <th className="text-left meta-mono py-3 pr-4">Updated</th>
                                <th className="text-left meta-mono py-3 pr-4">Regs</th>
                                <th className="text-right meta-mono py-3 pl-4">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.events.map((ev) => renderEventRow(ev, group.year))}
                            </tbody>
                          </table>
                        </div>

                        {/* 移动端卡片列表 */}
                        <div className="md:hidden divide-y divide-[var(--border)]">
                          {group.events.map((ev) => renderEventCard(ev, group.year))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </RevealItem>

      {/* ============ 模态框：报名列表 ============ */}
      {modal.type === 'eventRegistrations' && (
        <ModalShell
          title={`[ 报名列表 / Registrations · ${modal.event.title} ]`}
          onClose={closeModal}
        >
          <div className="space-y-6">
            {/* 工具栏：导出 CSV */}
            <div className="flex items-center justify-between">
              <div className="meta-mono text-[12px] text-[var(--muted-foreground)]">
                {registrationsLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  `${registrations.length} 人已报名`
                )}
              </div>
              {registrations.length > 0 && (
                <Button
                  size="sm"
                  type="button"
                  onClick={() => exportRegistrationsCsv(modal.event, registrations)}
                >
                  CSV 导出 / Export
                </Button>
              )}
            </div>

            {/* 报名列表 */}
            {registrationsLoading && registrations.length === 0 ? (
              <div className="py-12 flex items-center justify-center">
                <span className="meta-mono text-[var(--muted-foreground)]">加载报名数据中...</span>
              </div>
            ) : registrations.length === 0 ? (
              <div className="py-12 text-center border border-[var(--border)]">
                <p className="meta-mono text-[var(--muted-foreground)]">暂无报名记录</p>
              </div>
            ) : (
              <div className="border border-[var(--border)] overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/[0.3]">
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">#</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">姓名 / Name</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">邮箱 / Email</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">状态 / Status</th>
                      <th className="text-left meta-mono py-3 px-4 text-[11px]">报名时间</th>
                      {modal.event.registrationFields && modal.event.registrationFields.length > 0 &&
                        modal.event.registrationFields.map((f) => (
                          <th key={f.key} className="text-left meta-mono py-3 px-4 text-[11px]">{f.label}</th>
                        ))
                      }
                      <th className="text-right meta-mono py-3 px-4 text-[11px]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((r, idx) => (
                      <tr key={r.id} className="border-b border-[var(--border)] last:border-0 card-minimal">
                        <td className="py-3 px-4 meta-mono text-[var(--muted-foreground)]">{idx + 1}</td>
                        <td className="py-3 px-4 text-[14px] text-[var(--foreground)] font-mono">
                          {r.displayName || '—'}
                        </td>
                        <td className="py-3 px-4 meta-mono text-[var(--muted-foreground)]">
                          {r.email || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`meta-mono text-[10px] px-2 py-0.5 border ${
                              r.status === 'registered'
                                ? 'border-[var(--primary)]/30 text-[var(--primary)]'
                                : r.status === 'cancelled'
                                  ? 'border-[var(--destructive)]/30 text-[var(--destructive)]'
                                  : 'border-[var(--border)] text-[var(--muted-foreground)]'
                            }`}
                          >
                            {r.status === 'registered' ? '已报名' : r.status === 'cancelled' ? '已取消' : '候补'}
                          </span>
                        </td>
                        <td className="py-3 px-4 meta-mono text-[var(--muted-foreground)]">
                          {formatDate(r.registeredAt)}
                        </td>
                        {modal.event.registrationFields && modal.event.registrationFields.length > 0 &&
                          modal.event.registrationFields.map((f) => (
                            <td key={f.key} className="py-3 px-4 meta-mono text-[var(--muted-foreground)] text-[12px]">
                              {r.formData?.[f.key] || '—'}
                            </td>
                          ))
                        }
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {r.status !== 'cancelled' && (
                              <button
                                type="button"
                                disabled={regManageSaving === r.id}
                                onClick={() => adminUpdateRegistration(modal.event.id, r.id, 'cancelled')}
                                className="meta-mono text-[10px] text-[var(--destructive)] hover:text-[var(--destructive)]/70 underline-grow focus-amber"
                              >
                                {regManageSaving === r.id ? '...' : '取消'}
                              </button>
                            )}
                            {r.status !== 'registered' && r.status !== 'waitlisted' && (
                              <button
                                type="button"
                                disabled={regManageSaving === r.id}
                                onClick={() => adminUpdateRegistration(modal.event.id, r.id, 'registered')}
                                className="meta-mono text-[10px] text-[var(--primary)] hover:text-[var(--primary)]/70 underline-grow focus-amber"
                              >
                                {regManageSaving === r.id ? '...' : '恢复'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* ============ 模态框：创建 / 编辑活动（桌面端双列布局） ============ */}
      {(modal.type === 'eventCreate' || modal.type === 'eventEdit') && eventForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[var(--background)] border border-[var(--border)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border)] shrink-0">
              <div className="meta-mono text-[var(--primary)]">
                {modal.type === 'eventCreate' ? '[ Create Event ]' : '[ Edit Event ]'}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-[14px] leading-none"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>
            <div className="px-5 sm:px-6 py-6 overflow-y-auto flex-1">
              <form onSubmit={handleEventSubmit} className="space-y-6">

                {/* ===== 双列布局 ===== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">

                  {/* 标题 — 跨两列 */}
                  <div className="md:col-span-2">
                    <Field label="标题 / Title" count={`${eventForm.title.length}/120`}>
                      <input
                        type="text"
                        value={eventForm.title}
                        maxLength={120}
                        onChange={(e) => setEventForm((f) => ({ ...f!, title: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                        placeholder="例如：秋季招新"
                        autoFocus
                      />
                    </Field>
                  </div>

                  {/* 描述 — 跨两列 */}
                  <div className="md:col-span-2">
                    <Field label="描述 / Description" count={`${eventForm.description.length}/500`}>
                      <textarea
                        value={eventForm.description}
                        maxLength={500}
                        rows={3}
                        onChange={(e) => setEventForm((f) => ({ ...f!, description: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
                        placeholder="一句话介绍活动内容"
                      />
                    </Field>
                  </div>

                  {/* 月份 / 日期 */}
                  <>
                    <Field label="月份 / Month" count={`${eventForm.month.length}/8`}>
                      <input
                        type="text"
                        value={eventForm.month}
                        maxLength={8}
                        onChange={(e) => setEventForm((f) => ({ ...f!, month: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                        placeholder="Sep"
                      />
                    </Field>
                    <Field label="日期 / Date" count={`${eventForm.date.length}/32`}>
                      <input
                        type="text"
                        value={eventForm.date}
                        maxLength={32}
                        onChange={(e) => setEventForm((f) => ({ ...f!, date: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                        placeholder="2026.09.15"
                      />
                    </Field>
                  </>

                  {/* 年份 */}
                  <div className="md:col-span-2">
                    <Field label="年份 / Year" count={`${eventForm.year.length}/8`}>
                      <input
                        type="text"
                        value={eventForm.year}
                        maxLength={8}
                        onChange={(e) => setEventForm((f) => ({ ...f!, year: e.target.value }))}
                        className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                        placeholder="2025"
                      />
                    </Field>
                  </div>

                  {/* 状态 */}
                  <div className="md:col-span-2">
                    <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 状态 / Status ]</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { v: '', label: '未设置' },
                          { v: 'upcoming', label: '即将开始' },
                          { v: 'ongoing', label: '进行中' },
                          { v: 'ended', label: '已结束' },
                        ] as { v: EventForm['status']; label: string }[]
                      ).map((s) => (
                        <button
                          key={s.v || 'none'}
                          type="button"
                          onClick={() => setEventForm((f) => ({ ...f!, status: s.v }))}
                          className={`focus-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                            eventForm.status === s.v
                              ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 主题（逗号分隔） */}
                  <Field label="主题 / Topics" count={`${splitTags(eventForm.topicsStr).length}/10`}>
                    <input
                      type="text"
                      value={eventForm.topicsStr}
                      onChange={(e) => setEventForm((f) => ({ ...f!, topicsStr: e.target.value }))}
                      className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                      placeholder="Recruiting, Open House"
                    />
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                      逗号分隔，单主题≤40字符
                    </p>
                  </Field>

                  {/* 标签（逗号分隔） */}
                  <Field label="标签 / Tags" count={`${splitTags(eventForm.tagsStr).length}/10`}>
                    <input
                      type="text"
                      value={eventForm.tagsStr}
                      onChange={(e) => setEventForm((f) => ({ ...f!, tagsStr: e.target.value }))}
                      className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                      placeholder="Hackathon, 24h"
                    />
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                      逗号分隔，单标签≤40字符
                    </p>
                  </Field>

                  {/* 置顶 */}
                  <div>
                    <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 置顶 / Pinned ]</div>
                    <button
                      type="button"
                      onClick={() => setEventForm((f) => f ? { ...f, isPinned: !f.isPinned } : f)}
                      className={`focus-amber px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border transition-colors w-full ${
                        eventForm.isPinned
                          ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                      }`}
                    >
                      {eventForm.isPinned ? '📌 已置顶' : '置顶 / Pin'}
                    </button>
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                      置顶活动将始终排在最前
                    </p>
                  </div>

                  {/* 活动容量 */}
                  <Field label="容量 / Capacity">
                    <input
                      type="number"
                      value={eventForm.capacity}
                      min={0}
                      onChange={(e) =>
                        setEventForm((f) => ({
                          ...f!,
                          capacity: Number.isNaN(e.target.valueAsNumber)
                            ? 0
                            : Math.max(0, e.target.valueAsNumber),
                        }))
                      }
                      className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                      placeholder="0 = 不限"
                    />
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                      0 表示不限名额
                    </p>
                  </Field>

                  {/* 活动详情 Markdown — 跨两列 */}
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-0 mb-2">
                      <button
                        type="button"
                        onClick={() => setEventFormTab('edit')}
                        className={`focus-amber px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                          eventFormTab === 'edit'
                            ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                        }`}
                      >
                        编辑 / Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setEventFormTab('preview')}
                        className={`focus-amber px-4 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors -ml-px ${
                          eventFormTab === 'preview'
                            ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                        }`}
                      >
                        预览 / Preview
                      </button>
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-auto">
                        {eventForm.contentMarkdown.length}/10000
                      </span>
                    </div>
                    {eventFormTab === 'edit' ? (
                      <MarkdownEditorBase
                        value={eventForm.contentMarkdown}
                        onChange={(v) => setEventForm((f) => ({ ...f!, contentMarkdown: v }))}
                        placeholder={'可选 — 活动详情 Markdown，渲染在活动详情页 Details 区\n\n## 示例\n- 时间地点\n- 议程安排\n- 注意事项'}
                        rows={6}
                      />
                    ) : (
                      <div className="border border-[var(--border)] p-4 min-h-[120px] max-h-[300px] overflow-y-auto">
                        {eventForm.contentMarkdown.trim() ? (
                          <MarkdownRenderer content={eventForm.contentMarkdown} />
                        ) : (
                          <p className="meta-mono text-[var(--muted-foreground)] text-center py-8">
                            暂无内容 — 切换到「编辑」Tab 写入 Markdown
                          </p>
                        )}
                      </div>
                    )}
                    <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">
                      支持 Markdown 语法，最多 10000 字符；不填则不显示 Details 区
                    </p>
                  </div>
                </div>

                {eventError && (
                  <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                    {eventError}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                  <Button
                    type="submit"
                    disabled={eventSaving}
                    loading={eventSaving}
                  >
                    {eventSaving
                      ? '保存中 / Saving...'
                      : modal.type === 'eventCreate'
                        ? '创建活动 / Create Event →'
                        : '保存更改 / Save Changes →'}
                  </Button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============ 模态框：删除活动确认 ============ */}
      <ConfirmDialog
        open={modal.type === 'eventDelete'}
        title="删除活动"
        message="确认删除该活动？此操作不可撤销。"
        variant="danger"
        confirmLabel={eventDeleteSaving ? '删除中...' : '确认删除'}
        loading={eventDeleteSaving}
        onConfirm={handleEventDelete}
        onCancel={closeModal}
      >
        {modal.type === 'eventDelete' && (
          <>
            <div className="p-3 border border-[var(--border)] bg-[var(--muted)]/[0.3]">
              <div className="text-[13px] font-mono text-[var(--foreground)] break-all">
                {modal.event.title}
              </div>
              {modal.event.description && (
                <div className="meta-mono text-[var(--muted-foreground)] break-all mt-1">
                  {modal.event.description}
                </div>
              )}
            </div>
            {eventError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {eventError}
              </div>
            )}
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
