'use client';

/**
 * @file useTasks — 协会任务页共享状态与逻辑 Hook
 *
 * 任务数据来自统一后端的原生 `/api/tasks`；页面继续消费既有
 * TaskData / ClaimData 视图模型，旧项目 8081 代理不再是运行依赖。
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { apiRequest } from '@/shared/hooks/use-api-request';
import type { TaskData, ClaimData, PointsProfile, LeaderboardEntry } from '../task-shared';
import { toClaimData, toTaskData } from '../task-shared';

/** 管理员创建表单初值（难度沿用旧端文案；截止时间默认 7 天后） */
const EMPTY_NEW_TASK = {
  title: '',
  description: '',
  difficulty: '黑铁',
  reward: 10,
  deadline: '',
  techRequirements: '',
};

type NativeTask = Record<string, unknown>;
type NativeClaim = Record<string, unknown>;

export function useTasks() {
  const t = useTranslations('toolsTask');
  // 任务列表
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 我的任务
  const [myClaims, setMyClaims] = useState<ClaimData[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  // 积分/钱包
  const [pointsProfile, setPointsProfile] = useState<PointsProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);

  // 管理员创建表单
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({ ...EMPTY_NEW_TASK });
  const [creating, setCreating] = useState(false);

  // 管理员待审核任务
  const [pendingTasks, setPendingTasks] = useState<TaskData[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const isAdmin =
    permissions.includes('task:review') ||
    permissions.includes('task:publish') ||
    user?.role === 'admin' ||
    user?.role === 'root' ||
    user?.role === 'task_publisher';

  /** 拉取任务大厅（原生 /tasks，默认仅 published） */
  const loadTasks = useCallback(() => {
    setTasksLoading(true);
    apiRequest<{ items?: NativeTask[] }>('/api/tasks?status=published&limit=50')
      .then((r) => {
        if (!r.ok) throw new Error(r.error ?? t('loadFailed'));
        setTasks((r.data?.items || []).map(toTaskData));
        setTasksError(null);
      })
      .catch((err) => {
        setTasksError(err.message);
      })
      .finally(() => setTasksLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 初始化：获取用户信息 + 权限 + 任务列表
  useEffect(() => {
    apiRequest<{ user: { id: string; role: string } }>('/api/auth/me')
      .then((r) => r.data)
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
    apiRequest<{ permissions?: string[] }>('/api/rbac/me/permissions')
      .then((r) => {
        if (r.ok && Array.isArray(r.data?.permissions)) setPermissions(r.data.permissions);
      })
      .catch(() => {});
    loadTasks();
  }, [loadTasks]);

  // 获取我的任务
  const loadMyClaims = useCallback(() => {
    if (!user) return;
    setClaimsLoading(true);
    apiRequest<{ items?: NativeClaim[] }>('/api/tasks/me/claims?limit=50')
      .then((r) => {
        if (!r.ok) throw new Error(r.error ?? t('loadFailed'));
        setMyClaims((r.data?.items || []).map(toClaimData));
      })
      .catch(() => {})
      .finally(() => setClaimsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 获取统一钱包档案与公开余额排行
  const loadPoints = useCallback(() => {
    if (!user) return;
    setPointsLoading(true);
    Promise.all([
      apiRequest<Record<string, unknown>>('/api/wallet/me/profile'),
      apiRequest<LeaderboardEntry[]>('/api/wallet/leaderboard?limit=20'),
    ])
      .then(([pResult, lResult]) => {
        if (pResult.ok && pResult.data) {
          const p = pResult.data;
          setPointsProfile({
            balance: Number(p.balance ?? 0),
            level: Number(p.level ?? 1),
            levelTitle: String(p.levelTitle ?? p.level_title ?? ''),
            transactions: [],
          });
        }
        if (lResult.ok && Array.isArray(lResult.data)) {
          setLeaderboard(
            lResult.data.map((entry) => ({
              ...entry,
              userId: String(entry.userId),
              balance: Number(entry.balance),
            })),
          );
        }
      })
      .catch(() => {})
      .finally(() => setPointsLoading(false));
  }, [user]);

  // 管理员获取待审核任务
  const loadPendingTasks = useCallback(() => {
    if (!isAdmin) return;
    apiRequest<{ items?: NativeTask[] }>('/api/admin/tasks?status=pending_review&limit=50')
      .then((r) => {
        if (r.ok && Array.isArray(r.data?.items)) {
          setPendingTasks(r.data.items.map(toTaskData));
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    loadPendingTasks();
  }, [loadPendingTasks, tasks]);

  /** 接取任务：单人任务无业务体；团队入口由后续页面显式传 teamId */
  const handleClaim = useCallback(async (taskId: string) => {
    setClaimingId(taskId);
    try {
      const r = await apiRequest(`/api/tasks/${taskId}/claims`, {
        method: 'POST',
        body: {},
      });
      if (!r.ok) throw new Error(r.error ?? t('actionFailed'));
      loadTasks();
      loadMyClaims();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setClaimingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTasks, loadMyClaims]);

  /** 提交成果：claimId 为执行实例 ID，附件以数组传输 */
  const handleSubmitResult = useCallback(
    async (claimId: string, description: string, attachmentUrl: string) => {
      setSubmittingId(claimId);
      try {
        const r = await apiRequest(`/api/task-claims/${claimId}/submissions`, {
          method: 'POST',
          body: {
            description,
            attachments: attachmentUrl ? [attachmentUrl] : [],
          },
        });
        if (!r.ok) throw new Error(r.error ?? t('submitFailed'));
        loadMyClaims();
        return true;
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setSubmittingId(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [loadMyClaims],
  );

  /** 管理员建单：创建草稿后立即申请上架 */
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setCreating(true);
      try {
        const deadline = newTask.deadline
          ? new Date(newTask.deadline).toISOString()
          : new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
        const created = await apiRequest<{ id?: number }>('/api/tasks', {
          method: 'POST',
          body: {
            title: newTask.title,
            description: newTask.description,
            difficulty: newTask.difficulty,
            rewardTotal: String(newTask.reward),
            executionMode: 'single',
            maxMembers: 1,
            deadline,
            visibility: 'members',
            tags: newTask.techRequirements
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          },
        });
        if (!created.ok || !created.data?.id) {
          throw new Error(created.error ?? t('createFailed'));
        }
        const review = await apiRequest(`/api/tasks/${created.data.id}/review-requests`, {
          method: 'POST',
        });
        if (!review.ok) throw new Error(review.error ?? t('createFailed'));
        setShowCreateForm(false);
        setNewTask({ ...EMPTY_NEW_TASK });
        loadTasks();
        loadPendingTasks();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : String(e));
      } finally {
        setCreating(false);
      }
    },
    [newTask, loadTasks, loadPendingTasks, t],
  );

  /** 管理员审核通过：批准时后端原子托管奖励 */
  const handleApprove = useCallback(
    async (taskId: string) => {
      setReviewingId(taskId);
      try {
        const r = await apiRequest(`/api/admin/tasks/${taskId}/reviews`, {
          method: 'POST',
          body: { decision: 'approve' },
        });
        if (!r.ok) throw new Error(r.error ?? t('actionFailed'));
        setPendingTasks((prev) => prev.filter((x) => x.id !== taskId));
        loadTasks();
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : String(e));
      } finally {
        setReviewingId(null);
      }
    },
    [loadTasks, t],
  );

  /** 管理员审核驳回：必须填写原因 */
  const handleReject = useCallback(
    async (taskId: string) => {
      const reason = window.prompt(t('rejectReasonPrompt')) ?? '';
      if (!reason.trim()) return;
      setReviewingId(taskId);
      try {
        const r = await apiRequest(`/api/admin/tasks/${taskId}/reviews`, {
          method: 'POST',
          body: { decision: 'reject', note: reason },
        });
        if (!r.ok) throw new Error(r.error ?? t('actionFailed'));
        setPendingTasks((prev) => prev.filter((x) => x.id !== taskId));
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : String(e));
      } finally {
        setReviewingId(null);
      }
    },
    [t],
  );

  return {
    // 任务列表
    tasks,
    tasksLoading,
    tasksError,
    difficultyFilter,
    setDifficultyFilter,
    claimingId,
    expandedId,
    setExpandedId,
    filteredTasks: difficultyFilter ? tasks.filter((x) => x.difficulty === difficultyFilter) : tasks,
    loadTasks,
    // 我的任务
    myClaims,
    claimsLoading,
    submittingId,
    user,
    loadMyClaims,
    handleSubmitResult,
    // 积分
    pointsProfile,
    leaderboard,
    pointsLoading,
    loadPoints,
    // 管理员
    isAdmin,
    showCreateForm,
    setShowCreateForm,
    newTask,
    setNewTask,
    creating,
    pendingTasks,
    reviewingId,
    handleClaim,
    handleCreate,
    handleApprove,
    handleReject,
  };
}
