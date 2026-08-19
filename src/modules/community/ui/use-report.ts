'use client';

/**
 * @file useReport — 举报提交 数据逻辑 hook（C-19 收敛样板，对齐 useFollow）
 *
 * 从 report-button.tsx 抽出 POST /api/community/reports 的提交逻辑（含 401→/login 跳转、
 * 错误归一、submitting 态）。底层 fetch 已收敛至共享原语 `apiRequest`（C-19 收尾）。
 *
 * - submit(reason, detail, t) 返回 Promise<boolean>：成功 true、401 跳转或失败 false
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/shared/hooks/use-api-request';

interface UseReportParams {
  targetType: 'topic' | 'reply';
  targetId: string;
}

interface UseReportResult {
  submitting: boolean;
  error: string | null;
  submit: (
    reason: string,
    detail: string,
    t: (key: string) => string,
  ) => Promise<boolean>;
}

export function useReport({ targetType, targetId }: UseReportParams): UseReportResult {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (reason: string, detail: string, t: (key: string) => string): Promise<boolean> => {
      if (!reason) {
        setError(t('errorSelectReason'));
        return false;
      }
      setSubmitting(true);
      setError(null);
      const targetApiType = targetType === 'reply' ? 'comment' : 'topic';
      const result = await apiRequest<{ error?: string }>('/api/community/reports', {
        method: 'POST',
        body: { targetType: targetApiType, targetId, reason, detail: detail || null },
      });
      if (result.status === 401) {
        router.push('/login');
        return false;
      }
      if (!result.ok) {
        setError(result.error || t('errorSubmitFailed'));
        return false;
      }
      setSubmitting(false);
      return true;
    },
    [targetType, targetId, router],
  );

  return { submitting, error, submit };
}
