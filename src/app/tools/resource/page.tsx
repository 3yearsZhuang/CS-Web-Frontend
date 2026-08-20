/**
 * @file 学习资源站（/tools/resource）— 装配层
 *
 * 遵循 GENERAL 2.2「展示/容器分离」、2.4「组件 > 500 行拆分」：
 * 本文件仅负责 Hero、筛选工具栏、列表与提交弹窗的编排；
 * 全部状态与逻辑下放到 `useResources` Hook，渲染拆分到 ResourceCard / SubmitResourceModal。
 */

'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { BackLink } from '@/components';
import { Button, Pagination, SectionLoading, ArkDivider, Title } from '@/components';
import { motion } from 'motion/react';
import { useResources } from '@/modules/tools/ui/hooks/use-resources';
import { ResourceCard } from '@/modules/tools/ui/resource-card';
import { SubmitResourceModal } from '@/modules/tools/ui/submit-resource-modal';

export default function ResourcePage() {
  const t = useTranslations('toolsResource');
  const res = useResources();
  const {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  const typeTabs: CapsuleTab[] = res.typeTabs as CapsuleTab[];

  return (
    <main className="relative pt-16 pixel-page">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label={t('heroLabel')}
        hero={hero}
        pageKey="resource"
        minHeight="50vh"
        capsule={{
          tabs: typeTabs,
          activeKey: res.activeType,
          onTabChange: (key: string) => res.setType(key),
        }}
        sidebarBottom={
          <BackLink href="/tools">{t('back')}</BackLink>
        }
      >
        <RevealTitle>
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]"
            echo={`${t('pageTitle')}`}
            subtitle={`/ ${t('pageTitleEn')}`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('pageTitle')}
          </Title>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed ? 'max-h-[14px] opacity-30 mt-1' : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
            }`}
          >
            <p
              className={`max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal ${
                hero.collapsed ? 'text-[9px]' : 'text-[15px] sm:text-[16px]'
              }`}
            >
              {t('desc1')}
              <span className="serif-italic text-[var(--foreground)]">
                {t('desc2')}
              </span>
              。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ [ 01 ] 资源列表 ============ */}
      <section
        data-section-nav="01|资源列表"
        className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]"
      >
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <div>
            <Title level={2} className="mb-4"
              echo={`${res.activeType === 'all' ? t('allResources') : res.activeTypeLabel}`}>
              {res.activeType === 'all' ? t('allResources') : res.activeTypeLabel}
              <ArkDivider className="ml-2">{res.activeType === 'all' ? t('allResourcesEn') : res.activeTypeLabel}</ArkDivider>
            </Title>
            <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-10 sm:mb-16">
              {res.loading
                ? '// 加载中...'
                : t('sortCount', { count: res.data?.total ?? 0, sort: res.sort === 'latest' ? t('sortLatest') : t('sortPopular') })}
            </p>

            {/* 工具栏：技术标签 + 排序 + 提交 */}
            <div className="flex items-center gap-4 mb-8 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {res.techTagTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => res.setTag(tab.key)}
                    className={`tab-chip focus-ring whitespace-nowrap ${
                      (tab.key === '__all__' && !res.activeTag) || tab.key === res.activeTag
                        ? 'tab-chip-active'
                        : ''
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && <span className="ml-1.5 opacity-60 tabular-nums">{tab.count}</span>}
                  </button>
                ))}
              </div>

              <div className="flex-1" />

              <div className="flex gap-0">
                <button
                  onClick={() => res.setSortAndReset('latest')}
                  className={`tab-chip focus-ring whitespace-nowrap ${res.sort === 'latest' ? 'tab-chip-active' : ''}`}
                >
                  {t('sortLatest')}
                </button>
                <button
                  onClick={() => res.setSortAndReset('popular')}
                  className={`tab-chip focus-ring whitespace-nowrap ${res.sort === 'popular' ? 'tab-chip-active' : ''}`}
                >
                  {t('sortPopular')}
                </button>
              </div>

              {res.isLoggedIn && (
                <Button size="sm" onClick={res.openSubmit} className="whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5" />
                  {t('submit')}
                </Button>
              )}
            </div>

            {/* 资源列表 */}
            {res.loading ? (
              <SectionLoading label="Loading..." />
            ) : !res.data || res.data.resources.length === 0 ? (
              <div className="py-16 text-center">
                <div className="meta-mono text-[var(--muted-foreground)] mb-6">{'// '}{t('empty')}</div>
                {res.isLoggedIn && (
                  <button
                    onClick={res.openSubmit}
                    className="meta-mono text-[var(--primary)] underline-grow"
                  >
                    {t('submitHere')}
                  </button>
                )}
              </div>
            ) : (
              <>
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.03 } },
                  }}
                >
                  {res.data.resources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </motion.div>

                {/* 分页（共享组件，全量页码） */}
                {res.pages > 1 && (
                  <Pagination
                    page={res.page}
                    totalPages={res.pages}
                    onPageChange={res.setPage}
                    variant="all"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <SubmitResourceModal {...res} />
    </main>
  );
}
