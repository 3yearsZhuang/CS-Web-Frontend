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
import dynamic from 'next/dynamic';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import type { EventItem } from '@/modules/events/types';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, SectionLoading, Title } from '@/components';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { useAuth } from '@/shared/hooks/use-auth';
import { groupEventsByYear, getEventYear } from '@/shared/utils/event-date';

/** 活动管理面板（仅管理员可见的 Tab 99）— 懒加载，普通访客不加载该面板代码 */
const AdminEventsPanel = dynamic(() =>
  import('@/modules/admin/ui/admin-events-panel').then((m) => m.AdminEventsPanel),
);

type EventTab = 'timeline' | 'next' | 'admin';

/** 活动页客户端组件 — 服务端预取的默认视图数据经 initialEvents 注入（首屏直出） */
export default function EventsClient({ initialEvents }: { initialEvents: EventItem[] }) {
  const router = useRouter();
  const t = useTranslations('events');
  const [activeTab, setActiveTab] = useState<EventTab>('timeline');

  // 管理员判定：复用全局 SWR 化的 /api/auth/me（根布局已 SSR 注水），
  // 不再单独发起一次 /api/auth/me 请求（消除与其它组件的重复拉取）。
  const { user, loading: authLoading } = useAuth();
  const isAdmin =
    !authLoading &&
    !!user &&
    (user.role === 'admin' || user.role === 'root') &&
    (user as { isActive?: boolean }).isActive !== false;

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
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  // 服务端已预取默认视图 → 首帧不显示骨架屏
  const [loading, setLoading] = useState(initialEvents.length === 0);
  const [error, setError] = useState<string | null>(null);
  // 是否已跳过「服务端预取对应的那次重复拉取」（仅首次生效，切筛选后不再跳过）
  const initialFetchSkippedRef = useRef(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');

  // 年份手风琴：展开的年份集合（默认全部展开）
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    params.set('pageSize', '100');

    const r = await apiRequest<{ events?: EventItem[] }>(`/api/events?${params.toString()}`);
    if (!r.ok) throw new Error(r.error ?? t('loadFailed'));
    const data = r.data;
    return data?.events ?? [];
  }, [statusFilter, t]);

  useEffect(() => {
    // 首屏已由服务端预取（默认视图）：跳过这次重复请求；
    // 之后切换筛选、或 SPA 再次进入该路由（RSC 会重新预取）时按需请求。
    if (!initialFetchSkippedRef.current && initialEvents.length > 0 && !statusFilter) {
      initialFetchSkippedRef.current = true;
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchEvents()
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
        // 默认展开所有年份
        const years = new Set<string>(data.map((e: EventItem) => getEventYear(e, t('uncategorized'))));
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
  }, [fetchEvents, t]);

  // 按年份分组并严格降序排序，分离未分类活动
  const { uncategorized, yearGroups } = useMemo(
    () => groupEventsByYear(events, t('uncategorized')),
    [events, t],
  );

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

                {/* 筛选区域 — 仅状态筛选（搜索已聚合至顶栏） */}
                <EventFilterBar
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                />

                {/* 同屏双视图：移动端单列（日历在上、时间线在下）；lg+ 双列左右布局（左日历 / 右时间线）
                 * 日历列固定 320px/340px，设 lg:border-r 与右侧时间线形成清晰边界；
                 * sticky 日历使用 lg:top-36（144px）避让顶部 Header 与折叠态 Hero，并限制视口最大高度滚动。 */}
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[340px_1fr] gap-10 xl:gap-14 items-start">
                  <div className="relative z-10 lg:sticky lg:top-36 lg:pr-8 xl:pr-10 lg:border-r lg:border-[var(--border)] max-h-[calc(100vh-160px)] overflow-y-auto custom-scrollbar">
                    <MonthCalendar events={events} />
                  </div>
                  <div className="relative z-20 min-w-0">
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
            {activeTab === 'admin' && isAdmin && (
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
