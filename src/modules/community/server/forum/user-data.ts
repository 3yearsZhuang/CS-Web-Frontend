/**
 * @file 论坛服务层 — 用户维度数据（我的回复/话题/收藏，已迁移至 Repository）
 */
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import type { CommunityCommentRow } from '@/shared/db/repositories/community.repo';
import { formatComments, formatPosts, loadCategorySummaries, type FormattedComment, type FormattedPost, type PaginationInfo } from '../shared';
import { buildReplyDetails } from './replies';
import { getTopicSummariesByIds } from '../shared';

export interface ReplyActivityItem extends FormattedComment {
  topicTitle: string;
  categoryId: string | null;
  categoryName: string | null;
}

/** 用户发布的回复列表（分页，含主题标题与分类名） */
export async function getUserReplies(
  userId: string,
  params: { page?: number; pageSize?: number } = {},
): Promise<{ items: ReplyActivityItem[]; pagination: PaginationInfo }> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const totalRow = await repo.countComments('WHERE author_id = ?', [userId]);
  const rows = await repo.listComments(
    `WHERE c.author_id = ? ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset],
  );
  const formatted = (await buildReplyDetails(rows, userId, totalRow, page, pageSize, Math.max(1, Math.ceil(totalRow / pageSize)))).items;

  const topicIds = [...new Set(formatted.map((r) => r.topicId))];
  const topicSummaryMap = await getTopicSummariesByIds(topicIds);
  const categoryIds = [...new Set(topicIds.map((id) => topicSummaryMap.get(id)?.categoryId).filter((c): c is string => !!c))];
  const categorySummaryMap = await loadCategorySummaries(categoryIds);

  const items: ReplyActivityItem[] = formatted.map((r) => {
    const topic = topicSummaryMap.get(r.topicId);
    const category = topic ? categorySummaryMap.get(topic.categoryId) ?? null : null;
    return {
      ...r,
      topicTitle: topic?.title ?? '(已删除的主题)',
      categoryId: topic?.categoryId ?? null,
      categoryName: category?.name ?? null,
    };
  });

  const totalPages = Math.max(1, Math.ceil(totalRow / pageSize));
  return { items, pagination: { page, pageSize, total: totalRow, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } };
}

/** 用户收藏的主题列表（分页） */
export async function getUserFavorites(
  userId: string,
  params: { page?: number; pageSize?: number } = {},
): Promise<{ items: FormattedPost[]; pagination: PaginationInfo }> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const total = await repo.countUserFavorites(userId);
  const rows = await repo.listUserFavoritePosts(userId, pageSize, offset);
  const items = await formatPosts(rows, { currentUserId: userId });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items, pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } };
}

/** 用户发布的主题列表（分页） */
export async function getUserTopics(
  userId: string,
  params: { page?: number; pageSize?: number } = {},
): Promise<{ items: FormattedPost[]; pagination: PaginationInfo }> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const total = await repo.countPosts("WHERE author_id = ? AND kind = 'topic'", [userId]);
  const rows = await repo.listPosts(["author_id = ?", "kind = 'topic'"], [userId], pageSize, offset);
  const items = await formatPosts(rows, { currentUserId: userId });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items, pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } };
}

/** 兼容别名 */
export const listUserTopics = getUserTopics;
export const listUserReplies = getUserReplies;
