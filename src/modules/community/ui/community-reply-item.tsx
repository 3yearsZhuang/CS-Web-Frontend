/**
 * @file 回复项 — 主回复 + 楼中楼折叠（默认 >3 条折叠，复用 CommunityActions）
 */

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { MarkdownRenderer } from './community-markdown-renderer';
import { CommunityActions } from './community-actions';
import { formatDateTime } from '@/shared/utils/utils';
import type { CommunityCommentDetail, NestedCommentsResult } from '@/modules/community/types';
import { useTranslations } from 'next-intl';

interface CommunityReplyItemProps {
  /** 主回复数据 */
  reply: CommunityCommentDetail;
  /** 当前登录用户 ID（用于判断是否为作者） */
  currentUserId?: string;
  /** 是否为管理员 */
  isCurrentUserAdmin?: boolean;
  /** 是否已登录（控制操作按钮显隐） */
  isLoggedIn?: boolean;
  /** 回复楼中楼加载器 — 由父级传入以避免重复请求 */
  nestedRepliesLoader?: (parentId: string) => Promise<NestedCommentsResult | null>;
  /** 回复按钮回调 — 用于打开楼中楼编辑器 */
  onReply?: (parentReplyId: string) => void;
  /** 编辑回调 */
  onEdit?: (replyId: string, content: string) => void | Promise<void>;
  /** 删除回调 */
  onDelete?: (replyId: string) => Promise<void>;
  /** 主回复点赞回调 — 由父级管理状态（更新 replies 数组） */
  onLike?: (targetType: 'topic' | 'reply', targetId: string) => Promise<void>;
  /** 额外 className */
  className?: string;
}

/** 楼中楼初始展示数量，超过则折叠 */
const NESTED_PREVIEW_LIMIT = 3;

