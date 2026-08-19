/**
 * @file 数据看板子面板 — 从 community-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { SectionLoading } from '@/components';
import { useDashboardManager, type DashboardStats } from './hooks/use-dashboard-manager';

/** 数据看板 — 社区运营数据概览 */
export function DashboardManager() {
  const { stats, loading, error, loadStats } = useDashboardManager();
  const t = useTranslations('dashboard');

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const statCards = stats ? [
    { label: t('statTotalUsers'), value: stats.totalUsers, color: 'var(--primary)' },
    { label: t('statTopics'), value: stats.totalTopics, color: 'var(--chart-2)' },
    { label: t('statReplies'), value: stats.totalReplies, color: 'var(--chart-1)' },
    { label: t('statPosts'), value: stats.totalCommunityPosts, color: 'var(--chart-5)' },
    { label: t('statCategories'), value: stats.totalCategories, color: 'var(--chart-3)' },
    { label: t('statAnnouncements'), value: stats.totalAnnouncements, color: 'var(--destructive)' },
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
      <div className="meta-mono text-[var(--muted-foreground)]">{'// '}{t('overview')}</div>
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
