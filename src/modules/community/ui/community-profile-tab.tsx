/**
 * @file 个人主页社区 Tab — 我的主题/回复/收藏（三段 sub-tab 切换）
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CommunityTopicItem } from './community-topic-item';
import { formatDateTime } from '@/shared/utils/utils';
import { SectionLoading, Pagination } from '@/components';
import { SectionNav } from '@/components/primitives/section-nav';
import type {
  CommunityPost,
  CommunityCommentDetail,
  PaginatedPosts,
  PaginatedComments,
} from '@/modules/community/types';

const PAGE_SIZE = 10;

/** Sub-tab 类型 */
type CommunitySubTab = 'topics' | 'replies' | 'favorites';

/** Sub-tab 配置 */
const SUB_TABS: { value: CommunitySubTab; label: string; num: string }[] = [
  { value: 'topics', label: 'Topics', num: '01' },
  { value: 'replies', label: 'Replies', num: '02' },
  { value: 'favorites', label: 'Favorites', num: '03' },
];

interface ProfileCommunityTabProps {
  /** 当前登录用户 ID */
  userId: string;
}

/** 截断回复内容用于预览 */
function truncateContent(content: string, maxLen = 140): string {
  const text = content.replace(/[#*`>\-!\[\]()]/g, '').replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

export function ProfileCommunityTab({ userId }: ProfileCommunityTabProps) {
  const t = useTranslations('communityProfile');
  const [activeSubTab, setActiveSubTab] = useState<CommunitySubTab>('topics');

  // 主题列表（topics / favorites 共用）
  const [topics, setTopics] = useState<CommunityPost[]>([]);
  // 回复列表
  const [replies, setReplies] = useState<CommunityCommentDetail[]>([]);

  // 分页状态
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // 加载状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 加载数据 — 由 activeSubTab 与 page 触发 */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url: string;
      if (activeSubTab === 'topics') {
        url = `/api/community/users/${userId}/topics?page=${page}&page_size=${PAGE_SIZE}`;
      } else if (activeSubTab === 'replies') {
        url = `/api/community/users/${userId}/replies?page=${page}&page_size=${PAGE_SIZE}`;
      } else {
        url = `/api/community/favorites?page=${page}&page_size=${PAGE_SIZE}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(t('loadFailed'));
      }

      if (activeSubTab === 'replies') {
        const data = (await res.json()) as PaginatedComments;
        setReplies(data.items ?? []);
        setTopics([]);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
      } else {
        const data = (await res.json()) as PaginatedPosts;
        setTopics(data.items ?? []);
        setReplies([]);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'));
      setTopics([]);
      setReplies([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [activeSubTab, page, userId]);

  // sub-tab 或 page 变化时重新加载
  useEffect(() => {
    void loadData();
  }, [loadData]);

  /** 切换 sub-tab — 重置分页 */
  const handleTabChange = (tab: CommunitySubTab) => {
    if (tab === activeSubTab) return;
    setActiveSubTab(tab);
    setPage(1);
  };

  /** 当前页码范围由 Pagination 组件内部处理，无需本地 pageNums */

  return (
    <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
      <div className="col-span-12 md:col-span-2 mb-6 md:mb-0 md:pr-6">
        {/* Sub-tab 导航 — 复用 SectionNav 共享组件 */}
        <SectionNav
          options={SUB_TABS.map((t) => ({ value: t.value, label: t.label, num: t.num }))}
          value={activeSubTab}
          onChange={(v) => handleTabChange(v as CommunitySubTab)}
          layoutClassName="flex md:flex-col gap-4 md:gap-5 overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0"
          labelSpacingClassName="mt-2"
        />
      </div>

      <div className="col-span-12 md:col-span-10">
        {/* 统计信息 */}
        <div className="flex items-baseline justify-between mb-6 pb-4 border-b border-[var(--border)]">
          <div className="meta-mono text-[var(--muted-foreground)]">
            {loading ? (
              <span>{t('loading')}</span>
            ) : error ? (
              <span className="text-[var(--destructive)]">{'// '}{error}</span>
            ) : total === 0 ? (
              <span>
                {'// '}{activeSubTab === 'topics'
                  ? t('noTopics')
                  : activeSubTab === 'replies'
                    ? t('noReplies')
                    : t('noFavorites')}
              </span>
            ) : (
              <span>
                {t('countPrefix')}<span className="text-[var(--foreground)] tabular-nums">
                  {total}
                </span>{' '}
                {t('countUnit')}{activeSubTab === 'topics' ? t('unitTopics') : activeSubTab === 'replies' ? t('unitReplies') : t('unitFavorites')}
              </span>
            )}
          </div>
          {activeSubTab === 'topics' && (
            <Link
              href="/community/new"
              className="meta-mono text-[var(--primary)] underline-grow shrink-0 ml-4"
            >
              {t('newTopicLink')}
            </Link>
          )}
          {activeSubTab === 'favorites' && (
            <Link
              href="/community"
              className="meta-mono text-[var(--primary)] underline-grow shrink-0 ml-4"
            >
              {t('browseCategories')}
            </Link>
          )}
        </div>

        {/* 内容区 */}
        {loading ? (
          <SectionLoading label="Loading..." />
        ) : error ? (
          <div className="py-12 text-center meta-mono text-[var(--destructive)]">
            {error}
          </div>
        ) : activeSubTab === 'replies' ? (
          replies.length === 0 ? (
            <div className="py-12 text-center">
              <div className="meta-mono text-[var(--muted-foreground)] mb-4">
                [ No Record ]
              </div>
              <p className="text-[14px] text-[var(--muted-foreground)] mb-6">
                {activeSubTab === 'replies'
                  ? t('noRepliesDesc')
                  : t('noContentDesc')}
              </p>
              <Link
                href="/community"
                className="meta-mono text-[var(--primary)] underline-grow"
              >
                {t('browseCommunity')}
              </Link>
            </div>
          ) : (
            <ul>
              {replies.map((reply, idx) => {
                const topicSlug = reply.topic?.category?.slug ?? '';
                const topicHref = topicSlug
                  ? `/community/${reply.topicId}`
                  : `/community`;
                return (
                  <li
                    key={reply.id}
                    className={`py-6 ${
                      idx < replies.length - 1
                        ? 'border-b border-[var(--border)]'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4 mb-3">
                      {/* 所属主题链接 */}
                      <Link
                        href={topicHref}
                        className="display-serif text-[16px] sm:text-[18px] text-[var(--foreground)] hover:text-[var(--primary)] transition-colors line-clamp-1 flex-1 min-w-0"
                      >
                        {reply.topic?.title ?? t('topicDeleted')}
                      </Link>
                      {/* 时间 */}
                      <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[11px] shrink-0">
                        {formatDateTime(reply.createdAt)}
                      </span>
                    </div>
                    {/* 回复内容预览 */}
                    <Link
                      href={topicHref}
                      className="block text-[14px] text-[var(--muted-foreground)] leading-[1.7] hover:text-[var(--foreground)] transition-colors line-clamp-2"
                    >
                      {truncateContent(reply.contentMarkdown)}
                    </Link>
                    {/* 元信息 */}
                    <div className="flex items-center gap-3 mt-3 meta-mono text-[10px] text-[var(--muted-foreground)]">
                      {reply.topic?.category && (
                        <span className="text-[var(--primary)]">
                          {reply.topic.category.name}
                        </span>
                      )}
                      <span>·</span>
                      <span>♥ {reply.likeCount}</span>
                      {reply.parentReplyId && (
                        <>
                          <span>·</span>
                          <span>{t('nestedReply')}</span>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : topics.length === 0 ? (
          <div className="py-12 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">
              [ No Record ]
            </div>
            <p className="text-[14px] text-[var(--muted-foreground)] mb-6">
              {activeSubTab === 'topics'
                ? t('noTopicsDesc')
                : t('noFavoritesDesc')}
            </p>
            <Link
              href="/community"
              className="meta-mono text-[var(--primary)] underline-grow"
            >
              {t('browseCommunity')}
            </Link>
          </div>
        ) : (
          <div className="border-t border-[var(--border)]">
            {topics.map((topic, idx) => (
              <CommunityTopicItem
                key={topic.id}
                topic={topic}
                showCategory
                index={(page - 1) * PAGE_SIZE + idx + 1}
              />
            ))}
          </div>
        )}

        {/* 分页 */}
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
