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
import { EMAIL_REGEX } from '@/modules/auth/types/constants';
import { PASSWORD_MIN_LENGTH } from '@/shared/config';
import { Github } from 'lucide-react';

/** 密码强度等级 */
type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
};

/** 计算密码强度 */
function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', color: 'transparent' };
  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^a-zA-Z\d]/.test(password)) score++;

  const levels = [
    { label: '弱', color: 'var(--destructive)' },
    { label: '一般', color: 'var(--chart-3)' },
    { label: '中等', color: 'var(--chart-1)' },
    { label: '强', color: 'var(--chart-2)' },
  ];
  const level = levels[Math.max(0, score - 1)];
  return {
    score: score as 0 | 1 | 2 | 3 | 4,
    label: score === 0 ? '' : level.label,
    color: score === 0 ? 'transparent' : level.color,
  };
}

/** OAuth 错误消息映射 */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_state: '授权状态验证失败，请重试',
  oauth_failed: 'GitHub 登录失败，请稍后重试',
  oauth_unknown: '登录失败，请稍后重试',
  disabled: '该账号已被禁用，请联系管理员',
  github_email_conflict: '该邮箱已注册，请用密码登录后在个人设置中绑定 GitHub',
};

/**
 * 根据 fetch 错误与 HTTP 响应推断前端错误文案
 */
async function resolveErrorMessage(res: Response | null, fallback: string): Promise<string> {
  if (!res) {
    // 网络错误
    return '网络错误，请检查网络后重试';
  }
  try {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (data?.error) return data.error;
  } catch {
    // 忽略 JSON 解析失败
  }
  return fallback;
}

/**
 * 登录/注册页面组件
 *
 * 登录流程：邮箱+密码 → POST /api/auth/login → 跳转个人主页
 * 注册流程：邮箱+密码+确认密码 → POST /api/auth/register → 跳转个人主页
 */
