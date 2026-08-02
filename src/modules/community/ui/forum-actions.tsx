/**
 * @file 论坛操作栏 — 点赞/收藏/编辑/删除/回复（紧凑模式供楼中楼使用）
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { ReportButton } from './report-button';

type TargetType = 'topic' | 'reply';

/** 论坛操作栏属性 */
interface ForumActionsProps {
  /** 操作目标类型 */
  targetType: TargetType;
  /** 操作目标 ID */
  targetId: string;
  /** 点赞数 */
  likeCount: number;
  /** 当前用户是否已点赞 */
  isLikedByMe: boolean;
  /** 是否为作者（控制编辑/删除显隐） */
  isAuthor: boolean;
  /** 是否已登录 */
  isLoggedIn: boolean;
  /** 是否为管理员 */
  isCurrentUserAdmin?: boolean;
  /** 是否显示收藏按钮（仅主题用） */
  showFavorite?: boolean;
  /** 收藏数 */
  favoriteCount?: number;
  /** 当前用户是否已收藏 */
  isFavoritedByMe?: boolean;
  /** 紧凑模式（楼中楼用） */
  compact?: boolean;
  /** 点赞回调 */
  onLike?: (targetType: TargetType, targetId: string) => Promise<void>;
  /** 收藏回调 */
  onFavorite?: (topicId: string) => Promise<void>;
  /** 回复回调（仅回复项用） */
  onReply?: () => void;
  /** 编辑回调 */
  onEdit?: () => Promise<void>;
  /** 删除回调 */
  onDelete?: () => Promise<void>;
  /** 是否显示举报按钮（非作者、已登录时由父组件控制） */
  showReport?: boolean;
  /** 额外 className */
  className?: string;
}

/** 论坛操作栏组件 — 点赞/收藏/回复/编辑/删除按钮组，紧凑模式供楼中楼使用 */
export function ForumActions({
  targetType,
  targetId,
  likeCount,
  isLikedByMe,
  isAuthor,
  isLoggedIn,
  isCurrentUserAdmin = false,
  showFavorite = false,
  favoriteCount = 0,
  isFavoritedByMe = false,
  compact = false,
  onLike,
  onFavorite,
  onReply,
  onEdit,
  onDelete,
  showReport = false,
  className = '',
}: ForumActionsProps) {
  const [likeBusy, setLikeBusy] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const { confirm } = useConfirm();

  const canEdit = isAuthor || isCurrentUserAdmin;

  /** 点赞 */
  const handleLike = async () => {
    if (!isLoggedIn || likeBusy) return;
    setLikeBusy(true);
    try {
      await onLike?.(targetType, targetId);
    } finally {
      setLikeBusy(false);
    }
  };

  /** 收藏 */
  const handleFavorite = async () => {
    if (!isLoggedIn || favBusy || targetType !== 'topic') return;
    setFavBusy(true);
    try {
      await onFavorite?.(targetId);
    } finally {
      setFavBusy(false);
    }
  };

  /** 编辑 */
  const handleEdit = async () => {
    if (!canEdit || editBusy) return;
    setEditBusy(true);
    try {
      await onEdit?.();
    } finally {
      setEditBusy(false);
    }
  };

  /** 删除 */
  const handleDelete = async () => {
    if (!canEdit || deleteBusy) return;
    const confirmed = await confirm({
      title: '删除',
      message: '确认删除？此操作不可恢复。',
      variant: 'danger',
      confirmLabel: '确认删除',
    });
    if (!confirmed) return;
    setDeleteBusy(true);
    try {
      await onDelete?.();
    } finally {
      setDeleteBusy(false);
    }
  };

  const btnCls = compact
    ? 'px-3 py-2 text-[11px] gap-1 min-h-[44px] min-w-[44px]'
    : 'px-4 py-2.5 text-[12px] gap-1.5 min-h-[44px] min-w-[44px]';

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="toolbar"
      aria-label="论坛内容操作"
    >
      {/* 点赞 */}
      <Button
        variant="outline"
        onClick={handleLike}
        disabled={!isLoggedIn || likeBusy}
        aria-pressed={isLikedByMe}
        className={`flex items-center font-mono uppercase tracking-wider ${btnCls} ${
          isLikedByMe
            ? 'border-[var(--primary)] !text-[var(--primary)] bg-[var(--primary)]/5'
            : ''
        }`}
        title={isLoggedIn ? (isLikedByMe ? '取消点赞' : '点赞') : '请先登录'}
      >
        <span aria-hidden="true">{isLikedByMe ? '♥' : '♡'}</span>
        <span className="tabular-nums">{likeCount}</span>
      </Button>

      {/* 收藏（仅主题） */}
      {showFavorite && targetType === 'topic' && (
        <Button
          variant="outline"
          onClick={handleFavorite}
          disabled={!isLoggedIn || favBusy}
          aria-pressed={isFavoritedByMe}
          className={`flex items-center font-mono uppercase tracking-wider ${btnCls} ${
            isFavoritedByMe
              ? 'border-[var(--primary)] !text-[var(--primary)] bg-[var(--primary)]/5'
              : ''
          }`}
          title={isLoggedIn ? (isFavoritedByMe ? '取消收藏' : '收藏') : '请先登录'}
        >
          <span aria-hidden="true">{isFavoritedByMe ? '★' : '☆'}</span>
          <span className="tabular-nums">{favoriteCount}</span>
        </Button>
      )}

      {/* 分隔发丝线 */}
      {(onReply || canEdit) && (
        <span className="h-3 w-px bg-[var(--border)]" aria-hidden="true" />
      )}

      {/* 回复（仅回复项） */}
      {onReply && (
        <Button
          variant="outline"
          onClick={onReply}
          disabled={!isLoggedIn}
          className={`flex items-center font-mono uppercase tracking-wider ${btnCls}`}
          title={isLoggedIn ? '回复' : '请先登录'}
        >
          Reply
        </Button>
      )}

      {/* 编辑（作者或管理员） */}
      {canEdit && onEdit && (
        <Button
          variant="outline"
          onClick={handleEdit}
          disabled={editBusy}
          className={`flex items-center font-mono uppercase tracking-wider ${btnCls}`}
          title="编辑"
        >
          {editBusy ? '...' : 'Edit'}
        </Button>
      )}

      {/* 删除（作者或管理员） */}
      {canEdit && onDelete && (
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={deleteBusy}
          className={`flex items-center font-mono uppercase tracking-wider ${btnCls}`}
          title="删除"
        >
          {deleteBusy ? '...' : 'Del'}
        </Button>
      )}

      {/* 举报（非作者、已登录） */}
      {showReport && !isAuthor && isLoggedIn && (
        <ReportButton targetType={targetType} targetId={targetId} />
      )}
    </div>
  );
}
