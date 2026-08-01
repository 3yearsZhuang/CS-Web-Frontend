'use client';

/**
 * @file useReplyActions — 回复业务回调 hook
 *
 * 封装主题详情页回复相关状态与写操作（编辑/点赞/删除/提交/取消/楼中楼）。
 * sessionStorage 用于跨渲染保持 editing_reply_id；依赖调用方传入 topic/setReplies/loadReplies/setError。
 */

import { useCallback, useState } from 'react';
import type { ForumReplyDetail, ForumTopicDetail } from '@/modules/community/types';

interface UseReplyActionsParams {
  topic: ForumTopicDetail | null;
  setReplies: (
    updater: ForumReplyDetail[] | ((prev: ForumReplyDetail[]) => ForumReplyDetail[]),
  ) => void;
  loadReplies: () => Promise<void>;
  setError: (err: string | null) => void;
}

export interface ReplyActions {
  replyContent: string;
  setReplyContent: (content: string) => void;
  replyParentId: string | null;
  submittingReply: boolean;
  replyError: string | null;
  handleReplyLike: (targetType: 'topic' | 'reply', targetId: string) => Promise<void>;
  handleEditReply: (replyId: string, content: string) => void;
  handleDeleteReply: (replyId: string) => Promise<void>;
  handleSubmitReply: () => Promise<void>;
  handleCancelReply: () => void;
  handleReplyToParent: (parentReplyId: string) => void;
}

export function useReplyActions({
  topic,
  setReplies,
  loadReplies,
  setError,
}: UseReplyActionsParams): ReplyActions {
  const [replyContent, setReplyContent] = useState('');
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const handleReplyLike = useCallback(
    async (targetType: 'topic' | 'reply', targetId: string) => {
      setReplies((prev) =>
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
        const res = await fetch('/api/community/forum/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetType, targetId }),
        });
        if (!res.ok) throw new Error('操作失败');
        const data = (await res.json()) as { liked: boolean; likeCount: number };
        setReplies((prev) =>
          prev.map((r) =>
            r.id === targetId
              ? { ...r, isLikedByMe: data.liked, likeCount: data.likeCount }
              : r,
          ),
        );
      } catch {
        // 回滚由下一次 loadReplies 修正
      }
    },
    [setReplies],
  );

  const handleEditReply = useCallback((replyId: string, content: string) => {
    setReplyParentId(null);
    setReplyContent(content);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('forum_editing_reply_id', replyId);
    }
  }, []);

  const handleDeleteReply = useCallback(
    async (replyId: string) => {
      try {
        const res = await fetch(`/api/community/forum/replies/${replyId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? '删除失败');
        }
        await loadReplies();
      } catch (err) {
        setError(err instanceof Error ? err.message : '删除失败');
      }
    },
    [loadReplies, setError],
  );

  const handleSubmitReply = useCallback(async () => {
    if (!topic) return;
    if (!replyContent.trim()) {
      setReplyError('回复内容不能为空');
      return;
    }
    setSubmittingReply(true);
    setReplyError(null);

    const editingReplyId =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('forum_editing_reply_id')
        : null;

    try {
      if (editingReplyId) {
        const res = await fetch(`/api/community/forum/replies/${editingReplyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentMarkdown: replyContent }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? '编辑失败');
        }
        sessionStorage.removeItem('forum_editing_reply_id');
      } else {
        const res = await fetch(`/api/community/forum/topics/${topic.id}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentMarkdown: replyContent,
            parentReplyId: replyParentId,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? '发布失败');
        }
      }
      setReplyContent('');
      setReplyParentId(null);
      await loadReplies();
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setSubmittingReply(false);
    }
  }, [topic, replyContent, replyParentId, loadReplies]);

  const handleCancelReply = useCallback(() => {
    setReplyContent('');
    setReplyParentId(null);
    setReplyError(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('forum_editing_reply_id');
    }
  }, []);

  const handleReplyToParent = useCallback((parentReplyId: string) => {
    setReplyParentId(parentReplyId);
    setReplyContent('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('forum_editing_reply_id');
    }
  }, []);

  return {
    replyContent,
    setReplyContent,
    replyParentId,
    submittingReply,
    replyError,
    handleReplyLike,
    handleEditReply,
    handleDeleteReply,
    handleSubmitReply,
    handleCancelReply,
    handleReplyToParent,
  };
}
