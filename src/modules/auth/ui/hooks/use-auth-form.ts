'use client';

/**
 * @file useAuthForm — 登录/注册页共享状态与逻辑 Hook
 *
 * 从 `app/login/page.tsx` 拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook / 组件 > 500 行拆分」。
 * 涵盖：登录/注册提交、验证码发送与倒计时、忘记密码、2FA 验证、密码强度、OAuth 错误解析。
 * 各渲染子组件复用本 Hook 的返回值（GENERAL 2.2 注入式）。
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSWRConfig } from 'swr';
import { EMAIL_REGEX } from '@/modules/auth/types/constants';
import { PASSWORD_MIN_LENGTH } from '@/shared/config';
import { logger } from '@/shared/logger';

/** OAuth 错误码 → 翻译 key */
export const OAUTH_ERROR_KEYS: Record<string, string> = {
  oauth_state: 'oauthStateError',
  oauth_failed: 'oauthFailed',
  oauth_unknown: 'oauthUnknown',
  disabled: 'accountDisabled',
  github_email_conflict: 'githubEmailConflict',
};

/** 密码强度标签（score 0..4 → 翻译 key） */
const STRENGTH_LABEL_KEYS: Array<string | ''> = [
  '',
  'passwordStrengthWeak',
  'passwordStrengthFair',
  'passwordStrengthMedium',
  'passwordStrengthStrong',
];

/** 计算密码强度（颜色取自设计令牌，避免硬编码） */
export function getPasswordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; color: string } {
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

/**
 * 根据 fetch 错误与 HTTP 响应推断前端错误文案
 */
async function resolveErrorMessage(
  res: Response | null,
  fallback: string,
  networkError: string,
): Promise<string> {
  if (!res) return networkError;
  try {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (data?.error) return data.error;
  } catch {
    // 忽略 JSON 解析失败
  }
  return fallback;
}

export function useAuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');
  const { mutate } = useSWRConfig();

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

  // 解析 URL 上的 OAuth 错误 / 2FA 标识
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError && OAUTH_ERROR_KEYS[oauthError]) {
      setError(t(OAUTH_ERROR_KEYS[oauthError] as Parameters<typeof t>[0]));
    }
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

  const strengthLabel = (score: number) =>
    score > 0 && STRENGTH_LABEL_KEYS[score] ? t(STRENGTH_LABEL_KEYS[score] as Parameters<typeof t>[0]) : '';

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
      logger.error({ err: err instanceof Error ? err.message : err }, '[Auth] 发送验证码失败');
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
      logger.error({ err: err instanceof Error ? err.message : err }, '[Auth] 忘记密码申请失败');
      setError(t('requestFailed'));
    } finally {
      setForgotLoading(false);
    }
  };

  /** 登录/注册表单提交 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
        if (!isLogin && res.status === 409) {
          setIsLogin(true);
        }
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        requires2FA?: boolean;
        twoFactorToken?: string;
      } | null;

      if (data?.requires2FA && data?.twoFactorToken) {
        setTwoFactorToken(data.twoFactorToken);
        return;
      }

      // 登录成功：Cookie 已回写，主动刷新全局登录态缓存，避免 navbar/页面短暂显示未登录
      await mutate('/api/auth/me');
      router.push('/profile');
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : err }, '[Auth] 请求失败');
      const msg = await resolveErrorMessage(null, t('requestFailed'), t('networkError'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /** 2FA 验证提交 */
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

      // 2FA 登录成功：Cookie 已回写，主动刷新全局登录态缓存
      await mutate('/api/auth/me');
      router.push('/profile');
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : err }, '[Auth] 2FA 验证失败');
      const msg = await resolveErrorMessage(null, t('requestFailed'), t('networkError'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /** 切回登录模式（退出 2FA / 切换表单） */
  const resetTwoFactor = () => {
    setTwoFactorToken(null);
    setTwoFactorCode('');
    setError(null);
  };

  /** 切换登录/注册并重置相关状态 */
  const toggleMode = () => {
    setIsLogin((v) => !v);
    setError(null);
    setCodeSent(false);
    setCodeCountdown(0);
    setVerificationCode('');
  };

  /** 打开/关闭忘记密码面板 */
  const openForgotPassword = () => {
    setShowForgotPassword(true);
    setError(null);
  };
  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotSuccess(false);
    setForgotEmail('');
    setError(null);
  };

  return {
    // 翻译
    t,
    // 模式
    isLogin,
    setIsLogin,
    in2FAFlow,
    // 字段
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
    // 校验/强度
    emailValid,
    passwordStrength,
    strengthLabel,
    // 验证码
    codeSent,
    sendingCode,
    codeCountdown,
    handleSendCode,
    // 提交/错误
    loading,
    error,
    setError,
    handleSubmit,
    // 忘记密码
    showForgotPassword,
    forgotEmail,
    setForgotEmail,
    forgotLoading,
    forgotSuccess,
    handleForgotPassword,
    openForgotPassword,
    closeForgotPassword,
    // 2FA
    twoFactorCode,
    setTwoFactorCode,
    isOAuth2FA,
    handle2FASubmit,
    resetTwoFactor,
    // 工具
    toggleMode,
  };
}

export type AuthFormState = ReturnType<typeof useAuthForm>;