export function CommunityReplyItem({
  reply,
  currentUserId,
  isCurrentUserAdmin = false,
  isLoggedIn = false,
  nestedRepliesLoader,
  onReply,
  onEdit,
  onDelete,
  onLike,
  className = '',
}: CommunityReplyItemProps) {
  const t = useTranslations('communityCommon');
  const [nested, setNested] = useState<CommunityCommentDetail[]>([]);
  const [nestedTotal, setNestedTotal] = useState(reply.replyCount);
  const [nestedLoading, setNestedLoading] = useState(false);
  const [nestedExpanded, setNestedExpanded] = useState(false);
  const [nestedError, setNestedError] = useState<string | null>(null);

  const isAuthor = !!currentUserId && currentUserId === reply.authorId;

  /** 加载楼中楼 */
  const loadNested = useCallback(async () => {
    if (!nestedRepliesLoader) return;
    setNestedLoading(true);
    setNestedError(null);
    try {
      const result = await nestedRepliesLoader(reply.id);
      if (result) {
        setNested(result.items);
        setNestedTotal(result.total);
        setNestedExpanded(true);
      }
    } catch {
      setNestedError(t('loadNestedFailed'));
    } finally {
      setNestedLoading(false);
    }
  }, [nestedRepliesLoader, reply.id]);

  /** 切换折叠 */
  const handleToggleNested = () => {
    if (nestedExpanded) {
      setNestedExpanded(false);
    } else if (nested.length > 0) {
      setNestedExpanded(true);
    } else {
      void loadNested();
    }
  };

  const visibleNested = nestedExpanded ? nested : nested.slice(0, NESTED_PREVIEW_LIMIT);
  const hiddenNestedCount = nestedTotal - visibleNested.length;

  /** 楼中楼点赞 — 本组件自行管理 nested 状态（父级只管主回复） */
  const handleNestedLike = async (
    targetType: 'topic' | 'reply',
    targetId: string,
  ) => {
    // 乐观更新本地 nested 状态
    setNested((prev) =>
      prev.map((r) => {
        if (r.id === targetId) {
          const wasLiked = r.isLikedByMe;
          return {
            ...r,
            isLikedByMe: !wasLiked,
            likeCount: r.likeCount + (wasLiked ? -1 : 1),
          };
        }
        return r;
      }),
    );
    try {
      const res = await fetch('/api/community/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId }),
      });
      if (!res.ok) throw new Error('操作失败');
      const data = (await res.json()) as { liked: boolean; likeCount: number };
      setNested((prev) =>
        prev.map((r) =>
          r.id === targetId
            ? { ...r, isLikedByMe: data.liked, likeCount: data.likeCount }
            : r,
        ),
      );
    } catch {
      // 回滚 — 重新加载楼中楼
      void loadNested();
    }
  };

  return (
    <article
      className={`relative border-l-2 border-[var(--primary)] pl-4 sm:pl-6 py-5 ${className}`}
    >
      {/* 头部 — 作者 + 时间 */}
      <header className="flex items-center gap-3 mb-4">
        <Link
          href={`/users/${reply.authorId}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Avatar
            email={reply.author?.email ?? 'anonymous'}
            displayName={reply.author?.displayName}
            avatarUrl={reply.author?.avatarUrl}
            avatarType={reply.author?.avatarType}
            size={28}
          />
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[13px] text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
              {reply.author?.displayName ?? t('anonymous')}
            </span>
            <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
              {formatDateTime(reply.createdAt)}
            </span>
          </div>
        </Link>
      </header>

      {/* 内容 */}
      <MarkdownRenderer
        content={reply.contentMarkdown}
        className="mb-4"
      />

      {/* 操作栏 */}
      <CommunityActions
        targetType="reply"
        targetId={reply.id}
        likeCount={reply.likeCount}
        isLikedByMe={reply.isLikedByMe}
        isAuthor={isAuthor}
        isLoggedIn={isLoggedIn}
        isCurrentUserAdmin={isCurrentUserAdmin}
        onLike={onLike}
        onReply={() => onReply?.(reply.id)}
        onEdit={async () => onEdit?.(reply.id, reply.contentMarkdown)}
        onDelete={async () => onDelete?.(reply.id)}
      />

      {/* 楼中楼 */}
      {nestedTotal > 0 && (
        <div className="mt-5 ml-2 sm:ml-4 border-l border-[var(--border)] pl-4 sm:pl-5">
          {/* 折叠/展开按钮 */}
          <button
            type="button"
            onClick={handleToggleNested}
            disabled={nestedLoading}
            className="meta-mono text-[var(--primary)] hover:opacity-70 transition-opacity focus-amber disabled:opacity-50 py-2 min-h-[44px]"
          >
            {nestedLoading
              ? t('loading')
              : nestedExpanded
                ? t('collapseNested', { count: nestedTotal })
                : t('expandNested', { count: nestedTotal })}
          </button>

          {/* 楼中楼列表 */}
          {nestedExpanded && (
            <div className="mt-4 space-y-4">
              {nestedError && (
                <div className="meta-mono text-[var(--destructive)]">
                  {nestedError}
                  <button
                    type="button"
                    onClick={loadNested}
                    className="ml-3 underline hover:text-[var(--foreground)] transition-colors"
                  >
                    {t('retry')}
                  </button>
                </div>
              )}
              {visibleNested.map((nr) => {
                const nestedIsAuthor =
                  !!currentUserId && currentUserId === nr.authorId;
                return (
                  <div
                    key={nr.id}
                    className="bg-[var(--accent)]/30 border border-[var(--border)] p-3 sm:p-4"
                  >
                    <header className="flex items-center gap-2 mb-3">
                      <Link
                        href={`/users/${nr.authorId}`}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity py-1 min-h-[44px]"
                      >
                        <Avatar
                          email={nr.author?.email ?? 'anonymous'}
                          displayName={nr.author?.displayName}
                          avatarUrl={nr.author?.avatarUrl}
                          avatarType={nr.author?.avatarType}
                          size={24}
                        />
                        <span className="font-mono text-[12px] text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                          {nr.author?.displayName ?? t('anonymous')}
                        </span>
                      </Link>
                      <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)]">
                        {formatDateTime(nr.createdAt)}
                      </span>
                    </header>
                    <MarkdownRenderer
                      content={nr.contentMarkdown}
                      className="text-[14px] mb-3"
                    />
                    <CommunityActions
                      targetType="reply"
                      targetId={nr.id}
                      likeCount={nr.likeCount}
                      isLikedByMe={nr.isLikedByMe}
                      isAuthor={nestedIsAuthor}
                      isLoggedIn={isLoggedIn}
                      isCurrentUserAdmin={isCurrentUserAdmin}
                      compact
                      onLike={handleNestedLike}
                      onEdit={async () => onEdit?.(nr.id, nr.contentMarkdown)}
                      onDelete={async () => onDelete?.(nr.id)}
                    />
                  </div>
                );
              })}
              {hiddenNestedCount > 0 && (
                <button
                  type="button"
                  onClick={loadNested}
                  disabled={nestedLoading}
                  className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors focus-amber"
                >
                  {t('loadMoreNested', { count: hiddenNestedCount })}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
