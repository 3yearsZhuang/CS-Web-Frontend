/**
 * @file 登录/注册页（/login）— 装配层
 *
 * 遵循 GENERAL 2.2「展示/容器分离」、2.4「组件 > 500 行拆分」：
 * 本文件仅负责 Hero、2FA/主表单/忘记密码子组件的编排；
 * 全部状态与提交逻辑下放到 `useAuthForm` Hook（src/modules/auth/ui/hooks）。
 */

'use client';

import { StaggerContainer, RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { GhostTitle, Title } from '@/components';
import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/shared/hooks/use-auth';
import { useAuthForm } from '@/modules/auth/ui/hooks/use-auth-form';
import { DEMO_COOKIE, DEMO_COOKIE_MAX_AGE } from '@/shared/constants/demo';
import { AuthForm } from './auth-form';
import { TwoFactorForm } from './two-factor-form';
import { ForgotPasswordForm } from './forgot-password-form';

// 动态渲染：用户特定页面，无需静态预生成
export const dynamic = 'force-dynamic';

function LoginContent() {
  const auth = useAuthForm();
  const { t, in2FAFlow, isLogin } = auth;
  const router = useRouter();
  const searchParams = useSearchParams();
  // 登录态守卫：已登录用户访问 /login 应被拒绝，除非走「切换账号」流程（先 logout 再带 ?switch=1 进入）。
  const { user } = useAuth();

  const switching = searchParams.get('switch') === '1';

  /** 进入演示模式：写 cookie 后跳首页（服务端 route 据此走内置 mock 数据） */
  function enterDemo() {
    document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=${DEMO_COOKIE_MAX_AGE}; SameSite=Lax`;
    router.push('/');
  }

  useEffect(() => {
    if (switching) return;
    if (user !== null) {
      router.replace('/');
    }
  }, [switching, user, router]);

  const heading = in2FAFlow ? t('twoFactorTitle') : isLogin ? t('welcomeBack') : t('createAccount');
  const subtitle = in2FAFlow ? t('twoFactorSubtitle') : isLogin ? t('loginSubtitle') : t('registerSubtitle');

  // 已登录（非切换模式）：直接拒绝访问登录页，不渲染表单，由上方 effect 跳回首页。
  if (!switching && user !== null) {
    return null;
  }

  return (
    <main className="relative min-h-screen pt-16 flex items-center justify-center px-6 py-20 pixel-page">
      <div className="relative w-full max-w-md">
        {/* 顶部元数据 */}
        <StaggerContainer>
          <div className="mb-12">
            <div className="meta-mono mb-4 text-[var(--primary)]">[ Auth ]</div>
            <RevealTitle>
              <Title
                level={1}
                className="text-[clamp(36px,8vw,64px)] leading-[1.05] sm:leading-[0.95]"
                echo={heading}
              >
                {heading}
              </Title>
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

            {/* 演示模式入口：后端未连接时也可浏览界面（内置示例数据） */}
            {isLogin && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={enterDemo}
                  className="meta-mono text-[var(--primary)] hover:text-[var(--foreground)] underline-grow"
                >
                  进入演示模式 →
                </button>
              </div>
            )}
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
