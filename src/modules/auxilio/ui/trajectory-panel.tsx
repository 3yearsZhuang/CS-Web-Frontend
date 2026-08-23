/**
 * @file Trajectory 回放面板（融合点 2 消费端）— 按 seq 展示会话全事件流，支持逐条播放高亮。
 */
'use client';

import { useTranslations } from 'next-intl';
import { Activity, ChevronUp, Play, X } from 'lucide-react';
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

interface AgentRun {
  id: number;
  triggerType?: string | null;
  presetId?: string | null;
  status: string;
  totalTokens?: number | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}

const EVENT_LABELS = ['delta', 'tool_call', 'tool_result', 'usage', 'done', 'error'] as const;

function eventLabelKey(type: string): string {
  return `event${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

export default function TrajectoryPanel({ conversationId, onClose }: TrajectoryPanelProps) {
  const t = useTranslations('workbench');
  const [events, setEvents] = useState<TrajectoryEvent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [view, setView] = useState<'events' | 'runs'>('events');
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
      const runsResponse = await apiRequest<{ runs?: AgentRun[] }>(
        `/api/tools/auxilio/conversations/${conversationId}/runs`,
        { cache: 'no-store' },
      );
      if (runsResponse.ok) setRuns(runsResponse.data?.runs ?? []);
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
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] ${view === 'events' ? 'bg-[var(--border)]/50' : ''}`}
          onClick={() => setView('events')}
        >
          轨迹
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] ${view === 'runs' ? 'bg-[var(--border)]/50' : ''}`}
          onClick={() => setView('runs')}
        >
          <Activity className="w-3 h-3" /> 运行
        </button>
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
        {view === 'runs' && runs.map((run) => (
          <div key={run.id} className="rounded border border-[var(--border)] px-3 py-2 text-[12px]">
            <div className="flex items-center gap-2">
              <span className="font-medium">Run #{run.id}</span>
              <span className={run.status === 'completed' ? 'text-emerald-500' : run.status === 'failed' ? 'text-[var(--destructive)]' : 'text-amber-500'}>
                {run.status}
              </span>
              {run.presetId && <span className="text-[var(--muted-foreground)]">· {run.presetId}</span>}
            </div>
            <div className="mt-1 text-[var(--muted-foreground)]">
              {run.totalTokens ?? 0} tokens · {run.latencyMs != null ? `${run.latencyMs} ms` : '—'}
            </div>
            {run.errorMessage && <div className="mt-1 break-words text-[var(--destructive)]">{run.errorMessage}</div>}
          </div>
        ))}
        {view === 'runs' && !loading && !error && runs.length === 0 && (
          <p className="text-[12px] text-[var(--muted-foreground)]">暂无运行记录</p>
        )}
        {view === 'events' && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
