/**
 * @file 共享 Loading / Error fallback 组件
 *
 * 所有路由级 loading.tsx 和 error.tsx 均通过 re-export 引用此组件，
 * 确保 fallback UI 全站一致，修改一处即可全局生效。
 */

'use client';

import { useEffect } from 'react';
import { captureErrorSync } from '@/shared/utils/monitoring';
import { Button } from '@/components/primitives/button';
import { Loading } from '@/components/primitives/loading';
import { t } from '@/i18n';

/**
 * 路由级加载骨架屏
 *
 * 用于所有 loading.tsx 的 re-export
 */
export function LoadingFallback() {
  return <Loading />;
}

/**
 * 嵌套路由错误边界
 *
 * 用于所有嵌套 error.tsx 的 re-export
 */
export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureErrorSync(error, { level: 'error', extra: { digest: error.digest, stack: error.stack, msg: error.message } });
  }, [error]);

  return (
    <main className="min-h-[50vh] flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="meta-mono text-[var(--muted-foreground)] text-[11px]">[ ERROR ]</div>
        <h1 className="display-serif text-[clamp(24px,5vw,40px)] text-[var(--foreground)]">
          {t('fallback.errorTitle')}
        </h1>
        <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
          {t('fallback.errorDesc')}
        </p>
        <p className="meta-mono text-[10px] text-red-500 break-all">{error.message}</p>
        {error.digest && (
          <p className="meta-mono text-[10px] text-[var(--muted-foreground)]">
            {t('fallback.errorId')}: {error.digest}
          </p>
        )}
        <Button onClick={reset}>
          {t('common.retry')}
        </Button>
      </div>
    </main>
  );
}

/**
 * 全局错误边界
 *
 * 用于根 error.tsx 的 re-export
 */
export function GlobalErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureErrorSync(error, {
      level: 'error',
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="meta-mono text-[var(--muted-foreground)] text-[11px]">[ ERROR ]</div>
        <h1 className="display-serif text-[clamp(28px,5vw,48px)] text-[var(--foreground)]">
          {t('fallback.globalErrorTitle')}
        </h1>
        <p className="text-[14px] text-[var(--muted-foreground)] leading-relaxed">
          {t('fallback.globalErrorDesc')}
        </p>
        {error.digest && (
          <p className="meta-mono text-[10px] text-[var(--muted-foreground)]">
            {t('fallback.errorId')}: {error.digest}
          </p>
        )}
        <Button onClick={reset}>
          {t('common.retry')}
        </Button>
      </div>
    </main>
  );
}