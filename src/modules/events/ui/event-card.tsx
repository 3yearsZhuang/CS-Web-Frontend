/**
 * @file 活动卡片 — 时间轴节点（桌面端左右交替，移动端单列）
 */
'use client';

import Link from 'next/link';
import type { EventItem } from '@/modules/events/types';
import { EventStatusBadge } from './event-status-badge';

interface EventCardProps {
  event: EventItem;
  isLeft: boolean;
}

/** 活动卡片组件 — 左右交替排列的时间轴节点 */
export function EventCard({ event, isLeft }: EventCardProps) {
  const isArchived = event.status === 'ended';

  return (
    <div
      className={`relative flex items-start py-6 sm:py-8 group ${
        isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
      } flex-row`}
    >
      <div className="absolute left-[12px] md:left-1/2 top-[34px] md:-translate-x-1/2 z-10 w-[15px] h-[15px] rounded-full border-2 bg-[var(--background)] transition-transform duration-300 group-hover:scale-125 motion-reduce:transition-none group-hover:shadow-[0_0_0_4px_var(--primary)]/20 shrink-0 border-[var(--primary)] pointer-events-none" aria-hidden="true" />
      <div className={`relative z-20 w-full md:w-[calc(50%-32px)] ${isLeft ? 'md:pr-8 md:text-right' : 'md:pl-8'} pl-12 md:pl-0`}>
        <Link href={`/events/${event.id}`} className="block card-minimal focus-amber group/link relative z-20">
          <article className={`border p-5 sm:p-6 transition-colors ${
            isArchived
              ? 'border-[var(--border)] opacity-70 hover:opacity-100 hover:border-[var(--primary)]/50'
              : 'border-[var(--border)] hover:border-[var(--primary)]'
          }`}>
            <div className={`meta-mono text-[11px] sm:text-[12px] mb-3 flex items-center gap-2 flex-wrap ${isLeft ? 'md:justify-end' : ''}`}>
              <span className="text-[var(--muted-foreground)]">
                {'//'} {event.date || event.month || event.year || '—'}
              </span>
              {event.isPinned && (
                <span className="font-mono uppercase tracking-wider px-2 py-0.5 border text-[10px] border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5">
                  [PINNED]
                </span>
              )}
              <EventStatusBadge status={event.status} />
            </div>
            <h3 className={`display-serif text-[clamp(18px,3vw,24px)] mb-3 group-hover/link:text-[var(--primary)] transition-colors leading-[1.2] ${
              isArchived ? 'text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'
            }`}>
              {event.isPinned && (
                <span className="inline-block align-middle mr-2 text-[var(--primary)]" title="置顶">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block -mt-0.5">
                    <line x1="12" y1="17" x2="12" y2="22"/>
                    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
                  </svg>
                </span>
              )}
              {event.title}
            </h3>
            <p className={`text-[13px] leading-[1.7] max-w-xl ${isLeft ? 'md:ml-auto' : ''} ${
              isArchived ? 'text-[var(--muted-foreground)]/70' : 'text-[var(--muted-foreground)]'
            }`}>
              {event.description}
            </p>
            {(event.topics.length > 0 || event.tags.length > 0) && (
              <div className={`mt-4 flex flex-wrap gap-2 ${isLeft ? 'md:justify-end' : ''}`}>
                {[...new Set([...event.topics, ...event.tags])].map((t, i) => (
                  <span key={`${t}-${i}`} className="tag-badge">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </article>
        </Link>
      </div>
      <div className="hidden md:block md:w-[calc(50%-32px)]" />
    </div>
  );
}
