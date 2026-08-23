/**
 * @file Community feed item — modern discussion row for content and member results
 */
'use client';

import Link from 'next/link';
import { Bookmark, Eye, Heart, MessageCircle, Pin, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar, Badge } from '@/components';
import { formatRelativeTime } from '@/shared/utils/utils';
import type { FeedItem } from '@/modules/community/types';

interface FeedItemCardProps {
  item: FeedItem;
  index?: number;
}

export function FeedItemCard({ item }: FeedItemCardProps) {
  if (item.kind === 'member') return <MemberFeedItem item={item} />;
  return <PostFeedItem item={item} />;
}

function PostFeedItem({ item }: { item: Extract<FeedItem, { kind: 'topic' | 'post' }> }) {
  const t = useTranslations('community');
  const common = useTranslations('communityCommon');
  const post = item.data;
  const authorName = post.author?.displayName ?? post.authorName ?? common('feedAnonymous');
  const publishedAt = post.publishedAt ?? post.createdAt;

  return (
    <article className="group border-b border-[var(--border)] px-1 py-5 transition-colors hover:bg-[var(--hover-overlay)] sm:px-4 sm:py-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <Link
          href={post.author?.id ? `/users/${post.author.id}` : '#'}
          className="shrink-0 rounded-full focus-ring"
          aria-label={authorName}
        >
          <Avatar
            email={post.author?.email ?? 'anonymous'}
            displayName={post.author?.displayName}
            avatarUrl={post.author?.avatarUrl}
            avatarType={post.author?.avatarType}
            size={38}
          />
        </Link>

        <div className="min-w-0 flex-1">
          <header className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <Link
              href={post.author?.id ? `/users/${post.author.id}` : '#'}
              className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
            >
              {authorName}
            </Link>
            <span className="text-[var(--muted-foreground)]">{formatRelativeTime(publishedAt)}</span>
            {post.category && (
              <span className="text-[var(--muted-foreground)]">
                in <span className="text-[var(--primary)]">{post.category.name}</span>
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              {post.isPinned && (
                <Badge variant="primary" className="inline-flex items-center gap-1">
                  <Pin className="h-3 w-3" /> PIN
                </Badge>
              )}
              {post.isFeatured && (
                <Badge variant="amber" className="inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> FEAT
                </Badge>
              )}
            </div>
          </header>

          <Link href={`/community/${post.id}`} className="block focus-ring">
            <h2 className="mb-2 text-[16px] font-semibold leading-6 text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)] sm:text-[18px]">
              {post.title}
            </h2>
            {(post.excerpt || post.contentMarkdown) && (
              <p className="mb-3 line-clamp-2 max-w-3xl text-[13px] leading-6 text-[var(--muted-foreground)] sm:text-sm">
                {post.excerpt ?? post.contentMarkdown.replace(/[#>*`\[\]]/g, '').slice(0, 220)}
              </p>
            )}
          </Link>

          {post.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {post.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="badge badge-muted normal-case tracking-normal">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <footer className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--muted-foreground)]">
            <Stat icon={MessageCircle} label={t('repliesShort')} value={post.replyCount} emphasized />
            <Stat icon={Heart} label={t('likesShort')} value={post.likeCount} />
            <Stat icon={Bookmark} label="Save" value={post.favoriteCount} />
            <Stat icon={Eye} label={t('viewsShort')} value={post.viewCount} />
            {post.lastReplyAt && (
              <span className="ml-auto hidden sm:inline">
                {common('socialLastReply', { time: formatRelativeTime(post.lastReplyAt) })}
              </span>
            )}
          </footer>
        </div>
      </div>
    </article>
  );
}

function MemberFeedItem({ item }: { item: Extract<FeedItem, { kind: 'member' }> }) {
  const common = useTranslations('communityCommon');
  const member = item.data;
  const name = member.displayName ?? common('feedUnnamedMember');

  return (
    <article className="border-b border-[var(--border)] px-1 py-5 hover:bg-[var(--hover-overlay)] sm:px-4 sm:py-6">
      <Link href={`/users/${member.id}`} className="flex items-start gap-4 focus-ring">
        <Avatar
          email={member.id}
          displayName={member.displayName}
          avatarUrl={member.avatarUrl}
          avatarType={member.avatarType}
          size={44}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{name}</h2>
            <Badge variant="muted">{member.role}</Badge>
          </div>
          {member.bio && <p className="mb-3 text-sm leading-6 text-[var(--muted-foreground)]">{member.bio}</p>}
          <div className="flex flex-wrap gap-1.5">
            {member.techTags.slice(0, 5).map((tag) => (
              <span key={tag} className="badge badge-muted normal-case tracking-normal">{tag}</span>
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  emphasized = false,
}: {
  icon: typeof MessageCircle;
  label: string;
  value: number;
  emphasized?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${emphasized ? 'text-[var(--foreground)]' : ''}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className="tabular-nums">{value}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
