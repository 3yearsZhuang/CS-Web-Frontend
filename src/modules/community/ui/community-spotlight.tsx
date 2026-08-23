/**
 * @file Community Spotlight — one featured discussion above the feed
 */
'use client';

import Link from 'next/link';
import { ArrowUpRight, MessageCircle, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar, Badge } from '@/components';
import type { CommunityPost } from '@/modules/community/types';

export function CommunitySpotlight({ post }: { post: CommunityPost }) {
  const t = useTranslations('community');
  const common = useTranslations('communityCommon');

  return (
    <section className="border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="meta-mono flex items-center gap-2 text-[var(--primary)]">
          <Sparkles className="h-4 w-4" /> {t('spotlightLabel')}
        </div>
        <Badge variant="amber">FEATURED</Badge>
      </div>
      <Link href={`/community/${post.id}`} className="group block focus-ring">
        <h2 className="mb-3 display-serif text-[clamp(24px,4vw,38px)] leading-tight text-[var(--foreground)] group-hover:text-[var(--primary)]">
          {post.title}
        </h2>
        <p className="mb-6 line-clamp-2 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
          {post.excerpt ?? post.contentMarkdown.replace(/[#>*`\[\]]/g, '').slice(0, 240)}
        </p>
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted-foreground)]">
          <Avatar
            email={post.author?.email ?? 'anonymous'}
            displayName={post.author?.displayName}
            avatarUrl={post.author?.avatarUrl}
            avatarType={post.author?.avatarType}
            size={24}
          />
          <span className="text-[var(--foreground)]">{post.author?.displayName ?? common('anonymous')}</span>
          <span>·</span>
          <span>{post.category?.name}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[var(--foreground)]">
            <MessageCircle className="h-4 w-4" /> {post.replyCount}
          </span>
          <ArrowUpRight className="h-4 w-4 text-[var(--primary)]" />
        </div>
      </Link>
    </section>
  );
}
