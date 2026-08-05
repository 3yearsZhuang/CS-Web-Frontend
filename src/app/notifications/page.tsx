/**
 * @file 通知中心页（/notifications）— 工业终端风格，未读琥珀竖条 + 乐观更新
 * 筛选：全部/未读/系统/管理员/活动，分页 pageSize=20
 */
'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { StaggerContainer, RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { PageHeaderBackground } from '@/components/layout/page-header-background';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDateTime } from '@/shared/utils/utils';
import { EmptyState, SectionLoading } from '@/components';

type NotificationType = 'system' | 'admin' | 'activity' | 'like' | 'reply' | 'favorite' | 'follow';
type FilterType = 'all' | 'unread' | NotificationType;

interface Notification {
  id: string;
  title: string;
  content: string | null;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  senderId: string | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}

const FILTER_TABS: { value: FilterType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'unread', label: '未读' },
  { value: 'system', label: '系统' },
  { value: 'admin', label: '管理员' },
  { value: 'activity', label: '活动' },
  { value: 'like', label: '点赞' },
  { value: 'reply', label: '回复' },
  { value: 'favorite', label: '收藏' },
  { value: 'follow', label: '关注' },
];

const TYPE_STYLES: Record<NotificationType, { label: string; className: string }> = {
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

function NotificationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Hero 进入 1s 后自动收缩并悬浮于页首（动画期间锁定滚动）
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  const initialPage = Number(searchParams.get('page')) || 1;
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const pageSize = 20;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));

      if (filter === 'unread') {
        params.set('is_read', 'false');
      } else if (filter === 'system' || filter === 'admin' || filter === 'activity') {
        params.set('type', filter);
      }

      const res = await fetch(`/api/notifications?${params.toString()}`);

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) throw new Error('加载失败');

      const data: NotificationsResponse = await res.json();
      setNotifications(data.notifications);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setUnreadCount(data.unreadCount);
    } catch {
      setError('加载失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }, [page, filter, router]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // URL 同步 — 仅在 page/filter 变化时执行，避免 router/searchParams 引用变化触发循环
  useEffect(() => {
    const params = new URLSearchParams();
    if (page !== 1) params.set('page', String(page));
    if (filter !== 'all') params.set('filter', filter);

    const queryString = params.toString();
    router.replace(`/notifications${queryString ? `?${queryString}` : ''}`, {
      scroll: false,
    });
  }, [page, filter, router]);

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleMarkRead = async (id: string) => {
    const notification = notifications.find((n) => n.id === id);
    if (!notification || notification.isRead) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
      );
      setUnreadCount((prev) => prev + 1);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const prevCount = unreadCount;
    setUnreadCount(0);

    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (!res.ok) throw new Error('failed');
    } catch {
      setNotifications((prev) =>
        prev.map((n) =>
          notifications.some((u) => u.id === n.id && !u.isRead)
            ? { ...n, isRead: false }
            : n,
        ),
      );
      setUnreadCount(prevCount);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      if (page <= 3) {
        end = maxVisible - 1;
      } else if (page >= totalPages - 2) {
        start = totalPages - maxVisible + 2;
      }

      if (start > 2) {
        pages.push('ellipsis');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }

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
            <span
              key={`ellipsis-${idx}`}
              className="meta-mono px-2 text-[var(--muted-foreground)] text-[12px]"
            >
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

  if (loading && notifications.length === 0) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{error}</div>
          <button
            onClick={() => fetchNotifications()}
            className="meta-mono text-[var(--primary)] underline-grow"
          >
            重试
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative pt-16">
      <section
        data-section-nav="00|Notifications"
        className={`relative px-4 sm:px-6 md:px-8 overflow-hidden transition-all hero-reveal ${
          heroCollapsed
            ? 'sticky top-16 z-30 py-3 sm:py-4 hero-acrylic'
            : 'py-16 sm:py-20'
        }`}
      >
        <div
          className={`transition-opacity hero-reveal ${
            heroCollapsed ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <PageHeaderBackground pageKey="notifications" />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto">
          <StaggerContainer onComplete={onRevealComplete}>
            <div className={`grid grid-cols-12 gap-0 ${heroCollapsed ? 'items-center mb-0' : 'mb-0 sm:mb-0'}`}>
              <div className={`col-span-12 md:col-span-2 ${heroCollapsed ? 'mb-0' : 'mb-4 md:mb-0'}`}>
                <div className="section-marker">[ 00 ]</div>
              </div>
              <div className="col-span-12 md:col-span-10">
                <RevealTitle>
                  <h1
                    className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
                      heroCollapsed
                        ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                        : 'text-[clamp(32px,7vw,72px)] leading-[1.05]'
                    }`}
                    onClick={heroCollapsed ? onTitleClick : undefined}
                  >
                    通知
                    <span className="text-[var(--primary)]"> 中心</span>
                    <span
                      className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                        heroCollapsed
                          ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                          : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
                      }`}
                    >
                      / Notifications
                    </span>
                  </h1>
                </RevealTitle>
                <div
                  className={`overflow-hidden transition-all hero-reveal ${
                    heroCollapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[100px] opacity-100 mt-4 sm:mt-6'
                  }`}
                >
                  <RevealItem>
                    <p className="text-[var(--muted-foreground)] text-[14px] sm:text-[15px] meta-mono">
                      {unreadCount > 0
                        ? `你有 ${unreadCount} 条未读通知`
                        : '所有通知均已阅读'}
                    </p>
                  </RevealItem>
                </div>
              </div>
            </div>
          </StaggerContainer>
        </div>
      </section>

      {/* 操作栏 + 筛选 + 列表 — 不参与 Hero 收缩 */}
      <section className="px-4 sm:px-6 md:px-8 pb-16 sm:pb-20">
        <div className="max-w-[1200px] mx-auto">
          <RevealItem>
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 ${heroCollapsed ? 'mt-6' : 'mt-0'}`}>
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="meta-mono text-[12px] px-4 py-2.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed w-fit"
              >
                全部标记已读
              </button>

              <div className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                共 {total} 条通知
              </div>
            </div>
          </RevealItem>

          <RevealItem>
            <div className="border-b border-[var(--border)] mb-0 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="flex gap-0 min-w-max">
                {FILTER_TABS.map((tab) => (
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
              {/* 切换 filter 时顶部细条加载指示，保留旧列表避免闪烁 */}
              {loading && notifications.length > 0 && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--primary)]/30 overflow-hidden">
                  <div className="h-full w-1/3 bg-[var(--primary)] animate-pulse" />
                </div>
              )}
              {loading && notifications.length === 0 ? (
                <SectionLoading label="加载更多..." />
              ) : notifications.length === 0 ? (
                <EmptyState label="// EMPTY" message="暂无通知" />
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
                            <span
                              className={`meta-mono text-[10px] px-2 py-0.5 ${typeStyle.className}`}
                            >
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
        </div>
      </section>
    </main>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={null}>
      <NotificationsContent />
    </Suspense>
  );
}
