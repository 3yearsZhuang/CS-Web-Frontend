'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, RefreshCw, User, PenLine, Shield } from 'lucide-react';
import { EASE } from '@/shared/utils/ui-constants';
import { formatRelativeTime } from '@/shared/utils/utils';
import { setLocaleCookie } from '@/shared/utils/locale';
import { useAuth } from '@/shared/hooks/use-auth';
import { useFeatureVisibility, DEFAULT_VISIBILITY, useComponentVisible } from '@/shared/hooks/use-feature-visibility';
import { useNotificationsPreview } from '@/components/use-notifications-preview';
import { TYPE_STYLES } from '@/components/notification-bell';
import { Avatar } from '@/components/avatar';
import { useConfirm } from '@/components/primitives/confirm-dialog';

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.04 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.02, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -6, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.2, ease: EASE },
  },
  exit: {
    opacity: 0,
    y: -3,
    filter: 'blur(2px)',
    transition: { duration: 0.12 },
  },
};

/** 角色标签 */
const ROLE_LABEL: Record<string, string> = {
  root: 'Root',
  admin: 'Admin',
  member: 'Member',
};

function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Link
        href={href}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--foreground)] hover:bg-[var(--primary)]/[0.06] transition-colors"
      >
        <span className="text-[var(--muted-foreground)]">{icon}</span>
        <span>{label}</span>
      </Link>
    </motion.div>
  );
}

