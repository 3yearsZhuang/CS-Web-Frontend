/**
 * @file 回复（评论）服务（已迁移至 Repository 抽象层，ADR-009）
 */
import crypto from 'node:crypto';
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import type { CommunityCommentRow } from '@/shared/db/repositories/community.repo';
import { formatComments, type FormattedComment, type PaginationInfo, computePagination } from '../shared';
import { resolveMentionedUsers, notifyMentionedUsers } from './mentions';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { getUserById } from '@/modules/auth/server/identity';
import { createNotification } from '@/modules/notification/server/notification-core';
import type { DbEngine } from '@/shared/db/drivers';

export interface ReplyListResult {
  items: FormattedComment[];
  pagination: PaginationInfo;
}

export async function listReplies(params: {
  topicId: string;
  parentReplyId?: string | null;
  status?: string;
  page?: number;
  pageSize?: number;
  currentUserId?: string;
  withReplies?: boolean;
  sort?: string;
}): Promise<ReplyListResult> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const where: string[] = ['post_id = ?'];
  const queryParams: unknown[] = [params.topicId];
  if (params.parentReplyId !== undefined) {
    if (params.parentReplyId === null) {
      where.push('parent_comment_id IS NULL');
    } else {
      where.push('parent_comment_id = ?');
      queryParams.push(params.parentReplyId);
    }
  }
  if (params.status) {
    where.push('status = ?');
    queryParams.push(params.status);
  }
  const whereSql = `WHERE ${where.join(' AND ')} ORDER BY created_at ASC`;

  const total = await repo.countComments(whereSql, queryParams);
  const rows = await repo.listComments(whereSql, queryParams);
  const pagedRows = rows.slice(0, pageSize);
  const items = await formatComments(pagedRows, {
    currentUserId: params.currentUserId,
    withReplies: params.withReplies,
  });

  return { items, pagination: computePagination(page, pageSize, total) };
}

export async function getReply(id: string, options?: { currentUserId?: string }): Promise<FormattedComment> {
  const repo = getCommunityRepository();
  const row = await repo.getCommentById(id);
  if (!row) throw new AppError('回复不存在', 'REPLY_NOT_FOUND');
  const [formatted] = await formatComments([row], { currentUserId: options?.currentUserId });
  return formatted;
}

export async function createReply(input: {
  topicId: string;
  authorId: string;
  contentMarkdown: string;
  parentReplyId?: string | null;
}): Promise<{ id: string }> {
  const repo = getCommunityRepository();
  const topic = await repo.getPublishedTopic(input.topicId);
  if (!topic) throw new AppError('话题不存在或不可回复', 'TOPIC_NOT_FOUND');

  let parentReplyId: string | null = null;
  if (input.parentReplyId) {
    const parent = await repo.getPublishedComment(input.parentReplyId);
    if (!parent) throw new AppError('父回复不存在', 'PARENT_REPLY_NOT_FOUND');
    parentReplyId = input.parentReplyId;
  }

  const id = crypto.randomUUID();
  await repo.insertComment({
    id,
    topicId: input.topicId,
    authorId: input.authorId,
    parentCommentId: parentReplyId,
    contentMarkdown: input.contentMarkdown,
  });
  await repo.updateCommentCounts(parentReplyId, input.topicId);
  await repo.touchTopicAfterReply(input.topicId, id);

  await processCommentMentions(id, input.contentMarkdown, input.authorId);
  const mentioned = await resolveMentionedUsers(input.contentMarkdown);
  await notifyMentionedUsers(mentioned, 'reply', id, input.authorId);

  const topicRow = await repo.getPostById(input.topicId);
  if (topicRow && topicRow.author_id !== input.authorId) {
    await createNotification(
      topicRow.author_id,
      'reply',
      '你的话题有了新回复',
      '有人回复了你参与的话题',
      input.authorId,
    );
  }

  // 楼中楼：通知父回复作者（跳过自己与话题作者已通知的情况）
  if (parentReplyId) {
    const parentRow = await repo.getCommentById(parentReplyId);
    if (parentRow && parentRow.author_id !== input.authorId) {
      await createNotification(
        parentRow.author_id,
        'reply',
        '你的回复有了新回复',
        '有人在回复中提到了你，点击查看。',
        input.authorId,
      );
    }
  }

  return { id };
}

