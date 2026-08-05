/**
 * @file 管理员论坛面板 — 版块管理 + 主题审核 + 用户/公告/看板/举报（子视图切换）
 *
 * 六个子面板已分别抽离为独立组件（GENERAL 2.4 按关注点拆分），本文件仅保留子视图切换。
 */
'use client';

import { useState } from 'react';
import { CategoriesManager } from './categories-manager';
import { TopicsManager } from './topics-manager';
import { UsersManager } from './users-manager';
import { AnnouncementsManager } from './announcements-manager';
import { DashboardManager } from './dashboard-manager';
import { ReportsManager } from './reports-manager';
import type { SubView } from './forum-admin-utils';

const TABS: { key: SubView; label: string }[] = [
  { key: 'categories', label: '[ 版块管理 / Categories ]' },
  { key: 'topics', label: '[ 主题审核 / Topics ]' },
  { key: 'users', label: '[ 用户管理 / Users ]' },
  { key: 'announcements', label: '[ 公告管理 / Announcements ]' },
  { key: 'dashboard', label: '[ 数据看板 / Dashboard ]' },
  { key: 'reports', label: '[ 举报处理 / Reports ]' },
];

/** 管理员论坛面板 — 子视图切换 */
export function AdminForumPanel() {
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
            {tab.label}
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
