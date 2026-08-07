'use client';

/**
 * @file NotificationCenter — 通知列表主体（筛选 + 列表 + 分页）（通知中心页子组件）
 *
 * 从 `app/notifications/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `NotificationsState` 提供（GENERAL 2.2）。
 */

import { useTranslations } from 'next-intl';
import { RevealItem } from '@/components/effects/motion-primitives';
import { EmptyState, SectionLoading } from '@/components';
import { formatDateTime } from '@/shared/utils/utils';
import { filterTabs, TYPE_STYLES, type NotificationsState } from './use-notifications';

export function NotificationCenter(props: NotificationsState) {
  const t = useTranslations('notifications');
  const {
    notifications,
    loading,
    error,
    page,
    totalPages,
    total,
    unreadCount,
    filter,
    fetchNotifications,
    handleFilterChange,
    handleMarkRead,
    handleMarkAllRead,
    handlePageChange,
  } = props;

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);
      if (page <= 3) end = maxVisible - 1;
      else if (page >= totalPages - 2) start = totalPages - maxVisible + 2;
      if (start > 2) pages.push('ellipsis');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }

    return (
      <div className="flex items-center justify-center gap-1 sm:gap-2 mt-10">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="meta-mono px-3 py-2 text-[12px] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ←
        </button>
        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="meta-mono px-2 text-[var(--muted-foreground)] text-[12px]">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`meta-mono min-w-[36px] sm:min-w-[40px] px-2 py-2 text-[12px] border transition-colors ${
                page === p
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className="meta-mono px-3 py-2 text-[12px] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>
    );
  };

  return (
    <>
      <RevealItem>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="meta-mono text-[12px] px-4 py-2.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-fit"
          >
            {t('markAllRead')}
          </button>
          <div className="meta-mono text-[11px] text-[var(--muted-foreground)]">{t('total', { total })}</div>
        </div>
      </RevealItem>

      <RevealItem>
        <div className="border-b border-[var(--border)] mb-0 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-0 min-w-max">
            {filterTabs(t).map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleFilterChange(tab.value)}
                className={`relative meta-mono text-[12px] px-4 py-3 transition-colors ${
                  filter === tab.value
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {tab.label}
                {filter === tab.value && (
                  <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--primary)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </RevealItem>

      <RevealItem>
        <div className="border-t border-[var(--border)] relative">
          {loading && notifications.length > 0 && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--primary)]/30 overflow-hidden">
              <div className="h-full w-1/3 bg-[var(--primary)] animate-pulse" />
            </div>
          )}
          {loading && notifications.length === 0 ? (
            <SectionLoading label="加载更多..." />
          ) : notifications.length === 0 ? (
            <EmptyState label="// EMPTY" message={t('empty')} />
          ) : (
            <div>
              {notifications.map((notification) => {
                const typeStyle = TYPE_STYLES[notification.type];
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleMarkRead(notification.id)}
                    className={`w-full text-left py-5 sm:py-6 border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--primary)]/[0.04] relative ${
                      !notification.isRead ? 'pl-4 sm:pl-6' : 'pl-0 sm:pl-2'
                    }`}
                  >
                    {!notification.isRead && (
                      <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--primary)]" />
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`meta-mono text-[10px] px-2 py-0.5 ${typeStyle.className}`}>
                          {typeStyle.label}
                        </span>
                        <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                          {formatDateTime(notification.createdAt)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-[14px] sm:text-[15px] ${
                            notification.isRead
                              ? 'text-[var(--muted-foreground)] font-normal'
                              : 'text-[var(--foreground)] font-medium'
                          }`}
                        >
                          {notification.title}
                        </h3>
                        {notification.content && (
                          <p className="mt-1.5 text-[13px] text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">
                            {notification.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </RevealItem>

      {notifications.length > 0 && renderPagination()}
    </>
  );
}
