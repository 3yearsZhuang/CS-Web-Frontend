/**
 * @file task 页面共享定义 — 类型、常量、状态徽章
 *
 * 从 `app/tools/task/page.tsx` 抽出（GENERAL 2.4「组件 > 500 行拆分」、3.7「类型集中」）。
 */

import { Clock, CheckCircle, XCircle } from 'lucide-react';

export type TaskTab = 'board' | 'my-claims' | 'points';

export interface TaskData {
  id: string;
  title: string;
  description: string;
  contentMarkdown: string | null;
  category: string;
  tags: string[];
  points: number;
  maxClaimants: number;
  claimCount: number;
  status: string;
  createdBy: string;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimData {
  id: string;
  taskId: string;
  userId: string;
  status: string;
  claimNote: string | null;
  completedAt: string | null;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  displayName?: string;
}

export interface PointsProfile {
  balance: number;
  level: number;
  levelTitle: string;
  transactions: Array<{
    id: string;
    amount: number;
    reason: string;
    sourceType: string;
    createdAt: string;
  }>;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string | null;
  balance: number;
  level: number;
  levelTitle: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  general: '通用',
  documentation: '文档贡献',
  event: '活动协助',
  maintenance: '项目维护',
  mentoring: '新人指导',
  other: '其他',
};

export const INPUT_CLASS =
  'w-full bg-transparent border border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] font-mono transition-colors';

export function statusBadge(status: string): { label: string; icon: React.ReactNode; cls: string } {
  switch (status) {
    case 'claimed':
      return { label: '已认领', icon: <Clock className="w-3 h-3" />, cls: 'border-[var(--primary)]/30 text-[var(--primary)]' };
    case 'completed':
      return { label: '已完成', icon: <CheckCircle className="w-3 h-3" />, cls: 'border-green-500/30 text-green-600 dark:text-green-400' };
    case 'cancelled':
      return { label: '已取消', icon: <XCircle className="w-3 h-3" />, cls: 'border-[var(--border)] text-[var(--muted-foreground)]' };
    default:
      return { label: status, icon: null, cls: 'border-[var(--border)] text-[var(--muted-foreground)]' };
  }
}
