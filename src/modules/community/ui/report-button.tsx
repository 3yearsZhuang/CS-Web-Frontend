/**
 * @file 举报按钮 + 弹窗（客户端组件）
 *
 * 点击弹出理由选择，提交到 POST /api/community/reports。
 * 用于帖子详情与回复的操作栏。
 *
 * 提交逻辑（POST + 401→/login + 错误归一 + submitting）已收敛至 useReport（C-19），
 * 本组件仅保留表单 UI 状态（open/reason/detail）与成功后的弹窗时序。
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, ModalShell } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useReport } from './use-report';

type TargetType = 'topic' | 'reply';

const REASONS = [
  { id: 'spam', key: 'reasons.spam' },
  { id: 'porn', key: 'reasons.porn' },
  { id: 'abuse', key: 'reasons.abuse' },
  { id: 'fakeInfo', key: 'reasons.fakeInfo' },
  { id: 'infringement', key: 'reasons.infringement' },
  { id: 'other', key: 'reasons.other' },
] as const;

interface ReportButtonProps {
  targetType: TargetType;
  targetId: string;
}

export function ReportButton({ targetType, targetId }: ReportButtonProps) {
  const t = useTranslations('report');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [done, setDone] = useState(false);
  const { submitting, error, submit } = useReport({ targetType, targetId });

  const handleSubmit = async () => {
    const ok = await submit(reason, detail, t);
    if (ok) {
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setReason('');
        setDetail('');
      }, 1200);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="flex items-center font-mono uppercase tracking-wider px-4 py-2.5 text-[12px] gap-1.5 min-h-[44px] min-w-[44px]"
        title={t('buttonTitle')}
      >
        {t('buttonLabel')}
      </Button>

      {open && (
        <ModalShell title={t('dialogTitle')} onClose={() => setOpen(false)}>
          {done ? (
            <div className="py-8 text-center meta-mono text-[var(--primary)]">
              {t('successMessage')}
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {REASONS.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-3 cursor-pointer meta-mono text-[13px] text-[var(--foreground)]"
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      checked={reason === r.id}
                      onChange={() => setReason(r.id)}
                      className="accent-[var(--primary)]"
                    />
                    {t(r.key)}
                  </label>
                ))}
              </div>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder={t('detailPlaceholder')}
                className={`${INPUT_CLASS} w-full px-3 py-2 text-[13px]`}
              />
              {error && (
                <div className="mt-3 meta-mono text-[12px] text-[var(--destructive)]">{error}</div>
              )}
              <div className="flex items-center gap-3 mt-5">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  {t('cancel')}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? t('submitting') : t('submit')}
                </Button>
              </div>
            </>
          )}
        </ModalShell>
      )}
    </>
  );
}
