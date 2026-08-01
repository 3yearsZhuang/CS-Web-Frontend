/**
 * @file 管理员入社申请审核面板 — 状态筛选 + 审批（通过/拒绝 + 备注）
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RevealItem } from '@/components/effects/motion-primitives';
import { useToast } from '@/components/feedback/toast';
import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { SectionLoading } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { formatDate } from '@/shared/utils/utils';

/* ============= 类型定义 ============= */

type AppStatus = 'pending' | 'approved' | 'rejected';

interface JoinApplication {
  id: string;
  applicantName: string;
  studentId: string;
  major: string;
  techTags: string[];
  reason: string;
  contactQq: string | null;
  contactPhone: string | null;
  userId: string | null;
  status: AppStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

type ReviewModal =
  | { type: 'none' }
  | { type: 'review'; application: JoinApplication; action: 'approved' | 'rejected' };

/* ============= 常量 ============= */

const STATUS_FILTERS: Array<{ v: AppStatus; label: string }> = [
  { v: 'pending', label: '待审' },
  { v: 'approved', label: '已通过' },
  { v: 'rejected', label: '已拒绝' },
];

/* ============= 工具函数 ============= */

/** 状态中文标签 */
function statusLabel(s: AppStatus): string {
  switch (s) {
    case 'pending':
      return '待审';
    case 'approved':
      return '已通过';
    case 'rejected':
      return '已拒绝';
  }
}

/** 状态徽章样式 */
function statusBadgeClass(s: AppStatus): string {
  switch (s) {
    case 'pending':
      return 'border-amber-500/40 text-amber-500';
    case 'approved':
      return 'border-emerald-500/40 text-emerald-500';
    case 'rejected':
      return 'border-red-400/40 text-red-400';
  }
}

/* ============= 面板组件 ============= */

interface AdminJoinPanelProps {
  onForbidden: () => void;
}

/** 管理员入社申请审核面板 — 按状态筛选申请列表，支持通过/拒绝及备注 */
export function AdminJoinPanel({ onForbidden }: AdminJoinPanelProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [applications, setApplications] = useState<JoinApplication[]>([]);
  const [statusFilter, setStatusFilter] = useState<AppStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 审批模态框
  const [modal, setModal] = useState<ReviewModal>({ type: 'none' });
  const [reviewNote, setReviewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  /* ============= 数据获取 ============= */

  const fetchApplications = useCallback(
    async (status: AppStatus) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/join?status=${status}`, { cache: 'no-store' });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (res.status === 403) {
          onForbidden();
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || '加载失败');
        }
        const data = (await res.json()) as { applications: JoinApplication[] };
        setApplications(data.applications ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    },
    [router, onForbidden],
  );

  useEffect(() => {
    fetchApplications(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchApplications 已 useCallback 稳定化
  }, [statusFilter]);

  /* ============= 审批操作 ============= */

  const openReviewModal = (application: JoinApplication, action: 'approved' | 'rejected') => {
    setModal({ type: 'review', application, action });
    setReviewNote('');
    setModalError(null);
  };

  const closeModal = () => {
    setModal({ type: 'none' });
    setReviewNote('');
    setModalError(null);
  };

  const handleReview = async () => {
    if (modal.type !== 'review') return;
    const { application, action } = modal;

    setSaving(true);
    setModalError(null);
    try {
      const res = await fetch('/api/admin/join', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: application.id,
          status: action,
          reviewNote: reviewNote.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { application?: JoinApplication; error?: string }
        | null;
      if (!res.ok || !data?.application) {
        setModalError(data?.error || '审批失败，请稍后再试');
        return;
      }
      pushToast('success', action === 'approved' ? '已通过申请' : '已拒绝申请');
      setApplications((prev) => prev.filter((a) => a.id !== application.id));
      closeModal();
    } catch {
      setModalError('网络错误，请稍后再试');
    } finally {
      setSaving(false);
    }
  };

  /* ============= 渲染 ============= */

  return (
    <RevealItem>
      <div className="space-y-6">
        {/* 顶部说明 + 状态筛选 */}
        <div className="border-t border-b border-[var(--border)] py-5 sm:py-6">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="col-span-12 md:col-span-7">
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">
                [ 状态筛选 / Status Filter ]
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => setStatusFilter(s.v)}
                    className={`focus-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                      statusFilter === s.v
                        ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-5 flex md:justify-end items-end gap-3">
              <button
                type="button"
                onClick={() => fetchApplications(statusFilter)}
                disabled={loading}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
              >
                {loading ? 'Loading' : 'Refresh'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
              [ Error ] {error}
            </div>
          )}
        </div>

        {/* 列表区 */}
        {loading && applications.length === 0 && (
          <div className="py-20 flex items-center justify-center">
            <SectionLoading label="加载中 / Loading..." />
          </div>
        )}

        {!loading && !error && applications.length === 0 && (
          <div className="py-20 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">
              [ 暂无申请 / No Applications ]
            </div>
            <p className="text-[14px] text-[var(--muted-foreground)]">
              {statusFilter === 'pending' && '当前没有待审核的入社申请。'}
              {statusFilter === 'approved' && '尚未通过任何申请。'}
              {statusFilter === 'rejected' && '尚未拒绝任何申请。'}
            </p>
          </div>
        )}

        {/* 申请卡片列表 */}
        {applications.length > 0 && (
          <div className="space-y-4">
            {applications.map((app) => (
              <div key={app.id} className="border border-[var(--border)] p-5">
                {/* 卡片头部：姓名 + 学号 + 状态 + 时间 */}
                <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-[var(--border)]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="display-serif text-[18px] text-[var(--foreground)]">
                        {app.applicantName}
                      </h3>
                      <span className={`meta-mono text-[10px] px-2 py-0.5 border ${statusBadgeClass(app.status)}`}>
                        {statusLabel(app.status)}
                      </span>
                    </div>
                    <div className="meta-mono text-[11px] text-[var(--muted-foreground)] flex flex-wrap gap-x-4 gap-y-1">
                      <span>学号 / {app.studentId}</span>
                      <span>专业 / {app.major}</span>
                      <span>提交 / {formatDate(app.createdAt)}</span>
                      {app.userId && (
                        <span className="text-[var(--primary)]">已关联用户</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 申请理由 */}
                <div className="mb-4">
                  <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-2">
                    [ 申请理由 / Reason ]
                  </div>
                  <p className="text-[13px] text-[var(--foreground)] leading-[1.7] whitespace-pre-wrap">
                    {app.reason}
                  </p>
                </div>

                {/* 技术标签 */}
                {app.techTags.length > 0 && (
                  <div className="mb-4">
                    <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-2">
                      [ 技术方向 / Tech Tags ]
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {app.techTags.map((tag) => (
                        <span
                          key={tag}
                          className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 联系方式 */}
                {(app.contactQq || app.contactPhone) && (
                  <div className="mb-4">
                    <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-2">
                      [ 联系方式 / Contact ]
                    </div>
                    <div className="meta-mono text-[12px] text-[var(--foreground)] flex flex-wrap gap-x-6 gap-y-1">
                      {app.contactQq && <span>QQ: {app.contactQq}</span>}
                      {app.contactPhone && <span>Phone: {app.contactPhone}</span>}
                    </div>
                  </div>
                )}

                {/* 已审备注 */}
                {app.reviewNote && (
                  <div className="mb-4 p-3 border-l-2 border-[var(--border)] bg-[var(--muted)]/[0.04]">
                    <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-1">
                      [ 审批备注 / Review Note ]
                    </div>
                    <p className="text-[12px] text-[var(--foreground)]">{app.reviewNote}</p>
                  </div>
                )}

                {/* 操作按钮（仅待审状态显示） */}
                {app.status === 'pending' && (
                  <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
                    <button
                      type="button"
                      onClick={() => openReviewModal(app, 'approved')}
                      className="focus-amber meta-mono text-[11px] px-3 py-1.5 border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                    >
                      ✓ 通过
                    </button>
                    <button
                      type="button"
                      onClick={() => openReviewModal(app, 'rejected')}
                      className="focus-amber meta-mono text-[11px] px-3 py-1.5 border border-red-400 text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      ✕ 拒绝
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 审批确认模态框 */}
        {modal.type === 'review' && (
          <ModalShell
            title={modal.action === 'approved' ? '通过申请 / Approve' : '拒绝申请 / Reject'}
            onClose={closeModal}
          >
            <div className="space-y-5">
              {/* 申请人信息摘要 */}
              <div className="border border-[var(--border)] p-4">
                <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-2">
                  [ 申请人 / Applicant ]
                </div>
                <div className="text-[14px] text-[var(--foreground)] mb-1">
                  {modal.application.applicantName}
                </div>
                <div className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                  学号 {modal.application.studentId} · 专业 {modal.application.major}
                </div>
              </div>

              <Field label="审批备注（可选）" count={`${reviewNote.length}/200`}>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value.slice(0, 200))}
                  maxLength={200}
                  rows={3}
                  className={`${INPUT_CLASS} px-4 py-3 text-[13px] resize-y`}
                  placeholder={
                    modal.action === 'approved'
                      ? '例如：欢迎加入，请联系 XXX 安排后续'
                      : '例如：当前方向名额已满，建议下学期再申请'
                  }
                />
              </Field>

              {modalError && (
                <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                  [ Error ] {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="focus-amber meta-mono text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleReview}
                  disabled={saving}
                  className={`focus-amber meta-mono text-[12px] px-4 py-2 border transition-colors disabled:opacity-50 ${
                    modal.action === 'approved'
                      ? 'border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                      : 'border-red-400 text-red-400 hover:bg-red-400 hover:text-white'
                  }`}
                >
                  {saving
                    ? '处理中...'
                    : modal.action === 'approved'
                      ? '确认通过 →'
                      : '确认拒绝 →'}
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </div>
    </RevealItem>
  );
}
