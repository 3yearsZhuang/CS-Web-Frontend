/**
 * @file task 页面共享定义 — 类型、常量、状态徽章
 *
 * 任务数据唯一事实源为旧项目（经官网后端 BFF 代理）：单接取人模型，
 * 字段为 难度 / 悬赏灵石 / 截止时间 / 接取人；状态对外为官网英文 code（附旧项目中文原值）。
 *
 * 从 `app/tools/task/page.tsx` 抽出（GENERAL 2.4「组件 > 500 行拆分」、3.7「类型集中」）。
 */

import { Clock, CheckCircle, XCircle, Hourglass, Send, Zap } from 'lucide-react';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';

export type TaskTab = 'board' | 'my-claims' | 'teams' | 'points';

/** 官网英文任务状态（与后端 legacy_task_client 中文→英文映射表一致） */
export const TASK_STATUSES = [
  'pending_review',
  'published',
  'in_progress',
  'submitted',
  'completed',
  'rejected',
  'closed',
  'expired',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** 旧项目难度枚举 */
export const DIFFICULTY_KEYS = ['黑铁', '青铜', '白银', '黄金'] as const;

/** 旧项目单接取人（官网合成对象） */
export interface TaskCompleter {
  id: string;
  name: string | null;
  avatar: string | null;
}

export interface TaskData {
  id: string;
  title: string;
  description: string | null;
  difficulty: string | null;
  techRequirements: string[];
  reward: number;
  deadline: string | null;
  status: string;
  /** 旧项目原始中文状态：状态码未知时回落到它展示 */
  statusLabel: string | null;
  publisherId: string | null;
  publisherName: string | null;
  publisherAvatar: string | null;
  completer: TaskCompleter | null;
  submissionDescription: string | null;
  attachmentUrl: string | null;
  rejectReason: string | null;
  reviewedBy: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** 统一后端版本号（PATCH/归档的 If-Match） */
  version: number;
}

/** 原生 /tasks 响应（camelCase）→ 页面 TaskData 视图模型 */
export function toTaskData(input: unknown): TaskData {
  const task = (input ?? {}) as Record<string, unknown>;
  return {
    id: String(task.id ?? ''),
    title: String(task.title ?? ''),
    description: (task.description as string | null) ?? null,
    difficulty: (task.difficulty as string | null) ?? null,
    techRequirements: Array.isArray(task.tags) ? (task.tags as string[]) : [],
    reward: Number(task.rewardTotal ?? task.reward_total ?? 0),
    deadline: (task.deadline as string | null) ?? null,
    status: String(task.status ?? 'published'),
    statusLabel: null,
    publisherId: task.publisherId != null ? String(task.publisherId) : null,
    publisherName: (task.publisherName as string | null) ?? null,
    publisherAvatar: null,
    completer: null,
    submissionDescription: null,
    attachmentUrl: null,
    rejectReason: null,
    reviewedBy: null,
    reviewedAt: (task.reviewedAt as string | null) ?? null,
    createdAt: String(task.createdAt ?? ''),
    updatedAt: String(task.updatedAt ?? ''),
    version: Number(task.version ?? 1),
  };
}

/** 原生 claims 响应 → 页面 ClaimData 视图模型 */
export function toClaimData(input: unknown): ClaimData {
  const claim = (input ?? {}) as Record<string, unknown>;
  const submission = (claim.submission ?? null) as Record<string, unknown> | null;
  const rawStatus = String(claim.status ?? 'active');
  // 页面沿用旧状态机：active 视作「进行中」，提交后为 submitted。
  const status = rawStatus === 'active' ? 'in_progress' : rawStatus;
  const task = claim.task ? toTaskData(claim.task) : null;
  if (task && submission) {
    task.submissionDescription = (submission.description as string | null) ?? null;
    const attachments = Array.isArray(submission.attachments) ? submission.attachments : [];
    task.attachmentUrl = attachments.length ? String(attachments[0]) : null;
    if (String(submission.reviewStatus ?? '') === 'rejected') {
      task.rejectReason = (submission.reviewNote as string | null) ?? null;
    }
  }
  return {
    id: String(claim.id ?? ''),
    taskId: String(claim.taskId ?? claim.task_id ?? ''),
    status,
    statusLabel: null,
    createdAt: String(claim.startedAt ?? claim.createdAt ?? ''),
    task,
  };
}

/** 我的任务条目：单接取人模型下「任务即认领」 */
export interface ClaimData {
  id: string;
  taskId: string;
  status: string;
  statusLabel: string | null;
  createdAt: string;
  task: TaskData | null;
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

export function difficultyLabel(t: TFn, key: string | null | undefined): string {
  if (!key) return '';
  const map: Record<string, string> = {
    黑铁: t('diffBlackIron'),
    青铜: t('diffBronze'),
    白银: t('diffSilver'),
    黄金: t('diffGold'),
  };
  return map[key] ?? key;
}

export function difficultyOptions(t: TFn): Array<{ value: string; label: string }> {
  return DIFFICULTY_KEYS.map((k) => ({ value: k, label: difficultyLabel(t, k) }));
}

export const TASK_INPUT_CLASS = `${INPUT_CLASS} px-4 py-2.5 text-[13px]`;

/** 任务状态徽章：英文 code → 文案 + 图标 + 样式（未知 code 回落到旧项目中文原值） */
export function statusBadge(
  status: string,
  t: TFn,
  fallbackLabel?: string | null,
): { label: string; icon: React.ReactNode; cls: string } {
  switch (status) {
    case 'pending_review':
      return { label: t('statusPendingReview'), icon: <Hourglass className="w-3 h-3" />, cls: 'border-amber-500/40 text-amber-600 dark:text-amber-400' };
    case 'published':
      return { label: t('statusPublished'), icon: <Zap className="w-3 h-3" />, cls: 'border-[var(--primary)]/30 text-[var(--primary)]' };
    case 'in_progress':
      return { label: t('statusInProgress'), icon: <Clock className="w-3 h-3" />, cls: 'border-[var(--primary)]/30 text-[var(--primary)]' };
    case 'submitted':
      return { label: t('statusSubmitted'), icon: <Send className="w-3 h-3" />, cls: 'border-blue-500/30 text-blue-600 dark:text-blue-400' };
    case 'completed':
      return { label: t('statusCompleted'), icon: <CheckCircle className="w-3 h-3" />, cls: 'border-green-500/30 text-green-600 dark:text-green-400' };
    case 'rejected':
      return { label: t('statusRejected'), icon: <XCircle className="w-3 h-3" />, cls: 'border-red-500/30 text-red-600 dark:text-red-400' };
    case 'closed':
      return { label: t('statusClosed'), icon: <XCircle className="w-3 h-3" />, cls: 'border-[var(--border)] text-[var(--muted-foreground)]' };
    case 'expired':
      return { label: t('statusExpired'), icon: <XCircle className="w-3 h-3" />, cls: 'border-[var(--border)] text-[var(--muted-foreground)]' };
    default:
      return { label: fallbackLabel || status, icon: null, cls: 'border-[var(--border)] text-[var(--muted-foreground)]' };
  }
}