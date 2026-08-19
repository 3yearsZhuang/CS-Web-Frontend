/**
 * @file 社区帖子列表（客户端）— 给定 API url，拉取并渲染 FeedItemCard 列表
 *
 * 供标签详情页、系列详情页、草稿箱复用。数据逻辑见 `use-community-post-list.ts`。
 */
'use client';

import Link from 'next/link';
import { FeedItemCard } from './feed-item-card';
import { EmptyState, SectionLoading } from '@/components';
import { useCommunityPostList, POST_LIST_PAGE_SIZE } from './hooks/use-community-post-list';
import { useTranslations } from 'next-intl';

interface CommunityPostListProps {
  /** 数据接口（返回 { items: CommunityPostDetail[]; total; totalPages } 或 { data: ... }） */
  endpoint: string;
  /** 空状态文案 */
  emptyText?: string;
  /** 排序字段，默认 updatedAt */
  sortAtField?: 'updatedAt' | 'createdAt' | 'publishedAt';
}

export function CommunityPostList({
  endpoint,
  emptyText = '// 暂无内容',
  sortAtField = 'updatedAt',
}: CommunityPostListProps) {
  const t = useTranslations('communityCommon');
  const { items, loading, error, page } = useCommunityPostList(endpoint, sortAtField);

  if (loading) {
    return <SectionLoading label="Loading..." />;
  }

  if (error) {
    return <div className="py-8 meta-mono text-[var(--destructive)]">{error}</div>;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        message={emptyText}
        className="py-16"
        action={
          <Link href="/community" className="meta-mono text-[var(--primary)] underline-grow">
            {t('postListBrowseAll')}
          </Link>
        }
      />
    );
  }

  return (
    <div className="border-t border-[var(--border)]">
      {items.map((item, idx) => (
        <FeedItemCard
          key={`${item.kind}-${item.data.id}`}
          item={item}
          index={(page - 1) * POST_LIST_PAGE_SIZE + idx + 1}
        />
      ))}
    </div>
  );
}
