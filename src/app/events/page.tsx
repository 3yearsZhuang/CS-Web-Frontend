/**
 * @file 活动页（/events）— 统一铁路线时间轴（年份手风琴）+ 月历视图可切换
 * 后端自动归档 status=ended 的 plan 到 archive
 */
'use client';

import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { EventFilterBar, type StatusFilter } from '@/modules/events/ui/event-filter-bar';
import { YearAccordionTimeline, type YearGroup } from '@/modules/events/ui/year-accordion-timeline';
import { MonthCalendar } from '@/modules/events/ui/month-calendar';
import { AdminEventsPanel } from '@/modules/admin/ui/admin-events-panel';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useDebounce } from '@/shared/hooks/use-debounce';
import type { EventItem } from '@/modules/events/types';
import type { SafeUser } from '@/modules/admin/ui/types';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, SectionLoading } from '@/components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';

type EventTab = 'timeline' | 'next' | 'admin';

/** 时间轴子视图模式：时间轴 / 日历 */
type TimelineViewMode = 'timeline' | 'calendar';

/** 将活动列表按 year 降序分组 */
function groupByYear(events: EventItem[], uncategorizedLabel: string): YearGroup[] {
  const map = new Map<string, EventItem[]>();
  for (const e of events) {
    const y = e.year || uncategorizedLabel;
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(e);
  }
  // 按年份降序排列
  const sorted = Array.from(map.entries()).sort(([a], [b]) => {
    if (a === uncategorizedLabel) return -1;
    if (b === uncategorizedLabel) return 1;
    return b.localeCompare(a);
  });
  return sorted.map(([year, events]) => ({ year, events }));
}

export default function EventsPage() {
  const router = useRouter();
  const t = useTranslations('events');
  const [activeTab, setActiveTab] = useState<EventTab>('timeline');

  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => {
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return res.json() as Promise<{ user: SafeUser }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        const user = data.user;
        if ((user.role === 'admin' || user.role === 'root') && user.isActive) {
          setCurrentUser(user);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const isAdmin = currentUser !== null;

  // 悬浮胶囊侧边栏 Tab 配置（管理员可见 [99]）
  const eventsTabs: CapsuleTab[] = [
    { key: 'timeline', num: '01', label: t('tabTimeline') },
    { key: 'next', num: '02', label: t('tabNext') },
    ...(isAdmin ? [{ key: 'admin', num: '99', label: t('tabAdmin') }] : []),
  ];

  // Hero 进入 1s 后自动收缩并悬浮于页首（动画期间锁定滚动）
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  // 时间轴子视图模式：时间轴 / 日历（M3 活动日历视图）
  const [viewMode, setViewMode] = useState<TimelineViewMode>('timeline');

  // 年份手风琴：展开的年份集合（默认全部展开）
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(searchInput, 300);

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter) params.set('status', statusFilter);

    const res = await fetch(`/api/events?${params.toString()}`);
    if (!res.ok) throw new Error(t('loadFailed'));
    const data = await res.json();
    return data.events ?? [];
  }, [debouncedSearch, statusFilter, t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchEvents()
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
        // 默认展开所有年份
        const years = new Set<string>(data.map((e: EventItem) => e.year || t('uncategorized')));
        setExpandedYears(years);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t('loadFailed'));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchEvents]);

  // 按年份分组，分离未分类活动
  const { uncategorized, yearGroups } = useMemo(() => {
    const allGroups = groupByYear(events, t('uncategorized'));
    const uncategorizedEvents = allGroups.find((g) => g.year === t('uncategorized'))?.events ?? [];
    const categorizedGroups = allGroups.filter((g) => g.year !== t('uncategorized'));
    return { uncategorized: uncategorizedEvents, yearGroups: categorizedGroups };
  }, [events, t]);

  // 切换年份手风琴
  const toggleYear = (year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  if (loading && events.length === 0) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  if (error && events.length === 0) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="meta-mono text-[var(--primary)] underline-grow"
          >
            {t('retry')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <VisibilityGate componentKey="events">
      <main className="relative pt-16">
      {/* ============ Hero — 1s 后自动收缩悬浮（亚克力框） ============ */}
      <CollapsingHero
        index="00"
        label="Events"
        hero={hero}
        pageKey="events"
        capsule={{
          tabs: eventsTabs,
          activeKey: activeTab,
          onTabChange: (key) => setActiveTab(key as EventTab),
        }}
      >
        <RevealTitle>
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                : 'text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('heroTitle1')}
            <span className="text-[var(--primary)]">{t('heroTitle2')}</span>
            {t('heroTitle3')}
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              {t('heroTitleEn')}
            </span>
          </h1>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed
                ? 'max-h-[14px] opacity-30 mt-1'
                : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
            }`}
          >
            <p
              className={`max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal ${
                hero.collapsed ? 'text-[9px]' : 'text-[15px] sm:text-[16px]'
              }`}
            >
              {t('heroDesc1')}
              <span className="serif-italic text-[var(--foreground)]">{t('heroDesc2')}</span>
              。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ Tab 合并区 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          {/* 内容区 */}
          <div>
            {/* Tab 01 — 统一时间轴（年份手风琴 + 铁路线终端日志节点）/ 日历视图 */}
            {activeTab === 'timeline' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 sm:mb-16">
                  <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)]">
                    {t('sectionTitle1')}
                    <span className="text-[var(--primary)]">
                      {viewMode === 'calendar' ? t('calendarLabel') : t('sectionTitle2')}
                    </span>
                  </h2>
                  {/* 视图切换 — 时间轴 / 日历 */}
                  <div className="flex gap-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('timeline')}
                      className={`meta-mono text-[11px] uppercase tracking-wider px-4 py-2.5 border transition-colors ${
                        viewMode === 'timeline'
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                          : 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {t('timelineLabel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('calendar')}
                      className={`meta-mono text-[11px] uppercase tracking-wider px-4 py-2.5 border-l-0 transition-colors ${
                        viewMode === 'calendar'
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                          : 'bg-transparent text-[var(--muted-foreground)] border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {t('calendarLabel')}
                    </button>
                  </div>
                </div>

                {/* 筛选区域 */}
                <EventFilterBar
                  searchInput={searchInput}
                  statusFilter={statusFilter}
                  onSearchChange={setSearchInput}
                  onStatusChange={setStatusFilter}
                />

                {/* 视图内容：时间轴（年份手风琴 + 铁路线）或日历 */}
                {viewMode === 'timeline' ? (
                  <YearAccordionTimeline
                    uncategorized={uncategorized}
                    yearGroups={yearGroups}
                    expandedYears={expandedYears}
                    loading={loading}
                    onToggleYear={toggleYear}
                  />
                ) : (
                  <MonthCalendar events={events} />
                )}
              </div>
            )}

            {/* Tab 02 — Next CTA */}
            {activeTab === 'next' && (
              <div>
                <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                  {t('nextTitle1')}
                  <span className="text-[var(--primary)]">{t('nextTitle2')}</span>
                  ？
                </h2>
                <div className="border-t border-[var(--border)] pt-10 sm:pt-16">
                  <p className="text-[15px] sm:text-[16px] text-[var(--muted-foreground)] leading-[1.8] max-w-2xl mb-8">
                    {t('nextDesc')}
                  </p>
                  <Button
                    onClick={() => router.push('/about')}
                  >
                    <span>{t('joinUs')}</span>
                    <span>→</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Tab 99 — 活动管理（仅管理员） */}
            {activeTab === 'admin' && currentUser && (
              <div>
                <AdminEventsPanel
                  onForbidden={() => router.push('/')}
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
    </VisibilityGate>
  );
}
