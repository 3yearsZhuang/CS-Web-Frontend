/**
 * @file 帖子详情 Hero — 标题 + 面包屑 + 徽章 + 元信息（收缩/展开两态，复用 CollapsingHero）
 */
'use client';

import Link from 'next/link';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { Avatar } from '@/components/avatar';
import { formatDateTime } from '@/shared/utils/utils';
import { FollowButton } from './follow-button';
import type { CommunityPostDetail } from '@/modules/community/types';
import { useTranslations } from 'next-intl';

interface TopicHeroProps {
  topic: CommunityPostDetail;
  categorySlug: string;
  replyTotal: number;
  hero: HeroState;
  /** 当前登录用户 id（用于关注按钮） */
  currentUserId?: string;
}

export function TopicHero({ topic, categorySlug, replyTotal, hero, currentUserId }: TopicHeroProps) {
  const t = useTranslations('forum');
  return (
    <CollapsingHero
      index="00"
      label="Topic"
      hero={hero}
      minHeight="50vh"
      sidebarBottom={
        <Link
          href="/community"
          className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px]"
        >
          {t('backToCommunity')}
        </Link>
      }
    >
      <div
        className={`overflow-hidden transition-all hero-reveal ${
          hero.collapsed ? 'max-h-0 opacity-0' : 'max-h-[100px] opacity-100'
        }`}
      >
        <RevealItem>
          <div className="flex items-center gap-2 mb-6 meta-mono text-[var(--muted-foreground)]">
            <Link href="/community" className="hover:text-[var(--primary)] transition-colors">
              {t('community')}
            </Link>
            <span>/</span>
            <Link
              href="/community"
              className="hover:text-[var(--primary)] transition-colors"
            >
              {topic.category?.name ?? categorySlug}
            </Link>
          </div>
        </RevealItem>
      </div>

      <div
        className={`overflow-hidden transition-all hero-reveal ${
          hero.collapsed ? 'max-h-0 opacity-0' : 'max-h-[100px] opacity-100'
        }`}
      >
        {(topic.isPinned || topic.isFeatured) && (
          <RevealItem>
            <div className="flex gap-2 mb-4">
              {topic.isPinned && (
                <span className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--primary)] text-[var(--primary)]">
                  PIN
                </span>
              )}
              {topic.isFeatured && (
                <span className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--primary)] text-[var(--primary)]">
                  FEAT
                </span>
              )}
            </div>
          </RevealItem>
        )}
      </div>

      <RevealTitle>
        <h1
          className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
            hero.collapsed
              ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2] mb-0'
              : 'text-[clamp(28px,5vw,56px)] leading-[1.1] mb-6'
          }`}
          onClick={hero.collapsed ? hero.onTitleClick : undefined}
        >
          {topic.title}
          <span
            className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
            }`}
          >
            / Topic
          </span>
        </h1>
      </RevealTitle>

      <div
        className={`overflow-hidden transition-all hero-reveal ${
          hero.collapsed ? 'max-h-0 opacity-0' : 'max-h-[200px] opacity-100'
        }`}
      >
        <RevealItem>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
            <Avatar
              email={topic.author?.displayName ?? 'anonymous'}
              displayName={topic.author?.displayName}
              avatarUrl={topic.author?.avatarUrl}
              avatarType={topic.author?.avatarType}
              size={28}
            />
            <span className="font-mono text-[13px] text-[var(--foreground)]">
              {topic.author?.displayName ?? t('anonymous')}
            </span>
            <span className="meta-mono">·</span>
            <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
              {formatDateTime(topic.createdAt)}
            </span>
            <span className="meta-mono">·</span>
            <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
              {topic.viewCount} views
            </span>
            <span className="meta-mono">·</span>
            <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
              {replyTotal} replies
            </span>
            <FollowButton
              targetUserId={topic.authorId}
              currentUserId={currentUserId}
              compact
            />
          </div>
        </RevealItem>
      </div>
    </CollapsingHero>
  );
}