/** 头像展开页 — 内嵌「通知」与「中英文切换」 */
export function UserMenu({ size = 32 }: { size?: number }) {
  const router = useRouter();
  const locale = useLocale();
  const tProfile = useTranslations('profile');
  const tUserMenu = useTranslations('userMenu');
  const tCommon = useTranslations('common');
  const tNotif = useTranslations('notifications');

  const { user, isLoggedIn, logout } = useAuth();
  const { rules } = useFeatureVisibility();
  const adminRule = rules['admin'] ?? DEFAULT_VISIBILITY['admin'];
  const showAdminEntry = isLoggedIn && (user?.role === 'admin' || user?.role === 'root') && adminRule.admin;
  const showProfile = useComponentVisible('profile');
  const showNotifications = useComponentVisible('notifications');
  const showLangSwitch = useComponentVisible('chrome-language-switcher');
  const { confirm } = useConfirm();

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    loading: notifLoading,
    unreadCount,
    markRead,
    markAllRead,
  } = useNotificationsPreview(5, open && isLoggedIn);

  const handleLogout = async () => {
    const ok = await confirm({
      title: tUserMenu('logoutTitle'),
      message: tUserMenu('logoutMessage'),
      variant: 'danger',
      confirmLabel: tUserMenu('logoutConfirm'),
    });
    if (!ok) return;
    await logout();
    setOpen(false);
    router.push('/');
  };

  const handleSwitch = async () => {
    const ok = await confirm({
      title: tUserMenu('switchTitle'),
      message: tUserMenu('switchMessage'),
      variant: 'warning',
      confirmLabel: tUserMenu('switchConfirm'),
    });
    if (!ok) return;
    await logout();
    setOpen(false);
    // 带 switch=1 进入登录页，绕过「已登录拒绝访问 /login」的守卫，用于切换账号。
    router.push('/login?switch=1');
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  /** 登录态以 useAuth 为唯一事实来源（不再叠加通知预览的探测结果） */
  const loggedIn = isLoggedIn;

  const LANGUAGE_OPTIONS = [
    { value: 'zh-CN', label: '中文' },
    { value: 'en', label: 'EN' },
  ];

  const switchLocale = (next: string) => {
    if (next === locale) return;
    setLocaleCookie(next);
    window.location.reload();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!isLoggedIn) {
            router.push('/login');
            return;
          }
          setOpen((v) => !v);
        }}
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full bg-[var(--primary)]/[0.12] text-[var(--primary)] hover:bg-[var(--primary)]/[0.2] transition-colors focus-amber"
        aria-label={tUserMenu('menuAria')}
        aria-expanded={open}
        title={user?.displayName || user?.email || tUserMenu('login')}
      >
        {user ? (
          <Avatar
            email={user.email}
            displayName={user.displayName}
            avatarUrl={user.avatarUrl}
            avatarType={user.avatarType ?? undefined}
            size={size - 8}
            className="!rounded-full !bg-transparent !border-0"
          />
        ) : (
          <User className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={listVariants}
            className="absolute right-0 top-[calc(100%+8px)] z-[var(--z-header)] w-[min(88vw,320px)] max-h-[80vh] overflow-y-auto border border-[var(--border)] bg-[var(--background)] shadow-[var(--shadow-popover)]"
          >
            {/* 用户信息头部 */}
            <motion.div
              variants={itemVariants}
              className="px-4 py-3 border-b border-[var(--border)]"
            >
              <div className="meta-mono text-[13px] text-[var(--foreground)]">
                {user?.displayName || user?.email || tUserMenu('login')}
              </div>
              <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mt-0.5">
                {user?.role ? (ROLE_LABEL[user.role] ?? user.role) : ''}
              </div>
            </motion.div>

            {/* 通知区块（未登录时引导登录查看） */}
            <motion.div variants={itemVariants} className="border-b border-[var(--border)]">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                  [ {tNotif('ariaLabel')} ]
                </span>
                {loggedIn && (
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <span className="meta-mono text-[10px] text-[var(--primary)]">
                        {tNotif('unread', { count: unreadCount })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={markAllRead}
                      disabled={unreadCount === 0}
                      className="meta-mono text-[10px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {tNotif('markAllRead')}
                    </button>
                  </div>
                )}
              </div>

              {loggedIn ? (
                <div className="max-h-[240px] overflow-y-auto">
                  {notifLoading ? (
                    <div className="px-4 py-6 text-center text-[var(--muted-foreground)] text-[12px]">
                      {tNotif('loading')}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[var(--muted-foreground)] text-[12px]">
                      {tNotif('empty')}
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const typeStyle = TYPE_STYLES[n.type] ?? TYPE_STYLES.system;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (!n.isRead) markRead(n.id);
                            setOpen(false);
                            router.push('/notifications');
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-[var(--primary)]/[0.06] transition-colors border-b border-[var(--border)] last:border-b-0 relative ${
                            !n.isRead ? 'pl-[18px]' : ''
                          }`}
                        >
                          {!n.isRead && (
                            <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--primary)]" />
                          )}
                          <div className="flex items-start gap-2">
                            <span
                              className={`meta-mono text-[9px] px-1.5 py-0.5 shrink-0 ${typeStyle.className}`}
                            >
                              {typeStyle.label}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[12px] text-[var(--foreground)] truncate">
                                {n.title}
                              </div>
                              <div className="mt-0.5 meta-mono text-[10px] text-[var(--muted-foreground)]">
                                {formatRelativeTime(n.createdAt)}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push('/login');
                  }}
                  className="w-full px-4 py-4 text-left text-[12px] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/[0.06] transition-colors"
                >
                  {tUserMenu('loginToView')}
                </button>
              )}

              {loggedIn && showNotifications && (
                <div className="px-4 py-2 text-right">
                  <Link
                    href="/notifications"
                    onClick={() => setOpen(false)}
                    className="meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                  >
                    {tNotif('viewAll')}
                  </Link>
                </div>
              )}
            </motion.div>

            {/* 语言切换区块 */}
            {showLangSwitch && (
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]"
            >
              <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                [ {tCommon('language')} ]
              </span>
              <div className="flex items-center gap-1" role="group" aria-label={tCommon('language')}>
                {LANGUAGE_OPTIONS.map((opt) => {
                  const active = opt.value === locale;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => switchLocale(opt.value)}
                      aria-current={active ? 'true' : undefined}
                      className={`meta-mono text-[11px] px-2 py-0.5 transition-colors focus-amber ${
                        active
                          ? 'text-[var(--primary)] underline-grow'
                          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
            )}

            {/* 菜单项（已登录显示） */}
            {loggedIn && (
              <>
                {showProfile && (
                <motion.div variants={itemVariants}>
                  <MenuItem
                    href="/profile"
                    icon={<User className="w-3.5 h-3.5" />}
                    label={tProfile('profileTitle')}
                    onClick={() => setOpen(false)}
                  />
                </motion.div>
                )}
                <motion.div variants={itemVariants}>
                  <MenuItem
                    href="/create"
                    icon={<PenLine className="w-3.5 h-3.5" />}
                    label={tUserMenu('create')}
                    onClick={() => setOpen(false)}
                  />
                </motion.div>

                {showAdminEntry ? (
                  <motion.div variants={itemVariants}>
                    <MenuItem
                      href="/admin"
                      icon={<Shield className="w-3.5 h-3.5" />}
                      label={tUserMenu('admin')}
                      onClick={() => setOpen(false)}
                    />
                  </motion.div>
                ) : null}

                <motion.div variants={itemVariants}>
                  <button
                    type="button"
                    onClick={handleSwitch}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--foreground)] hover:bg-[var(--primary)]/[0.06] transition-colors"
                  >
                    <span className="text-[var(--muted-foreground)]">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </span>
                    <span>{tUserMenu('switch')}</span>
                  </button>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--foreground)] hover:bg-[var(--primary)]/[0.06] transition-colors"
                  >
                    <span className="text-[var(--muted-foreground)]">
                      <LogOut className="w-3.5 h-3.5" />
                    </span>
                    <span>{tUserMenu('logout')}</span>
                  </button>
                </motion.div>
              </>
            )}

            {/* 未登录：登录项 */}
            {!loggedIn && (
              <motion.div variants={itemVariants}>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[var(--background)] bg-[var(--primary)] hover:opacity-90 transition-opacity"
                >
                  <span>
                    <LogOut className="w-3.5 h-3.5" />
                  </span>
                  <span>{tUserMenu('login')}</span>
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
