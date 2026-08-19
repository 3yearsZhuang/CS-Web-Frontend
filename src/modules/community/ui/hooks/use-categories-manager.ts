'use client';

/**
 * @file useCategoriesManager — 版块管理数据逻辑 hook（P1-6 / C-19 架构收敛）
 *
 * 从 categories-manager.tsx 抽出版块列表加载 + 新建/编辑/删除 3 个操作，
 * 全部裸 fetch 收敛到 apiRequest（统一错误归一/JSON/状态判定）。
 * 组件保留新建/编辑表单视图态、字段校验与 confirm 时序，仅作为 UI 壳。
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiRequest, type ApiRequestResult } from '@/shared/hooks/use-api-request';
import { getError, type CategoryInput, type CategoriesResponse } from '../community-admin-utils';
import type { CommunityCategory } from '@/modules/community/types';

const CATEGORIES_URL = '/api/admin/community/community/categories';

export interface UseCategoriesManagerResult {
  categories: CommunityCategory[];
  loading: boolean;
  error: string | null;
  loadCategories: () => Promise<void>;
  createCategory: (input: CategoryInput) => Promise<ApiRequestResult<unknown>>;
  updateCategory: (id: string, input: CategoryInput) => Promise<ApiRequestResult<unknown>>;
  deleteCategory: (id: string) => Promise<ApiRequestResult<unknown>>;
}

export function useCategoriesManager(): UseCategoriesManagerResult {
  const t = useTranslations('communityAdmin');
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiRequest<CategoriesResponse>(CATEGORIES_URL);
    if (!result.ok) {
      setError(getError(result.data, t('loadFailed')));
      setCategories([]);
    } else {
      setCategories(result.data?.items ?? []);
    }
    setLoading(false);
  }, [t]);

  const createCategory = useCallback(
    async (input: CategoryInput): Promise<ApiRequestResult<unknown>> => {
      const result = await apiRequest(CATEGORIES_URL, {
        method: 'POST',
        body: {
          slug: input.slug.trim(),
          name: input.name.trim(),
          description: input.description?.trim() || null,
          icon: input.icon?.trim() || null,
          sortOrder: input.sortOrder ?? 0,
        },
      });
      if (result.ok) await loadCategories();
      return result;
    },
    [loadCategories],
  );

  const updateCategory = useCallback(
    async (id: string, input: CategoryInput): Promise<ApiRequestResult<unknown>> => {
      const result = await apiRequest(`${CATEGORIES_URL}/${id}`, {
        method: 'PUT',
        body: {
          slug: input.slug.trim(),
          name: input.name.trim(),
          description: input.description?.trim() || null,
          icon: input.icon?.trim() || null,
          sortOrder: input.sortOrder ?? 0,
        },
      });
      if (result.ok) await loadCategories();
      return result;
    },
    [loadCategories],
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<ApiRequestResult<unknown>> => {
      const result = await apiRequest(`${CATEGORIES_URL}/${id}`, { method: 'DELETE' });
      if (result.ok) {
        await loadCategories();
      } else {
        setError(getError(result.data, t('deleteFailed')));
      }
      return result;
    },
    [loadCategories, t],
  );

  return {
    categories,
    loading,
    error,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
