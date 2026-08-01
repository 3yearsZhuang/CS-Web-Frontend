/**
 * @file 管理员工具集面板 — 资源审核 [01] + 考试管理 [02] + 任务管理 [03]（子视图切换）
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Check, X, ExternalLink, BookOpen, GraduationCap, ClipboardList } from 'lucide-react';
import { TECH_TAGS } from '@/shared/utils/tech-tags';
import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useToast } from '@/components/feedback/toast';

type ToolSubView = 'resources' | 'exams' | 'tasks';

const TASK_CATEGORY_LABELS: Record<string, string> = {
  general: '通用',
  documentation: '文档贡献',
  event: '活动协助',
  maintenance: '项目维护',
  mentoring: '新人指导',
  other: '其他',
};

interface PendingResource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  resource_type: string;
  tech_tags: string | null;
  file_url: string | null;
  status: string;
  submitted_by: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_tech_tags: string | null;
  created_at: string;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  tech_tags: string | null;
  created_by: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  points: number;
  maxClaimants: number;
  status: string;
  createdBy: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  claimCount: number;
}

interface TaskClaim {
  id: string;
  taskId: string;
  userId: string;
  status: string;
  claimNote: string | null;
  displayName: string | null;
  createdAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'Z');
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

/** 管理员工具集面板（资源审核 + 考试管理） */
export function AdminToolsPanel() {
  const { pushToast } = useToast();
  const [subView, setSubView] = useState<ToolSubView>('resources');

  // 资源审核
  const [resources, setResources] = useState<PendingResource[]>([]);
  const [resourceTotal, setResourceTotal] = useState(0);
  const [resourcePage, setResourcePage] = useState(1);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  // 考试管理
  const [exams, setExams] = useState<Exam[]>([]);
  const [examTotal, setExamTotal] = useState(0);
  const [examPage, setExamPage] = useState(1);
  const [examLoading, setExamLoading] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  // 考试创建模态框
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examCreating, setExamCreating] = useState(false);
  const [examFormError, setExamFormError] = useState<string | null>(null);
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    durationMinutes: '60',
    techTags: [] as string[],
  });

  // 任务管理
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(1);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [taskActingId, setTaskActingId] = useState<string | null>(null);
  const [pendingClaims, setPendingClaims] = useState<TaskClaim[]>([]);
  const [claimReviewingId, setClaimReviewingId] = useState<string | null>(null);

  const RESOURCE_PAGE_SIZE = 10;
  const EXAM_PAGE_SIZE = 10;
  const TASK_PAGE_SIZE = 10;

  const fetchResources = useCallback(async (pg: number) => {
    setResourceLoading(true);
    setResourceError(null);
    try {
      const res = await fetch(`/api/admin/tools/resource?page=${pg}&pageSize=${RESOURCE_PAGE_SIZE}`);
      if (res.ok) {
        const json = await res.json();
        setResources(json.resources);
        setResourceTotal(json.total);
      } else {
        const json = await res.json();
        setResourceError(json.error || '加载失败');
      }
    } catch {
      setResourceError('网络错误');
    } finally {
      setResourceLoading(false);
    }
  }, []);

  const fetchExams = useCallback(async (pg: number) => {
    setExamLoading(true);
    setExamError(null);
    try {
      const res = await fetch(`/api/admin/tools/exam?page=${pg}&pageSize=${EXAM_PAGE_SIZE}`);
      if (res.ok) {
        const json = await res.json();
        setExams(json.exams || json.data || []);
        setExamTotal(json.total || 0);
      } else {
        const json = await res.json();
        setExamError(json.error || '加载失败');
      }
    } catch {
      setExamError('网络错误');
    } finally {
      setExamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subView === 'resources') fetchResources(resourcePage);
  }, [subView, resourcePage, fetchResources]);

  useEffect(() => {
    if (subView === 'exams') fetchExams(examPage);
  }, [subView, examPage, fetchExams]);

  const fetchTasks = useCallback(async (pg: number) => {
    setTaskLoading(true);
    setTaskError(null);
    try {
      const res = await fetch(`/api/admin/tools/task?page=${pg}&pageSize=${TASK_PAGE_SIZE}`);
      if (res.ok) {
        const json = await res.json();
        setTasks(json.tasks || []);
        setTaskTotal(json.total || 0);
      } else {
        const json = await res.json();
        setTaskError(json.error || '加载失败');
      }
    } catch {
      setTaskError('网络错误');
    } finally {
      setTaskLoading(false);
    }
  }, []);

  const fetchPendingClaims = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tools/task?sub=claims');
      if (res.ok) {
        const json = await res.json();
        setPendingClaims(json.claims || []);
      }
    } catch {
      /* 认领审核非关键路径，静默失败 */
    }
  }, []);

  useEffect(() => {
    if (subView === 'tasks') {
      fetchTasks(taskPage);
      fetchPendingClaims();
    }
  }, [subView, taskPage, fetchTasks, fetchPendingClaims]);

  const handleReview = async (resourceId: string, status: 'published' | 'hidden') => {
    const res = await fetch(`/api/admin/tools/resource?id=${resourceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        note: reviewNote[resourceId]?.trim() || undefined,
      }),
    });

    if (res.ok) {
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
      setResourceTotal((prev) => prev - 1);
    } else {
      const json = await res.json();
      alert(json.error || '操作失败');
    }
  };

  /** 关闭考试创建模态框并重置表单 */
  const closeExamModal = () => {
    setExamModalOpen(false);
    setExamFormError(null);
    setExamForm({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      durationMinutes: '60',
      techTags: [],
    });
  };

  /** 提交创建考试（POST /api/admin/tools/exam） */
  const handleCreateExam = async () => {
    setExamFormError(null);

    // 客户端基础校验
    if (!examForm.title.trim()) {
      setExamFormError('标题不能为空');
      return;
    }
    if (!examForm.startTime || !examForm.endTime) {
      setExamFormError('开始时间和结束时间不能为空');
      return;
    }
    const duration = parseInt(examForm.durationMinutes, 10);
    if (!Number.isFinite(duration) || duration < 1 || duration > 1440) {
      setExamFormError('考试时长需在 1-1440 分钟之间');
      return;
    }

    setExamCreating(true);
    try {
      const res = await fetch('/api/admin/tools/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: examForm.title.trim(),
          description: examForm.description.trim() || undefined,
          startTime: new Date(examForm.startTime).toISOString(),
          endTime: new Date(examForm.endTime).toISOString(),
          durationMinutes: duration,
          techTags: examForm.techTags.length > 0 ? examForm.techTags : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExamFormError(data.error || '创建失败');
        return;
      }

      pushToast('success', '考试已创建（草稿状态）');
      closeExamModal();
      fetchExams(1);
      setExamPage(1);
    } catch {
      setExamFormError('网络错误，请稍后再试');
    } finally {
      setExamCreating(false);
    }
  };

  const resourcePages = Math.ceil(resourceTotal / RESOURCE_PAGE_SIZE) || 1;
  const examPages = Math.ceil(examTotal / EXAM_PAGE_SIZE) || 1;
  const taskPages = Math.ceil(taskTotal / TASK_PAGE_SIZE) || 1;

  /** 发布任务 */
  const handlePublishTask = async (taskId: string) => {
    setTaskActingId(taskId);
    try {
      const res = await fetch('/api/admin/tools/task?sub=publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || '发布失败');
      } else {
        fetchTasks(taskPage);
      }
    } catch {
      alert('网络错误');
    } finally {
      setTaskActingId(null);
    }
  };

  /** 关闭任务 */
  const handleCloseTask = async (taskId: string) => {
    if (!confirm('确认关闭该任务？关闭后用户将无法认领。')) return;
    setTaskActingId(taskId);
    try {
      const res = await fetch('/api/admin/tools/task?sub=close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || '关闭失败');
      } else {
        fetchTasks(taskPage);
      }
    } catch {
      alert('网络错误');
    } finally {
      setTaskActingId(null);
    }
  };

  /** 删除任务（需密码确认） */
  const handleDeleteTask = async (taskId: string) => {
    const password = prompt('删除任务需输入登录密码以确认：');
    if (password === null) return;
    setTaskActingId(taskId);
    try {
      const res = await fetch(`/api/admin/tools/task?id=${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || '删除失败');
      } else {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        setTaskTotal((prev) => prev - 1);
        fetchPendingClaims();
      }
    } catch {
      alert('网络错误');
    } finally {
      setTaskActingId(null);
    }
  };

  /** 审核认领（通过/拒绝） */
  const handleReviewClaim = async (claimId: string, approved: boolean) => {
    setClaimReviewingId(claimId);
    try {
      const res = await fetch('/api/admin/tools/task?sub=claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, approved }),
      });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || '操作失败');
      } else {
        setPendingClaims((prev) => prev.filter((c) => c.id !== claimId));
      }
    } catch {
      alert('网络错误');
    } finally {
      setClaimReviewingId(null);
    }
  };

  return (
    <div>
      {/* 子视图切换 */}
      <div className="flex items-center gap-6 mb-6 border-b border-[var(--border)] pb-4">
        <button
          type="button"
          onClick={() => { setSubView('resources'); setResourcePage(1); }}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'resources' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          [ 资源审核 / Review ]
        </button>
        <button
          type="button"
          onClick={() => { setSubView('exams'); setExamPage(1); }}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'exams' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          [ 考试管理 / Exams ]
        </button>
        <button
          type="button"
          onClick={() => { setSubView('tasks'); setTaskPage(1); }}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'tasks' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          [ 任务管理 / Tasks ]
        </button>
      </div>

      {/* 资源审核 */}
      {subView === 'resources' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
              待审核 {resourceTotal} 条
            </span>
            <button
              type="button"
              onClick={() => fetchResources(resourcePage)}
              disabled={resourceLoading}
              className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
            >
              {resourceLoading ? 'Loading' : 'Refresh'}
            </button>
          </div>

          {resourceError && (
            <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)] mb-4">
              [ Error ] {resourceError}
            </div>
          )}

          {resourceLoading && resources.length === 0 && (
            <div className="py-20 text-center meta-mono text-[var(--muted-foreground)]">加载中...</div>
          )}

          {!resourceLoading && !resourceError && resources.length === 0 && (
            <div className="py-20 text-center">
              <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 暂无待审核 / No Pending ]</div>
              <p className="text-[14px] text-[var(--muted-foreground)]">所有资源已审核完毕。</p>
            </div>
          )}

          {resources.length > 0 && (
            <div className="space-y-3">
              {resources.map((r) => {
                const tags: string[] = r.tech_tags ? JSON.parse(r.tech_tags) : [];
                return (
                  <div key={r.id} className="border border-[var(--border)] p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
                          <span className="meta-mono text-[10px] text-[var(--muted-foreground)] uppercase">
                            {r.resource_type}
                          </span>
                        </div>
                        <h3 className="text-[14px] font-semibold text-[var(--foreground)] mb-0.5">{r.title}</h3>
                        {r.description && (
                          <p className="text-[12px] text-[var(--muted-foreground)] line-clamp-2">{r.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[var(--primary)] hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> {r.url.slice(0, 60)}...
                          </a>
                          {r.file_url && (
                            <a
                              href={r.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-[var(--primary)] hover:underline"
                            >
                              附件
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {tags.map((tag) => (
                            <span key={tag} className="meta-mono text-[10px] px-1.5 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]">
                              {TECH_TAGS.find((t) => t.key === tag)?.label ?? tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                          {r.author_display_name || r.submitted_by.slice(0, 8)}
                        </span>
                        <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                          {formatDate(r.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* 审核操作 */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--border)]">
                      <input
                        type="text"
                        value={reviewNote[r.id] || ''}
                        onChange={(e) => setReviewNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="审核备注（可选）"
                        maxLength={500}
                        className="flex-1 bg-transparent border border-[var(--border)] px-3 py-1.5 text-[12px] font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleReview(r.id, 'published')}
                        className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> 通过
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(r.id, 'hidden')}
                        className="flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 border border-red-400 text-red-400 hover:bg-red-400/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> 拒绝
                      </button>
                    </div>
                  </div>
                );
              })}

              {resourcePages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {Array.from({ length: resourcePages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setResourcePage(p)}
                      className={`text-[11px] font-mono px-3 py-1.5 border transition-colors ${
                        p === resourcePage
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
        </div>
      )}

      {/* 考试管理 */}
      {subView === 'exams' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
              共 {examTotal} 场考试
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setExamModalOpen(true)}
                className="focus-amber meta-mono text-[11px] px-3 py-1.5 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
              >
                + 新建考试
              </button>
              <button
                type="button"
                onClick={() => fetchExams(examPage)}
                disabled={examLoading}
                className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
              >
                {examLoading ? 'Loading' : 'Refresh'}
              </button>
            </div>
          </div>

          {examError && (
            <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)] mb-4">
              [ Error ] {examError}
            </div>
          )}

          {examLoading && exams.length === 0 && (
            <div className="py-20 text-center meta-mono text-[var(--muted-foreground)]">加载中...</div>
          )}

          {!examLoading && !examError && exams.length === 0 && (
            <div className="py-20 text-center">
              <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 暂无考试 / No Exams ]</div>
              <p className="text-[14px] text-[var(--muted-foreground)]">尚未创建任何考试。</p>
            </div>
          )}

          {exams.length > 0 && (
            <div className="hidden md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left meta-mono py-3 pr-4">考试 / Exam</th>
                    <th className="text-left meta-mono py-3 pr-4">状态 / Status</th>
                    <th className="text-left meta-mono py-3 pr-4">时间 / Time</th>
                    <th className="text-left meta-mono py-3 pr-4">时长 / Duration</th>
                    <th className="text-left meta-mono py-3">创建 / Created</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.id} className="border-b border-[var(--border)]">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/tools/exam/${exam.id}`}
                          className="text-[14px] text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                        >
                          <GraduationCap className="w-3.5 h-3.5 inline mr-1.5 text-[var(--primary)]" />
                          {exam.title}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`meta-mono text-[10px] px-2 py-0.5 border ${
                          exam.status === 'published' ? 'border-emerald-500/40 text-emerald-500' :
                          exam.status === 'draft' ? 'border-amber-500/40 text-amber-500' :
                          'border-[var(--border)] text-[var(--muted-foreground)]'
                        }`}>
                          {exam.status === 'published' ? '已发布' :
                           exam.status === 'draft' ? '草稿' :
                           exam.status === 'ended' ? '已结束' : exam.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                        {exam.start_time ? new Date(exam.start_time + 'Z').toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 pr-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                        {exam.duration_minutes > 0 ? `${exam.duration_minutes} min` : '不限'}
                      </td>
                      <td className="py-3 meta-mono text-[11px] text-[var(--muted-foreground)]">
                        {formatDate(exam.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {examPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  {Array.from({ length: examPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setExamPage(p)}
                      className={`text-[11px] font-mono px-3 py-1.5 border transition-colors ${
                        p === examPage
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
          {exams.length > 0 && (
            <div className="md:hidden space-y-3">
              {exams.map((exam) => (
                <Link
                  key={exam.id}
                  href={`/tools/exam/${exam.id}`}
                  className="block border border-[var(--border)] p-4 hover:border-[var(--primary)]/40 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span className={`meta-mono text-[10px] px-2 py-0.5 border ${
                      exam.status === 'published' ? 'border-emerald-500/40 text-emerald-500' :
                      exam.status === 'draft' ? 'border-amber-500/40 text-amber-500' :
                      'border-[var(--border)] text-[var(--muted-foreground)]'
                    }`}>
                      {exam.status === 'published' ? '已发布' :
                       exam.status === 'draft' ? '草稿' :
                       exam.status === 'ended' ? '已结束' : exam.status}
                    </span>
                  </div>
                  <h3 className="text-[14px] text-[var(--foreground)]">{exam.title}</h3>
                  <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mt-2">
                    {exam.start_time ? new Date(exam.start_time + 'Z').toLocaleString('zh-CN') : '-'} · {exam.duration_minutes}min
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 任务管理 */}
      {subView === 'tasks' && (
        <div>
          {/* 待审核认领 */}
          {pendingClaims.length > 0 && (
            <div className="border border-[var(--border)] p-4 mb-6">
              <div className="meta-mono text-[11px] text-[var(--primary)] mb-3">
                待审核认领 {pendingClaims.length} 条
              </div>
              <div className="space-y-0">
                {pendingClaims.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 py-2.5 border-t border-[var(--border)] first:border-t-0"
                  >
                    <div className="min-w-0">
                      <span className="text-[13px] text-[var(--foreground)]">
                        {c.displayName || c.userId.slice(0, 8)}
                      </span>
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-3">
                        {formatDate(c.createdAt)}
                      </span>
                      {c.claimNote && (
                        <p className="text-[12px] text-[var(--muted-foreground)] mt-1 truncate">{c.claimNote}</p>
                      )}
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
            <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
              共 {taskTotal} 个任务
            </span>
            <button
              type="button"
              onClick={() => fetchTasks(taskPage)}
              disabled={taskLoading}
              className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
            >
              {taskLoading ? 'Loading' : 'Refresh'}
            </button>
          </div>

          {taskError && (
            <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)] mb-4">
              [ Error ] {taskError}
            </div>
          )}

          {taskLoading && tasks.length === 0 && (
            <div className="py-20 text-center meta-mono text-[var(--muted-foreground)]">加载中...</div>
          )}

          {!taskLoading && !taskError && tasks.length === 0 && (
            <div className="py-20 text-center">
              <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 暂无任务 / No Tasks ]</div>
              <p className="text-[14px] text-[var(--muted-foreground)]">尚未创建任何任务。</p>
            </div>
          )}

          {tasks.length > 0 && (
            <div className="hidden md:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left meta-mono py-3 pr-4">任务 / Task</th>
                    <th className="text-left meta-mono py-3 pr-4">分类 / Category</th>
                    <th className="text-left meta-mono py-3 pr-4">状态 / Status</th>
                    <th className="text-left meta-mono py-3 pr-4">积分 / Points</th>
                    <th className="text-left meta-mono py-3 pr-4">认领 / Claims</th>
                    <th className="text-left meta-mono py-3">操作 / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b border-[var(--border)]">
                      <td className="py-3 pr-4">
                        <span className="text-[14px] text-[var(--foreground)]">{task.title}</span>
                      </td>
                      <td className="py-3 pr-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                        {TASK_CATEGORY_LABELS[task.category] || task.category}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`meta-mono text-[10px] px-2 py-0.5 border ${
                          task.status === 'published' ? 'border-emerald-500/40 text-emerald-500' :
                          task.status === 'draft' ? 'border-amber-500/40 text-amber-500' :
                          'border-[var(--border)] text-[var(--muted-foreground)]'
                        }`}>
                          {task.status === 'published' ? '已发布' :
                           task.status === 'draft' ? '草稿' :
                           task.status === 'closed' ? '已关闭' : task.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 meta-mono text-[11px] text-[var(--primary)]">
                        {task.points} 分
                      </td>
                      <td className="py-3 pr-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                        {task.claimCount}/{task.maxClaimants}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {task.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => handlePublishTask(task.id)}
                              disabled={taskActingId === task.id}
                              className="text-[11px] font-mono px-2.5 py-1.5 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors disabled:opacity-30"
                            >
                              发布
                            </button>
                          )}
                          {task.status === 'published' && (
                            <button
                              type="button"
                              onClick={() => handleCloseTask(task.id)}
                              disabled={taskActingId === task.id}
                              className="text-[11px] font-mono px-2.5 py-1.5 border border-amber-500/50 text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-30"
                            >
                              关闭
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            disabled={taskActingId === task.id}
                            className="text-[11px] font-mono px-2.5 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors disabled:opacity-30"
                          >
                            删除
                          </button>
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
                          {task.status === 'published' ? '已发布' :
                           task.status === 'draft' ? '草稿' :
                           task.status === 'closed' ? '已关闭' : task.status}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 meta-mono text-[11px] text-[var(--primary)]">{task.points} 分</span>
                  </div>
                  <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-3">
                    认领 {task.claimCount}/{task.maxClaimants}
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => handlePublishTask(task.id)}
                        disabled={taskActingId === task.id}
                        className="text-[11px] font-mono px-2.5 py-1.5 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors disabled:opacity-30"
                      >
                        发布
                      </button>
                    )}
                    {task.status === 'published' && (
                      <button
                        type="button"
                        onClick={() => handleCloseTask(task.id)}
                        disabled={taskActingId === task.id}
                        className="text-[11px] font-mono px-2.5 py-1.5 border border-amber-500/50 text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-30"
                      >
                        关闭
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={taskActingId === task.id}
                      className="text-[11px] font-mono px-2.5 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors disabled:opacity-30"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 考试创建模态框 */}
      {examModalOpen && (
        <ModalShell title="新建考试 / New Exam" onClose={closeExamModal}>
          <div className="space-y-5">
            <Field label="标题" count={`${examForm.title.length}/200`}>
              <input
                type="text"
                value={examForm.title}
                onChange={(e) => setExamForm((f) => ({ ...f, title: e.target.value.slice(0, 200) }))}
                maxLength={200}
                className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                placeholder="例如：2026 春季算法周赛"
              />
            </Field>

            <Field label="描述" count={`${examForm.description.length}/2000`}>
              <textarea
                value={examForm.description}
                onChange={(e) => setExamForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
                maxLength={2000}
                rows={3}
                className={`${INPUT_CLASS} px-4 py-3 text-[13px] resize-y`}
                placeholder="考试简介（选填）"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="开始时间">
                <input
                  type="datetime-local"
                  value={examForm.startTime}
                  onChange={(e) => setExamForm((f) => ({ ...f, startTime: e.target.value }))}
                  className={`${INPUT_CLASS} px-3 py-2.5 text-[13px]`}
                />
              </Field>
              <Field label="结束时间">
                <input
                  type="datetime-local"
                  value={examForm.endTime}
                  onChange={(e) => setExamForm((f) => ({ ...f, endTime: e.target.value }))}
                  className={`${INPUT_CLASS} px-3 py-2.5 text-[13px]`}
                />
              </Field>
            </div>

            <Field label="时长（分钟）">
              <input
                type="number"
                min={1}
                max={1440}
                value={examForm.durationMinutes}
                onChange={(e) => setExamForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                placeholder="1-1440"
              />
            </Field>

            <Field label="技术标签">
              <div className="flex flex-wrap gap-1.5">
                {TECH_TAGS.map((tag) => {
                  const selected = examForm.techTags.includes(tag.key);
                  return (
                    <button
                      key={tag.key}
                      type="button"
                      onClick={() => {
                        setExamForm((f) => ({
                          ...f,
                          techTags: selected
                            ? f.techTags.filter((t) => t !== tag.key)
                            : [...f.techTags, tag.key],
                        }));
                      }}
                      className={`meta-mono text-[10px] px-2.5 py-1 border transition-colors ${
                        selected
                          ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50'
                      }`}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {examFormError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                [ Error ] {examFormError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeExamModal}
                disabled={examCreating}
                className="focus-amber meta-mono text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleCreateExam}
                disabled={examCreating}
                className="focus-amber meta-mono text-[12px] px-4 py-2 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors disabled:opacity-50"
              >
                {examCreating ? '创建中...' : '创建考试 →'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
