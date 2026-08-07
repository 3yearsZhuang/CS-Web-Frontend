'use client';

/**
 * @file useTasks — 协会任务页共享状态与逻辑 Hook
 *
 * 从 `app/tools/task/page.tsx` 拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook / 组件 > 500 行拆分」。各 tab 子组件复用本 Hook 的返回值。
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { TaskData, ClaimData, PointsProfile, LeaderboardEntry } from './task-shared';

export function useTasks() {
  const t = useTranslations('toolsTask');
  // 任务列表
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // 我的认领
  const [myClaims, setMyClaims] = useState<ClaimData[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; role: string } | null>(null);

  // 积分
  const [pointsProfile, setPointsProfile] = useState<PointsProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);

  // 管理员创建表单
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', category: 'general', points: 10, maxClaimants: 1, tags: '' });
  const [creating, setCreating] = useState(false);

  // 审核状态
  const [pendingClaims, setPendingClaims] = useState<ClaimData[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.role === 'root' || user?.role === 'task_publisher';

  // 初始化：获取用户信息 + 任务列表
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});

    setTasksLoading(true);
    fetch('/api/tools/task?status=published&pageSize=50')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || t('loadFailed'));
        setTasks(data.tasks || []);
        setTasksError(null);
      })
      .catch((err) => {
        setTasksError(err.message);
      })
      .finally(() => setTasksLoading(false));
  }, []);

  // 获取我的认领
  const loadMyClaims = useCallback(() => {
    if (!user) return;
    setClaimsLoading(true);
    fetch('/api/tools/task/claims')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || t('loadFailed'));
        setMyClaims(data.claims || []);
      })
      .catch(() => {})
      .finally(() => setClaimsLoading(false));
  }, [user]);

  // 获取积分
  const loadPoints = useCallback(() => {
    if (!user) return;
    setPointsLoading(true);
    Promise.all([
      fetch('/api/tools/points').then((r) => r.json()),
      fetch('/api/tools/points/leaderboard').then((r) => r.json()),
    ])
      .then(([pData, lData]) => {
        if (pData.profile) setPointsProfile(pData.profile);
        if (lData.leaderboard) setLeaderboard(lData.leaderboard);
      })
      .catch(() => {})
      .finally(() => setPointsLoading(false));
  }, [user]);

  // 管理员获取待审核认领
  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/admin/tools/task?sub=claims')
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && data.claims) setPendingClaims(data.claims);
      })
      .catch(() => {});
  }, [isAdmin, tasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // 认领任务
  const handleClaim = useCallback(async (taskId: string) => {
    setClaimingId(taskId);
    try {
      const r = await fetch(`/api/tools/task/${taskId}/claim`, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || t('actionFailed'));
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, claimCount: t.claimCount + 1 } : t)));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setClaimingId(null);
    }
  }, []);

  // 取消认领
  const handleCancelClaim = useCallback(async (taskId: string) => {
    try {
      const r = await fetch(`/api/tools/task/${taskId}/claim`, { method: 'DELETE' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || t('actionFailed'));
      loadMyClaims();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }, [loadMyClaims]);

  // 创建任务
  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const r = await fetch('/api/admin/tools/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          category: newTask.category,
          points: newTask.points,
          maxClaimants: newTask.maxClaimants,
          tags: newTask.tags.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || t('createFailed'));
      setShowCreateForm(false);
      setNewTask({ title: '', description: '', category: 'general', points: 10, maxClaimants: 1, tags: '' });
      // 刷新
      fetch('/api/tools/task?status=published&pageSize=50')
        .then((r) => r.json())
        .then((data) => setTasks(data.tasks || []));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  }, [newTask]);

  // 发布任务
  const handlePublish = useCallback(async (taskId: string) => {
    try {
      const r = await fetch('/api/admin/tools/task?sub=publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      if (!r.ok) throw new Error((await r.json()).error || '操作失败');
      fetch('/api/tools/task?status=published&pageSize=50')
        .then((r) => r.json())
        .then((data) => setTasks(data.tasks || []));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // 审核认领
  const handleReview = useCallback(async (claimId: string, approved: boolean) => {
    setReviewingId(claimId);
    try {
      const r = await fetch('/api/admin/tools/task?sub=claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, approved }),
      });
      if (!r.ok) throw new Error((await r.json()).error || '操作失败');
      setPendingClaims((prev) => prev.filter((c) => c.id !== claimId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setReviewingId(null);
    }
  }, []);

  const categories = Array.from(new Set(tasks.map((t) => t.category)));

  return {
    // 任务列表
    tasks,
    tasksLoading,
    tasksError,
    categoryFilter,
    setCategoryFilter,
    claimingId,
    expandedId,
    setExpandedId,
    filteredTasks: categoryFilter ? tasks.filter((t) => t.category === categoryFilter) : tasks,
    categories,
    // 我的认领
    myClaims,
    claimsLoading,
    user,
    loadMyClaims,
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
    pendingClaims,
    reviewingId,
    handleClaim,
    handleCancelClaim,
    handleCreate,
    handlePublish,
    handleReview,
  };
}
