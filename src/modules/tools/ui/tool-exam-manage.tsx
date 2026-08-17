/**
 * @file 考试管理子面板 — 从 admin-tools-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useToast } from '@/components/feedback/toast';
import { TECH_TAGS } from '@/shared/utils/tech-tags';
import { Badge, Button } from '@/components';
import {
  formatDate,
  EXAM_PAGE_SIZE,
  type Exam,
} from './tool-types';

const EMPTY_EXAM_FORM = {
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  durationMinutes: '60',
  techTags: [] as string[],
};

/** 考试管理子面板 — 考试列表 + 新建考试模态框 */
export function ExamManagePanel() {
  const t = useTranslations('toolsAdmin');
  const tc = useTranslations('common');
  const { pushToast } = useToast();

  const [exams, setExams] = useState<Exam[]>([]);
  const [examTotal, setExamTotal] = useState(0);
  const [examPage, setExamPage] = useState(1);
  const [examLoading, setExamLoading] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examCreating, setExamCreating] = useState(false);
  const [examFormError, setExamFormError] = useState<string | null>(null);
  const [examForm, setExamForm] = useState(EMPTY_EXAM_FORM);

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
    fetchExams(examPage);
  }, [examPage, fetchExams]);

  /** 关闭考试创建模态框并重置表单 */
  const closeExamModal = () => {
    setExamModalOpen(false);
    setExamFormError(null);
    setExamForm(EMPTY_EXAM_FORM);
  };

  /** 提交创建考试（POST /api/admin/tools/exam） */
  const handleCreateExam = async () => {
    setExamFormError(null);

    if (!examForm.title.trim()) {
      setExamFormError(t('examTitleEmpty'));
      return;
    }
    if (!examForm.startTime || !examForm.endTime) {
      setExamFormError(t('examTimeRequired'));
      return;
    }
    const duration = parseInt(examForm.durationMinutes, 10);
    if (!Number.isFinite(duration) || duration < 1 || duration > 1440) {
      setExamFormError(t('examDurationRange'));
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
        setExamFormError(data.error || t('examCreateFailed'));
        return;
      }

      pushToast('success', t('examCreated'));
      closeExamModal();
      fetchExams(1);
      setExamPage(1);
    } catch {
      setExamFormError(t('examNetworkRetry'));
    } finally {
      setExamCreating(false);
    }
  };

  const examPages = Math.ceil(examTotal / EXAM_PAGE_SIZE) || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">{t('examCount', { count: examTotal })}</span>
        <div className="flex items-center gap-3">
          <Button
            variant="primary-outline"
            size="sm"
            type="button"
            onClick={() => setExamModalOpen(true)}
          >
            {t('newExam')}
          </Button>
          <button
            type="button"
            onClick={() => fetchExams(examPage)}
            disabled={examLoading}
            className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
          >
            {examLoading ? tc('loading') : tc('refresh')}
          </button>
        </div>
      </div>

      {examError && (
        <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)] mb-4">
          [ Error ] {examError}
        </div>
      )}

      {examLoading && exams.length === 0 && (
        <div className="py-20 text-center meta-mono text-[var(--muted-foreground)]">{t('loading')}</div>
      )}

      {!examLoading && !examError && exams.length === 0 && (
        <div className="py-20 text-center">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">{t('noExams')}</div>
          <p className="text-[14px] text-[var(--muted-foreground)]">{t('noExamsDesc')}</p>
        </div>
      )}

      {exams.length > 0 && (
        <div className="hidden md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left meta-mono py-3 pr-4">{t('colExam')}</th>
                <th className="text-left meta-mono py-3 pr-4">{t('colStatus')}</th>
                <th className="text-left meta-mono py-3 pr-4">{t('colTime')}</th>
                <th className="text-left meta-mono py-3 pr-4">{t('colDuration')}</th>
                <th className="text-left meta-mono py-3">{t('colCreated')}</th>
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
                    <Badge variant={exam.status === 'published' ? 'success' : exam.status === 'draft' ? 'amber' : 'muted'}>
                      {exam.status === 'published' ? t('statusPublished') :
                       exam.status === 'draft' ? t('statusDraft') :
                       exam.status === 'ended' ? t('statusEnded') : exam.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                    {exam.start_time ? new Date(exam.start_time + 'Z').toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="py-3 pr-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                    {exam.duration_minutes > 0 ? `${exam.duration_minutes} min` : t('durationUnlimited')}
                  </td>
                  <td className="py-3 meta-mono text-[11px] text-[var(--muted-foreground)]">{formatDate(exam.created_at)}</td>
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

      {/* 考试创建模态框 */}
      {examModalOpen && (
        <ModalShell title={t('examModalTitle')} onClose={closeExamModal}>
          <div className="space-y-5">
            <Field label={t('fieldTitle')} count={`${examForm.title.length}/200`}>
              <input
                type="text"
                value={examForm.title}
                onChange={(e) => setExamForm((f) => ({ ...f, title: e.target.value.slice(0, 200) }))}
                maxLength={200}
                className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
                placeholder={t('examTitlePlaceholder')}
              />
            </Field>

            <Field label={t('fieldDesc')} count={`${examForm.description.length}/2000`}>
              <textarea
                value={examForm.description}
                onChange={(e) => setExamForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
                maxLength={2000}
                rows={3}
                className={`${INPUT_CLASS} px-4 py-3 text-[13px] resize-y`}
                placeholder={t('examDescPlaceholder')}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label={t('fieldStartTime')}>
                <input
                  type="datetime-local"
                  value={examForm.startTime}
                  onChange={(e) => setExamForm((f) => ({ ...f, startTime: e.target.value }))}
                  className={`${INPUT_CLASS} px-3 py-2.5 text-[13px]`}
                />
              </Field>
              <Field label={t('fieldEndTime')}>
                <input
                  type="datetime-local"
                  value={examForm.endTime}
                  onChange={(e) => setExamForm((f) => ({ ...f, endTime: e.target.value }))}
                  className={`${INPUT_CLASS} px-3 py-2.5 text-[13px]`}
                />
              </Field>
            </div>

            <Field label={t('fieldDuration')}>
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

            <Field label={t('fieldTechTags')}>
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
                          techTags: selected ? f.techTags.filter((key) => key !== tag.key) : [...f.techTags, tag.key],
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
                {tc('cancel')}
              </button>
              <Button
                variant="primary-outline"
                type="button"
                onClick={handleCreateExam}
                disabled={examCreating}
              >
                {examCreating ? t('creating') : t('createExamBtn')}
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
