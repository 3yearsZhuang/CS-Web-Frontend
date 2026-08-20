/**
 * @file useAdminCollection — 管理列表数据逻辑工厂（重复实现治理波次 C1d：#16）。
 *
 * 收敛 community 域 6 个 use-*-manager 中完全同构的「列表加载样板」：
 *   items/loading/error 状态 + setLoading/setError + apiRequest + getError + items 提取。
 * 各 manager 保留差异部分（action 方法、busyIds、runAction 语义、分页/查询参数）。
 *
 * 用法：
 *   const { items, loading, error, fetchList } = useAdminCollection<AnnouncementItem>('announcementsAdmin');
 *   const loadXxx = useCallback(() => fetchList('/api/xxx'), [fetchList]);
 *
 * 说明：工厂依赖 community 域内部工具 getError（i18n fallback 文案各 ns 的 loadFailed），
 * 故置于 community/ui/hooks/ 而非 shared/；若未来跨域复用再提升到 shared 并参数化错误文案。
 */
'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { getError } from '../community-admin-utils';

export function useAdminCollection<T>(tNs: string) {
  const t = useTranslations(tNs);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (url: string) => {
      setLoading(true);
      setError(null);
      const result = await apiRequest<{ items: T[] }>(url);
      if (!result.ok) {
        setError(getError(result.data, t('loadFailed')));
        setItems([]);
      } else {
        setItems(result.data?.items ?? []);
      }
      setLoading(false);
    },
    [t],
  );

  return { items, setItems, loading, error, setError, fetchList };
}
