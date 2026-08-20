/**
 * @file 发布内容 /community/new — 装配层
 *
 * 遵循 GENERAL 2.2「展示/容器分离」、2.4「组件 > 500 行拆分」：
 * 本文件仅负责 Hero、鉴权态分支、表单编排与提示区；
 * 全部状态与逻辑下放到 `useCompose` Hook，表单渲染拆分到 `ComposeForm`。
 */

'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { BackLink } from '@/components';
import { Button, SectionLoading, Title, SectionMarker, ArkDivider } from '@/components';
import { useCompose } from '@/modules/community/ui/hooks/use-compose';
import { ComposeForm } from '@/modules/community/ui/compose-form';

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <main className="relative pt-16 min-h-screen flex items-center justify-center pixel-page">
          <SectionLoading label="Loading..." />
        </main>
      }
    >
      <ComposePageContent />
    </Suspense>
  );
}

function ComposePageContent() {
  const c = useCompose();
  const t = useTranslations('communityNew');
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  // 鉴权未完成 — 显示 Loading
  if (!c.authChecked || c.loadingCats) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center pixel-page">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  // 未登录 — 提示登录
  if (!c.isLoggedIn) {
    return (
      <main className="relative pt-16 pixel-page">
        <section className="px-4 sm:px-6 md:px-8 py-20 sm:py-32 min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <SectionMarker className="mb-6">[ 00 ]</SectionMarker>
            <Title
              level={1}
              className="text-[clamp(28px,5vw,48px)] leading-[1.1] mb-6"
              echo={`${t('loginRequiredTitle1')} ${t('loginRequiredTitle2')}`}
            >
              {t('loginRequiredTitle1')}<span className="text-[var(--primary)]">{t('loginRequiredTitle2')}</span>
            </Title>
            <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] leading-[1.8] mb-8">
              {t('loginRequiredDesc')}
            </p>
            <Button onClick={() => c.router.push('/login?redirect=/community/new')}>{t('loginNow')}</Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative pt-16 pixel-page">
      {/* ============ [ 00 ] Hero — 1s 后自动收缩悬浮 ============ */}
            <CollapsingHero
        index="00"
        label="Compose"
        hero={hero}
        pageKey="posts-new"
        sidebarBottom={
          <BackLink href="/community" arrow={false}>{t('backToAll')}</BackLink>
        }
      >
        <RevealTitle>
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2] mb-0"
            expandedSize="text-[clamp(36px,7vw,88px)] leading-[1.05] mb-4"
            echo={`${t('heroTitle1')}${t('heroTitle2')}`}
            subtitle="/ Compose"
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('heroTitle1')}<span className="text-[var(--primary)]">{t('heroTitle2')}</span>
          </Title>
        </RevealTitle>
        <div
          className={`overflow-hidden transition-all hero-reveal ${
            hero.collapsed ? 'max-h-0 opacity-0' : 'max-h-[200px] opacity-100'
          }`}
        >
          <RevealItem>
            <p className="max-w-2xl text-[var(--muted-foreground)] text-[15px] leading-[1.8]">
              <ArkDivider className="mr-2">{'//'}</ArkDivider>
              {t('heroDesc')}
            </p>
          </RevealItem>
        </div>
      </CollapsingHero>

      {/* ============ [ 01 ] Form ============ */}
      <section
        data-section-nav="01|Form"
        className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]"
      >
        <div className="max-w-[1600px] mx-auto w-full">
          <ComposeForm {...c} />
        </div>
      </section>

      {/* ============ [ 02 ] Hints ============ */}
      <section
        data-section-nav="02|Hints"
        className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]"
      >
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="grid grid-cols-12 gap-0">
            <div className="col-span-12 md:col-span-2 mb-6 md:mb-0">
              <SectionMarker>[ 02 ]</SectionMarker>
              <div className="meta-mono mt-2">{t('hintsLabel')}</div>
            </div>
            <div className="col-span-12 md:col-span-10">
              <Title level={2} className="text-[clamp(24px,4vw,40px)] mb-8"
                echo={`${t('hintsTitle1')}${t('hintsTitle2')}`}>
                {t('hintsTitle1')}<span className="text-[var(--primary)]">{t('hintsTitle2')}</span>
              </Title>
              <div className="border-t border-[var(--border)] pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 max-w-3xl">
                <div>
                  <ArkDivider className="mb-3">{t('hint01Title')}</ArkDivider>
                  <p className="text-[14px] leading-[1.7] text-[var(--muted-foreground)]">
                    {t('hint01Desc')}
                  </p>
                </div>
                <div>
                  <ArkDivider className="mb-3">{t('hint02Title')}</ArkDivider>
                  <p className="text-[14px] leading-[1.7] text-[var(--muted-foreground)]">
                    {t('hint02Desc')}
                  </p>
                </div>
                <div>
                  <ArkDivider className="mb-3">{t('hint03Title')}</ArkDivider>
                  <p className="text-[14px] leading-[1.7] text-[var(--muted-foreground)]">
                    {t('hint03Desc')}
                  </p>
                </div>
                <div>
                  <ArkDivider className="mb-3">{t('hint04Title')}</ArkDivider>
                  <p className="text-[14px] leading-[1.7] text-[var(--muted-foreground)]">
                    {t('hint04Desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
