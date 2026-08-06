/**
 * @file UserMenu 用户菜单组件 — 未登录显示登录按钮，已登录显示头像与下拉菜单（更多/切换/退出）
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { EASE } from '@/shared/utils/ui-constants';
import { Button } from '@/components/primitives/button';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { useFocusTrap } from '@/shared/hooks/use-focus-trap';
import { Avatar } from './avatar';
import type { User } from '@/modules/user/types';

/** 下拉菜单项配置 */
const MENU_ITEMS = [
  {
    key: 'more',
    label: '更多',
    en: 'More',
    action: 'navigate' as const,
    href: '/profile',
  },
  {
    key: 'switch',
    label: '切换',
    en: 'Switch',
    action: 'logout-navigate' as const,
    href: '/login',
  },
  {
    key: 'logout',
    label: '退出',
    en: 'Logout',
    action: 'logout-navigate' as const,
    href: '/',
  },
];

/** 管理员专属菜单项 */
const ADMIN_MENU_ITEM = {
  key: 'admin',
  label: '管理',
  en: 'Admin',
  action: 'navigate' as const,
  href: '/admin',
};

/** 下拉菜单 variants — 与面包屑动画风格一致 */
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: -8, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.25, ease: EASE },
  },
  exit: {
    opacity: 0,
    y: -4,
    filter: 'blur(2px)',
    transition: { duration: 0.15 },
  },
};

/** 登出请求 */
async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {
    // 网络错误也不阻塞跳转
  });
}

interface UserMenuProps {
  /** 头像尺寸（px），默认 32 */
  size?: number;
}

/** 用户菜单 — 登录状态显示头像与下拉菜单，未登录显示登录按钮 */
export function UserMenu({ size = 32 }: UserMenuProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const menuRef = useFocusTrap<HTMLDivElement>({
    active: open,
    triggerRef: avatarRef,
    onClose: () => setOpen(false),
    lockScroll: false,
  });

  // 路由变化时重新获取用户，解决登录跳回后 Navbar（持久化在 layout）未更新的问题
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) {
          setUser(data?.user ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const { confirm } = useConfirm();

  /** 处理菜单项点击 — logout 类操作需二次确认 */
  const handleAction = async (action: string, href: string, key?: string) => {
    setOpen(false);

    if (action === 'navigate') {
      router.push(href);
      return;
    }

    // 切换 / 退出 → 二次确认
    if (action === 'logout-navigate' || action === 'logout-stay') {
      const isSwitch = key === 'switch';
      const confirmed = await confirm({
        title: isSwitch ? '切换账号' : '退出登录',
        message: isSwitch
          ? '切换后将登出当前账号并返回登录页。'
          : '退出后将登出当前账号并返回首页。',
        variant: isSwitch ? 'warning' : 'info',
        confirmLabel: isSwitch ? '确认切换' : '确认退出',
      });
      if (!confirmed) return;

      await logout();
      setUser(null);
      if (action === 'logout-navigate') {
        router.push(href);
      } else {
        router.refresh();
      }
    }
  };

  if (loading) {
    return (
      <div
        className="shrink-0 bg-[var(--muted)] border border-[var(--border)]"
        style={{ width: size, height: size }}
      />
    );
  }

  // 未登录
  if (!user) {
    return (
      <Button
        size="sm"
        onClick={() => router.push('/login')}
      >
        登录
      </Button>
    );
  }

  return (
    <div ref={avatarRef} className="relative">
      <Avatar
        email={user.email}
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        avatarType={user.avatarType}
        size={size}
        clickable
        onClick={() => setOpen((v) => !v)}
      />

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={listVariants}
            className="absolute right-0 bottom-[calc(100%+8px)] md:bottom-auto md:top-[calc(100%+8px)] z-50 min-w-[200px] sm:min-w-[240px] border border-[var(--border)] bg-[var(--background)] shadow-[var(--shadow-popover)]"
          >
            {/* 用户信息头部 */}
            <motion.div
              variants={itemVariants}
              className="px-4 py-3 border-b border-[var(--border)]"
            >
              <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-1">
                [ Account ]
              </div>
              <div className="text-[13px] text-[var(--foreground)] truncate">
                {user.displayName || user.email}
              </div>
              {user.displayName && (
                <div className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">
                  {user.email}
                </div>
              )}
            </motion.div>

            {/* 菜单项 */}
            <div className="py-1">
              {/* 管理员专属 — 仅 admin / root 可见 */}
              {(user.role === 'admin' || user.role === 'root') && (
                <motion.button
                  key={ADMIN_MENU_ITEM.key}
                  variants={itemVariants}
                  onClick={() => handleAction(ADMIN_MENU_ITEM.action, ADMIN_MENU_ITEM.href)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--primary)]/[0.08] transition-colors group border-b border-[var(--border)]"
                >
                  <span className="meta-mono text-[10px] text-[var(--primary)] group-hover:text-[var(--primary)] transition-colors">
                    00
                  </span>
                  <span className="text-[13px] text-[var(--primary)] font-medium">
                    {ADMIN_MENU_ITEM.label}
                  </span>
                  <span className="meta-mono ml-auto text-[10px] text-[var(--primary)]/70">
                    {ADMIN_MENU_ITEM.en}
                  </span>
                </motion.button>
              )}
              {MENU_ITEMS.map((item, idx) => (
                <motion.button
                  key={item.key}
                  variants={itemVariants}
                  onClick={() => handleAction(item.action, item.href, item.key)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--primary)]/[0.08] transition-colors group"
                >
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors">
                    0{idx + 1}
                  </span>
                  <span className="text-[13px] text-[var(--foreground)]">
                    {item.label}
                  </span>
                  <span className="meta-mono ml-auto text-[10px] text-[var(--muted-foreground)]">
                    {item.en}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
