/**
 * @file 登录/注册页（/login）— 装配层
 *
 * 遵循 GENERAL 2.2「展示/容器分离」、2.4「组件 > 500 行拆分」：
 * 本文件仅负责 Hero、2FA/主表单/忘记密码子组件的编排；
 * 全部状态与提交逻辑下放到 `useAuthForm` Hook（src/modules/auth/ui/hooks）。
 */

'use client';

import { StaggerContainer, RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import Link from 'next/link';
import { Suspense } from 'react';
import { useAuthForm } from '@/modules/auth/ui/hooks/use-auth-form';
import { AuthForm } from './auth-form';
import { TwoFactorForm } from './two-factor-form';
import { ForgotPasswordForm } from './forgot-password-form';

// 动态渲染：用户特定页面，无需静态预生成
export const dynamic = 'force-dynamic';

function LoginContent() {
  const auth = useAuthForm();
  const { t, in2FAFlow, isLogin } = auth;

  const heading = in2FAFlow ? t('twoFactorTitle') : isLogin ? t('welcomeBack') : t('createAccount');
  const subtitle = in2FAFlow ? t('twoFactorSubtitle') : isLogin ? t('loginSubtitle') : t('registerSubtitle');

  return (
    <main className="relative min-h-screen pt-16 flex items-center justify-center px-6 py-20">
      <div className="relative w-full max-w-md">
        {/* 顶部元数据 */}
        <StaggerContainer>
          <div className="mb-12">
            <div className="meta-mono mb-4 text-[var(--primary)]">[ Auth ]</div>
            <RevealTitle>
              <h1 className="display-serif text-[clamp(36px,8vw,64px)] text-[var(--foreground)] leading-[1.05] sm:leading-[0.95]">
                {heading}
              </h1>
            </RevealTitle>
            <RevealItem>
              <p className="mt-4 text-[13px] text-[var(--muted-foreground)]">{subtitle}</p>
            </RevealItem>
          </div>
        </StaggerContainer>

        {in2FAFlow ? (
          <TwoFactorForm {...auth} />
        ) : (
          <>
            <AuthForm {...auth} />
            <ForgotPasswordForm {...auth} />

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
