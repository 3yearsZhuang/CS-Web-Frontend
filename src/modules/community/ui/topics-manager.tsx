/**
 * @file 主题审核子面板 — 从 community-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/avatar';
import { Badge, Button, Pagination, SectionLoading } from '@/components';
import { formatDateTime } from '@/shared/utils/utils';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import type { CommunityPost } from '@/modules/community/types';
import { useTopicsManager } from './use-topics-manager';
import {
  STATUS_OPTIONS,
  SORT_OPTIONS,
  TOPICS_PAGE_SIZE,
  type SortValue,
  type TopicStatus,
} from './community-admin-utils';

/** 主题审核 — 搜索/筛选/置顶/加精/隐藏/硬删除 */
export function TopicsManager() {
  const t = useTranslations('communityAdmin');
  const {
    topics,
    categories,
    loading,
    error,
    actionError,
    total,
    totalPages,
    busyIds,
    loadCategories,
    loadTopics,
    hideTopic,
    restoreTopic,
    togglePin,
    toggleFeature,
    deleteTopic,
  } = useTopicsManager();
  const { confirm } = useConfirm();

  // 视图态（筛选/排序/搜索/分页）
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortValue>('latest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadTopics({
      sort,
      page,
      page_size: TOPICS_PAGE_SIZE,
      status: statusFilter,
      category: categoryFilter,
      search,
    });
  }, [loadTopics, sort, page, statusFilter, categoryFilter, search]);

  /** 隐藏主题（需填写原因） */
  const handleHide = (topic: CommunityPost) => {
    const reason = window.prompt(t('hidePrompt', { title: topic.title })) ?? '';
    void hideTopic(topic.id, reason);
  };

  /** 硬删除主题（需 confirm） */
  const handleHardDelete = async (topic: CommunityPost) => {
    const confirmed = await confirm({
      title: t('hardDeleteTitle'),
      message: t('hardDeleteMessage', { title: topic.title }),
      variant: 'danger',
      confirmLabel: t('confirmDelete'),
    });
    if (!confirmed) return;
    await deleteTopic(topic.id);
  };

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
          <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('searchLabel')}</label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('searchPlaceholder')}
            maxLength={80}
            className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 状态筛选 */}
          <div className="flex-shrink-0">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('statusLabel')}</label>
            <div className="flex gap-0">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setPage(1);
                  }}
                  className={`tab-chip focus-ring whitespace-nowrap ${statusFilter === opt.value ? 'tab-chip-active' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* 版块筛选 */}
          <div className="flex-shrink-0">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('categoryLabel')}</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className={`${INPUT_CLASS} appearance-none pr-8 cursor-pointer`}
            >
              <option value="">{t('allOption')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          {/* 排序 */}
          <div className="flex-shrink-0 sm:ml-auto">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('sortLabel')}</label>
            <div className="flex gap-0">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSort(opt.value);
                    setPage(1);
                  }}
                  className={`tab-chip focus-ring whitespace-nowrap ${sort === opt.value ? 'tab-chip-active' : ''}`}
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
          t('loading')
        ) : error ? (
          <span className="text-[var(--destructive)]">{'// '}{error}</span>
        ) : (
          <>
            {t('countPrefix')}<span className="text-[var(--foreground)] tabular-nums">{total}</span>{t('countSuffix')}
          </>
        )}
      </div>

      {/* 主题列表 */}
      {loading ? (
        <SectionLoading label="Loading..." />
      ) : error ? (
        <div className="py-12 text-center meta-mono text-[var(--destructive)]">{error}</div>
      ) : topics.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{t('noTopics')}</div>
      ) : (
        <div className="border-t border-[var(--border)]">
          {/* 表头 */}
          <div className="hidden lg:grid grid-cols-12 gap-3 py-3 border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
            <div className="col-span-5">{t('colTitleAuthor')}</div>
            <div className="col-span-1">{t('colStatus')}</div>
            <div className="col-span-1">{t('colStats')}</div>
            <div className="col-span-1">{t('colCreated')}</div>
            <div className="col-span-4 text-right">{t('colActions')}</div>
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
                      <Badge variant="primary">PIN</Badge>
                    )}
                    {topic.isFeatured && (
                      <Badge variant="primary">FEAT</Badge>
                    )}
                  </div>
                  <Link href={topicHref} target="_blank" className="display-serif text-[14px] sm:text-[15px] text-[var(--foreground)] hover:text-[var(--primary)] transition-colors line-clamp-1">
                    {topic.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar email={topic.author?.email ?? 'anonymous'} displayName={topic.author?.displayName} avatarUrl={topic.author?.avatarUrl} avatarType={topic.author?.avatarType} size={16} />
                    <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[11px]">{topic.author?.displayName ?? t('anonymous')}</span>
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
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)] lg:hidden mr-2">{t('statusMobile')}</span>
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
                  <Button variant="outline" size="sm" type="button" onClick={() => togglePin(topic.id, !topic.isPinned)} disabled={busy} className={topic.isPinned ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5' : ''} title={topic.isPinned ? t('unpinTitle') : t('pinTitle')}>
                    {topic.isPinned ? t('unpinBtn') : t('pinBtn')}
                  </Button>
                  <Button variant="outline" size="sm" type="button" onClick={() => toggleFeature(topic.id, !topic.isFeatured)} disabled={busy} className={topic.isFeatured ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5' : ''} title={topic.isFeatured ? t('unfeatTitle') : t('featTitle')}>
                    {topic.isFeatured ? t('unfeatBtn') : t('featBtn')}
                  </Button>
                  {topic.status === 'published' ? (
                    <Button variant="outline-danger" size="sm" type="button" onClick={() => handleHide(topic)} disabled={busy}>
                      {t('hideBtn')}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" type="button" onClick={() => restoreTopic(topic.id)} disabled={busy}>
                      {t('restoreBtn')}
                    </Button>
                  )}
                  <Button variant="outline-danger" size="sm" type="button" onClick={() => handleHardDelete(topic)} disabled={busy}>{t('deleteBtn')}</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