// 动态渲染：用户特定页面，无需静态预生成
export const dynamic = 'force-dynamic';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    if (oauthError && OAUTH_ERROR_MESSAGES[oauthError]) {
      setError(OAUTH_ERROR_MESSAGES[oauthError]);
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
      setError('请先填写正确的邮箱地址');
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
        const msg = await resolveErrorMessage(res, '验证码发送失败');
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
      setError('验证码发送失败，请稍后再试');
    } finally {
      setSendingCode(false);
    }
  };

  /** 忘记密码提交 */
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !EMAIL_REGEX.test(forgotEmail)) {
      setError('请填写正确的邮箱地址');
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
        const msg = await resolveErrorMessage(res, '申请提交失败');
        setError(msg);
        return;
      }

      setForgotSuccess(true);
    } catch (err) {
      console.error('[Auth] 忘记密码申请失败:', err instanceof Error ? err.message : err);
      setError('申请提交失败，请稍后再试');
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
      setError('请填写邮箱与密码');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError('邮箱格式不正确');
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`密码长度至少为 ${PASSWORD_MIN_LENGTH} 位`);
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      if (!verificationCode) {
        setError('请输入验证码');
        return;
      }
    }

    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const fallbackMsg = isLogin ? '邮箱或密码错误' : '请求失败，请稍后再试';

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
        const msg = await resolveErrorMessage(res, fallbackMsg);
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
      const msg = await resolveErrorMessage(null, '请求失败，请稍后再试');
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
      setError('请输入 6 位验证码');
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
        const msg = await resolveErrorMessage(res, '验证码错误');
        setError(msg);
        return;
      }

      router.push('/profile');
    } catch (err) {
      console.error('[Auth] 2FA 验证失败:', err instanceof Error ? err.message : err);
      const msg = await resolveErrorMessage(null, '请求失败，请稍后再试');
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
                    两步
                    <span className="text-[var(--primary)]"> 验证</span>
                  </>
                ) : isLogin ? (
                  <>
                    欢迎
                    <span className="text-[var(--primary)]"> 回来</span>
                    。
                  </>
                ) : (
                  <>
                    创建
                    <br />
                    <span className="text-[var(--primary)]">新账号</span>
                    。
                  </>
                )}
              </h1>
            </RevealTitle>
            <RevealItem>
              <p className="mt-4 text-[13px] text-[var(--muted-foreground)]">
                {in2FAFlow
                  ? '请输入身份验证器中的 6 位验证码'
                  : isLogin
                    ? '登录你的账号继续探索'
                    : '只需邮箱与密码，30 秒完成注册'}
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
                [ 01 ] Verify Code
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
                placeholder="000000"
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
              {loading ? 'Verifying...' : 'Verify →'}
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
                ← Back to Login
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
              [ 01 ] Email
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
                placeholder="your@email.com"
              />
              {/* 发送验证码按钮 — 仅注册模式 */}
              {!isLogin && (
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || codeCountdown > 0 || !emailValid}
                  className="px-4 py-3 whitespace-nowrap border border-[var(--border)] text-[12px] font-mono text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/[0.08] transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-amber"
                >
                  {sendingCode ? '...' : codeCountdown > 0 ? `${codeCountdown}s` : 'Send Code'}
                </button>
              )}
            </div>
            {emailValid === false && (
              <div className="mt-1 text-[11px] font-mono text-[var(--destructive)]">
                邮箱格式不正确
              </div>
            )}
            {codeSent && !isLogin && (
              <div className="mt-1 text-[11px] font-mono text-[var(--primary)]">
                验证码已发送至该邮箱（开发环境请查看服务器控制台）
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="meta-mono mb-2 block text-[var(--muted-foreground)]"
            >
              [ 02 ] Password
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
                placeholder="至少 8 位，含大小写+数字+符号"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
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
                  {passwordStrength.label}
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
                [ 03 ] Confirm
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
                  placeholder="再次输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                >
                  {showConfirmPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <div className="mt-1 text-[11px] font-mono text-[var(--destructive)]">
                  两次密码不一致
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
                [ 04 ] Verify Code
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
                placeholder="000000"
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
              ? 'Processing...'
              : isLogin
                ? 'Sign In →'
                : 'Create Account →'}
          </Button>

          {/* OR 分隔线 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="meta-mono text-[var(--muted-foreground)] text-[12px]">— OR —</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* GitHub 登录按钮 */}
          <Link
            href="/api/auth/oauth/github"
            className="flex items-center justify-center gap-3 w-full py-4 border border-[var(--border)] bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-[13px] font-mono hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Github className="w-5 h-5" />
            使用 GitHub 登录
          </Link>
        </form>

        {/* Toggle login/register */}
        <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between">
          <span className="meta-mono text-[var(--muted-foreground)]">
            {isLogin ? 'No account?' : 'Have account?'}
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
            {isLogin ? 'Register →' : 'Sign In →'}
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
              Forgot Password?
            </button>
          </div>
        )}

        {/* 忘记密码表单 */}
        {showForgotPassword && (
          <div className="mt-6 p-6 border border-[var(--border)] bg-[var(--card)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="meta-mono text-[var(--primary)]">[ Reset Request ]</span>
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
                  您的密码重置申请已提交，请等待管理员审批。
                </p>
                <p className="text-[11px] font-mono text-[var(--muted-foreground)] leading-relaxed">
                  管理员批准后，您的密码将被重置为默认密码，届时可使用默认密码登录后修改。
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
                  ← Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-[12px] text-[var(--muted-foreground)] leading-relaxed">
                  输入您的注册邮箱，提交密码重置申请。管理员审批后，密码将重置为默认密码。
                </p>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[14px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors"
                  placeholder="your@email.com"
                />
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full"
                >
                  {forgotLoading ? 'Submitting...' : 'Submit Request →'}
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
            ← Back to Home
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
