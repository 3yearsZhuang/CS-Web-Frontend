/**
 * @file 主题审核子面板 — 从 forum-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { Button, SectionLoading } from '@/components';
import { formatDateTime } from '@/shared/utils/utils';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import type { CommunityCategory, CommunityPost, PaginatedPosts } from '@/modules/community/types';
import {
  getError,
  STATUS_OPTIONS,
  SORT_OPTIONS,
  TOPICS_PAGE_SIZE,
  type SortValue,
  type TopicStatus,
} from './forum-admin-utils';

interface CategoriesResponse {
  items: CommunityCategory[];
}

/** 主题审核 — 搜索/筛选/置顶/加精/隐藏/硬删除 */
export function TopicsManager() {
  const [topics, setTopics] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortValue>('latest');

  // 分页
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // 操作中状态（按 topicId 隔离）
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const { confirm } = useConfirm();

  /** 加载版块（用于筛选下拉） */
  useEffect(() => {
    fetch('/api/admin/community/forum/categories')
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as CategoriesResponse;
        return data.items ?? [];
      })
      .then((cats) => {
        if (cats) setCategories(cats);
      })
      .catch(() => {
        // 静默失败 — 筛选下拉仅作辅助
      });
  }, []);

  /** 加载主题列表 */
  const loadTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sort,
        page: String(page),
        page_size: String(TOPICS_PAGE_SIZE),
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/community/forum/topics?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getError(data, '加载失败'));
      }
      const data = (await res.json()) as PaginatedPosts;
      setTopics(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, search, sort, page]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  /** 通用操作调用 — 设置 busy + 错误处理 + 成功后刷新 */
  const doAction = async (
    topicId: string,
    action: () => Promise<Response>,
    _successMsg?: string,
  ) => {
    setActionError(null);
    setBusyIds((s) => new Set(s).add(topicId));
    try {
      const res = await action();
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(getError(data, '操作失败'));
      }
      await loadTopics();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(topicId);
        return next;
      });
    }
  };

  /** 隐藏主题 */
  const handleHide = (topic: CommunityPost) => {
    const reason = window.prompt(`隐藏主题「${topic.title}」\n请输入隐藏原因（可选）：`) ?? '';
    void doAction(topic.id, () =>
      fetch(`/api/admin/community/forum/topics/${topic.id}/hide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      }),
    );
  };

  /** 恢复主题 */
  const handleRestore = (topic: CommunityPost) => {
    void doAction(topic.id, () =>
      fetch(`/api/admin/community/forum/topics/${topic.id}/restore`, { method: 'POST' }),
    );
  };

  /** 切换置顶 */
  const handleTogglePin = (topic: CommunityPost) => {
    void doAction(topic.id, () =>
      fetch(`/api/admin/community/forum/topics/${topic.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !topic.isPinned }),
      }),
    );
  };

  /** 切换加精 */
  const handleToggleFeature = (topic: CommunityPost) => {
    void doAction(topic.id, () =>
      fetch(`/api/admin/community/forum/topics/${topic.id}/feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !topic.isFeatured }),
      }),
    );
  };

  /** 硬删除主题 */
  const handleHardDelete = (topic: CommunityPost) => {
    void (async () => {
      const confirmed = await confirm({
        title: '硬删除主题',
        message: `硬删除主题「${topic.title}」？\n该操作不可恢复，将级联删除所有回复、点赞、收藏。`,
        variant: 'danger',
        confirmLabel: '确认删除',
      });
      if (!confirmed) return;
      doAction(topic.id, () =>
        fetch(`/api/admin/community/forum/topics/${topic.id}`, { method: 'DELETE' }),
      );
    })();
  };

  /** 当前页码范围 */
  const pageNums = (() => {
    const max = totalPages;
    const cur = page;
    const range: number[] = [];
    const start = Math.max(1, Math.min(cur - 2, max - 4));
    const end = Math.min(max, start + 4);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  })();

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="px-4 py-3 border border-[var(--destructive)] bg-[var(--destructive)]/5 meta-mono text-[var(--destructive)]">
          {actionError}
        </div>
      )}

      {/* 筛选区 */}
      <div className="border border-[var(--border)] p-4 sm:p-6 space-y-4">
        {/* 搜索 */}
        <div>
          <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">搜索 / Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索标题或正文..."
            maxLength={80}
            className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 状态筛选 */}
          <div className="flex-shrink-0">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">状态 / Status</label>
            <div className="flex gap-0">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap px-3 py-2 text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* 版块筛选 */}
          <div className="flex-shrink-0">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">分类 / Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className={`${INPUT_CLASS} appearance-none pr-8 cursor-pointer`}
            >
              <option value="">全部 / All</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          {/* 排序 */}
          <div className="flex-shrink-0 sm:ml-auto">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">排序 / Sort</label>
            <div className="flex gap-0">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSort(opt.value);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap px-3 py-2 text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                    sort === opt.value
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 统计 */}
      <div className="meta-mono text-[var(--muted-foreground)]">
        {loading ? (
          '// 加载中...'
        ) : error ? (
          <span className="text-[var(--destructive)]">{'// '}{error}</span>
        ) : (
          <>
            {'// 共 '}<span className="text-[var(--foreground)] tabular-nums">{total}</span>{' 条主题'}
          </>
        )}
      </div>

      {/* 主题列表 */}
      {loading ? (
        <SectionLoading label="Loading..." />
      ) : error ? (
        <div className="py-12 text-center meta-mono text-[var(--destructive)]">{error}</div>
      ) : topics.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{'// 暂无主题'}</div>
      ) : (
        <div className="border-t border-[var(--border)]">
          {/* 表头 */}
          <div className="hidden lg:grid grid-cols-12 gap-3 py-3 border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
            <div className="col-span-5">标题 / 作者 / Title / Author</div>
            <div className="col-span-1">状态 / Status</div>
            <div className="col-span-1">统计 / Stats</div>
            <div className="col-span-1">创建 / Created</div>
            <div className="col-span-4 text-right">操作 / Actions</div>
          </div>
          {topics.map((topic) => {
            const busy = busyIds.has(topic.id);
            const slug = topic.category?.slug ?? '';
            const topicHref = slug ? `/community/${topic.id}` : '/community';
            return (
              <div key={topic.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 py-4 border-b border-[var(--border)]">
                {/* 标题 + 作者 */}
                <div className="lg:col-span-5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {topic.isPinned && (
                      <span className="meta-mono text-[9px] px-1.5 py-0.5 border border-[var(--primary)] text-[var(--primary)]">PIN</span>
                    )}
                    {topic.isFeatured && (
                      <span className="meta-mono text-[9px] px-1.5 py-0.5 border border-[var(--primary)] text-[var(--primary)]">FEAT</span>
                    )}
                  </div>
                  <Link href={topicHref} target="_blank" className="display-serif text-[14px] sm:text-[15px] text-[var(--foreground)] hover:text-[var(--primary)] transition-colors line-clamp-1">
                    {topic.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar email={topic.author?.email ?? 'anonymous'} displayName={topic.author?.displayName} avatarUrl={topic.author?.avatarUrl} avatarType={topic.author?.avatarType} size={16} />
                    <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[11px]">{topic.author?.displayName ?? '匿名'}</span>
                    {topic.category && (
                      <>
                        <span className="meta-mono text-[var(--muted-foreground)] text-[10px]">·</span>
                        <span className="meta-mono text-[var(--primary)] text-[10px]">{topic.category.name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 状态 */}
                <div className="lg:col-span-1">
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)] lg:hidden mr-2">状态:</span>
                  <span className={`meta-mono text-[10px] px-2 py-0.5 border ${topic.status === 'hidden' ? 'border-[var(--destructive)] text-[var(--destructive)]' : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}>
                    {topic.status === 'hidden' ? 'HIDDEN' : 'PUBLISHED'}
                  </span>
                </div>

                {/* 统计 */}
                <div className="lg:col-span-1 meta-mono text-[10px] text-[var(--muted-foreground)]">
                  <span className="lg:hidden mr-2">Stats:</span>
                  <span className="tabular-nums">R:{topic.replyCount}</span>
                  <span className="mx-1">·</span>
                  <span className="tabular-nums">V:{topic.viewCount}</span>
                  <span className="mx-1">·</span>
                  <span className="tabular-nums">L:{topic.likeCount}</span>
                </div>

                {/* 创建时间 */}
                <div className="lg:col-span-1 meta-mono text-[10px] text-[var(--muted-foreground)]">
                  <span className="lg:hidden mr-2">Created:</span>
                  {formatDateTime(topic.createdAt)}
                </div>

                {/* 操作 */}
                <div className="lg:col-span-4 flex flex-wrap gap-1.5 lg:justify-end">
                  <Button variant="outline" size="sm" type="button" onClick={() => handleTogglePin(topic)} disabled={busy} className={topic.isPinned ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5' : ''} title={topic.isPinned ? '取消置顶' : '置顶'}>
                    {topic.isPinned ? '取消置顶 / Unpin' : '置顶 / Pin'}
                  </Button>
                  <Button variant="outline" size="sm" type="button" onClick={() => handleToggleFeature(topic)} disabled={busy} className={topic.isFeatured ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5' : ''} title={topic.isFeatured ? '取消加精' : '加精'}>
                    {topic.isFeatured ? '取消加精 / Unfeat' : '加精 / Feat'}
                  </Button>
                  {topic.status === 'published' ? (
                    <Button variant="outline" size="sm" type="button" onClick={() => handleHide(topic)} disabled={busy} className="hover:text-[var(--destructive)] hover:border-[var(--destructive)]">
                      隐藏 / Hide
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" type="button" onClick={() => handleRestore(topic)} disabled={busy}>
                      恢复 / Restore
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleHardDelete(topic)}
                    disabled={busy}
                    className="px-2.5 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] font-mono text-[10px] uppercase tracking-wider hover:text-[var(--destructive)] hover:border-[var(--destructive)] transition-colors focus-amber disabled:opacity-50"
                  >
                    删除 / Del
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-6 border-t border-[var(--border)]">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber">←</button>
          {pageNums.map((n) => (
            <button key={n} onClick={() => setPage(n)} className={`font-mono text-[12px] px-3 py-1.5 border transition-colors focus-amber ${page === n ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)]'}`}>
              {String(n).padStart(2, '0')}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber">→</button>
        </div>
      )}
    </div>
  );
}
