'use client';

/**
 * @file ForgotPasswordForm — 忘记密码申请面板（登录/注册页子组件）
 *
 * 从 `app/login/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `AuthFormState` 提供（GENERAL 2.2）。
 */

import { Button } from '@/components';
import type { AuthFormState } from '@/modules/auth/ui/hooks/use-auth-form';

export function ForgotPasswordForm(props: AuthFormState) {
  const {
    t,
    showForgotPassword,
    forgotEmail,
    setForgotEmail,
    forgotLoading,
    forgotSuccess,
    handleForgotPassword,
    closeForgotPassword,
  } = props;

  if (!showForgotPassword) return null;

  return (
    <div className="mt-6 p-6 border border-[var(--border)] bg-[var(--card)] space-y-4">
      <div className="flex items-center justify-between">
        <span className="meta-mono text-[var(--primary)]">{t('resetRequest')}</span>
        <button
          type="button"
          onClick={closeForgotPassword}
          className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          ✕
        </button>
      </div>

      {forgotSuccess ? (
        <div className="space-y-3">
          <p className="text-[13px] text-[var(--foreground)] leading-relaxed">{t('forgotSuccessTitle')}</p>
          <p className="text-[11px] font-mono text-[var(--muted-foreground)] leading-relaxed">{t('forgotSuccessDesc')}</p>
          <button
            type="button"
            onClick={closeForgotPassword}
            className="meta-mono text-[var(--primary)] underline-grow"
          >
            {t('backToLogin')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <p className="text-[12px] text-[var(--muted-foreground)] leading-relaxed">{t('forgotDesc')}</p>
          <input
            type="email"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[14px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors"
            placeholder={t('emailPlaceholder')}
          />
          <Button type="submit" disabled={forgotLoading} className="w-full">
            {forgotLoading ? t('processing') : t('submitRequest')}
          </Button>
        </form>
      )}
    </div>
  );
}
