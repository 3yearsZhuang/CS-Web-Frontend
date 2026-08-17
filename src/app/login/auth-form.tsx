'use client';

/**
 * @file AuthForm — 登录/注册主表单（登录/注册页子组件）
 *
 * 从 `app/login/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `AuthFormState` 提供（GENERAL 2.2）。
 */

import Link from 'next/link';
import { Button } from '@/components';
import { Github } from 'lucide-react';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import type { AuthFormState } from '@/modules/auth/ui/hooks/use-auth-form';

export function AuthForm(props: AuthFormState) {
  const {
    t,
    isLogin,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    verificationCode,
    setVerificationCode,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    emailValid,
    passwordStrength,
    strengthLabel,
    codeSent,
    sendingCode,
    codeCountdown,
    handleSendCode,
    error,
    loading,
    handleSubmit,
    toggleMode,
    openForgotPassword,
    showForgotPassword,
  } = props;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label htmlFor="email" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
            [ 01 ] {t('emailLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={`${INPUT_CLASS} flex-1 px-4 py-3 text-[14px] ${
                emailValid === false ? 'border-[var(--destructive)]' : ''
              }`}
              placeholder={t('emailPlaceholder')}
            />
            {!isLogin && (
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sendingCode || codeCountdown > 0 || !emailValid}
                className="px-4 py-3 whitespace-nowrap border border-[var(--border)] text-[12px] font-mono text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/[0.08] transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-amber"
              >
                {sendingCode ? '...' : codeCountdown > 0 ? `${codeCountdown}s` : t('sendCode')}
              </button>
            )}
          </div>
          {emailValid === false && (
            <div className="mt-1 text-[11px] font-mono text-[var(--destructive)]">{t('invalidEmail')}</div>
          )}
          {codeSent && !isLogin && (
            <div className="mt-1 text-[11px] font-mono text-[var(--primary)]">{t('codeSent')}</div>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
            [ 02 ] {t('passwordLabel')}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              className={`${INPUT_CLASS} w-full px-4 py-3 pr-16 text-[14px]`}
              placeholder={t('passwordPlaceholder')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
            >
              {showPassword ? t('hide') : t('show')}
            </button>
          </div>
          {!isLogin && password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-[2px] bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${(passwordStrength.score / 4) * 100}%`,
                    backgroundColor: passwordStrength.color,
                  }}
                />
              </div>
              <span
                className="meta-mono"
                style={{
                  color:
                    passwordStrength.color === 'transparent' ? 'var(--muted-foreground)' : passwordStrength.color,
                }}
              >
                {strengthLabel(passwordStrength.score)}
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password (Register only) */}
        {!isLogin && (
          <div>
            <label htmlFor="confirmPassword" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
              [ 03 ] {t('confirmLabel')}
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className={`${INPUT_CLASS} w-full px-4 py-3 pr-16 text-[14px] ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-[var(--destructive)]'
                    : ''
                }`}
                placeholder={t('confirmPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
              >
                {showConfirmPassword ? t('hide') : t('show')}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <div className="mt-1 text-[11px] font-mono text-[var(--destructive)]">{t('passwordMismatch')}</div>
            )}
          </div>
        )}

        {/* Verification Code (Register only) */}
        {!isLogin && (
          <div>
            <label htmlFor="verificationCode" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
              [ 04 ] {t('verifyCodeLabel')}
            </label>
            <input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              inputMode="numeric"
              maxLength={6}
              className={`${INPUT_CLASS} w-full px-4 py-3 text-[14px] tracking-[0.5em] text-center`}
              placeholder={t('codePlaceholder')}
            />
          </div>
        )}

        {/* Error message — 红色横幅 */}
        {error && (
          <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] text-[var(--destructive)] font-mono leading-relaxed">
            {error}
          </div>
        )}

        {/* Submit button */}
        <Button type="submit" disabled={loading} loading={loading} className="w-full py-4">
          {loading ? t('processing') : isLogin ? t('signIn') : t('createAccountBtn')}
        </Button>

        {/* OR 分隔线 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="meta-mono text-[var(--muted-foreground)] text-[12px]">{t('or')}</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        {/* GitHub 登录按钮 */}
        <Link
          href="/api/auth/oauth/github"
          prefetch={false}
          className="flex items-center justify-center gap-3 w-full py-4 border border-[var(--border)] bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-[13px] font-mono hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        >
          <Github className="w-5 h-5" />
          {t('githubLogin')}
        </Link>
      </form>

      {/* Toggle login/register */}
      <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between">
        <span className="meta-mono text-[var(--muted-foreground)]">{isLogin ? t('noAccount') : t('haveAccount')}</span>
        <button type="button" onClick={toggleMode} className="meta-mono text-[var(--primary)] underline-grow">
          {isLogin ? t('register') : t('signIn')}
        </button>
      </div>

      {/* Forgot Password — 仅登录模式 */}
      {isLogin && !showForgotPassword && (
        <div className="mt-4 text-center">
          <button type="button" onClick={openForgotPassword} className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow">
            {t('forgotPassword')}
          </button>
        </div>
      )}
    </>
  );
}
