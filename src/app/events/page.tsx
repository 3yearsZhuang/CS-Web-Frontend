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
import { Button, SectionLoading, Title } from '@/components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';
import { apiRequest } from '@/shared/hooks/use-api-request';

type EventTab = 'timeline' | 'next' | 'admin';

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
    (async () => {
      const r = await apiRequest<{ user: SafeUser }>('/api/auth/me', { cache: 'no-store' });
      if (cancelled) return;
      if (r.status === 401 || !r.ok || !r.data) return;
      const user = r.data.user;
      if ((user.role === 'admin' || user.role === 'root') && user.isActive) {
        setCurrentUser(user);
      }
    })();
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

  // 年份手风琴：展开的年份集合（默认全部展开）
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(searchInput, 300);

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter) params.set('status', statusFilter);

    const r = await apiRequest<{ events?: EventItem[] }>(`/api/events?${params.toString()}`);
    if (!r.ok) throw new Error(r.error ?? t('loadFailed'));
    const data = r.data;
    return data?.events ?? [];
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
      <main className="events-page relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  if (error && events.length === 0) {
    return (
      <main className="events-page relative pt-16 min-h-screen flex items-center justify-center">
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
      <main className="events-page relative pt-16">
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
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(36px,9vw,100px)] leading-[1.05] sm:leading-[0.95]"
            echo={`${t('heroTitle1')}${t('heroTitle2')}${t('heroTitle3')}`}
            subtitle={t('heroTitleEn')}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('heroTitle1')}
            <span className="text-[var(--primary)]">{t('heroTitle2')}</span>
            {t('heroTitle3')}
          </Title>
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
            {/* Tab 01 — 时间线 + 日历同屏（桌面左右布局，移动端日历在上、时间线在下） */}
            {activeTab === 'timeline' && (
              <div>
                <div className="mb-10 sm:mb-16">
                  <Title level={2}
                    echo={`${t('sectionTitle1')}${t('sectionTitle2')}`}>
                    {t('sectionTitle1')}
                    <span className="text-[var(--primary)]">{t('sectionTitle2')}</span>
                  </Title>
                </div>

                {/* 筛选区域 — 同时作用于日历与时间线 */}
                <EventFilterBar
                  searchInput={searchInput}
                  statusFilter={statusFilter}
                  onSearchChange={setSearchInput}
                  onStatusChange={setStatusFilter}
                />

                {/* 同屏双视图：移动端单列（日历在上、时间线在下）；lg+ 双列左右布局（左日历 / 右时间线）
                 * 日历列收窄为固定 320px（进一步压缩占比，时间线占剩余空间）；
                 * 日历层 z-0、时间线层 z-10 显式分层，sticky 日历永不覆盖时间轴卡片的 hover 抬升/硬阴影。 */}
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12 lg:gap-12 items-start">
                  <div className="relative z-0 lg:sticky lg:top-24">
                    <MonthCalendar events={events} />
                  </div>
                  <div className="relative z-10">
                    <YearAccordionTimeline
                      uncategorized={uncategorized}
                      yearGroups={yearGroups}
                      expandedYears={expandedYears}
                      loading={loading}
                      onToggleYear={toggleYear}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 02 — Next CTA */}
            {activeTab === 'next' && (
              <div>
                <Title level={2} className="mb-10 sm:mb-16"
                  echo={`${t('nextTitle1')}${t('nextTitle2')}？`}>
                  {t('nextTitle1')}
                  <span className="text-[var(--primary)]">{t('nextTitle2')}</span>
                  ？
                </Title>
                <div className="border-t border-[var(--border)] pt-10 sm:pt-16">
                  <p className="text-[15px] sm:text-[16px] text-[var(--muted-foreground)] leading-[1.8] max-w-2xl mb-8">
                    {t('nextDesc')}
                  </p>
                  <Button
                    variant="pixel"
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
