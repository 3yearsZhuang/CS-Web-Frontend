/**
 * @file 月历视图 — 活动日历（网格点标记 + 选中日详情面板，移动端塌缩为圆点）
 */
'use client';

import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EASE } from '@/shared/utils/ui-constants';
import type { EventItem } from '@/modules/events/types';

interface MonthCalendarProps {
  events: EventItem[];
}

/** 一周表头 — 周一为首日（国内习惯） */
const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

/** 月份英文缩写 — 与活动 month 字段语义对齐 */
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/**
 * 解析活动 date 字段为 { year, month (0-11), day } 三元组
 *
 * 支持格式（由 admin 表单 placeholder 2026.09.15 推导）：
 *   - YYYY.MM.DD / YYYY-MM-DD / YYYY/MM/DD
 *   - 不匹配则返回 null（该活动不入日历网格，归入"未排期"列表）
 */
function parseEventDate(dateStr: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const match = dateStr.trim().match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;
  return { year, month, day };
}

/** 计算日历网格所需的日期矩阵（6 行 × 7 列，覆盖整月 + 首尾溢出） */
function buildMonthMatrix(year: number, month: number): Array<{
  date: Date;
  isCurrentMonth: boolean;
}> {
  const firstOfMonth = new Date(year, month, 1);
  // 周一为首日：getDay() 周日=0..周六=6，转换为周一=0..周日=6
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - firstWeekday);
  const cells: Array<{ date: Date; isCurrentMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    cells.push({ date, isCurrentMonth: date.getMonth() === month });
  }
  return cells;
}

/** 状态 → 指示点样式类 */
function statusDotClass(status: EventItem['status']): string {
  if (status === 'upcoming') return 'border-[var(--primary)] bg-transparent';
  if (status === 'ongoing') return 'bg-[var(--primary)] border-[var(--primary)]';
  return 'bg-[var(--muted-foreground)]/40 border-[var(--muted-foreground)]/40';
}

/** 状态 → 徽章样式类（日详情列表用） */
function statusBadgeClass(status: EventItem['status']): string {
  if (status === 'upcoming') return 'border-[var(--primary)] text-[var(--primary)]';
  if (status === 'ongoing') return 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5';
  return 'border-[var(--border)] text-[var(--muted-foreground)]';
}

/** 状态 → 文案 */
function statusLabel(status: EventItem['status']): string {
  if (status === 'upcoming') return 'UPCOMING';
  if (status === 'ongoing') return 'ONGOING';
  if (status === 'ended') return 'ARCHIVED';
  return '—';
}

