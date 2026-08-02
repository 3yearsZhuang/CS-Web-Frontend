/**
 * @file 协会任务发布页（/tools/task）— 任务卡片列表 + 认领 + 积分展示
 * 管理员可创建/发布/关闭/删除任务、审核认领
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ClipboardList, Trophy, CheckCircle, Clock, XCircle, Plus, Zap } from 'lucide-react';
import { StaggerContainer, RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button, SectionLoading } from '@/components';

type TaskTab = 'board' | 'my-claims' | 'points';

const CATEGORY_LABELS: Record<string, string> = {
  general: '通用',
  documentation: '文档贡献',
  event: '活动协助',
  maintenance: '项目维护',
  mentoring: '新人指导',
  other: '其他',
};

interface TaskData {
  id: string;
  title: string;
  description: string;
  contentMarkdown: string | null;
  category: string;
  tags: string[];
  points: number;
  maxClaimants: number;
  status: string;
  createdBy: string;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  claimCount: number;
}

interface ClaimData {
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

interface PointsProfile {
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

interface LeaderboardEntry {
  userId: string;
  displayName: string | null;
  balance: number;
  level: number;
  levelTitle: string;
}

function statusBadge(status: string): { label: string; icon: React.ReactNode; cls: string } {
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

const INPUT_CLASS =
  'w-full bg-transparent border border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] font-mono transition-colors';

export default function TaskPage() {
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };
  const [activeTab, setActiveTab] = useState<TaskTab>('board');

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

  const taskTabs: CapsuleTab[] = useMemo(
    () => [
      { key: 'board', num: '01', label: '任务板' },
      { key: 'my-claims', num: '02', label: '我的认领' },
      { key: 'points', num: '03', label: '积分' },
    ],
    [],
  );

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
        if (!r.ok) throw new Error(data.error || '加载失败');
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
        if (!r.ok) throw new Error(data.error || '加载失败');
        setMyClaims(data.claims || []);
      })
      .catch(() => {})
      .finally(() => setClaimsLoading(false));
  }, [user]);

  useEffect(() => {
    if (activeTab === 'my-claims') loadMyClaims();
  }, [activeTab, loadMyClaims]);

  // 获取积分
  useEffect(() => {
    if (activeTab !== 'points' || !user) return;
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
  }, [activeTab, user]);

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
      if (!r.ok) throw new Error(data.error || '操作失败');
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
      if (!r.ok) throw new Error(data.error || '操作失败');
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
      if (!r.ok) throw new Error(data.error || '创建失败');
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

  const filteredTasks = categoryFilter
    ? tasks.filter((t) => t.category === categoryFilter)
    : tasks;

  const categories = Array.from(new Set(tasks.map((t) => t.category)));

  return (
    <main className="relative pt-16">

      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label="任务板"
        hero={hero}
        minHeight="50vh"
        capsule={{
          tabs: taskTabs,
          activeKey: activeTab,
          onTabChange: (key) => setActiveTab(key as TaskTab),
        }}
        sidebarBottom={
          <Link
            href="/tools"
            className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px]"
          >
            ← 返回
          </Link>
        }
      >
        <RevealTitle>
          <h1
            className={`display-serif cursor-pointer transition-all hero-reveal origin-left ${
              hero.collapsed
                ? 'text-[clamp(22px,4vw,36px)] leading-tight'
                : 'text-[clamp(36px,9vw,120px)] leading-[1.1]'
            }`}
            onClick={onTitleClick}
          >
            任务<button className="text-[var(--primary)] focus-amber" onClick={onTitleClick}>发布板</button>
          </h1>
        </RevealTitle>
        <RevealItem className="mt-4 sm:mt-6">
          <p className="text-[14px] sm:text-[15px] text-[var(--muted-foreground)] leading-[1.8] max-w-2xl">
            协会任务板 — 类似冒险者公会。
            <span className="serif-italic text-[var(--foreground)]">领取任务、完成挑战、获得积分奖励</span>
            。
          </p>
        </RevealItem>
      </CollapsingHero>

      {/* ============ Tab 合并区 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">


          <div>
            {/* Tab 01 — 任务板 */}
            {activeTab === 'board' && (
              <div>
                <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                  任务<span className="text-[var(--primary)]">板</span>
                </h2>

                {/* 分类筛选 */}
                {categories.length > 0 && (
                  <div className="border-t border-[var(--border)] py-6 mb-8">
                    <div className="meta-mono mb-2">Category</div>
                    <div className="flex gap-0 overflow-x-auto flex-wrap">
                      <button
                        onClick={() => setCategoryFilter('')}
                        className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                          !categoryFilter
                            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                            : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                        }`}
                      >
                        全部 ({tasks.length})
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                          className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                            cat === categoryFilter
                              ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                              : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                          }`}
                        >
                          {CATEGORY_LABELS[cat] || cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 管理员：创建按钮 + 待审核 */}
                {isAdmin && (
                  <div className="flex flex-wrap items-center gap-3 mb-8">
                    <button
                      onClick={() => setShowCreateForm(!showCreateForm)}
                      className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {showCreateForm ? '取消' : '创建任务'}
                    </button>
                    {pendingClaims.length > 0 && (
                      <span className="meta-mono text-[11px] text-[var(--primary)]">
                        待审核: {pendingClaims.length}
                      </span>
                    )}
                  </div>
                )}

                {/* 创建表单 */}
                {showCreateForm && isAdmin && (
                  <form onSubmit={handleCreate} className="border border-[var(--border)] p-6 sm:p-8 mb-8 space-y-4">
                    <div>
                      <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 01 ] 任务标题</label>
                      <input
                        value={newTask.title}
                        onChange={(e) => setNewTask((f) => ({ ...f, title: e.target.value }))}
                        className={INPUT_CLASS}
                        placeholder="例如：更新社团 Wiki 页面"
                        required
                      />
                    </div>
                    <div>
                      <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 02 ] 任务描述</label>
                      <textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask((f) => ({ ...f, description: e.target.value }))}
                        className={INPUT_CLASS}
                        rows={3}
                        placeholder="详细描述任务内容和要求..."
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 03 ] 分类</label>
                        <select
                          value={newTask.category}
                          onChange={(e) => setNewTask((f) => ({ ...f, category: e.target.value }))}
                          className={INPUT_CLASS}
                        >
                          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 04 ] 积分奖励</label>
                        <input
                          type="number"
                          value={newTask.points}
                          onChange={(e) => setNewTask((f) => ({ ...f, points: parseInt(e.target.value) || 0 }))}
                          className={INPUT_CLASS}
                          min={0}
                          max={100}
                        />
                      </div>
                      <div>
                        <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 05 ] 认领上限</label>
                        <input
                          type="number"
                          value={newTask.maxClaimants}
                          onChange={(e) => setNewTask((f) => ({ ...f, maxClaimants: parseInt(e.target.value) || 1 }))}
                          className={INPUT_CLASS}
                          min={1}
                          max={50}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="meta-mono mb-2 block text-[var(--muted-foreground)]">[ 06 ] 标签（逗号分隔）</label>
                      <input
                        value={newTask.tags}
                        onChange={(e) => setNewTask((f) => ({ ...f, tags: e.target.value }))}
                        className={INPUT_CLASS}
                        placeholder="React, TypeScript, 文档"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button type="submit" disabled={creating}>
                        {creating ? '创建中...' : '创建任务'}
                      </Button>
                    </div>
                  </form>
                )}

                {/* 待审核认领 */}
                {isAdmin && pendingClaims.length > 0 && (
                  <div className="border border-[var(--border)] p-6 mb-8">
                    <div className="meta-mono mb-4">[ Pending Reviews ]</div>
                    {pendingClaims.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
                        <div>
                          <span className="text-[13px] text-[var(--foreground)]">{c.displayName || c.userId}</span>
                          <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-3">{c.createdAt}</span>
                          {c.claimNote && <p className="text-[12px] text-[var(--muted-foreground)] mt-1">{c.claimNote}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(c.id, true)}
                            disabled={reviewingId === c.id}
                            className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-500/10 transition-colors"
                          >
                            ✓ 通过
                          </button>
                          <button
                            onClick={() => handleReview(c.id, false)}
                            disabled={reviewingId === c.id}
                            className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
                          >
                            ✗ 拒绝
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 任务列表 */}
                {tasksLoading ? (
                  <SectionLoading label="Loading..." />
                ) : tasksError ? (
                  <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{tasksError}</div>
                ) : filteredTasks.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ No Quest ]</div>
                    <p className="text-[14px] text-[var(--muted-foreground)]">暂无可认领的任务。</p>
                  </div>
                ) : (
                  <div className="space-y-0 border-t border-[var(--border)]">
                    {filteredTasks.map((task, idx) => (
                      <div
                        key={task.id}
                        className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--primary)]/[0.02] ${
                          expandedId === task.id ? 'bg-[var(--primary)]/[0.03]' : ''
                        }`}
                      >
                        <button
                          onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                          className="w-full text-left p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-[14px] sm:text-[15px] text-[var(--foreground)] font-medium truncate">
                                {task.title}
                              </span>
                              <span className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]">
                                {CATEGORY_LABELS[task.category] || task.category}
                              </span>
                            </div>
                            <p className="text-[13px] text-[var(--muted-foreground)] mt-2 line-clamp-2">
                              {task.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="flex items-center gap-1 meta-mono text-[11px] text-[var(--primary)]">
                              <Zap className="w-3 h-3" />
                              {task.points} 分
                            </span>
                            <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                              {task.claimCount}/{task.maxClaimants}
                            </span>
                            <span className={`meta-mono text-[10px] transition-transform duration-300 ${expandedId === task.id ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </button>

                        {expandedId === task.id && (
                          <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-[var(--border)] pt-4">
                            <div className="space-y-4">
                              <p className="text-[13px] text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                                {task.description}
                              </p>
                              {task.tags.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {task.tags.map((tag, i) => (
                                    <span key={`${tag}-${i}`} className="tag-badge">{tag}</span>
                                  ))}
                                </div>
                              )}

                              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)]">
                                {user && task.status === 'published' && (
                                  <Button
                                    onClick={(e) => { e.stopPropagation(); handleClaim(task.id); }}
                                    disabled={claimingId === task.id || task.claimCount >= task.maxClaimants}
                                    className="text-[11px] px-4 py-2"
                                  >
                                    {task.claimCount >= task.maxClaimants ? '已满' : claimingId === task.id ? '认领中...' : '认领任务'}
                                  </Button>
                                )}
                                {isAdmin && task.status === 'draft' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handlePublish(task.id); }}
                                    className="px-3 py-1.5 text-[11px] font-mono border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors"
                                  >
                                    发布
                                  </button>
                                )}
                                <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                                  {task.status === 'draft' ? '草稿' : task.publishedAt ? `发布于 ${task.publishedAt}` : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 02 — 我的认领 */}
            {activeTab === 'my-claims' && (
              <div>
                <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                  我的<span className="text-[var(--primary)]">认领</span>
                </h2>

                {!user ? (
                  <div className="py-12 text-center">
                    <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 未登录 ]</div>
                    <p className="text-[14px] text-[var(--muted-foreground)]">请先登录查看认领记录。</p>
                  </div>
                ) : claimsLoading ? (
                  <SectionLoading label="Loading..." />
                ) : myClaims.length === 0 ? (
                  <div className="py-12 text-center border-t border-[var(--border)]">
                    <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ No Claim ]</div>
                    <p className="text-[14px] text-[var(--muted-foreground)]">你还没有认领过任务。</p>
                  </div>
                ) : (
                  <div className="border-t border-[var(--border)]">
                    {myClaims.map((claim) => {
                      const info = statusBadge(claim.status);
                      return (
                        <div key={claim.id} className="border-b border-[var(--border)] p-5 sm:p-6 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-[13px] text-[var(--foreground)] truncate">任务 #{claim.taskId.slice(0, 8)}...</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex items-center gap-1 meta-mono text-[10px] px-2 py-0.5 border ${info.cls}`}>
                                {info.icon}
                                {info.label}
                              </span>
                              <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">{claim.createdAt}</span>
                            </div>
                            {claim.claimNote && <p className="text-[12px] text-[var(--muted-foreground)] mt-1">{claim.claimNote}</p>}
                            {claim.reviewNote && <p className="text-[12px] text-[var(--muted-foreground)] mt-1 italic">审核备注: {claim.reviewNote}</p>}
                          </div>
                          {claim.status === 'claimed' && (
                            <button
                              onClick={() => handleCancelClaim(claim.taskId)}
                              className="meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow flex-shrink-0"
                            >
                              取消
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 03 — 积分 */}
            {activeTab === 'points' && (
              <div>
                <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                  积分<span className="text-[var(--primary)]">系统</span>
                </h2>

                {!user ? (
                  <div className="py-12 text-center">
                    <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 未登录 ]</div>
                    <p className="text-[14px] text-[var(--muted-foreground)]">请先登录查看积分。</p>
                  </div>
                ) : pointsLoading ? (
                  <SectionLoading label="Loading..." />
                ) : (
                  <div className="border-t border-[var(--border)]">
                    {/* 积分概览 */}
                    {pointsProfile && (
                      <div className="p-6 sm:p-8 border-b border-[var(--border)]">
                        <div className="flex items-baseline gap-4">
                          <div>
                            <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-1">[ Balance ]</div>
                            <div className="display-serif text-[clamp(36px,6vw,64px)] text-[var(--primary)]">
                              {pointsProfile.balance}
                            </div>
                          </div>
                          <div>
                            <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-1">[ Level ]</div>
                            <div className="flex items-center gap-2">
                              <Trophy className="w-5 h-5 text-[var(--primary)]" />
                              <span className="text-[16px] text-[var(--foreground)]">
                                Lv.{pointsProfile.level} — {pointsProfile.levelTitle}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 等级说明 */}
                    <div className="p-6 sm:p-8 border-b border-[var(--border)]">
                      <div className="meta-mono mb-4">[ Level Thresholds ]</div>
                      <div className="space-y-2">
                        {[
                          { l: 1, t: '新人学徒', p: 0 },
                          { l: 2, t: '初级成员', p: 50 },
                          { l: 3, t: '活跃成员', p: 150 },
                          { l: 4, t: '资深成员', p: 400 },
                          { l: 5, t: '核心骨干', p: 1000 },
                          { l: 6, t: '技术专家', p: 2500 },
                          { l: 7, t: '协会元老', p: 5000 },
                        ].map((lv) => (
                          <div
                            key={lv.l}
                            className={`flex items-center justify-between text-[12px] font-mono py-1.5 px-3 border border-[var(--border)] ${
                              pointsProfile && pointsProfile.level === lv.l
                                ? 'border-[var(--primary)] bg-[var(--primary)]/[0.04]'
                                : ''
                            }`}
                          >
                            <span className="text-[var(--foreground)]">Lv.{lv.l} {lv.t}</span>
                            <span className="meta-mono text-[var(--muted-foreground)]">{lv.p} 分</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 积分历史 */}
                    {pointsProfile && pointsProfile.transactions.length > 0 && (
                      <div className="p-6 sm:p-8">
                        <div className="meta-mono mb-4">[ Transactions ]</div>
                        <div className="space-y-0 border-t border-[var(--border)]">
                          {pointsProfile.transactions.slice(0, 20).map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                              <div>
                                <span className="text-[13px] text-[var(--foreground)]">{tx.reason}</span>
                                <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-2">{tx.createdAt}</span>
                              </div>
                              <span className={`meta-mono text-[12px] ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-[var(--destructive)]'}`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 排行榜 */}
                    {leaderboard.length > 0 && (
                      <div className="p-6 sm:p-8 border-t border-[var(--border)]">
                        <div className="meta-mono mb-4">[ Leaderboard Top 20 ]</div>
                        <div className="space-y-0 border-t border-[var(--border)]">
                          {leaderboard.map((entry, idx) => (
                            <div key={entry.userId} className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                              <div className="flex items-center gap-3">
                                <span className="meta-mono text-[11px] text-[var(--muted-foreground)] w-5 text-right">
                                  {idx + 1}
                                </span>
                                <span className="text-[13px] text-[var(--foreground)]">
                                  {entry.displayName || entry.userId.slice(0, 8)}
                                </span>
                                <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                                  Lv.{entry.level}
                                </span>
                              </div>
                              <span className="meta-mono text-[12px] text-[var(--primary)]">{entry.balance} 分</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
