/**
 * @file 数据看板子面板 — 从 forum-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState } from 'react';
import { SectionLoading } from '@/components';

interface DashboardStats {
  totalUsers: number;
  totalTopics: number;
  totalReplies: number;
  totalBlogPosts: number;
  totalCategories: number;
  totalAnnouncements: number;
  onlineUsers: number;
}

/** 数据看板 — 社区运营数据概览 */
export function DashboardManager() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users?pageSize=1').then((r) => r.json()),
      fetch('/api/community/feed?stats=1').then((r) => r.json()),
      fetch('/api/admin/announcements').then((r) => r.json()),
      fetch('/api/admin/community/forum/categories').then((r) => r.json()),
    ])
      .then(([usersData, feedStats, announcementsData, categoriesData]) => {
        setStats({
          totalUsers: usersData.total ?? 0,
          totalTopics: feedStats.topicCount ?? 0,
          totalReplies: (feedStats.topicCount ?? 0) + (feedStats.postCount ?? 0),
          totalBlogPosts: feedStats.postCount ?? 0,
          totalCategories: (categoriesData.items ?? []).length,
          totalAnnouncements: announcementsData.total ?? 0,
          onlineUsers: 0,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: '总用户', value: stats.totalUsers, color: 'var(--primary)' },
    { label: '讨论主题', value: stats.totalTopics, color: 'var(--chart-2)' },
    { label: '回复/评论', value: stats.totalReplies, color: 'var(--chart-1)' },
    { label: '文章内容', value: stats.totalBlogPosts, color: 'var(--chart-5)' },
    { label: '版块', value: stats.totalCategories, color: 'var(--chart-3)' },
    { label: '公告', value: stats.totalAnnouncements, color: 'var(--destructive)' },
  ] : [];

  if (loading) {
    return <SectionLoading label="Loading..." />;
  }

  if (error) {
    return <div className="py-12 text-center meta-mono text-[var(--destructive)]">{error}</div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="meta-mono text-[var(--muted-foreground)]">{'// 社区运营数据概览'}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="border border-[var(--border)] p-6 card-minimal">
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-2">{card.label}</div>
            <div className="font-mono text-[28px] sm:text-[32px] tabular-nums" style={{ color: card.color }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