export async function updateReply(
  id: string,
  updates: { contentMarkdown: string },
  editorId: string,
): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getCommentTopicParent(id);
  if (!existing) throw new AppError('回复不存在', 'REPLY_NOT_FOUND');
  const editor = await getUserById(editorId);
  const isAdmin = editor?.role === 'admin';
  if (existing.author_id !== editorId && !isAdmin) {
    throw new AppError('无权修改该回复', 'FORBIDDEN');
  }
  await repo.updateCommentContent(id, updates.contentMarkdown);

  if (existing.status === 'published') {
    const mentioned = await resolveMentionedUsers(updates.contentMarkdown);
    await notifyMentionedUsers(mentioned, 'reply', id, editorId);
  }
}

export async function deleteReply(id: string, deleterId: string, reason?: string): Promise<void> {
  const repo = getCommunityRepository();
  const comment = await repo.getCommentTopicParent(id);
  if (!comment) throw new AppError('回复不存在', 'REPLY_NOT_FOUND');
  await repo.softDeleteComment(id);
  await repo.decrementCommentCounts(comment.parent_comment_id, comment.post_id);
  await logAdminAction(deleterId, 'community.reply.delete', id, { targetType: 'reply', reason });
}

export async function hideReply(id: string, operatorId: string, reason?: string): Promise<void> {
  const repo = getCommunityRepository();
  if (!(await repo.getCommentForModeration(id))) throw new AppError('回复不存在', 'REPLY_NOT_FOUND');
  await repo.markCommentHidden(id);
  await logAdminAction(operatorId, 'community.reply.hide', id, { targetType: 'reply', reason });
}

export async function restoreReply(id: string, operatorId: string): Promise<void> {
  const repo = getCommunityRepository();
  const comment = await repo.getCommentTopicParent(id);
  if (!comment) throw new AppError('回复不存在', 'REPLY_NOT_FOUND');
  await repo.restoreComment(id);
  await repo.restoreCommentCounts(comment.parent_comment_id, comment.post_id);
  await logAdminAction(operatorId, 'community.reply.restore', id, { targetType: 'reply' });
}

export async function hardDeleteReply(id: string, operatorId: string): Promise<void> {
  const repo = getCommunityRepository();
  const comment = await repo.getCommentTopicParent(id);
  if (!comment) throw new AppError('回复不存在', 'REPLY_NOT_FOUND');
  await repo.decrementCommentCounts(comment.parent_comment_id, comment.post_id);
  await repo.hardDeleteComment(id);
  await logAdminAction(operatorId, 'community.reply.hardDelete', id, { targetType: 'reply' });
}

export async function moderateReply(id: string, action: 'hide' | 'restore' | 'delete', operatorId: string): Promise<void> {
  if (action === 'hide') await hideReply(id, operatorId);
  else if (action === 'restore') await restoreReply(id, operatorId);
  else await hardDeleteReply(id, operatorId);
}

export async function processCommentMentions(sourceId: string, content: string, sourceAuthorId: string): Promise<void> {
  const repo = getCommunityRepository();
  const mentioned = await resolveMentionedUsers(content);
  for (const t of mentioned) {
    if (t.userId === sourceAuthorId) continue;
    await repo.insertMention(crypto.randomUUID(), t.userId, 'reply', sourceId, sourceAuthorId);
  }
}

export { canManageCategory } from './categories';

export interface PaginatedComments {
  items: FormattedComment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type { ListRepliesFilters, NestedCommentsResult, ReplyInput } from '@/modules/community/types';

/** 组装回复分页结果（含嵌套回复格式化） */
export async function listNestedReplies(params: {
  topicId: string;
  parentReplyId?: string | null;
  status?: string;
  page?: number;
  pageSize?: number;
  currentUserId?: string;
}): Promise<ReplyListResult> {
  return listReplies({ ...params, withReplies: true });
}

/** 组装回复分页结果（含嵌套回复格式化） */
export async function buildReplyDetails(
  rows: CommunityCommentRow[],
  currentUserId: string | undefined,
  total: number,
  page: number,
  pageSize: number,
  totalPages: number,
): Promise<PaginatedComments> {
  const items = await formatComments(rows, { currentUserId, withReplies: true });
  return { items, total, page, pageSize, totalPages };
}
