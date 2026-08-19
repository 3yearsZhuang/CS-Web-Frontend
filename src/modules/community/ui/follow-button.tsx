/**
 * @file 关注/取关按钮（客户端组件）
 *
 * 用法：
 *   <FollowButton targetUserId={authorId} currentUserId={currentUser?.id} />
 *
 * - 未登录：点击跳转 /login
 * - 已登录且非本人：显示「关注 / 已关注」切换，调用 POST /api/community/users/[id]/follow
 * - 关注状态首次挂载时若未显式传入，则从 GET 同名接口拉取
 *
 * 数据逻辑（关注态/乐观更新/回滚）已收敛至 useFollow（C-19），本组件仅负责 UI 与登录跳转。
 */
'use client';

import { useTranslations } from 'next-intl';
import { useFollow } from './use-follow';

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
  const { isSelf, following, loaded, pending, toggle } = useFollow({
    targetUserId,
    currentUserId,
    initialFollowing,
  });

  if (isSelf) return null;

  const base = compact
    ? 'meta-mono text-[10px] px-2 py-1 border'
    : 'meta-mono text-[11px] px-3 py-1.5 border';

  return (
    <button
      type="button"
      onClick={() => void toggle()}
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
