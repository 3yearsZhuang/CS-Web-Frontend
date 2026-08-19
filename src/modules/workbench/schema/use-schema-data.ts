/**
 * @file Schema 卡数据源 hook — 统一 local / api / static 三种数据读取。
 * - local：useLocalStorage（wb_ 前缀由校验器保证）
 * - api：fetch 白名单端点 → path 点号取数（如 data.items）
 * - static：直接返回 value
 * 返回 { items, loading, error, setItems }；setItems 仅 local 源可用（写回）。
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { useLocalStorage } from '../hooks/use-local-storage';
import type { SchemaData } from './widget-schema';

/** 按点号路径取数，如 'data.items'；path 为空返回整值 */
export function pickByPath<T = unknown>(root: unknown, path?: string): T | undefined {
  if (!path) return root as T;
  let cur: unknown = root;
  for (const seg of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur as T;
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

export interface UseSchemaDataResult {
  items: unknown[];
  loading: boolean;
  error: string | null;
  /** 仅 local 源可用；api/static 为 noop */
  setItems: (next: unknown[] | ((prev: unknown[]) => unknown[])) => void;
}

export function useSchemaData(data: SchemaData): UseSchemaDataResult {
  const [apiItems, setApiItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 提前解构联合类型的分支字段（deps 数组在闭包外，TS 无法按 kind 收窄）
  const apiUrl = data.kind === 'api' ? data.url : null;
  const apiPath = data.kind === 'api' ? data.path : undefined;
  const staticValue = data.kind === 'static' ? data.value : null;

  const [localItems, setLocalItems] = useLocalStorage<unknown[]>(
    data.kind === 'local' ? data.key : '__schema_unused__',
    () => (data.kind === 'local' ? (data.default as unknown[] | undefined) ?? [] : []),
  );

  useEffect(() => {
    if (apiUrl == null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const r = await apiRequest<unknown>(apiUrl, { cache: 'no-store' });
        if (cancelled) return;
        if (!r.ok) {
          setError(`请求失败 (${r.status})`);
          return;
        }
        const picked = pickByPath(r.data, apiPath);
        setApiItems(isArray(picked) ? picked : []);
      } catch {
        if (!cancelled) setError('网络异常');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiUrl, apiPath]);

  return useMemo(() => {
    if (data.kind === 'local') {
      return {
        items: isArray(localItems) ? localItems : [],
        loading: false,
        error: null,
        setItems: setLocalItems as UseSchemaDataResult['setItems'],
      };
    }
    if (data.kind === 'api') {
      return { items: apiItems, loading, error, setItems: () => {} };
    }
    return {
      items: isArray(staticValue) ? staticValue : [],
      loading: false,
      error: null,
      setItems: () => {},
    };
  }, [data.kind, staticValue, localItems, apiItems, loading, error, setLocalItems]);
}
