/**
 * @file 主题列表项 — 版块详情页与首页最近主题流共用
 */

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { formatDateTime } from '@/shared/utils/utils';
import type { ForumTopic } from '@/modules/community/types';

interface ForumTopicItemProps {
  /** 主题数据 */
  topic: ForumTopic;
  /** 是否显示版块名（首页最近主题流用，版块详情页隐藏） */
  showCategory?: boolean;
  /** 序号（用于编号显示，可选） */
  index?: number;
  /** 额外 className */
  className?: string;
}

export function ForumTopicItem({
  topic,
  showCategory = false,
  index,
  className = '',
}: ForumTopicItemProps) {
  const router = useRouter();
  const href = topic.category
    ? `/community/forum/${topic.category.slug}/${topic.id}`
    : `/community/forum/topic/${topic.id}`;

  const num =
    typeof index === 'number' ? String(index).padStart(2, '0') : null;

  return (
    <Link
      href={href}
      className={`block group focus-amber ${className}`}
      aria-label={`查看主题 ${topic.title}`}
    >
      <article className="grid grid-cols-12 gap-3 sm:gap-4 py-5 sm:py-6 border-b border-[var(--border)] card-minimal px-2 sm:px-4">
        {/* 左侧 — 编号 + 状态标记 */}
        <div className="col-span-12 sm:col-span-2 flex sm:flex-col items-start sm:items-start gap-2 sm:gap-1.5">
          {num && <div className="section-marker">[ {num} ]</div>}
          <div className="flex flex-wrap gap-1.5">
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

        {/* 中部 — 标题 + 作者/时间/版块 */}
        <div className="col-span-12 sm:col-span-7 min-w-0">
          <h3 className="display-serif text-[clamp(16px,2vw,20px)] text-[var(--foreground)] leading-[1.3] mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
            {topic.title}
          </h3>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span
              role="link"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/users/${topic.author?.id}`);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  router.push(`/users/${topic.author?.id}`);
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
            {showCategory && topic.category && (
              <>
                <span className="meta-mono">·</span>
                <span className="meta-mono text-[var(--primary)]">
                  {topic.category.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 右侧 — 统计 */}
        <div className="col-span-12 sm:col-span-3 flex sm:flex-col items-start sm:items-end gap-3 sm:gap-1.5 mt-1 sm:mt-0">
          <div className="flex sm:flex-col gap-3 sm:gap-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="meta-mono text-[11px]">Reply</span>
              <span className="font-mono text-[13px] text-[var(--foreground)] tabular-nums">
                {topic.replyCount}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="meta-mono text-[11px]">View</span>
              <span className="font-mono text-[13px] text-[var(--foreground)] tabular-nums">
                {topic.viewCount}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="meta-mono text-[11px]">Like</span>
              <span className="font-mono text-[13px] text-[var(--foreground)] tabular-nums">
                {topic.likeCount}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
