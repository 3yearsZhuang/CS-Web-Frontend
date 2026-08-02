/**
 * @file 标签详情页 /community/tags/[tag]
 *
 * 展示某标签下的公开文章列表，复用 CommunityPostList。
 */

'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { CommunityPostList } from '@/modules/community/ui/community-post-list';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';

export default function TagDetailPage() {
  const params = useParams<{ tag: string }>();
  const tag = decodeURIComponent(params?.tag ?? '');

  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } =
    useCollapsingHero();
  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  return (
    <main className="relative pt-16">
      <CollapsingHero index="00" label="Tag" hero={hero} pageKey={`tag-${tag}`}>
        <RevealTitle>
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                : 'text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            #{tag}
          </h1>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed ? 'max-h-[14px] opacity-30 mt-1' : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
            }`}
          >
            <p className="max-w-2xl text-[var(--muted-foreground)] text-[15px] sm:text-[16px] leading-[1.8]">
              标签「{tag}」下的全部文章。
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
              ← 返回全部内容
            </Link>
          </div>
          <CommunityPostList
            endpoint={`/api/community/posts?kind=post&tag=${encodeURIComponent(tag)}`}
            emptyText="// 该标签下暂无文章"
          />
        </div>
      </section>
    </main>
  );
}
