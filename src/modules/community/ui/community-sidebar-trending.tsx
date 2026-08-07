/**
 * @file 社区右侧栏 — 热榜 + 活跃用户 + 统计仪表盘（<md 时隐藏）
 */
'use client';

import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import type { CommunityPost } from '@/modules/community/types';
import type { MemberItem } from '@/modules/community/types';
import { useTranslations } from 'next-intl';

interface CommunitySidebarTrendingProps {
  hotTopics: CommunityPost[];
  activeMembers: MemberItem[];
  stats?: {
    todayTopics: number;
    activeUsers: number;
    onlineUsers: number;
  } | null;
  className?: string;
}

export function CommunitySidebarTrending({
  hotTopics,
  activeMembers,
  stats,
  className = '',
}: CommunitySidebarTrendingProps) {
  const t = useTranslations('forum');
  return (
    <aside className={`space-y-8 ${className}`}>
      {/* 社区仪表盘 */}
      {stats && (
        <section className="border-t border-[var(--border)] pt-6">
          <h3 className="meta-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-4">
            Dashboard
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">{t('trendingTodayTopics')}</span>
              <span className="font-mono text-[14px] tabular-nums text-[var(--foreground)]">
                {stats.todayTopics}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">{t('trendingActiveUsers')}</span>
              <span className="font-mono text-[14px] tabular-nums text-[var(--foreground)]">
                {stats.activeUsers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">{t('trendingOnlineUsers')}</span>
              <span className="font-mono text-[14px] tabular-nums text-[var(--foreground)]">
                {stats.onlineUsers}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* 热榜 */}
      <section className="border-t border-[var(--border)] pt-6">
        <h3 className="meta-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-4">
          Trending
        </h3>
        <div className="space-y-0">
          {hotTopics.map((topic, idx) => {
            const num = String(idx + 1).padStart(2, '0');
            const href = `/community/${topic.id}`;
            return (
              <Link
                key={topic.id}
                href={href}
                className="block border-t border-[var(--border)]/50 py-3 group focus-amber"
              >
                <div className="flex items-start gap-2">
                  <span className="font-mono text-[11px] text-[var(--muted-foreground)] mt-0.5 flex-shrink-0">
                    {num}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[12px] text-[var(--foreground)] leading-snug line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                      {topic.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                        {topic.replyCount} replies
                      </span>
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                        {topic.likeCount} likes
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 活跃用户 */}
      {activeMembers.length > 0 && (
        <section className="border-t border-[var(--border)] pt-6">
          <h3 className="meta-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-4">
            Active Members
          </h3>
          <div className="space-y-0">
            {activeMembers.slice(0, 5).map((member) => (
              <Link
                key={member.id}
                href={`/users/${member.id}`}
                className="flex items-center gap-3 border-t border-[var(--border)]/50 py-3 group focus-amber"
              >
                <Avatar
                  email={member.id}
                  displayName={member.displayName}
                  avatarUrl={member.avatarUrl}
                  avatarType={member.avatarType}
                  size={28}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[12px] text-[var(--foreground)] leading-tight truncate group-hover:text-[var(--primary)] transition-colors">
                    {member.displayName ?? t('trendingUnnamedUser')}
                  </p>
                  {member.techTags.length > 0 && (
                    <p className="meta-mono text-[10px] text-[var(--muted-foreground)] mt-0.5 truncate">
                      {member.techTags.slice(0, 3).join(' · ')}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}