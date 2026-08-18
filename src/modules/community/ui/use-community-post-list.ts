/**
 * @file useCommunityPostList — 社区帖子列表数据逻辑（C-19 收敛）
 *
 * 从 `community-post-list.tsx` 抽出：给定 endpoint 拉取并归一为 FeedItem[]。
 * 保留原竞态防护（request-id ref）：仅采用最新一次请求结果，旧请求结果丢弃。
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { FeedItem, CommunityPost, PostKind } from '@/modules/community/types';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { useTranslations } from 'next-intl';

export const POST_LIST_PAGE_SIZE = 20;

type SortAtField = 'updatedAt' | 'createdAt' | 'publishedAt';

interface PostListResponse {
  items?: CommunityPost[];
  totalPages?: number;
  data?: {
    items?: CommunityPost[];
    posts?: { items?: CommunityPost[] };
    totalPages?: number;
  };
}

export interface UseCommunityPostListResult {
  items: FeedItem[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  page: number;
  setPage: (p: number) => void;
}

/**
 * 社区帖子列表数据 hook。
 * @param endpoint 数据接口（返回 { items } 或 { data: { items|posts } }）
 * @param sortAtField 排序字段，默认 updatedAt
 */
export function useCommunityPostList(
  endpoint: string,
  sortAtField: SortAtField = 'updatedAt',
): UseCommunityPostListResult {
  const t = useTranslations('communityCommon');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);

  // request-id ref：保证竞态安全，只采用最新一次请求结果
  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);
    void apiRequest<PostListResponse>(
      `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&pageSize=${POST_LIST_PAGE_SIZE}`,
      { cache: 'no-store' },
    ).then((result) => {
      if (reqId !== reqIdRef.current) return; // 过期请求，丢弃
      if (!result.ok) {
        setError(result.error ?? t('postListLoadFailed'));
        setLoading(false);
        return;
      }
      const json = result.data;
      const list: CommunityPost[] =
        Array.isArray(json?.items) ? json.items
        : json?.data?.items ?? json?.data?.posts?.items ?? [];
      const tPages = json?.totalPages ?? json?.data?.totalPages ?? 1;
      setItems(
        list.map((p) => ({
          kind: p.kind as PostKind,
          sortAt: (p as unknown as Record<string, string>)[sortAtField] ?? p.createdAt,
          data: p,
        })),
      );
      setTotalPages(tPages);
      setLoading(false);
    });
  }, [endpoint, page, sortAtField, t]);

  return { items, loading, error, totalPages, page, setPage };
}
