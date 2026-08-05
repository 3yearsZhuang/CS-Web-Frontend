/**
 * @file 活动列表行/卡片/年份分组展示组件 — 从 admin-events-panel 拆出（GENERAL 2.4 按 UI 层级拆分）
 */
'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { EventItem, YearGroup } from '@/modules/admin/ui/types';
import { EASE } from '@/shared/utils/ui-constants';
import { formatDate } from '@/shared/utils/utils';
import type { EventStat } from './events-panel-utils';

export interface EventRowActions {
  onRegistrations: (ev: EventItem) => void;
  onEdit: (ev: EventItem) => void;
  onDelete: (ev: EventItem) => void;
}

/** 桌面端活动表格行 */
export function EventRow({
  event: ev,
  stat,
  keyPrefix,
  actions,
}: {
  event: EventItem;
  stat?: EventStat;
  keyPrefix: string;
  actions: EventRowActions;
}) {
  return (
    <tr key={`${keyPrefix}-${ev.id}`} className="border-b border-[var(--border)] card-minimal align-middle">
      <td className="py-4 pr-4">
        <div className="text-[14px] text-[var(--foreground)] truncate font-mono break-all">{ev.title}</div>
        {ev.description && (
          <div className="meta-mono mt-1 text-[var(--muted-foreground)] line-clamp-2 break-all">{ev.description}</div>
        )}
        {(ev.topics.length > 0 || ev.tags.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {ev.topics.map((t) => (
              <span key={`t-${t}`} className="meta-mono px-1.5 py-0.5 border border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
                {t}
              </span>
            ))}
            {ev.tags.map((t) => (
              <span key={`g-${t}`} className="meta-mono px-1.5 py-0.5 border border-[var(--primary)]/30 text-[10px] text-[var(--primary)]">
                #{t}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="py-4 pr-4 meta-mono">{ev.date || ev.month || ev.year || '—'}</td>
      <td className="py-4 pr-4">
        <span
          className={`meta-mono ${
            ev.status === 'upcoming'
              ? 'text-[var(--primary)]'
              : ev.status === 'ongoing'
                ? 'text-[var(--foreground)]'
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
          const s = stat;
          if (!s) return <span className="text-[var(--muted-foreground)]">—</span>;
          const cap = s.capacity > 0 ? `/${s.capacity}` : '';
          return (
            <span className={`${s.total > 0 ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
              {s.total}
              {cap}
            </span>
          );
        })()}
      </td>
      <td className="py-4 pl-4">
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <button type="button" onClick={() => actions.onRegistrations(ev)} className="focus-amber meta-mono text-[var(--primary)] hover:text-[var(--primary)]/70 underline-grow">
            报名
          </button>
          <button type="button" onClick={() => actions.onEdit(ev)} className="focus-amber meta-mono text-[var(--foreground)] hover:text-[var(--primary)] underline-grow">
            编辑
          </button>
          <button type="button" onClick={() => actions.onDelete(ev)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow">
            删除
          </button>
        </div>
      </td>
    </tr>
  );
}

/** 移动端活动卡片 */
export function EventCard({
  event: ev,
  stat,
  keyPrefix,
  actions,
}: {
  event: EventItem;
  stat?: EventStat;
  keyPrefix: string;
  actions: EventRowActions;
}) {
  return (
    <div key={`${keyPrefix}-${ev.id}`} className="p-4 card-minimal">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-[14px] text-[var(--foreground)] truncate font-mono break-all">{ev.title}</div>
      </div>
      {ev.description && (
        <div className="meta-mono mb-3 text-[var(--muted-foreground)] line-clamp-2 break-all">{ev.description}</div>
      )}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="meta-mono text-[var(--muted-foreground)]">Date</div>
          <div className="meta-mono mt-1 text-[var(--foreground)]">{ev.date || ev.month || ev.year || '—'}</div>
        </div>
        <div>
          <div className="meta-mono text-[var(--muted-foreground)]">状态 / Status</div>
          <div className={`meta-mono mt-1 ${ev.status === 'upcoming' ? 'text-[var(--primary)]' : ev.status === 'ended' ? 'text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'}`}>
            {ev.status === 'upcoming'
              ? '即将开始'
              : ev.status === 'ongoing'
                ? '进行中'
                : ev.status === 'ended'
                  ? '已结束'
                  : '—'}
          </div>
        </div>
        <div>
          <div className="meta-mono text-[var(--muted-foreground)]">更新 / Updated</div>
          <div className="meta-mono mt-1 text-[var(--foreground)]">{formatDate(ev.updatedAt)}</div>
        </div>
        <div>
          <div className="meta-mono text-[var(--muted-foreground)]">报名 / Regs</div>
          <div className="meta-mono mt-1">
            {(() => {
              const s = stat;
              if (!s) return <span className="text-[var(--muted-foreground)]">—</span>;
              const cap = s.capacity > 0 ? `/${s.capacity}` : '';
              return (
                <span className={`${s.total > 0 ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
                  {s.total}
                  {cap}
                </span>
              );
            })()}
          </div>
        </div>
      </div>
      {(ev.topics.length > 0 || ev.tags.length > 0) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {ev.topics.map((t) => (
            <span key={`m-t-${t}`} className="meta-mono px-1.5 py-0.5 border border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
              {t}
            </span>
          ))}
          {ev.tags.map((t) => (
            <span key={`m-g-${t}`} className="meta-mono px-1.5 py-0.5 border border-[var(--primary)]/30 text-[10px] text-[var(--primary)]">
              #{t}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => actions.onRegistrations(ev)} className="focus-amber meta-mono text-[var(--primary)] hover:text-[var(--primary)]/70 underline-grow">
          报名
        </button>
        <button type="button" onClick={() => actions.onEdit(ev)} className="focus-amber meta-mono text-[var(--foreground)] hover:text-[var(--primary)] underline-grow">
          编辑
        </button>
        <button type="button" onClick={() => actions.onDelete(ev)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow ml-auto">
          删除
        </button>
      </div>
    </div>
  );
}

/** 年份手风琴活动列表 — 未分类平铺 + 按年份分组折叠 */
export function EventYearGroups({
  uncategorizedEvents,
  yearGroups,
  expandedYears,
  statsMap,
  onToggleYear,
  actions,
}: {
  uncategorizedEvents: EventItem[];
  yearGroups: YearGroup[];
  expandedYears: Set<string>;
  statsMap: Map<string, EventStat>;
  onToggleYear: (year: string) => void;
  actions: EventRowActions;
}) {
  return (
    <div>
      {/* 未分类活动 — 直接平铺，不包裹年份手风琴 */}
      {uncategorizedEvents.length > 0 && (
        <div>
          <div className="border-b border-[var(--border)] py-4">
            <span className="display-serif text-[clamp(20px,3vw,28px)] text-[var(--primary)]">Unclassified</span>
            <span className="meta-mono text-[11px] text-[var(--muted-foreground)] ml-3">{uncategorizedEvents.length} 活动</span>
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
                {uncategorizedEvents.map((ev) => (
                  <EventRow key={`uncat-${ev.id}`} event={ev} stat={statsMap.get(ev.id)} keyPrefix="uncat" actions={actions} />
                ))}
              </tbody>
            </table>
          </div>
          {/* 移动端卡片列表 */}
          <div className="md:hidden divide-y divide-[var(--border)]">
            {uncategorizedEvents.map((ev) => (
              <EventCard key={`uncat-${ev.id}`} event={ev} stat={statsMap.get(ev.id)} keyPrefix="uncat" actions={actions} />
            ))}
          </div>
          {yearGroups.length > 0 && <div className="border-b border-[var(--border)] py-2" />}
        </div>
      )}

      {yearGroups.map((group) => {
        const isExpanded = expandedYears.has(group.year);
        const pastCount = group.events.filter((e) => e.status === 'ended').length;
        const activeCount = group.events.length - pastCount;

        return (
          <div key={group.year}>
            {/* 年份分割线 */}
            <button
              type="button"
              onClick={() => onToggleYear(group.year)}
              className="w-full flex items-center gap-4 py-5 group cursor-pointer focus-amber border-b border-[var(--border)]"
            >
              <span className="display-serif text-[clamp(20px,3vw,28px)] transition-colors duration-300 text-[var(--foreground)] group-hover:text-[var(--primary)]">
                {group.year}
              </span>
              <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">{group.events.length} 活动</span>
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
              <span className={`meta-mono text-[10px] ml-auto transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
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
                        {group.events.map((ev) => (
                          <EventRow key={`${group.year}-${ev.id}`} event={ev} stat={statsMap.get(ev.id)} keyPrefix={group.year} actions={actions} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden divide-y divide-[var(--border)]">
                    {group.events.map((ev) => (
                      <EventCard key={`${group.year}-${ev.id}`} event={ev} stat={statsMap.get(ev.id)} keyPrefix={group.year} actions={actions} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
