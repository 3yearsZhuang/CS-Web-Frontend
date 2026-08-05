/**
 * @file 社区帖子列表（客户端）— 给定 API url，拉取并渲染 FeedItemCard 列表
 *
 * 供标签详情页、系列详情页、草稿箱复用。
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FeedItemCard } from './feed-item-card';
import { EmptyState, SectionLoading } from '@/components';
import type { FeedItem, CommunityPost, PostKind } from '@/modules/community/types';

const PAGE_SIZE = 20;

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
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&pageSize=${PAGE_SIZE}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('加载失败');
        const json = await res.json();
        const list: CommunityPost[] =
          Array.isArray(json.items) ? json.items
          : json.data?.items ?? json.data?.posts?.items ?? [];
        const tPages = json.totalPages ?? json.data?.totalPages ?? 1;
        if (cancelled) return;
        setItems(
          list.map((p) => ({
            kind: p.kind as PostKind,
            sortAt: (p as unknown as Record<string, string>)[sortAtField] ?? p.createdAt,
            data: p,
          })),
        );
        setTotalPages(tPages);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, page]);

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
            浏览全部内容 →
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
          index={(page - 1) * PAGE_SIZE + idx + 1}
        />
      ))}
    </div>
  );
}
