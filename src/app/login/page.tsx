/**
 * @file 登录/注册页（/login）— 编辑式极简表单，单屏聚焦 + 影院级动效
 * 认证：密码登录/注册（验证码）/ GitHub OAuth / 忘记密码申请，均支持 2FA
 */
'use client';

import { StaggerContainer, RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import Link from 'next/link';
import { Button } from '@/components';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { EMAIL_REGEX } from '@/modules/auth/types/constants';
import { PASSWORD_MIN_LENGTH } from '@/shared/config';
import { Github } from 'lucide-react';

/** 密码强度等级 */
type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
};

/** 计算密码强度（label 由调用方通过翻译解析） */
function getPasswordStrength(password: string): Omit<PasswordStrength, 'label'> {
  if (!password) return { score: 0, color: 'transparent' };
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^a-zA-Z\d]/.test(password)) score++;

  const colors = [
    'var(--destructive)',
    'var(--chart-3)',
    'var(--chart-1)',
    'var(--chart-2)',
  ];
  return {
    score: score as 0 | 1 | 2 | 3 | 4,
    color: score === 0 ? 'transparent' : colors[Math.max(0, score - 1)],
  };
}

/** OAuth 错误码 → 翻译 key（在组件内解析） */
const OAUTH_ERROR_KEYS: Record<string, string> = {
  oauth_state: 'oauthStateError',
  oauth_failed: 'oauthFailed',
  oauth_unknown: 'oauthUnknown',
  disabled: 'accountDisabled',
  github_email_conflict: 'githubEmailConflict',
};

/**
 * 登录/注册页面组件
 *
 * 登录流程：邮箱+密码 → POST /api/auth/login → 跳转个人主页
 * 注册流程：邮箱+密码+确认密码 → POST /api/auth/register → 跳转个人主页
 */
// 动态渲染：用户特定页面，无需静态预生成
export const dynamic = 'force-dynamic';

/**
 * 根据 fetch 错误与 HTTP 响应推断前端错误文案
 */
