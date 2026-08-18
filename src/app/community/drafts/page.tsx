/**
 * @file 草稿箱 /community/drafts
 *
 * 当前登录用户的草稿文章（status = 'draft'），仅本人可见。
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { CommunityPostList } from '@/modules/community/ui/community-post-list';
import { SectionLoading, Title } from '@/components';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { apiRequest } from '@/shared/hooks/use-api-request';

export default function DraftsPage() {
  const t = useTranslations('communityDrafts');
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } =
    useCollapsingHero();
  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  const [loginRequired, setLoginRequired] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // 以一次探测请求判断登录态（草稿 API 未登录返回 401；网络异常等同未登录）
    void (async () => {
      const result = await apiRequest('/api/community/drafts?page=1&pageSize=1', {
        cache: 'no-store',
      });
      setLoginRequired(result.status === 401 || result.status === 0);
      setChecked(true);
    })();
  }, []);

  return (
    <main className="relative pt-16 pixel-page">
      <CollapsingHero index="00" label="Drafts" hero={hero} pageKey="drafts">
        <RevealTitle>
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]"
            echo={t('heroTitle')}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('heroTitle')}
          </Title>
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
          {!checked ? (
            <SectionLoading label="Loading..." />
          ) : loginRequired ? (
            <div className="py-16 text-center">
              <div className="meta-mono text-[var(--muted-foreground)] mb-4">
                {t('loginRequiredDesc')}
              </div>
              <Link href="/login" className="meta-mono text-[var(--primary)] underline-grow">
                {t('loginLink')}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-center justify-between">
                <Link
                  href="/community"
                  className="meta-mono text-[12px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                >
                  {t('backToAll')}
                </Link>
                <Link href="/community/new" className="meta-mono text-[12px] text-[var(--primary)] underline-grow">
                  {t('writeNew')}
                </Link>
              </div>
              <CommunityPostList
                endpoint="/api/community/drafts"
                emptyText={t('emptyText')}
              />
            </>
          )}
        </div>
      </section>
    </main>
  );
}
