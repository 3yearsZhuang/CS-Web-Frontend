'use client';

/**
 * @file useReplyActions — 回复业务回调 hook
 *
 * 封装主题详情页回复相关状态与写操作（编辑/点赞/删除/提交/取消/楼中楼）。
 * sessionStorage 用于跨渲染保持 editing_reply_id；依赖调用方传入 topic/setReplies/loadReplies/setError。
 */

import { useCallback, useState } from 'react';
import type { CommunityCommentDetail, CommunityPostDetail } from '@/modules/community/types';
import { apiRequest } from '@/shared/hooks/use-api-request';

interface UseReplyActionsParams {
  topic: CommunityPostDetail | null;
  setReplies: (
    updater: CommunityCommentDetail[] | ((prev: CommunityCommentDetail[]) => CommunityCommentDetail[]),
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
        const r = await apiRequest<{ liked: boolean; likeCount: number }>('/api/community/like', {
          method: 'POST',
          body: { targetType, targetId },
        });
        if (!r.ok || !r.data) throw new Error('操作失败');
        const liked = r.data;
        setReplies((prev) =>
          prev.map((rp) =>
            rp.id === targetId
              ? { ...rp, isLikedByMe: liked.liked, likeCount: liked.likeCount }
              : rp,
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
      sessionStorage.setItem('community_editing_reply_id', replyId);
    }
  }, []);

  const handleDeleteReply = useCallback(
    async (replyId: string) => {
      try {
        const r = await apiRequest(`/api/community/replies/${replyId}`, {
          method: 'DELETE',
        });
        if (!r.ok) throw new Error(r.error ?? '删除失败');
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
        ? sessionStorage.getItem('community_editing_reply_id')
        : null;

    try {
      if (editingReplyId) {
        const r = await apiRequest(`/api/community/replies/${editingReplyId}`, {
          method: 'PUT',
          body: { contentMarkdown: replyContent },
        });
        if (!r.ok) throw new Error(r.error ?? '编辑失败');
        sessionStorage.removeItem('community_editing_reply_id');
      } else {
        const r = await apiRequest(`/api/community/topics/${topic.id}/replies`, {
          method: 'POST',
          body: {
            contentMarkdown: replyContent,
            parentReplyId: replyParentId,
          },
        });
        if (!r.ok) throw new Error(r.error ?? '发布失败');
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
      sessionStorage.removeItem('community_editing_reply_id');
    }
  }, []);

  const handleReplyToParent = useCallback((parentReplyId: string) => {
    setReplyParentId(parentReplyId);
    setReplyContent('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('community_editing_reply_id');
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
