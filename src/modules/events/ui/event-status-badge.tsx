'use client';

import type { EventStatus } from '../types';

/**
 * 活动状态元数据 — 全站统一视觉来源的单一事实
 * 颜色走 CSS 变量，避免硬编码，自动适配明暗主题
 */
export const EVENT_STATUS_META: Record<
  EventStatus,
  { label: string; dot: string; border: string; text: string }
> = {
  upcoming: {
    label: 'Upcoming',
    dot: 'bg-[var(--primary)]',
    border: 'border-[var(--primary)]',
    text: 'text-[var(--primary)]',
  },
  ongoing: {
    label: 'Ongoing',
    dot: 'bg-emerald-500',
    border: 'border-emerald-500',
    text: 'text-emerald-500',
  },
  ended: {
    label: 'Ended',
    dot: 'bg-[var(--muted-foreground)]',
    border: 'border-[var(--border)]',
    text: 'text-[var(--muted-foreground)]',
  },
};

/** 状态圆点 — 编辑式：极简实心点 + 呼吸环（仅进行中） */
export function EventStatusDot({
  status,
  className = '',
}: {
  status: EventStatus | null | undefined;
  className?: string;
}) {
  if (!status) {
    return (
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full bg-[var(--border)] ${className}`}
      />
    );
  }
  const meta = EVENT_STATUS_META[status];
  return (
    <span
      role="img"
      aria-label={meta.label}
      className={`relative inline-flex h-1.5 w-1.5 items-center justify-center ${className}`}
    >
      {status === 'ongoing' && (
        <span
          aria-hidden
          className={`absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full ${meta.dot} opacity-60`}
        />
      )}
      <span
        aria-hidden
        className={`relative inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`}
      />
    </span>
  );
}

/** 状态徽章 — 编辑式：直角框 + 等宽小字 + 前置圆点 */
export function EventStatusBadge({
  status,
  withDot = true,
  className = '',
}: {
  status: EventStatus | null | undefined;
  withDot?: boolean;
  className?: string;
}) {
  if (!status) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 border border-[var(--border)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)] ${className}`}
      >
        {withDot && <EventStatusDot status={null} />}
        Unknown
      </span>
    );
  }
  const meta = EVENT_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${meta.border} px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] ${meta.text} ${className}`}
    >
      {withDot && <EventStatusDot status={status} />}
      {meta.label}
    </span>
  );
}
