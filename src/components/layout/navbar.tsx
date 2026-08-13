'use client';

/**
 * @file 全局导航 — 左侧 logo + 导航链接，右侧主题切换/通知/用户菜单
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { useAuth } from '@/shared/hooks/use-auth';
import { useFeatureVisibility, deriveUserClass, DEFAULT_VISIBILITY } from '@/shared/hooks/use-feature-visibility';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';
import { useFocusTrap } from '@/shared/hooks/use-focus-trap';
import type { NavMessageKey } from '@/i18n/types';

const NAV_LINKS: Array<{ href: string; key: NavMessageKey; requireAuth?: boolean }> = [
  { href: '/about', key: 'about' },
  { href: '/events', key: 'events' },
  { href: '/tools', key: 'tools', requireAuth: true },
];

/** 全站导航栏 — 含公告横幅、用户菜单、通知铃、主题切换 */
export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoggedIn, user } = useAuth();
  const { rules } = useFeatureVisibility();
  const userClass = deriveUserClass(isLoggedIn, user?.role);
  const t = useTranslations('nav');
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const mobileDrawerRef = useFocusTrap<HTMLDivElement>({
    active: mobileOpen,
    triggerRef: hamburgerRef,
    onClose: () => setMobileOpen(false),
    lockScroll: true,
  });

  // Hydration 守卫：可见性规则 / 登录态来自异步源（SWR + useAuth），SSR 与客户端
  // 首帧必须渲染一致的结构，否则导航链接列表会因 /tools 等受控项出现 hydration
  // mismatch。mounted 前统一用确定性基线（DEFAULT_VISIBILITY + guest 视角），
  // 客户端 hydrate 完成后再切换为真实 rules / 用户类别。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const effectiveRules = mounted ? rules : DEFAULT_VISIBILITY;
  const effectiveUserClass: UserClass = mounted ? userClass : 'guest';
  const effectiveLoggedIn = mounted ? isLoggedIn : false;

  const visibleLinks = NAV_LINKS.filter((link) => {
    const moduleKey = link.href.slice(1);
    const rule = effectiveRules[moduleKey] ?? DEFAULT_VISIBILITY[moduleKey];
    // 配置缺失或未知模块：回退原 requireAuth 行为（fail-open，保证可用性）
    if (!rule) return !link.requireAuth || effectiveLoggedIn;
    return rule[effectiveUserClass];
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/logo.png"
              alt={t('logoAlt')}
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              priority
            />
            <span className="display-serif text-[20px] text-[var(--foreground)] tracking-tight">
              CS
              <span className="text-[var(--primary)]"> Association</span>
            </span>
            <span className="meta-mono hidden lg:inline text-[var(--muted-foreground)]">
              / {t('brand')}
            </span>
          </Link>

          {/* 桌面端右侧 */}
          <div className="hidden md:flex items-center gap-1">
            <nav className="flex items-center gap-1">
              {visibleLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== '/' && pathname.startsWith(`${link.href}/`));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-2 text-[13px] tracking-tight transition-colors ${
                      isActive
                        ? 'text-[var(--primary)]'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {t(link.key)}
                    {isActive && (
                      <span className="absolute left-4 right-4 bottom-0 h-[1px] bg-[var(--primary)]" />
                    )}
                  </Link>
                );
              })}
            </nav>

            <VisibilityGate componentKey="chrome-theme-toggle">
              <ThemeToggle />
            </VisibilityGate>
            <span className="h-4 w-px bg-[var(--border)] mx-2" />
            <VisibilityGate componentKey="chrome-user-menu">
              <UserMenu />
            </VisibilityGate>
          </div>

          {/* 移动端右侧 — 按钮需 min 44x44 触摸目标（WCAG 2.5.5） */}
          <div className="flex md:hidden items-center gap-1">
            <ThemeToggle />
            <button
              ref={hamburgerRef}
              onClick={() => setMobileOpen((v) => !v)}
              className="flex flex-col gap-[5px] p-2 min-w-[44px] min-h-[44px] items-center justify-center focus-amber"
              aria-label={t('toggleMenu')}
              aria-expanded={mobileOpen}
            >
              <span
                className={`block w-6 h-[1px] bg-[var(--foreground)] transition-transform duration-300 ${
                  mobileOpen ? 'translate-y-[3px] rotate-45' : ''
                }`}
              />
              <span
                className={`block w-6 h-[1px] bg-[var(--foreground)] transition-transform duration-300 ${
                  mobileOpen ? '-translate-y-[3px] -rotate-45' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* 移动端全屏菜单 — 始终渲染以保持 UserMenu 缓存，用 opacity + pointer-events 控制显隐
       *  z-[45] 确保高于公告横幅(z-40)，低于 header(z-50) 以保留汉堡按钮可点击 */}
      <div
        ref={mobileDrawerRef}
        className={`fixed inset-0 z-[45] bg-[var(--background)] md:hidden flex flex-col pt-16 transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex-1 flex flex-col justify-between px-6 py-12">
          <nav className="flex flex-col gap-2">
            {visibleLinks.map((link, idx) => {
              const isActive =
                pathname === link.href ||
                (link.href !== '/' && pathname.startsWith(`${link.href}/`));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-baseline gap-6 py-4 border-b border-[var(--border)] ${
                    isActive ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'
                  }`}
                >
                  <span className="meta-mono text-[var(--muted-foreground)]">
                    0{idx + 1}
                  </span>
                  <span className="display-serif text-[44px] leading-none">
                    {t(link.key)}
                  </span>
                  <span className="meta-mono ml-auto text-[var(--muted-foreground)]">
                    {t(`${link.key}En` as NavMessageKey)}
                  </span>
                </Link>
              );
            })}
          </nav>
          {/* 抽屉底部 — ThemeToggle 用 lg 大号变体更易触摸 */}
          <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-6">
            <VisibilityGate componentKey="chrome-theme-toggle">
              <ThemeToggle size="lg" />
            </VisibilityGate>
            <VisibilityGate componentKey="chrome-user-menu">
              <UserMenu size={56} />
            </VisibilityGate>
          </div>
        </div>
      </div>
    </>
  );
}
