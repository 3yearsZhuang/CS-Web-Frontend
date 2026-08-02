/**
 * @file FeedItemCard — 聚合 Feed 统一卡片（判别联合，kind 区分 topic/post/member）
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/avatar';
import { formatDateTime, formatDate, formatRelativeTime } from '@/shared/utils/utils';
import type { FeedItem } from '@/modules/community/types';

interface FeedItemCardProps {
  item: FeedItem;
  /** 序号（用于编号显示） */
  index?: number;
}

/** 类型徽章配置 */
const KIND_BADGE: Record<FeedItem['kind'], { label: string; color: string }> = {
  topic: { label: 'FORUM', color: 'var(--primary)' },
  post: { label: 'BLOG', color: '#5bc9c5' },
  member: { label: 'MEMBER', color: '#d4a574' },
};

export function FeedItemCard({ item, index }: FeedItemCardProps) {
  const num = typeof index === 'number' ? String(index).padStart(2, '0') : null;
  const badge = KIND_BADGE[item.kind];

  if (item.kind === 'topic') {
    return <TopicCard item={item} num={num} badge={badge} />;
  }
  if (item.kind === 'post') {
    return <PostCard item={item} num={num} badge={badge} />;
  }
  return <MemberCard item={item} num={num} badge={badge} />;
}

// ============= 论坛主题卡片 =============

function TopicCard({
  item,
  num,
  badge,
}: {
  item: Extract<FeedItem, { kind: 'topic' }>;
  num: string | null;
  badge: { label: string; color: string };
}) {
  const router = useRouter();
  const topic = item.data;
  const href = topic.category
    ? `/community/forum/${topic.category.slug}/${topic.id}`
    : `/community/forum/topic/${topic.id}`;

  return (
    <Link href={href} className="block group focus-amber" aria-label={`查看主题 ${topic.title}`}>
      <article className="grid grid-cols-12 gap-3 sm:gap-4 py-5 sm:py-6 border-b border-[var(--border)] card-minimal px-2 sm:px-4">
        {/* 左侧 — 编号 + 状态标记 */}
        <div className="col-span-12 sm:col-span-2 flex sm:flex-col items-start gap-2 sm:gap-1.5">
          {num && <div className="section-marker">[ {num} ]</div>}
          <div className="flex flex-wrap gap-1.5">
            <span
              className="meta-mono text-[11px] px-2 py-0.5 border"
              style={{ color: badge.color, borderColor: badge.color }}
            >
              {badge.label}
            </span>
            {topic.isPinned && (
              <span className="meta-mono text-[11px] px-2 py-0.5 border border-[var(--primary)] text-[var(--primary)]">
                PIN
              </span>
            )}
            {topic.isFeatured && (
              <span className="meta-mono text-[11px] px-2 py-0.5 border border-[var(--primary)] text-[var(--primary)]">
                FEAT
              </span>
            )}
          </div>
        </div>

        {/* 中部 — 标题 + 社交动态文案 + 作者/时间/版块 */}
        <div className="col-span-12 sm:col-span-7 min-w-0">
          <h3 className="display-serif text-[clamp(16px,2vw,20px)] text-[var(--foreground)] leading-[1.3] mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
            {topic.title}
          </h3>
          {/* 社交动态文案 */}
          <p className="text-[12px] text-[var(--muted-foreground)] leading-[1.6] line-clamp-1 mb-2">
            {topicSocialCopy(topic)}
          </p>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (topic.author?.id) router.push(`/users/${topic.author.id}`);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (topic.author?.id) router.push(`/users/${topic.author.id}`);
                }
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer py-1 min-h-[44px]"
            >
              <Avatar
                email={topic.author?.email ?? 'anonymous'}
                displayName={topic.author?.displayName}
                avatarUrl={topic.author?.avatarUrl}
                avatarType={topic.author?.avatarType}
                size={18}
              />
              <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">
                {topic.author?.displayName ?? '匿名'}
              </span>
            </span>
            <span className="meta-mono">·</span>
            <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
              {formatDateTime(topic.createdAt)}
            </span>
            {topic.category && (
              <>
                <span className="meta-mono">·</span>
                <span className="meta-mono text-[var(--primary)]">{topic.category.name}</span>
              </>
            )}
          </div>
        </div>

        {/* 右侧 — 统计 */}
        <div className="col-span-12 sm:col-span-3 flex sm:flex-col items-start sm:items-end gap-3 sm:gap-1.5 mt-1 sm:mt-0">
          <div className="flex sm:flex-col gap-3 sm:gap-1.5">
            <StatItem label="Reply" value={topic.replyCount} />
            <StatItem label="View" value={topic.viewCount} />
            <StatItem label="Like" value={topic.likeCount} />
          </div>
        </div>
      </article>
    </Link>
  );
}

