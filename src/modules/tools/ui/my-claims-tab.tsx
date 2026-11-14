'use client';

/**
 * @file MyClaimsTab — 我的任务（Tab 02）：我接取的任务 + 提交成果
 *
 * 单接取人模型：任务即认领，无「取消接取」；旧项目「讨伐中」可提交成果（描述 + 附件链接）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `useTasks` 返回值提供（GENERAL 2.2）。
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { EmptyState, Button, SectionLoading, Title } from '@/components';
import type { useTasks } from './hooks/use-tasks';
import {
  TASK_INPUT_CLASS,
  difficultyLabel,
  statusBadge,
  type ClaimData,
  type TFn,
} from './task-shared';

export function MyClaimsTab(props: ReturnType<typeof useTasks>) {
  const t = useTranslations('toolsTask');
  const { user, claimsLoading, myClaims, submittingId, handleSubmitResult } = props;

  return (
    <div>
      <Title level={2} className="mb-10 sm:mb-16">
        {t('tabMyClaims')}
      </Title>

      {!user ? (
        <EmptyState label={`[ ${t('notLoggedIn')} ]`} message={t('loginToViewClaims')} className="py-12" />
      ) : claimsLoading ? (
        <SectionLoading label="Loading..." />
      ) : myClaims.length === 0 ? (
        <EmptyState label="[ No Quest ]" message={t('noClaims')} className="py-12 border-t border-[var(--border)]" />
      ) : (
        <div className="border-t border-[var(--border)]">
          {myClaims.map((claim) => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              t={t}
              submitting={submittingId === claim.id}
              onSubmit={handleSubmitResult}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** 单条「我的任务」：展示状态与成果，「讨伐中」内联提交成果表单 */
function ClaimRow({
  claim,
  t,
  submitting,
  onSubmit,
}: {
  claim: ClaimData;
  t: TFn;
  submitting: boolean;
  onSubmit: (claimId: string, description: string, attachmentUrl: string) => Promise<boolean>;
}) {
  const task = claim.task;
  const badge = statusBadge(claim.status, t, claim.statusLabel);
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');

  return (
    <div className="border-b border-[var(--border)] p-5 sm:p-6">
      <p className="text-[14px] text-[var(--foreground)] truncate">
        {task?.title || `${t('taskHash')}${claim.taskId.slice(0, 8)}...`}
      </p>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className={`inline-flex items-center gap-1 meta-mono text-[10px] px-2 py-0.5 border ${badge.cls}`}>
          {badge.icon}
          {badge.label}
        </span>
        {task?.difficulty && (
          <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
            {difficultyLabel(t, task.difficulty)}
          </span>
        )}
        {task && task.reward > 0 && (
          <span className="meta-mono text-[10px] text-[var(--primary)]">
            {task.reward} {t('rewardUnit')}
          </span>
        )}
        <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">{claim.createdAt}</span>
      </div>

      {/* 已提交 / 已完成：展示成果 */}
      {task?.submissionDescription && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-1">{t('submissionLabel')}</div>
          <p className="text-[13px] text-[var(--foreground)] whitespace-pre-wrap">{task.submissionDescription}</p>
          {task.attachmentUrl && (
            <a
              href={task.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="meta-mono text-[11px] text-[var(--primary)] underline-grow"
            >
              {t('attachmentLabel')}
            </a>
          )}
        </div>
      )}

      {/* 已驳回：展示原因 */}
      {task?.rejectReason && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-1">{t('rejectReasonLabel')}</div>
          <p className="text-[13px] text-[var(--destructive)] whitespace-pre-wrap">{task.rejectReason}</p>
        </div>
      )}

      {/* 讨伐中：提交成果（描述 + 附件链接） */}
      {claim.status === 'in_progress' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await onSubmit(claim.id, description, attachmentUrl);
            if (ok) {
              setDescription('');
              setAttachmentUrl('');
            }
          }}
          className="mt-4 pt-4 border-t border-[var(--border)] space-y-3"
        >
          <div className="meta-mono text-[10px] text-[var(--muted-foreground)]">{t('submitResultTitle')}</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={TASK_INPUT_CLASS}
            rows={3}
            placeholder={t('submitDescPlaceholder')}
            required
          />
          <input
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            className={TASK_INPUT_CLASS}
            placeholder={t('attachUrlPlaceholder')}
          />
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? t('submitting') : t('submit')}
          </Button>
        </form>
      )}
    </div>
  );
}