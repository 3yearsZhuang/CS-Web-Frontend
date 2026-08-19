/**
 * @file Trajectory 回放面板（融合点 2 消费端）— 按 seq 展示会话全事件流，支持逐条播放高亮。
 */
'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Play, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/shared/hooks/use-api-request';

interface TrajectoryEvent {
  id: number;
  seq: number;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt?: string | null;
}

interface TrajectoryPanelProps {
  conversationId: number | null;
  onClose: () => void;
}

const EVENT_LABELS = ['delta', 'tool_call', 'tool_result', 'usage', 'done', 'error'] as const;

function eventLabelKey(type: string): string {
  return `event${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

export default function TrajectoryPanel({ conversationId, onClose }: TrajectoryPanelProps) {
  const t = useTranslations('workbench');
  const [events, setEvents] = useState<TrajectoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (conversationId == null) return;
    setLoading(true);
    setError(null);
    try {
      const r = await apiRequest<{ events?: TrajectoryEvent[] }>(
        `/api/tools/auxilio/conversations/${conversationId}/events`,
        { cache: 'no-store' },
      );
      if (!r.ok) {
        setError(String(r.status));
        return;
      }
      setEvents(r.data?.events ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) {
      setPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    if (events.length === 0) return;
    setActiveIdx(0);
    setPlaying(true);
    timerRef.current = setInterval(() => {
      setActiveIdx((prev) => {
        if (prev >= events.length - 1) {
          setPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, 900);
  }, [playing, events.length]);

  const preview = (ev: TrajectoryEvent): string => {
    const p = ev.payload ?? {};
    if (ev.eventType === 'delta') return String(p.text ?? '').slice(0, 120);
    if (ev.eventType === 'tool_call') return `${String(p.name ?? '')}(${String(p.arguments ?? '{}')})`;
    if (ev.eventType === 'tool_result')
      return `${String(p.name ?? '')} · ${p.ok === false ? 'error' : 'ok'} · ${String(p.preview ?? '').slice(0, 80)}`;
    if (ev.eventType === 'error') return String(p.message ?? '');
    if (ev.eventType === 'done') return String(p.title ?? '');
    return JSON.stringify(p).slice(0, 120);
  };

  return (
    <div className="flex flex-col border border-[var(--border)] rounded-lg bg-[var(--background)]/40">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
        <span className="text-[13px] font-medium">{t('replay')}</span>
        <span className="text-[12px] text-[var(--muted-foreground)]">
          {conversationId != null ? `#${conversationId}` : t('replayNoConversation')}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          className="p-1 rounded hover:bg-[var(--border)]/40"
          onClick={togglePlay}
          disabled={events.length === 0 || conversationId == null}
          aria-label={t('play')}
        >
          {playing ? <ChevronUp className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button type="button" className="p-1 rounded hover:bg-[var(--border)]/40" onClick={onClose} aria-label="close">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[40vh] overflow-y-auto p-3 flex flex-col gap-1.5">
        {loading && <p className="text-[12px] text-[var(--muted-foreground)]">{t('loading')}</p>}
        {!loading && error && (
          <p className="text-[12px] text-[var(--destructive)]">{t('replayFailed', { msg: error })}</p>
        )}
        {!loading && !error && events.length === 0 && (
          <p className="text-[12px] text-[var(--muted-foreground)]">{t('noEvents')}</p>
        )}
        {events.map((ev, i) => {
          const isActive = playing && i === activeIdx;
          const labelKey = EVENT_LABELS.includes(ev.eventType as (typeof EVENT_LABELS)[number])
            ? eventLabelKey(ev.eventType)
            : 'eventOther';
          return (
            <div
              key={ev.id}
              className={`flex items-start gap-2 px-2 py-1.5 rounded border border-[var(--border)] text-[12px] transition-colors ${
                isActive ? 'bg-[var(--primary)]/15 border-[var(--primary)]/40' : ''
              }`}
            >
              <span className="text-[var(--muted-foreground)] shrink-0 w-6">#{ev.seq}</span>
              <span className="shrink-0 font-medium w-20">{t(labelKey)}</span>
              <span className="text-[var(--muted-foreground)] break-all leading-[1.5]">{preview(ev)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
