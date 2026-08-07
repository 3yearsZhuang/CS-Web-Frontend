/**
 * @file 关注/取关按钮（客户端组件）
 *
 * 用法：
 *   <FollowButton targetUserId={authorId} currentUserId={currentUser?.id} />
 *
 * - 未登录：点击跳转 /login
 * - 已登录且非本人：显示「关注 / 已关注」切换，调用 POST /api/community/users/[id]/follow
 * - 关注状态首次挂载时若未显式传入，则从 GET 同名接口拉取
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface FollowButtonProps {
  targetUserId: string;
  currentUserId?: string;
  /** 可选初始状态，避免首屏闪烁；不传则自动拉取 */
  initialFollowing?: boolean;
  /** 紧凑样式（用于 hero 行内） */
  compact?: boolean;
}

export function FollowButton({
  targetUserId,
  currentUserId,
  initialFollowing,
  compact,
}: FollowButtonProps) {
  const t = useTranslations('follow');
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
      try {
        const res = await fetch(`/api/community/users/${targetUserId}/follow`, {
          cache: 'no-store',
        });
        const data = (await res.json()) as { following: boolean };
        if (!cancelled) {
          setFollowing(data.following);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, initialFollowing, isSelf]);

  const handleClick = useCallback(async () => {
    if (!currentUserId) {
      router.push('/login');
      return;
    }
    if (isSelf || pending) return;
    setPending(true);
    try {
      const res = await fetch(`/api/community/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = (await res.json()) as { following: boolean };
        setFollowing(data.following);
      }
    } catch {
      // 静默失败，保持原状态
    } finally {
      setPending(false);
    }
  }, [currentUserId, isSelf, pending, targetUserId, router]);

  if (isSelf) return null;

  const base = compact
    ? 'meta-mono text-[10px] px-2 py-1 border'
    : 'meta-mono text-[11px] px-3 py-1.5 border';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`${base} transition-colors focus-amber disabled:opacity-50 ${
        following
          ? 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:border-[var(--destructive)]'
          : 'border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5'
      }`}
    >
      {pending ? t('pending') : following ? t('following') : t('follow')}
    </button>
  );
}
