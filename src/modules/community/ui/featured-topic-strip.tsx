/**
 * @file 精选/置顶横滑卡片区 — 社区首页 Feed 顶部（横向滚动 + ScrollIndicator）
 */
'use client';

import Link from 'next/link';
import { ScrollIndicator } from '@/components/effects/scroll-indicator';
import { Avatar } from '@/components/avatar';
import type { CommunityPost } from '@/modules/community/types';

interface FeaturedTopicStripProps {
  topics: CommunityPost[];
  className?: string;
}

export function FeaturedTopicStrip({ topics, className = '' }: FeaturedTopicStripProps) {
  if (topics.length === 0) return null;

  return (
    <div className={className}>
      <div className="meta-mono text-[11px] mb-4">
        {'// 精选与置顶 — '}
        <span className="text-[var(--primary)] tabular-nums">{topics.length}</span>
        {' featured'}
      </div>
      <ScrollIndicator gap="gap-3 sm:gap-4">
        <div className="flex gap-3 sm:gap-4 pb-2">
          {topics.map((topic) => {
            const href = `/community/${topic.id}`;
            const author = topic.author;

            return (
              <Link
                key={topic.id}
                href={href}
                className="block group focus-amber flex-shrink-0 w-[260px] sm:w-[300px]"
              >
                <article className="border border-[var(--border)] p-4 sm:p-5 card-minimal hover:border-[var(--primary)] transition-colors h-full flex flex-col">
                  {/* 标签行 */}
                  <div className="flex items-center gap-1.5 mb-3">
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
                    <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-auto">
                      {topic.category?.name ?? ''}
                    </span>
                  </div>

                  {/* 标题 */}
                  <h3 className="display-serif text-[16px] sm:text-[18px] text-[var(--foreground)] leading-[1.3] mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                    {topic.title}
                  </h3>

                  {/* 社交动态文案 — 基于数据自动生成 */}
                  <p className="text-[12px] text-[var(--muted-foreground)] leading-[1.6] line-clamp-2 mb-3 flex-1">
                    {generateSocialCopy(topic)}
                  </p>

                  {/* 底部作者 + 统计 */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border)]/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar
                        email={author?.email ?? 'anonymous'}
                        displayName={author?.displayName}
                        avatarUrl={author?.avatarUrl}
                        avatarType={author?.avatarType}
                        size={20}
                      />
                      <span className="meta-mono text-[11px] text-[var(--muted-foreground)] truncate">
                        {author?.displayName ?? '匿名'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                        {topic.replyCount} replies
                      </span>
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                        {topic.likeCount} likes
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </ScrollIndicator>
    </div>
  );
}

/**
 * 根据帖子数据自动生成社交动态文案
 *
 * 根据帖子是否有回复、点赞等状态生成自然的描述性文案，
 * 提升 Feed 的社交感。
 */
function generateSocialCopy(topic: CommunityPost): string {
  const parts: string[] = [];

  if (topic.replyCount > 0) {
    if (topic.replyCount >= 20) {
      parts.push('讨论热烈');
    } else if (topic.replyCount >= 5) {
      parts.push('多人参与讨论');
    } else {
      parts.push('已有回复');
    }
  } else {
    parts.push('期待你的参与');
  }

  if (topic.likeCount > 0) {
    if (topic.likeCount >= 10) {
      parts.push(`${topic.likeCount} 人点赞`);
    }
  }

  if (topic.viewCount > 100) {
    parts.push('热门浏览');
  }

  return parts.join(' · ') + (parts.length > 0 ? '。' : '');
}