async function resolveErrorMessage(res: Response | null, fallback: string, networkError: string): Promise<string> {
  if (!res) return networkError;
  try {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (data?.error) return data.error;
  } catch {
    // 忽略 JSON 解析失败
  }
  return fallback;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');
  // 密码强度标签（score 0..4 → 翻译 key）
  const STRENGTH_LABEL_KEYS: Array<Parameters<typeof t>[0] | ''> = ['', 'passwordStrengthWeak', 'passwordStrengthFair', 'passwordStrengthMedium', 'passwordStrengthStrong'];
  const strengthLabel = (score: number) => (score > 0 && STRENGTH_LABEL_KEYS[score] ? t(STRENGTH_LABEL_KEYS[score] as Parameters<typeof t>[0]) : '');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
  const [isOAuth2FA, setIsOAuth2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 是否处于 2FA 验证流程（密码登录持有 token 或 OAuth 流程持有 cookie）
  const in2FAFlow = !!twoFactorToken || isOAuth2FA;

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError && OAUTH_ERROR_KEYS[oauthError]) {
      setError(t(OAUTH_ERROR_KEYS[oauthError] as Parameters<typeof t>[0]));
    }
    // OAuth 登录但目标账号已启用 2FA — 复用密码登录的 2FA 验证 UI
    // 安全：URL 仅作标识（oauth_2fa=1），2FA 预认证 token 通过 HttpOnly cookie 传递，
    // 前端不感知 token 值，避免经 Referer / 历史 / 日志泄漏
    if (searchParams.get('oauth_2fa') === '1') {
      setIsOAuth2FA(true);
    }
  }, [searchParams]);

  // 密码强度
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  // 邮箱格式校验
  const emailValid = useMemo(() => {
    if (!email) return null;
    return EMAIL_REGEX.test(email);
  }, [email]);

  /** 发送验证码 */
  const handleSendCode = async () => {
    if (!email || !EMAIL_REGEX.test(email)) {
      setError(t('emailRequired'));
      return;
    }

    setSendingCode(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const msg = await resolveErrorMessage(res, t('sendCodeFailed'), t('networkError'));
        setError(msg);
        return;
      }

      setCodeSent(true);
      setCodeCountdown(60);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCodeCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('[Auth] 发送验证码失败:', err instanceof Error ? err.message : err);
      setError(t('sendCodeFailedRetry'));
    } finally {
      setSendingCode(false);
    }
  };

  /** 忘记密码提交 */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !EMAIL_REGEX.test(forgotEmail)) {
      setError(t('emailInvalid'));
      return;
    }

    setForgotLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      if (!res.ok) {
        const msg = await resolveErrorMessage(res, t('submitFailed'), t('networkError'));
        setError(msg);
        return;
      }

      setForgotSuccess(true);
    } catch (err) {
      console.error('[Auth] 忘记密码申请失败:', err instanceof Error ? err.message : err);
      setError(t('requestFailed'));
    } finally {
      setForgotLoading(false);
    }
  };

  /**
   * 表单提交处理 — 根据当前模式调用对应 API
   *
   * 登录流程：
   *   1. POST /api/auth/login → 如果 requires2FA=true，进入 2FA 验证
   *   2. POST /api/auth/2fa/verify（mode=login，携带 twoFactorToken + code）→ 登录成功
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 客户端校验
    if (!email || !password) {
      setError(t('emailRequired'));
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError(t('invalidEmail'));
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(t('passwordTooShort', { min: PASSWORD_MIN_LENGTH }));
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError(t('passwordMismatch'));
        return;
      }
      if (!verificationCode) {
        setError(t('codeRequired'));
        return;
      }
    }

    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const fallbackMsg = isLogin ? t('credentialsInvalid') : t('requestFailed');

    try {
      const body: Record<string, string> = { email, password };
      if (!isLogin) {
        body.verificationCode = verificationCode;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const msg = await resolveErrorMessage(res, fallbackMsg, t('networkError'));
        setError(msg);
        // 注册时邮箱已存在，自动切回登录模式
        if (!isLogin && res.status === 409) {
          setIsLogin(true);
        }
        return;
      }

      const data = (await res.json().catch(() => null)) as { requires2FA?: boolean; twoFactorToken?: string } | null;

      // 2FA 已启用 — 进入 2FA 验证流程
      if (data?.requires2FA && data?.twoFactorToken) {
        setTwoFactorToken(data.twoFactorToken);
        return;
      }

      // 成功 — 跳转个人主页
      router.push('/profile');
    } catch (err) {
      console.error('[Auth] 请求失败:', err instanceof Error ? err.message : err);
      const msg = await resolveErrorMessage(null, t('requestFailed'), t('networkError'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 2FA 验证提交 — 发送 twoFactorToken + TOTP code
   */
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setError(t('enter2FACode'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // OAuth 流程：token 在 HttpOnly cookie 中，浏览器自动携带，body 仅传 code
        // 密码登录流程：token 在 body 中传递（前端持有 twoFactorToken）
        body: JSON.stringify(
          isOAuth2FA
            ? { code: twoFactorCode, mode: 'login' }
            : { code: twoFactorCode, mode: 'login', twoFactorToken },
        ),
      });

      if (!res.ok) {
        const msg = await resolveErrorMessage(res, t('enter2FACode'), t('networkError'));
        setError(msg);
        return;
      }

      router.push('/profile');
    } catch (err) {
      console.error('[Auth] 2FA 验证失败:', err instanceof Error ? err.message : err);
      const msg = await resolveErrorMessage(null, t('requestFailed'), t('networkError'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen pt-16 flex items-center justify-center px-6 py-20">
      <div className="relative w-full max-w-md">
        {/* 顶部元数据 */}
        <StaggerContainer>
          <div className="mb-12">
            <div className="meta-mono mb-4 text-[var(--primary)]">[ Auth ]</div>
            <RevealTitle>
              <h1 className="display-serif text-[clamp(36px,8vw,64px)] text-[var(--foreground)] leading-[1.05] sm:leading-[0.95]">
                {in2FAFlow ? (
                  <>
                    {t('twoFactorTitle')}
                  </>
                ) : isLogin ? (
                  <>
                    {t('welcomeBack')}
                  </>
                ) : (
                  <>
                    {t('createAccount')}
                  </>
                )}
              </h1>
            </RevealTitle>
            <RevealItem>
              <p className="mt-4 text-[13px] text-[var(--muted-foreground)]">
                {in2FAFlow
                  ? t('twoFactorSubtitle')
                  : isLogin
                    ? t('loginSubtitle')
                    : t('registerSubtitle')}
              </p>
            </RevealItem>
          </div>
        </StaggerContainer>

        {/* 2FA 验证界面 */}
        {in2FAFlow ? (
          <form onSubmit={handle2FASubmit} className="space-y-6">
            <div>
              <label
                htmlFor="twoFactorCode"
                className="meta-mono mb-2 block text-[var(--muted-foreground)]"
              >
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
                className="w-full px-4 py-3 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[14px] font-mono tracking-[0.5em] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors text-center"
                placeholder={t('codePlaceholder')}
              />
            </div>

            {error && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] text-[var(--destructive)] font-mono leading-relaxed">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full py-4"
            >
              {loading ? t('verifying') : t('verify')}
            </Button>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setTwoFactorToken(null);
                  setTwoFactorCode('');
                  setError(null);
                }}
                className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow"
              >
                {t('backToLogin')}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* 表单 — 直角、发丝线边框 */}
            <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="meta-mono mb-2 block text-[var(--muted-foreground)]"
            >
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
                className={`flex-1 px-4 py-3 bg-transparent border text-[var(--foreground)] text-[14px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors ${
                  emailValid === false
                    ? 'border-[var(--destructive)]'
                    : 'border-[var(--border)]'
                }`}
                placeholder={t('emailPlaceholder')}
              />
              {/* 发送验证码按钮 — 仅注册模式 */}
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
              <div className="mt-1 text-[11px] font-mono text-[var(--destructive)]">
                {t('invalidEmail')}
              </div>
            )}
            {codeSent && !isLogin && (
              <div className="mt-1 text-[11px] font-mono text-[var(--primary)]">
                {t('codeSent')}
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="meta-mono mb-2 block text-[var(--muted-foreground)]"
            >
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
                className="w-full px-4 py-3 pr-16 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[14px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors"
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
            {/* 密码强度指示器 — 仅注册模式显示 */}
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
                  style={{ color: passwordStrength.color === 'transparent' ? 'var(--muted-foreground)' : passwordStrength.color }}
                >
                  {strengthLabel(passwordStrength.score)}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password (Register only) */}
          {!isLogin && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="meta-mono mb-2 block text-[var(--muted-foreground)]"
              >
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
                  className={`w-full px-4 py-3 pr-16 bg-transparent border text-[var(--foreground)] text-[14px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-[var(--destructive)]'
                      : 'border-[var(--border)]'
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
                <div className="mt-1 text-[11px] font-mono text-[var(--destructive)]">
                  {t('passwordMismatch')}
                </div>
              )}
            </div>
          )}

          {/* Verification Code (Register only) */}
          {!isLogin && (
            <div>
              <label
                htmlFor="verificationCode"
                className="meta-mono mb-2 block text-[var(--muted-foreground)]"
              >
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
                className="w-full px-4 py-3 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[14px] font-mono tracking-[0.5em] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors text-center"
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

          {/* Submit button — 直角琥珀实色 + spinner */}
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            className="w-full py-4"
          >
            {loading
              ? t('processing')
              : isLogin
                ? t('signIn')
                : t('createAccountBtn')}
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
            className="flex items-center justify-center gap-3 w-full py-4 border border-[var(--border)] bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-[13px] font-mono hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Github className="w-5 h-5" />
            {t('githubLogin')}
          </Link>
        </form>

        {/* Toggle login/register */}
        <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between">
          <span className="meta-mono text-[var(--muted-foreground)]">
            {isLogin ? t('noAccount') : t('haveAccount')}
          </span>
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setCodeSent(false);
              setCodeCountdown(0);
              setVerificationCode('');
            }}
            className="meta-mono text-[var(--primary)] underline-grow"
          >
            {isLogin ? t('register') : t('signIn')}
          </button>
        </div>

        {/* Forgot Password — 仅登录模式 */}
        {isLogin && !showForgotPassword && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setError(null);
              }}
              className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow"
            >
              {t('forgotPassword')}
            </button>
          </div>
        )}

        {/* 忘记密码表单 */}
        {showForgotPassword && (
          <div className="mt-6 p-6 border border-[var(--border)] bg-[var(--card)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="meta-mono text-[var(--primary)]">{t('resetRequest')}</span>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotSuccess(false);
                  setForgotEmail('');
                  setError(null);
                }}
                className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                ✕
              </button>
            </div>

            {forgotSuccess ? (
              <div className="space-y-3">
                <p className="text-[13px] text-[var(--foreground)] leading-relaxed">
                  {t('forgotSuccessTitle')}
                </p>
                <p className="text-[11px] font-mono text-[var(--muted-foreground)] leading-relaxed">
                  {t('forgotSuccessDesc')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotSuccess(false);
                    setForgotEmail('');
                  }}
                  className="meta-mono text-[var(--primary)] underline-grow"
                >
                  {t('backToLogin')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-[12px] text-[var(--muted-foreground)] leading-relaxed">
                  {t('forgotDesc')}
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[14px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors"
                  placeholder={t('emailPlaceholder')}
                />
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full"
                >
                  {forgotLoading ? t('processing') : t('submitRequest')}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
          >
            {t('backToHome')}
          </Link>
        </div>
      </>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