/** 月历视图组件 — 按月渲染网格，点击日期查看当日活动详情 */
export function MonthCalendar({ events }: MonthCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 将活动按日期分组：YYYY-MM-DD → EventItem[]
  const { eventsByDate, unscheduled } = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    const unscheduled: EventItem[] = [];
    for (const e of events) {
      const parsed = parseEventDate(e.date);
      if (!parsed) {
        unscheduled.push(e);
        continue;
      }
      const key = `${parsed.year}-${String(parsed.month + 1).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return { eventsByDate: map, unscheduled };
  }, [events]);

  const matrix = useMemo(() => buildMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthEvents = useMemo(() => {
    const count = events.filter((e) => {
      const p = parseEventDate(e.date);
      return p && p.year === viewYear && p.month === viewMonth;
    }).length;
    return count;
  }, [events, viewYear, viewMonth]);

  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null;
  const selectedEvents = selectedKey ? (eventsByDate.get(selectedKey) ?? []) : [];

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const isSelected = (d: Date) =>
    selectedDate !== null &&
    d.getFullYear() === selectedDate.getFullYear() &&
    d.getMonth() === selectedDate.getMonth() &&
    d.getDate() === selectedDate.getDate();

  const goPrevMonth = () => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
    setSelectedDate(null);
  };
  const goNextMonth = () => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
    setSelectedDate(null);
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(null);
  };

  return (
    <div>
      {/* ============ 月份导航 ============ */}
      <div className="flex items-end justify-between mb-8 sm:mb-10 border-b border-[var(--border)] pb-4">
        <div>
          <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-1">
            {'// '}{viewYear} · {monthEvents > 0 ? `${monthEvents} event${monthEvents > 1 ? 's' : ''}` : 'no events'}
          </div>
          <h3 className="display-serif text-[clamp(28px,5vw,48px)] leading-[1] text-[var(--foreground)]">
            {MONTH_LABELS[viewMonth]}
            <span className="text-[var(--primary)]">.</span>
            <span className="meta-mono text-[clamp(14px,2vw,20px)] ml-2 text-[var(--muted-foreground)] align-baseline">
              {viewYear}
            </span>
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={goToday}
            className="meta-mono text-[10px] uppercase tracking-wider px-3 py-2 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors focus-amber"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goPrevMonth}
            aria-label="上一月"
            className="meta-mono text-[14px] px-3 py-2 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors focus-amber"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goNextMonth}
            aria-label="下一月"
            className="meta-mono text-[14px] px-3 py-2 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors focus-amber"
          >
            →
          </button>
        </div>
      </div>

      {/* ============ 周首行 ============ */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="meta-mono text-[10px] sm:text-[11px] text-[var(--muted-foreground)] text-center py-2 uppercase tracking-wider">
            {w}
          </div>
        ))}
      </div>

      {/* ============ 日期网格 ============ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${viewYear}-${viewMonth}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="grid grid-cols-7 border-l border-t border-[var(--border)]"
        >
          {matrix.map(({ date, isCurrentMonth }, idx) => {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const dayEvents = eventsByDate.get(key) ?? [];
            const hasEvents = dayEvents.length > 0;
            const todayFlag = isToday(date);
            const selectedFlag = isSelected(date);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => hasEvents ? setSelectedDate(date) : null}
                className={`relative aspect-square border-r border-b border-[var(--border)] p-1 sm:p-2 flex flex-col items-start transition-colors ${
                  hasEvents && isCurrentMonth ? 'cursor-pointer hover:bg-[var(--primary)]/5' : 'cursor-default'
                } ${!isCurrentMonth ? 'opacity-30' : ''} ${
                  selectedFlag ? 'bg-[var(--primary)]/10' : ''
                }`}
              >
                {/* 日期数字 */}
                <span className={`meta-mono text-[10px] sm:text-[12px] leading-none ${
                  todayFlag
                    ? 'text-[var(--primary)] font-bold'
                    : isCurrentMonth
                      ? 'text-[var(--foreground)]'
                      : 'text-[var(--muted-foreground)]'
                }`}>
                  {date.getDate()}
                </span>

                {/* 今日标记 — 左上角小三角 */}
                {todayFlag && (
                  <span className="absolute top-0 left-0 w-0 h-0 border-t-[6px] border-l-[6px] border-t-[var(--primary)] border-l-transparent" aria-hidden="true" />
                )}

                {/* 事件指示器 — 桌面端最多 3 个圆点 + 溢出计数 */}
                {hasEvents && (
                  <div className="mt-auto w-full flex flex-col gap-0.5 sm:gap-1">
                    <div className="flex flex-wrap gap-0.5 sm:gap-1">
                      {dayEvents.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full border ${statusDotClass(e.status)}`}
                          aria-hidden="true"
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="meta-mono text-[8px] sm:text-[9px] text-[var(--muted-foreground)] leading-none">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </div>
                    {/* 桌面端：单个事件时显示标题截断 */}
                    {dayEvents.length === 1 && (
                      <span className="hidden sm:block meta-mono text-[9px] text-[var(--muted-foreground)] truncate w-full leading-tight">
                        {dayEvents[0].title}
                      </span>
                    )}
                    {dayEvents.length > 1 && (
                      <span className="hidden sm:block meta-mono text-[9px] text-[var(--muted-foreground)] leading-tight">
                        {dayEvents.length} events
                      </span>
                    )}
                  </div>
                )}

                {/* 选中标记 — 右下角小方块 */}
                {selectedFlag && (
                  <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-[var(--primary)]" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* ============ 选中日事件列表 ============ */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedKey}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden mt-8 sm:mt-10"
          >
            <div className="border-t border-[var(--border)] pt-6">
              <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-4">
                {'// '}{selectedDate.getFullYear()}.{String(selectedDate.getMonth() + 1).padStart(2, '0')}.{String(selectedDate.getDate()).padStart(2, '0')}
                {' — '}
                {selectedEvents.length} event{selectedEvents.length > 1 ? 's' : ''}
              </div>

              {selectedEvents.length === 0 ? (
                <div className="meta-mono text-[13px] text-[var(--muted-foreground)] py-4">
                  当日无活动
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((e) => (
                    <Link
                      key={e.id}
                      href={`/events/${e.id}`}
                      className="block card-minimal focus-amber group"
                    >
                      <article className="border border-[var(--border)] p-4 sm:p-5 hover:border-[var(--primary)] transition-colors flex items-start gap-4">
                        {/* 状态徽章 */}
                        <span className={`meta-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border shrink-0 ${statusBadgeClass(e.status)}`}>
                          [{statusLabel(e.status)}]
                        </span>
                        {/* 标题 + 描述 */}
                        <div className="flex-1 min-w-0">
                          <h4 className="display-serif text-[clamp(16px,2.5vw,20px)] leading-[1.2] group-hover:text-[var(--primary)] transition-colors">
                            {e.isPinned && (
                              <span className="text-[var(--primary)] mr-1.5" title="置顶">★</span>
                            )}
                            {e.title}
                          </h4>
                          {e.description && (
                            <p className="text-[12px] sm:text-[13px] text-[var(--muted-foreground)] mt-1.5 line-clamp-2 leading-[1.6]">
                              {e.description}
                            </p>
                          )}
                          {(e.topics.length > 0 || e.tags.length > 0) && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {[...e.topics, ...e.tags].slice(0, 5).map((t) => (
                                <span key={t} className="tag-badge text-[9px] px-1.5 py-0.5">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="meta-mono text-[12px] text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors shrink-0">
                          →
                        </span>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ 未排期活动（date 字段无法解析） ============ */}
      {unscheduled.length > 0 && (
        <div className="mt-10 sm:mt-12 border-t border-[var(--border)] pt-6">
          <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-4">
            {'// '}未排期 — {unscheduled.length} event{unscheduled.length > 1 ? 's' : ''}
          </div>
          <div className="space-y-3">
            {unscheduled.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="block card-minimal focus-amber group"
              >
                <article className="border border-[var(--border)] p-4 sm:p-5 hover:border-[var(--primary)] transition-colors flex items-center gap-4">
                  <span className="meta-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border shrink-0 border-[var(--border)] text-[var(--muted-foreground)]">
                    [{statusLabel(e.status)}]
                  </span>
                  <span className="meta-mono text-[11px] text-[var(--muted-foreground)] shrink-0">
                    {e.date || e.month || e.year || '—'}
                  </span>
                  <h4 className="display-serif text-[clamp(15px,2vw,18px)] leading-[1.2] group-hover:text-[var(--primary)] transition-colors flex-1 min-w-0 truncate">
                    {e.title}
                  </h4>
                  <span className="meta-mono text-[12px] text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors shrink-0">
                    →
                  </span>
                </article>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
