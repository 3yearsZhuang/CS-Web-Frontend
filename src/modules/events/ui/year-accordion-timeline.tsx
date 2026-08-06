/**
 * @file 年份手风琴时间轴 — 按年份分组的活动展示（桌面端铁路线居中，移动端单列左侧）
 */
'use client';

import { motion, AnimatePresence } from 'motion/react';
import { EASE } from '@/shared/utils/ui-constants';
import { isPastDate } from '@/shared/utils/event-date';
import { EmptyState, SectionLoading } from '@/components';
import { EventCard } from './event-card';
import { EventStatusDot } from './event-status-badge';
import type { EventItem } from '@/modules/events/types';

/** 年份分组，包含年份标签和对应活动列表 */
export interface YearGroup {
  year: string;
  events: EventItem[];
}

interface YearAccordionTimelineProps {
  uncategorized: EventItem[];
  yearGroups: YearGroup[];
  expandedYears: Set<string>;
  loading: boolean;
  onToggleYear: (year: string) => void;
}

/** 年份手风琴时间轴组件 — 按年份分组展示活动，支持展开/折叠 */
export function YearAccordionTimeline({
  uncategorized,
  yearGroups,
  expandedYears,
  loading,
  onToggleYear,
}: YearAccordionTimelineProps) {
  return (
    <div className="relative">
      {/* 垂直铁路线 — 桌面端居中，移动端左侧 */}
      <div className="absolute left-[19px] md:left-1/2 top-0 bottom-0 w-px bg-[var(--border)] md:-translate-x-px" aria-hidden="true" />

      {loading ? (
        <SectionLoading label="Loading..." />
      ) : uncategorized.length === 0 && yearGroups.length === 0 ? (
        <EmptyState message="暂无活动" className="py-12" />
      ) : (
        <>
          {/* 未分类活动 — 直接平铺在最上方，不包裹年份手风琴 */}
          {uncategorized.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {uncategorized.map((event, idx) => (
                <EventCard key={event.id} event={event} isLeft={idx % 2 === 0} />
              ))}
              {/* 未分类与年份组之间的分隔 */}
              {yearGroups.length > 0 && (
                <div className="relative py-4">
                  <div className="absolute left-[19px] md:left-1/2 md:-translate-x-px w-px h-full bg-[var(--border)]/30" aria-hidden="true" />
                </div>
              )}
            </motion.div>
          )}

          {/* 年份手风琴分组 */}
          {yearGroups.map((group) => {
            const isExpanded = expandedYears.has(group.year);
            const pastCount = group.events.filter((e) => e.status === 'ended' || isPastDate(e.date)).length;
            const activeCount = group.events.length - pastCount;

            return (
              <div key={group.year}>
                {/* 年份分割线 — 点击展开/折叠 */}
                <button
                  type="button"
                  onClick={() => onToggleYear(group.year)}
                  className="relative z-10 w-full flex items-center gap-4 py-6 group cursor-pointer focus-amber"
                >
                  {/* 铁路线上的菱形节点 */}
                  <div className={`absolute left-[13px] md:left-1/2 md:-translate-x-1/2 w-[14px] h-[14px] border-2 rotate-45 transition-all duration-300 motion-reduce:transition-none ${
                    isExpanded
                      ? 'bg-[var(--primary)] border-[var(--primary)] shadow-[0_0_0_3px_var(--primary)]/15'
                      : 'bg-[var(--background)] border-[var(--border)] group-hover:border-[var(--primary)]/50'
                  }`} aria-hidden="true" />

                  {/* 年份标题 */}
                  <div className="w-full md:w-[calc(50%-32px)] md:text-right md:pr-8 pl-12 md:pl-0">
                    <span className={`display-serif text-[clamp(24px,4vw,40px)] transition-colors duration-300 ${
                      isExpanded ? 'text-[var(--primary)]' : 'text-[var(--foreground)] group-hover:text-[var(--primary)]/70'
                    }`}>
                      {group.year}
                    </span>
                  </div>
                  {/* 统计信息 — 桌面端右侧 */}
                  <div className="hidden md:flex md:w-[calc(50%-32px)] md:pl-8 items-center gap-4">
                    <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                      {group.events.length} 个活动
                    </span>
                    {activeCount > 0 && (
                      <span className="flex items-center gap-1.5 meta-mono text-[10px] text-[var(--primary)] px-2 py-0.5 border border-[var(--primary)]/30">
                        <EventStatusDot status="ongoing" />
                        {activeCount} active
                      </span>
                    )}
                    {pastCount > 0 && (
                      <span className="flex items-center gap-1.5 meta-mono text-[10px] text-[var(--muted-foreground)] px-2 py-0.5 border border-[var(--border)]">
                        <EventStatusDot status="ended" />
                        {pastCount} archived
                      </span>
                    )}
                    <span className={`meta-mono text-[10px] transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}>
                      ▼
                    </span>
                  </div>
                  {/* 移动端统计 */}
                  <div className="md:hidden flex items-center gap-2 pl-12">
                    <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                      {group.events.length} 活动
                    </span>
                    <span className={`meta-mono text-[10px] transition-transform duration-300 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}>
                      ▼
                    </span>
                  </div>
                </button>

                {/* 年份内活动列表 — 手风琴展开 */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className="overflow-hidden"
                    >
                      {group.events.map((event, idx) => (
                        <EventCard key={event.id} event={event} isLeft={idx % 2 === 0} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
