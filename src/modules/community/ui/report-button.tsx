/**
 * @file 举报按钮 + 弹窗（客户端组件）
 *
 * 点击弹出理由选择，提交到 POST /api/community/reports。
 * 用于帖子详情与回复的操作栏。
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components';

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetApiType = targetType === 'reply' ? 'comment' : 'topic';

  const handleSubmit = async () => {
    if (!reason) {
      setError(t('errorSelectReason'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: targetApiType, targetId, reason, detail: detail || null }),
      });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || t('errorSubmitFailed'));
      }
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setReason('');
        setDetail('');
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorSubmitFailed'));
    } finally {
      setSubmitting(false);
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md border border-[var(--border)] bg-[var(--background)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">{t('dialogTitle')}</div>
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
                  className="w-full px-3 py-2 bg-transparent border border-[var(--border)] text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
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
          </div>
        </div>
      )}
    </>
  );
}