// ============= 博客文章卡片 =============

const BLOG_CATEGORY_LABELS: Record<string, string> = {
  general: '通用',
  frontend: '前端',
  backend: '后端',
  devops: '运维',
  algorithm: '算法',
  design: '设计',
  tutorial: '教程',
  essay: '随笔',
};

function PostCard({
  item,
  num,
  badge,
}: {
  item: Extract<FeedItem, { kind: 'post' }>;
  num: string | null;
  badge: { label: string; color: string };
}) {
  const post = item.data;
  const categoryLabel = BLOG_CATEGORY_LABELS[post.category?.slug ?? ''] ?? post.category?.name ?? '未分类';

  return (
    <Link href={`/community/blog/${post.slug}`} className="block group focus-amber" aria-label={`查看文章 ${post.title}`}>
      <article className="grid grid-cols-12 gap-3 sm:gap-4 py-5 sm:py-6 border-b border-[var(--border)] card-minimal px-2 sm:px-4">
        {/* 左侧 — 编号 + 类型徽章 */}
        <div className="col-span-12 sm:col-span-2 flex sm:flex-col items-start gap-2 sm:gap-1.5">
          {num && <div className="section-marker">[ {num} ]</div>}
          <span
            className="meta-mono text-[11px] px-2 py-0.5 border"
            style={{ color: badge.color, borderColor: badge.color }}
          >
            {badge.label}
          </span>
        </div>

        {/* 中部 — 标题 + 摘要 + 作者 */}
        <div className="col-span-12 sm:col-span-7 min-w-0">
          <h3 className="display-serif text-[clamp(16px,2vw,20px)] text-[var(--foreground)] leading-[1.3] mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-[13px] text-[var(--muted-foreground)] leading-[1.6] line-clamp-1 mb-2">
              {post.excerpt}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
              {post.authorName ?? '匿名作者'}
            </span>
            <span className="meta-mono">·</span>
            <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
              {formatDate(post.publishedAt ?? post.createdAt)}
            </span>
            <span className="meta-mono">·</span>
            <span className="meta-mono text-[var(--primary)]">{categoryLabel}</span>
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
            <StatItem label="View" value={post.viewCount} />
            <StatItem label="Like" value={post.likeCount} />
          </div>
        </div>
      </article>
    </Link>
  );
}

// ============= 成员卡片 =============

function MemberCard({
  item,
  num,
  badge,
}: {
  item: Extract<FeedItem, { kind: 'member' }>;
  num: string | null;
  badge: { label: string; color: string };
}) {
  const member = item.data;

  return (
    <Link
      href={`/users/${member.id}`}
      className="block group focus-amber"
      aria-label={`查看成员 ${member.displayName ?? '未命名用户'}`}
    >
      <article className="grid grid-cols-12 gap-3 sm:gap-4 py-5 sm:py-6 border-b border-[var(--border)] card-minimal px-2 sm:px-4">
        {/* 左侧 — 编号 + 类型徽章 */}
        <div className="col-span-12 sm:col-span-2 flex sm:flex-col items-start gap-2 sm:gap-1.5">
          {num && <div className="section-marker">[ {num} ]</div>}
          <span
            className="meta-mono text-[11px] px-2 py-0.5 border"
            style={{ color: badge.color, borderColor: badge.color }}
          >
            {badge.label}
          </span>
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
              {member.displayName ?? '未命名用户'}
            </h3>
          </div>
          {member.bio && (
            <p className="text-[13px] text-[var(--muted-foreground)] leading-[1.6] line-clamp-1 mb-2">
              {member.bio}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
              加入于 {formatDate(member.joinedAt)}
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

/** 根据论坛主题数据生成社交动态文案 */
function topicSocialCopy(topic: {
  replyCount: number;
  likeCount: number;
  viewCount: number;
  lastReplyAt: string | null;
}): string {
  const parts: string[] = [];

  if (topic.replyCount > 0) {
    if (topic.replyCount >= 20) {
      parts.push('讨论热烈');
    } else if (topic.replyCount >= 5) {
      parts.push(`${topic.replyCount} 人参与讨论`);
    } else {
      parts.push(`${topic.replyCount} 条回复`);
    }
  } else {
    parts.push('期待你的参与');
  }

  if (topic.likeCount >= 10) {
    parts.push(`${topic.likeCount} 人点赞`);
  }

  if (topic.viewCount > 100) {
    parts.push('热门浏览');
  }

  if (topic.lastReplyAt) {
    parts.push(`最近回复 ${formatRelativeTime(topic.lastReplyAt)}`);
  }

  return parts.join(' · ');
}
