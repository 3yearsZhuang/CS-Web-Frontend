'use client';

/**
 * @file TwoFactorForm — 2FA 验证码输入界面（登录/注册页子组件）
 *
 * 从 `app/login/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `AuthFormState` 提供（GENERAL 2.2）。
 */

import { Button } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import type { AuthFormState } from '@/modules/auth/ui/hooks/use-auth-form';

export function TwoFactorForm(props: AuthFormState) {
  const { t, twoFactorCode, setTwoFactorCode, error, loading, handle2FASubmit, resetTwoFactor } = props;

  return (
    <form onSubmit={handle2FASubmit} className="space-y-6">
      <div>
        <label htmlFor="twoFactorCode" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
          [ 01 ] {t('verifyCodeLabel')}
        </label>
        <input
          id="twoFactorCode"
          type="text"
          value={twoFactorCode}
          onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          inputMode="numeric"
          maxLength={6}
          autoFocus
          className={`${INPUT_CLASS} w-full px-4 py-3 text-[14px] tracking-[0.5em] text-center`}
          placeholder={t('codePlaceholder')}
        />
      </div>

      {error && (
        <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] text-[var(--destructive)] font-mono leading-relaxed">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} loading={loading} className="w-full py-4">
        {loading ? t('verifying') : t('verify')}
      </Button>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={resetTwoFactor}
          className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow"
        >
          {t('backToLogin')}
        </button>
      </div>
    </form>
  );
}
