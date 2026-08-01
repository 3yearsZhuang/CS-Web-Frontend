/**
 * @file 帖子详情页右侧栏 — 楼主信息 + 相关推荐 + 版块导航（<md 时隐藏）
 */
'use client';

import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import type { CommunityPostDetail, CommunityPost } from '@/modules/community/types';

interface TopicSidebarProps {
  topic: CommunityPostDetail;
  relatedTopics: CommunityPost[];
  className?: string;
}

export function TopicSidebar({ topic, relatedTopics, className = '' }: TopicSidebarProps) {
  const author = topic.author;
  const category = topic.category;

  return (
    <aside className={`space-y-8 ${className}`}>
      {/* ===== 楼主信息 ===== */}
      <section className="border-t border-[var(--border)] pt-6">
        <h3 className="meta-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-4">
          Author
        </h3>
        <div className="flex items-center gap-3 mb-3">
          <Avatar
            email={author?.email ?? 'anonymous'}
            displayName={author?.displayName}
            avatarUrl={author?.avatarUrl}
            avatarType={author?.avatarType}
            size={36}
          />
          <div>
            <p className="font-mono text-[13px] text-[var(--foreground)] leading-tight">
              {author?.displayName ?? '匿名'}
            </p>
          </div>
        </div>
        <div className="flex gap-3 pt-3 border-t border-[var(--border)]/50">
          <div className="flex-1">
            <p className="font-mono text-[15px] tabular-nums text-[var(--foreground)]">
              {topic.viewCount}
            </p>
            <p className="meta-mono text-[10px] text-[var(--muted-foreground)]">阅读</p>
          </div>
          <div className="flex-1">
            <p className="font-mono text-[15px] tabular-nums text-[var(--foreground)]">
              {topic.likeCount}
            </p>
            <p className="meta-mono text-[10px] text-[var(--muted-foreground)]">点赞</p>
          </div>
          <div className="flex-1">
            <p className="font-mono text-[15px] tabular-nums text-[var(--foreground)]">
              {topic.replyCount}
            </p>
            <p className="meta-mono text-[10px] text-[var(--muted-foreground)]">回复</p>
          </div>
        </div>
      </section>

      {/* ===== 相关推荐 ===== */}
      {relatedTopics.length > 0 && (
        <section className="border-t border-[var(--border)] pt-6">
          <h3 className="meta-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-4">
            Related
          </h3>
          <div className="space-y-0">
            {relatedTopics.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                href={`/community/forum/${t.category?.slug ?? ''}/${t.id}`}
                className="block border-t border-[var(--border)]/50 py-3 group focus-amber"
              >
                <p className="font-mono text-[12px] text-[var(--foreground)] leading-snug line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                  {t.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                    {t.replyCount} replies
                  </span>
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                    {t.likeCount} likes
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== 版块导航 ===== */}
      {category && (
        <section className="border-t border-[var(--border)] pt-6">
          <h3 className="meta-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-4">
            Section
          </h3>
          <Link
            href={`/community/forum/${category.slug}`}
            className="block font-mono text-[12px] text-[var(--foreground)] hover:text-[var(--primary)] transition-colors mb-2 focus-amber"
          >
            {category.name}
          </Link>
          <Link
            href="/community/forum"
            className="block font-mono text-[12px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors focus-amber"
          >
            ← 所有版块
          </Link>
        </section>
      )}

      {/* ===== 回到顶部 ===== */}
      <section className="border-t border-[var(--border)] pt-6">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="meta-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors focus-amber py-1"
        >
          ↑ Back to Top
        </button>
      </section>
    </aside>
  );
}
