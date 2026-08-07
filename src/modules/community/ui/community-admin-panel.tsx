/**
 * @file 管理员社区面板 — 版块管理 + 主题审核 + 用户/公告/看板/举报（子视图切换）
 *
 * 六个子面板已分别抽离为独立组件（GENERAL 2.4 按关注点拆分），本文件仅保留子视图切换。
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CategoriesManager } from './categories-manager';
import { TopicsManager } from './topics-manager';
import { UsersManager } from './users-manager';
import { AnnouncementsManager } from './announcements-manager';
import { DashboardManager } from './dashboard-manager';
import { ReportsManager } from './reports-manager';
import type { SubView } from './community-admin-utils';

const TABS: { key: SubView; label: string }[] = [
  { key: 'categories', label: 'tabCategories' },
  { key: 'topics', label: 'tabTopics' },
  { key: 'users', label: 'tabUsers' },
  { key: 'announcements', label: 'tabAnnouncements' },
  { key: 'dashboard', label: 'tabDashboard' },
  { key: 'reports', label: 'tabReports' },
];

/** 管理员社区面板 — 子视图切换 */
export function AdminCommunityPanel() {
  const t = useTranslations('communityAdmin');
  const [subView, setSubView] = useState<SubView>('categories');

  return (
    <>
      {/* 子视图切换 */}
      <div className="flex items-center gap-6 mb-6 border-b border-[var(--border)] pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSubView(tab.key)}
            className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
              subView === tab.key
                ? 'text-[var(--primary)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {subView === 'categories' && <CategoriesManager />}
      {subView === 'topics' && <TopicsManager />}
      {subView === 'users' && <UsersManager />}
      {subView === 'announcements' && <AnnouncementsManager />}
      {subView === 'reports' && <ReportsManager />}
      {subView === 'dashboard' && <DashboardManager />}
    </>
  );
}
