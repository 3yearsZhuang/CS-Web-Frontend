'use client';

/**
 * @file useFollow — 关注/取关 数据逻辑 hook（C-19 收敛样板）
 *
 * 从 follow-button.tsx 抽出的关注态管理：移除组件内联 fetch，统一收敛到
 * 「组件 → use-* hook → BFF fetch」范式（对齐 useTopicActions 的乐观更新+失败回滚）。
 * 底层 fetch 已收敛至共享原语 `apiRequest`（C-19 收尾，消除裸 fetch 样板）。
 *
 * - 首屏若未显式传入 initialFollowing 且非本人，拉取 GET /api/community/users/[id]/follow 取状态
 * - toggle() 执行 POST 关注/取关，乐观翻转 + 失败回滚
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/shared/hooks/use-api-request';

interface UseFollowParams {
  targetUserId: string;
  currentUserId?: string;
  /** 可选初始状态，避免首屏闪烁；不传则自动拉取 */
  initialFollowing?: boolean;
}

interface UseFollowResult {
  isSelf: boolean;
  following: boolean;
  loaded: boolean;
  pending: boolean;
  toggle: () => Promise<void>;
}

export function useFollow({
  targetUserId,
  currentUserId,
  initialFollowing,
}: UseFollowParams): UseFollowResult {
  const router = useRouter();
  const isSelf = !!currentUserId && currentUserId === targetUserId;
  const [following, setFollowing] = useState<boolean>(initialFollowing ?? false);
  const [loaded, setLoaded] = useState<boolean>(initialFollowing !== undefined);
  const [pending, setPending] = useState(false);

  // 未显式传入状态时，首屏拉取一次
  useEffect(() => {
    if (initialFollowing !== undefined || isSelf) return;
    let cancelled = false;
    (async () => {
      const result = await apiRequest<{ following: boolean }>(
        `/api/community/users/${targetUserId}/follow`,
        { cache: 'no-store' },
      );
      if (!cancelled && result.data) {
        setFollowing(result.data.following);
        setLoaded(true);
      } else if (!cancelled) {
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, initialFollowing, isSelf]);

  const toggle = useCallback(async () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    if (isSelf || pending) return;
    const prev = following;
    setPending(true);
    setFollowing(!prev); // 乐观翻转
    const result = await apiRequest<{ following: boolean }>(
      `/api/community/users/${targetUserId}/follow`,
      { method: 'POST' },
    );
    if (result.ok && result.data) {
      setFollowing(result.data.following);
    } else {
      setFollowing(prev); // 失败回滚
    }
    setPending(false);
  }, [currentUserId, isSelf, pending, following, targetUserId, router]);

  return { isSelf, following, loaded, pending, toggle };
}
