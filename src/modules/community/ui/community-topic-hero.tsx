/**
 * @file Discussion header — compact context, author metadata, and follow action
 */
'use client';

import Link from 'next/link';
import { ArrowLeft, Eye, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar, Badge } from '@/components';
import { formatRelativeTime } from '@/shared/utils/utils';
import { FollowButton } from './follow-button';
import type { CommunityPostDetail } from '@/modules/community/types';

interface TopicHeroProps {
  topic: CommunityPostDetail;
  categorySlug: string;
  replyTotal: number;
  currentUserId?: string;
}

export function TopicHero({ topic, categorySlug, replyTotal, currentUserId }: TopicHeroProps) {
  const t = useTranslations('communityCommon');
  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto max-w-[1120px] px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <Link href="/community" className="mb-7 inline-flex min-h-10 items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] focus-ring">
          <ArrowLeft className="h-4 w-4" /> {t('backToCommunity')}
        </Link>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link href={`/community?category=${topic.category?.slug ?? categorySlug}`} className="badge badge-primary normal-case tracking-normal">
            {topic.category?.name ?? categorySlug}
          </Link>
          {topic.isPinned && <Badge variant="primary">PINNED</Badge>}
          {topic.isFeatured && <Badge variant="amber">FEATURED</Badge>}
        </div>

        <h1 className="mb-6 max-w-4xl display-serif text-[clamp(32px,5vw,58px)] leading-[1.08] text-[var(--foreground)]">
          {topic.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
          <Link href={`/users/${topic.authorId}`} className="flex items-center gap-2 text-[var(--foreground)] hover:text-[var(--primary)] focus-ring">
            <Avatar
              email={topic.author?.email ?? 'anonymous'}
              displayName={topic.author?.displayName}
              avatarUrl={topic.author?.avatarUrl}
              avatarType={topic.author?.avatarType}
              size={32}
            />
            <span className="font-medium">{topic.author?.displayName ?? t('anonymous')}</span>
          </Link>
          <span>·</span>
          <span>{formatRelativeTime(topic.createdAt)}</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {topic.viewCount}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {replyTotal}</span>
          <FollowButton targetUserId={topic.authorId} currentUserId={currentUserId} compact />
        </div>
      </div>
    </header>
  );
}
