/**
 * @file 通知铃铛组件 — 轮询未读数，点击展开最近通知面板
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from 'lucide-react';
import { EASE } from '@/shared/utils/ui-constants';
import { formatRelativeTime } from '@/shared/utils/utils';
import { useAuth } from '@/shared/hooks/use-auth';
import { useNotificationBell } from './use-notification-bell';
import type { Notification, NotificationType } from './use-notification-bell';

export type { Notification, NotificationType };

/** 类型标签颜色映射 */
export const TYPE_STYLES: Record<NotificationType, { label: string; className: string }> = {
  system: {
    label: 'SYS',
    className: 'text-[var(--primary)] bg-[var(--primary)]/10',
  },
  admin: {
    label: 'ADM',
    className: 'text-red-500 bg-red-500/10',
  },
  activity: {
    label: 'ACT',
    className: 'text-emerald-500 bg-emerald-500/10',
  },
  like: {
    label: 'LIKE',
    className: 'text-pink-500 bg-pink-500/10',
  },
  reply: {
    label: 'REPLY',
    className: 'text-sky-500 bg-sky-500/10',
  },
  favorite: {
    label: 'FAV',
    className: 'text-amber-500 bg-amber-500/10',
  },
  follow: {
    label: 'FOLLOW',
    className: 'text-violet-500 bg-violet-500/10',
  },
};

/** 下拉面板 variants — 与 UserMenu 动画风格一致 */
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

/** 通知铃铛组件 — 轮询获取未读通知数，点击打开通知面板 */
export function NotificationBell() {
  const t = useTranslations('notifications');
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const {
    unreadCount,
    notifications,
    loadingList,
    fetchUnreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
  } = useNotificationBell();
  // 登录态以 useAuth 为唯一事实来源，不再另起探测请求。
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
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

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  // 未登录或登录态加载中：不渲染铃铛（以 useAuth 为唯一来源）
  if (!isLoggedIn) {
    return null;
  }

  return (
    <div ref={bellRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-8 h-8 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors focus-amber"
        aria-label={t('ariaLabel')}
        aria-expanded={open}
        title={t('ariaLabel')}
      >
        <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-[3px] flex items-center justify-center bg-[var(--primary)] text-[var(--primary-foreground)] text-[9px] meta-mono leading-none rounded-full">
            {displayCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={listVariants}
            className="absolute right-0 top-[calc(100%+8px)] z-[var(--z-header)] w-[min(85vw,360px)] max-h-[70vh] border border-[var(--border)] bg-[var(--background)] shadow-[var(--shadow-popover)]"
          >
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
            >
              <div className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                [ Notifications ]
              </div>
              <span className="meta-mono text-[10px] text-[var(--primary)]">
                {t('unread', { count: unreadCount })}
              </span>
            </motion.div>

            <div className="max-h-[400px] overflow-y-auto">
              {loadingList ? (
                <motion.div
                  variants={itemVariants}
                  className="px-4 py-8 text-center text-[var(--muted-foreground)] text-[12px]"
                >
                  {t('loading')}
                </motion.div>
              ) : notifications.length === 0 ? (
                <motion.div
                  variants={itemVariants}
                  className="px-4 py-8 text-center text-[var(--muted-foreground)] text-[12px]"
                >
                  {t('empty')}
                </motion.div>
              ) : (
                notifications.map((notification) => {
                  const typeStyle = TYPE_STYLES[notification.type];
                  return (
                    <motion.button
                      key={notification.id}
                      variants={itemVariants}
                      onClick={() => markRead(notification.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-[var(--primary)]/[0.06] transition-colors border-b border-[var(--border)] last:border-b-0 relative ${
                        !notification.isRead ? 'pl-[18px]' : ''
                      }`}
                    >
                      {!notification.isRead && (
                        <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--primary)]" />
                      )}
                      <div className="flex items-start gap-2">
                        <span
                          className={`meta-mono text-[9px] px-1.5 py-0.5 shrink-0 ${typeStyle.className}`}
                        >
                          {typeStyle.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-[var(--foreground)] truncate">
                            {notification.title}
                          </div>
                          <div className="mt-1 meta-mono text-[10px] text-[var(--muted-foreground)]">
                            {formatRelativeTime(notification.createdAt)}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })
              )}
            </div>

            <motion.div
              variants={itemVariants}
              className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)]"
            >
              <Link
                href="/notifications"
                className="meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                onClick={() => setOpen(false)}
              >
                {t('viewAll')}
              </Link>
              <button
                type="button"
                onClick={() => markAllRead()}
                disabled={unreadCount === 0}
                className="meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('markAllRead')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
