/**
 * @file 系列详情页 /community/series/[id]
 *
 * 展示某系列下的公开文章列表，复用 CommunityPostList。
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { CommunityPostList } from '@/modules/community/ui/community-post-list';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { GhostTitle } from '@/components';

export default function SeriesDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const t = useTranslations('communitySeries');

  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } =
    useCollapsingHero();
  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  return (
    <main className="relative pt-16 pixel-page">
      <CollapsingHero index="00" label="Series" hero={hero} pageKey={`series-${id}`}>
        <RevealTitle>
          <GhostTitle
            as="h1"
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                : 'text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
            echo="Series"
          >
            Series
          </GhostTitle>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed ? 'max-h-[14px] opacity-30 mt-1' : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
            }`}
          >
            <p className="max-w-2xl text-[var(--muted-foreground)] text-[15px] sm:text-[16px] leading-[1.8]">
              {t('heroDesc')}
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <div className="mb-8">
            <Link
              href="/community"
              className="meta-mono text-[12px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
            >
              {t('backToAll')}
            </Link>
          </div>
          <CommunityPostList
            endpoint={`/api/community/posts?kind=post&seriesId=${encodeURIComponent(id)}`}
            emptyText={t('emptyText')}
          />
        </div>
      </section>
    </main>
  );
}
