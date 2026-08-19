/**
 * @file 任务管理子面板 — 从 admin-tools-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components';
import { Check, X } from 'lucide-react';
import {
  formatDate,
  TASK_CATEGORY_LABELS,
  TASK_PAGE_SIZE,
  type Task,
  type TaskClaim,
} from './tool-types';
import { apiRequest } from '@/shared/hooks/use-api-request';

/** 任务管理子面板 — 任务列表 + 发布/关闭/删除 + 认领审核 */
export function TaskManagePanel() {
  const t = useTranslations('toolsAdmin');
  const tc = useTranslations('common');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(1);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskActingId, setTaskActingId] = useState<string | null>(null);
  const [pendingClaims, setPendingClaims] = useState<TaskClaim[]>([]);
  const [claimReviewingId, setClaimReviewingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async (pg: number) => {
    setTaskLoading(true);
    setTaskError(null);
    try {
      const r = await apiRequest<{ tasks?: Task[]; total?: number }>(`/api/admin/tools/task?page=${pg}&pageSize=${TASK_PAGE_SIZE}`);
      if (r.ok) {
        const json = r.data ?? {};
        setTasks(json.tasks || []);
        setTaskTotal(json.total || 0);
      } else {
        setTaskError(r.error ?? '加载失败');
      }
    } catch {
      setTaskError('网络错误');
    } finally {
      setTaskLoading(false);
    }
  }, []);

  const fetchPendingClaims = useCallback(async () => {
    try {
      const r = await apiRequest<{ claims?: TaskClaim[] }>('/api/admin/tools/task?sub=claims');
      if (r.ok) {
        const json = r.data ?? {};
        setPendingClaims(json.claims || []);
      }
    } catch {
      /* 认领审核非关键路径，静默失败 */
    }
  }, []);

  useEffect(() => {
    fetchTasks(taskPage);
    fetchPendingClaims();
  }, [taskPage, fetchTasks, fetchPendingClaims]);

  /** 发布任务 */
  const handlePublishTask = async (taskId: string) => {
    setTaskActingId(taskId);
    try {
      const r = await apiRequest('/api/admin/tools/task?sub=publish', {
        method: 'POST',
        body: { taskId },
      });
      if (!r.ok) {
        alert(r.error ?? t('taskPublishFailed'));
      } else {
        fetchTasks(taskPage);
      }
    } catch {
      alert(t('networkError'));
    } finally {
      setTaskActingId(null);
    }
  };

  /** 关闭任务 */
  const handleCloseTask = async (taskId: string) => {
    if (!window.confirm(t('taskCloseConfirm'))) return;
    setTaskActingId(taskId);
    try {
      const r = await apiRequest('/api/admin/tools/task?sub=close', {
        method: 'POST',
        body: { taskId },
      });
      if (!r.ok) {
        alert(r.error ?? t('taskCloseFailed'));
      } else {
        fetchTasks(taskPage);
      }
    } catch {
      alert(t('networkError'));
    } finally {
      setTaskActingId(null);
    }
  };

  /** 删除任务（需密码确认） */
  const handleDeleteTask = async (taskId: string) => {
    const password = window.prompt(t('taskDeletePrompt'));
    if (password === null) return;
    setTaskActingId(taskId);
    try {
      const r = await apiRequest(`/api/admin/tools/task?id=${taskId}`, {
        method: 'DELETE',
        body: { password },
      });
      if (!r.ok) {
        alert(r.error ?? t('taskDeleteFailed'));
      } else {
        setTasks((prev) => prev.filter((item) => item.id !== taskId));
        setTaskTotal((prev) => prev - 1);
        fetchPendingClaims();
      }
    } catch {
      alert(t('networkError'));
    } finally {
      setTaskActingId(null);
    }
  };

  /** 审核认领（通过/拒绝） */
  const handleReviewClaim = async (claimId: string, approved: boolean) => {
    setClaimReviewingId(claimId);
    try {
      const r = await apiRequest('/api/admin/tools/task?sub=claim', {
        method: 'POST',
        body: { claimId, approved },
      });
      if (!r.ok) {
        alert(r.error ?? t('actionFailed'));
      } else {
        setPendingClaims((prev) => prev.filter((c) => c.id !== claimId));
      }
    } catch {
      alert(t('networkError'));
    } finally {
      setClaimReviewingId(null);
    }
  };

  const taskPages = Math.ceil(taskTotal / TASK_PAGE_SIZE) || 1;

  return (
    <div>
      {/* 待审核认领 */}
      {pendingClaims.length > 0 && (
        <div className="border border-[var(--border)] p-4 mb-6">
          <div className="meta-mono text-[11px] text-[var(--primary)] mb-3">{t('pendingClaims', { count: pendingClaims.length })}</div>
          <div className="space-y-0">
            {pendingClaims.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 py-2.5 border-t border-[var(--border)] first:border-t-0"
              >
                <div className="min-w-0">
                  <span className="text-[13px] text-[var(--foreground)]">{c.displayName || c.userId.slice(0, 8)}</span>
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-3">{formatDate(c.createdAt)}</span>
                  {c.claimNote && <p className="text-[12px] text-[var(--muted-foreground)] mt-1 truncate">{c.claimNote}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReviewClaim(c.id, true)}
                    disabled={claimReviewingId === c.id}
                    className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-30"
                  >
                    <Check className="w-3.5 h-3.5" /> 通过
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewClaim(c.id, false)}
                    disabled={claimReviewingId === c.id}
                    className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 border border-red-400 text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30"
                  >
                    <X className="w-3.5 h-3.5" /> 拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">共 {taskTotal} 个任务</span>
        <button
          type="button"
          onClick={() => fetchTasks(taskPage)}
          disabled={taskLoading}
          className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
        >
          {taskLoading ? tc('loading') : tc('refresh')}
        </button>
      </div>

      {taskError && (
        <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)] mb-4">
          [ Error ] {taskError}
        </div>
      )}

      {taskLoading && tasks.length === 0 && (
        <div className="py-20 text-center meta-mono text-[var(--muted-foreground)]">{t('loading')}</div>
      )}

      {!taskLoading && !taskError && tasks.length === 0 && (
        <div className="py-20 text-center">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">{t('noTasks')}</div>
          <p className="text-[14px] text-[var(--muted-foreground)]">{t('noTasksDesc')}</p>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="hidden md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left meta-mono py-3 pr-4">{t('colTask')}</th>
                <th className="text-left meta-mono py-3 pr-4">{t('colCategory')}</th>
                <th className="text-left meta-mono py-3 pr-4">{t('colStatus')}</th>
                <th className="text-left meta-mono py-3 pr-4">{t('colPoints')}</th>
                <th className="text-left meta-mono py-3 pr-4">{t('colClaims')}</th>
                <th className="text-left meta-mono py-3">{t('colAction')}</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-[var(--border)]">
                  <td className="py-3 pr-4"><span className="text-[14px] text-[var(--foreground)]">{task.title}</span></td>
                  <td className="py-3 pr-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                    {TASK_CATEGORY_LABELS[task.category] || task.category}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`meta-mono text-[10px] px-2 py-0.5 border ${
                      task.status === 'published' ? 'border-emerald-500/40 text-emerald-500' :
                      task.status === 'draft' ? 'border-amber-500/40 text-amber-500' :
                      'border-[var(--border)] text-[var(--muted-foreground)]'
                    }`}>
                      {task.status === 'published' ? t('statusPublished') :
                       task.status === 'draft' ? t('statusDraft') :
                       task.status === 'closed' ? t('statusClosed') : task.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 meta-mono text-[11px] text-[var(--primary)]">{t('pointsUnit', { count: task.points })}</td>
                  <td className="py-3 pr-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                    {t('taskClaimCount', { count: task.claimCount, max: task.maxClaimants })}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {task.status === 'draft' && (
                        <Button
                          variant="primary-outline"
                          size="sm"
                          type="button"
                          onClick={() => handlePublishTask(task.id)}
                          disabled={taskActingId === task.id}
                        >
                          {t('publish')}
                        </Button>
                      )}
                      {task.status === 'published' && (
                        <Button
                          variant="amber"
                          size="sm"
                          type="button"
                          onClick={() => handleCloseTask(task.id)}
                          disabled={taskActingId === task.id}
                        >
                          {t('close')}
                        </Button>
                      )}
                <Button variant="outline-danger" size="sm" type="button" onClick={() => handleDeleteTask(task.id)} disabled={taskActingId === task.id}>
                  {t('delete')}
                </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {taskPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: taskPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTaskPage(p)}
                  className={`text-[11px] font-mono px-3 py-1.5 border transition-colors ${
                    p === taskPage
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 移动端卡片列表 */}
      {tasks.length > 0 && (
        <div className="md:hidden space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="border border-[var(--border)] p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-semibold text-[var(--foreground)]">{task.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]">
                      {TASK_CATEGORY_LABELS[task.category] || task.category}
                    </span>
                    <span className={`meta-mono text-[10px] px-2 py-0.5 border ${
                      task.status === 'published' ? 'border-emerald-500/40 text-emerald-500' :
                      task.status === 'draft' ? 'border-amber-500/40 text-amber-500' :
                      'border-[var(--border)] text-[var(--muted-foreground)]'
                    }`}>
                      {task.status === 'published' ? t('statusPublished') :
                       task.status === 'draft' ? t('statusDraft') :
                       task.status === 'closed' ? t('statusClosed') : task.status}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 meta-mono text-[11px] text-[var(--primary)]">{t('pointsUnit', { count: task.points })}</span>
              </div>
              <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-3">{t('taskClaimCount', { count: task.claimCount, max: task.maxClaimants })}</div>
              <div className="flex items-center gap-2">
                {task.status === 'draft' && (
                  <Button
                    variant="primary-outline"
                    size="sm"
                    type="button"
                    onClick={() => handlePublishTask(task.id)}
                    disabled={taskActingId === task.id}
                  >
                    发布
                  </Button>
                )}
                {task.status === 'published' && (
                  <Button
                    variant="amber"
                    size="sm"
                    type="button"
                    onClick={() => handleCloseTask(task.id)}
                    disabled={taskActingId === task.id}
                  >
                    关闭
                  </Button>
                )}
                <Button variant="outline-danger" size="sm" type="button" onClick={() => handleDeleteTask(task.id)} disabled={taskActingId === task.id}>
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
