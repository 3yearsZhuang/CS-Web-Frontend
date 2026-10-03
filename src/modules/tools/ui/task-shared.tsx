/**
 * @file task 页面共享定义 — 类型、常量、状态徽章
 *
 * 从 `app/tools/task/page.tsx` 抽出（GENERAL 2.4「组件 > 500 行拆分」、3.7「类型集中」）。
 */

import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';

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

export type TFn = (key: string, values?: Record<string, string | number | Date>) => string;

export const CATEGORY_KEYS = ['general', 'documentation', 'event', 'maintenance', 'mentoring', 'other'] as const;

export function categoryLabel(t: TFn, key: string): string {
  const map: Record<string, string> = {
    general: t('catGeneral'),
    documentation: t('catDocumentation'),
    event: t('catEvent'),
    maintenance: t('catMaintenance'),
    mentoring: t('catMentoring'),
    other: t('catOther'),
  };
  return map[key] ?? key;
}

export function categoryOptions(t: TFn): Array<{ value: string; label: string }> {
  return CATEGORY_KEYS.map((k) => ({ value: k, label: categoryLabel(t, k) }));
}

export const TASK_INPUT_CLASS = `${INPUT_CLASS} px-4 py-2.5 text-[13px]`;

export function statusBadge(status: string, t: TFn): { label: string; icon: React.ReactNode; cls: string } {
  // Slice E 值域统一：对齐后端 claimed/submitted/approved/rejected（取消即删行，无 cancelled）
  switch (status) {
    case 'claimed':
      return { label: t('statusClaimed'), icon: <Clock className="w-3 h-3" />, cls: 'border-[var(--primary)]/30 text-[var(--primary)]' };
    case 'submitted':
      return { label: t('statusSubmitted'), icon: <Clock className="w-3 h-3" />, cls: 'border-amber-500/30 text-amber-600 dark:text-amber-400' };
    case 'approved':
      return { label: t('statusApproved'), icon: <CheckCircle className="w-3 h-3" />, cls: 'border-green-500/30 text-green-600 dark:text-green-400' };
    case 'rejected':
      return { label: t('statusRejected'), icon: <XCircle className="w-3 h-3" />, cls: 'border-[var(--destructive)]/30 text-[var(--destructive)]' };
    default:
      return { label: status, icon: null, cls: 'border-[var(--border)] text-[var(--muted-foreground)]' };
  }
}
