/**
 * @file FeedItemCard — 聚合 Feed 统一卡片（topic/post 合并为同一内容卡片，member 单独）
 *
 * 合并说明：原论坛主题(topic)与博客文章(post)采用不同卡片样式与 FORUM/BLOG 徽章，
 * 现统一为单一内容卡片，不再做 kind 的 UI 区分（detail 数据层已统一为 CommunityPost）。
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/avatar';
import { formatDateTime, formatDate, formatRelativeTime } from '@/shared/utils/utils';
import type { FeedItem } from '@/modules/community/types';
import { useTranslations } from 'next-intl';

type TFn = (key: string, values?: Record<string, string | number | Date>) => string;

interface FeedItemCardProps {
  item: FeedItem;
  /** 序号（用于编号显示） */
  index?: number;
}

export function FeedItemCard({ item, index }: FeedItemCardProps) {
  const num = typeof index === 'number' ? String(index).padStart(2, '0') : null;

  if (item.kind === 'member') {
    return <MemberCard item={item} num={num} />;
  }
  return <ContentCard item={item} num={num} />;
}

// ============= 统一内容卡片（topic + post 合并） =============

function ContentCard({ item, num }: { item: Extract<FeedItem, { kind: 'topic' | 'post' }>; num: string | null }) {
  const t = useTranslations('forum');
  const router = useRouter();
  const post = item.data;
  const href = `/community/${post.id}`;

  // 中部摘要：论坛优先社交动态文案，博客优先 excerpt
  const summary = post.excerpt ?? topicSocialCopy(post, t);

  return (
    <Link href={href} className="block group focus-amber" aria-label={t('feedViewContentAria', { title: post.title })}>
      <article className="grid grid-cols-12 gap-3 sm:gap-4 py-5 sm:py-6 border-b border-[var(--border)] card-minimal px-2 sm:px-4">
        {/* 左侧 — 编号 + 状态标记（仅保留置顶/精选，不展示 FORUM/BLOG） */}
        <div className="col-span-12 sm:col-span-2 flex sm:flex-col items-start gap-2 sm:gap-1.5">
          {num && <div className="section-marker">[ {num} ]</div>}
          <div className="flex flex-wrap gap-1.5">
            {post.isPinned && (
              <span className="meta-mono text-[11px] px-2 py-0.5 border border-[var(--primary)] text-[var(--primary)]">
                PIN
              </span>
            )}
            {post.isFeatured && (
              <span className="meta-mono text-[11px] px-2 py-0.5 border border-[var(--primary)] text-[var(--primary)]">
                FEAT
              </span>
            )}
          </div>
        </div>

        {/* 中部 — 标题 + 摘要 + 作者/时间/版块/标签 */}
        <div className="col-span-12 sm:col-span-7 min-w-0">
          <h3 className="display-serif text-[clamp(16px,2vw,20px)] text-[var(--foreground)] leading-[1.3] mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
            {post.title}
          </h3>
          {summary && (
            <p className="text-[12px] text-[var(--muted-foreground)] leading-[1.6] line-clamp-1 mb-2">
              {summary}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (post.author?.id) router.push(`/users/${post.author.id}`);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (post.author?.id) router.push(`/users/${post.author.id}`);
                }
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer py-1 min-h-[44px]"
            >
              <Avatar
                email={post.author?.email ?? 'anonymous'}
                displayName={post.author?.displayName}
                avatarUrl={post.author?.avatarUrl}
                avatarType={post.author?.avatarType}
                size={18}
              />
              <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">
                {post.author?.displayName ?? post.authorName ?? t('feedAnonymous')}
              </span>
            </span>
            <span className="meta-mono">·</span>
            <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
              {formatDateTime(post.publishedAt ?? post.createdAt)}
            </span>
            {post.category && (
              <>
                <span className="meta-mono">·</span>
                <span className="meta-mono text-[var(--primary)]">{post.category.name}</span>
              </>
            )}
            {post.tags.length > 0 && (
              <>
                <span className="meta-mono">·</span>
                <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
                  {post.tags.slice(0, 3).join(' / ')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 右侧 — 统计 */}
        <div className="col-span-12 sm:col-span-3 flex sm:flex-col items-start sm:items-end gap-3 sm:gap-1.5 mt-1 sm:mt-0">
          <div className="flex sm:flex-col gap-3 sm:gap-1.5">
            {post.replyCount > 0 && <StatItem label="Reply" value={post.replyCount} />}
            <StatItem label="View" value={post.viewCount} />
            <StatItem label="Like" value={post.likeCount} />
          </div>
        </div>
      </article>
    </Link>
  );
}

// ============= 成员卡片 =============

function MemberCard({ item, num }: { item: Extract<FeedItem, { kind: 'member' }>; num: string | null }) {
  const t = useTranslations('forum');
  const member = item.data;

  return (
    <Link
      href={`/users/${member.id}`}
      className="block group focus-amber"
      aria-label={t('feedViewMemberAria', { name: member.displayName ?? t('feedUnnamedMember') })}
    >
      <article className="grid grid-cols-12 gap-3 sm:gap-4 py-5 sm:py-6 border-b border-[var(--border)] card-minimal px-2 sm:px-4">
        {/* 左侧 — 编号 */}
        <div className="col-span-12 sm:col-span-2 flex sm:flex-col items-start gap-2 sm:gap-1.5">
          {num && <div className="section-marker">[ {num} ]</div>}
        </div>

        {/* 中部 — 头像 + 姓名 + bio */}
        <div className="col-span-12 sm:col-span-7 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Avatar
              email={member.id}
              displayName={member.displayName}
              avatarUrl={member.avatarUrl}
              avatarType={member.avatarType}
              size={32}
            />
            <h3 className="display-serif text-[clamp(16px,2vw,20px)] text-[var(--foreground)] leading-[1.3] group-hover:text-[var(--primary)] transition-colors truncate">
              {member.displayName ?? t('feedUnnamedMember')}
            </h3>
          </div>
          {member.bio && (
            <p className="text-[13px] text-[var(--muted-foreground)] leading-[1.6] line-clamp-1 mb-2">
              {member.bio}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
              {t('feedJoinedAt', { date: formatDate(member.joinedAt) })}
            </span>
            {member.githubUrl && (
              <>
                <span className="meta-mono">·</span>
                <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] truncate">
                  {member.githubUrl.replace('https://github.com/', 'gh: ')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 右侧 — 技术标签 */}
        <div className="col-span-12 sm:col-span-3 flex sm:flex-col items-start sm:items-end gap-2 mt-1 sm:mt-0">
          {member.techTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 sm:justify-end max-w-full">
              {member.techTags.slice(0, 4).map((tag, i) => (
                <span key={`${tag}-${i}`} className="tag-badge text-[11px]">
                  {tag}
                </span>
              ))}
              {member.techTags.length > 4 && (
                <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                  +{member.techTags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

// ============= 共用统计项 =============

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="meta-mono text-[11px]">{label}</span>
      <span className="font-mono text-[13px] text-[var(--foreground)] tabular-nums">
        {value}
      </span>
    </div>
  );
}

// ============= 社交动态文案生成 =============

/** 根据内容数据生成社交动态文案（用于无 excerpt 时补充摘要） */
function topicSocialCopy(topic: {
  replyCount: number;
  likeCount: number;
  viewCount: number;
  lastReplyAt: string | null;
}, t: TFn): string {
  const parts: string[] = [];

  if (topic.replyCount > 0) {
    if (topic.replyCount >= 20) {
      parts.push(t('socialHotDiscussion'));
    } else if (topic.replyCount >= 5) {
      parts.push(t('socialParticipantCount', { count: topic.replyCount }));
    } else {
      parts.push(t('socialReplyCount', { count: topic.replyCount }));
    }
  } else {
    parts.push(t('socialExpectParticipation'));
  }

  if (topic.likeCount >= 10) {
    parts.push(t('socialLikeCount', { count: topic.likeCount }));
  }

  if (topic.viewCount > 100) {
    parts.push(t('socialPopularView'));
  }

  if (topic.lastReplyAt) {
    parts.push(t('socialLastReply', { time: formatRelativeTime(topic.lastReplyAt) }));
  }

  return parts.join(' · ');
}
