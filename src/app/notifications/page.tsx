/**
 * @file 通知中心页（/notifications）— 装配层
 *
 * 遵循 GENERAL 2.2「展示/容器分离」、2.4「组件 > 500 行拆分」：
 * 本文件仅负责 Hero（含未读统计）与列表主体的编排；
 * 全部状态与逻辑下放到 `useNotifications` Hook，渲染拆分到 `NotificationCenter`。
 */

'use client';

import { Suspense } from 'react';
import { StaggerContainer, RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { PageHeaderBackground } from '@/components/layout/page-header-background';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { SectionLoading, SectionMarker, Title } from '@/components';
import { useTranslations } from 'next-intl';
import { useNotifications } from '@/modules/notifications/ui/hooks/use-notifications';
import { NotificationCenter } from '@/modules/notifications/ui/notification-center';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';

export default function NotificationsPage() {
  return (
    <Suspense fallback={null}>
      <NotificationsContent />
    </Suspense>
  );
}

function NotificationsContent() {
  const t = useTranslations('notifications');
  const n = useNotifications();
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  if (n.loading && n.notifications.length === 0) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center pixel-page">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  if (n.error && n.notifications.length === 0) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center pixel-page">
        <div className="text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{n.error}</div>
          <button onClick={() => n.fetchNotifications()} className="meta-mono text-[var(--primary)] underline-grow">
            {t('retry')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <VisibilityGate componentKey="notifications">
      <main className="relative pt-16 pixel-page">
      <section
        data-section-nav="00|Notifications"
        className={`relative px-4 sm:px-6 md:px-8 overflow-hidden transition-all hero-reveal ${
          heroCollapsed ? 'sticky top-16 z-30 py-3 sm:py-4 hero-acrylic' : 'py-16 sm:py-20'
        }`}
      >
        <div className={`transition-opacity hero-reveal ${heroCollapsed ? 'opacity-0' : 'opacity-100'}`}>
          <PageHeaderBackground pageKey="notifications" />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto">
          <StaggerContainer onComplete={onRevealComplete}>
            <div className={`grid grid-cols-12 gap-0 ${heroCollapsed ? 'items-center mb-0' : 'mb-0 sm:mb-0'}`}>
              <div className={`col-span-12 md:col-span-2 ${heroCollapsed ? 'mb-0' : 'mb-4 md:mb-0'}`}>
                <SectionMarker>[ 00 ]</SectionMarker>
              </div>
              <div className="col-span-12 md:col-span-10">
                <RevealTitle>
                  <Title
                    level={1}
                    collapsed={heroCollapsed}
                    collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
                    expandedSize="text-[clamp(32px,7vw,72px)] leading-[1.05]"
                    echo={`${t('centerTitle')} ${t('centerTitleEn')}`}
                    subtitle={t('centerTitleEn')}
                    onClick={heroCollapsed ? onTitleClick : undefined}
                  >
                    {t('centerTitle')}
                  </Title>
                </RevealTitle>
                <div
                  className={`overflow-hidden transition-all hero-reveal ${
                    heroCollapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[100px] opacity-100 mt-4 sm:mt-6'
                  }`}
                >
                  <RevealItem>
                    <p className="text-[var(--muted-foreground)] text-[14px] sm:text-[15px] meta-mono">
                      {n.unreadCount > 0 ? t('unreadCount', { count: n.unreadCount }) : t('allReadDone')}
                    </p>
                  </RevealItem>
                </div>
              </div>
            </div>
          </StaggerContainer>
        </div>
      </section>

      {/* 操作栏 + 筛选 + 列表 — 不参与 Hero 收缩 */}
      <section className="px-4 sm:px-6 md:px-8 pb-16 sm:pb-20">
        <div className="max-w-[1200px] mx-auto">
          <NotificationCenter {...n} />
        </div>
      </section>
    </main>
    </VisibilityGate>
  );
}
