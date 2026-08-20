/**
 * @file 全站搜索数据 hook — 防抖请求 /api/search（BFF），返回分组结果。
 * scope 由调用方（组件按路由）传入：hero 传 all，模块页传单 scope。
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { apiRequest } from '@/shared/hooks/use-api-request';
import type { SearchResponse, SearchScope } from '../../types';

/** 触发搜索的最小字符数（与 community 页原搜索一致） */
export const SEARCH_MIN_CHARS = 2;

export interface UseGlobalSearchOptions {
  scope: SearchScope;
  /** 每类返回条数（下拉即时结果用 5） */
  limit?: number;
}

export function useGlobalSearch({ scope, limit = 5 }: UseGlobalSearchOptions) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query.trim(), 300);
  // scope 变化时立即清空旧结果，避免跨模块残留
  useEffect(() => {
    setResponse(null);
    setError(null);
  }, [scope]);

  const requestSeq = useRef(0);
  useEffect(() => {
    const q = debouncedQuery;
    if (q.length < SEARCH_MIN_CHARS) {
      setResponse(null);
      setLoading(false);
      setError(null);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ q, scope, limit: String(limit) });
    apiRequest<SearchResponse>(`/api/search?${params.toString()}`)
      .then((r) => {
        if (seq !== requestSeq.current) return; // 丢弃过期响应
        setLoading(false);
        if (r.ok && r.data) {
          setResponse(r.data);
        } else {
          setError(r.error ?? 'search failed');
        }
      })
      .catch(() => {
        if (seq !== requestSeq.current) return;
        setLoading(false);
        setError('search failed');
      });
  }, [debouncedQuery, scope, limit]);

  const hasResults = useMemo(
    () => !!response && Object.values(response.results).some((g) => (g?.items.length ?? 0) > 0),
    [response],
  );

  /** 清空输入与结果（下拉关闭/清除按钮） */
  function clear() {
    setQuery('');
    setResponse(null);
    setError(null);
  }

  return { query, setQuery, response, loading, error, hasResults, clear };
}
