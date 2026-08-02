/**
 * @file 反应（点赞/收藏）服务（已迁移至 Repository 抽象层，ADR-009）
 */
import crypto from 'node:crypto';
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import { loadAuthorSummaries, type AuthorSummary } from './shared';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { createNotification } from '@/modules/notification/server/notification-core';

export interface ReactionTarget {
  targetId: string;
  targetType: 'post' | 'comment';
  isLiked: boolean;
  isFavorited: boolean;
}

const VALID_TARGETS = new Set(['post', 'comment']);

export async function toggleLike(targetId: string, targetType: 'post' | 'comment', userId: string): Promise<{ liked: boolean; likeCount: number }> {
  if (!VALID_TARGETS.has(targetType)) throw new AppError('无效的目标类型', 'INVALID_TARGET');
  const repo = getCommunityRepository();
  const tableName = targetType === 'post' ? 'community_posts' : 'community_comments';
  const existing = await repo.getReaction(userId, 'like', targetId);
  if (existing) {
    await repo.deleteReactionById(existing.id);
    await repo.decrementLike(tableName, targetId);
    const likeCount = await repo.getLikeCount(tableName, targetId);
    return { liked: false, likeCount };
  }
  await repo.insertReaction(crypto.randomUUID(), userId, 'like', targetId);
  await repo.incrementLike(tableName, targetId);
  const likeCount = await repo.getLikeCount(tableName, targetId);

  // 通知内容作者（跳过自己）
  try {
    const authorId = await getContentAuthorId(targetType, targetId);
    if (authorId && authorId !== userId) {
      await createNotification(
        authorId,
        'like',
        '有人赞了你的内容',
        targetType === 'post' ? '你的帖子获得了赞' : '你的回复获得了赞',
        userId,
      );
    }
  } catch {
    // 通知失败不影响点赞业务
  }

  return { liked: true, likeCount };
}

export async function toggleFavorite(targetId: string, userId: string): Promise<{ favorited: boolean; favoriteCount: number }> {
  const repo = getCommunityRepository();
  const existing = await repo.getFavorite(userId, targetId);
  if (existing) {
    await repo.decrementFavorite(targetId);
    await repo.deleteFavoriteById(existing.id);
    const favoriteCount = await repo.getFavoriteCount(targetId);
    return { favorited: false, favoriteCount };
  }
  await repo.insertFavorite(crypto.randomUUID(), userId, targetId);
  await repo.incrementFavorite(targetId);
  const favoriteCount = await repo.getFavoriteCount(targetId);

  // 通知内容作者（跳过自己）
  try {
    const authorId = await getContentAuthorId('post', targetId);
    if (authorId && authorId !== userId) {
      await createNotification(
        authorId,
        'favorite',
        '有人收藏了你的帖子',
        '你的帖子被加入收藏',
        userId,
      );
    }
  } catch {
    // 通知失败不影响收藏业务
  }

  return { favorited: true, favoriteCount };
}

/** 获取内容作者 id（post 或 comment） */
async function getContentAuthorId(targetType: 'post' | 'comment', targetId: string): Promise<string | null> {
  const repo = getCommunityRepository();
  if (targetType === 'post') {
    const row = await repo.getPostById(targetId);
    return row?.author_id ?? null;
  }
  const row = await repo.getCommentById(targetId);
  return row?.author_id ?? null;
}

export async function getReactionStatus(targetId: string, targetType: 'post' | 'comment', userId: string): Promise<{ isLiked: boolean; isFavorited: boolean; likeCount: number; favoriteCount: number }> {
  if (!VALID_TARGETS.has(targetType)) throw new AppError('无效的目标类型', 'INVALID_TARGET');
  const repo = getCommunityRepository();
  const tableName = targetType === 'post' ? 'community_posts' : 'community_comments';
  const [likeRow, favRow, likeCount, favoriteCount] = await Promise.all([
    repo.getReaction(userId, 'like', targetId),
    repo.getFavorite(userId, targetId),
    repo.getLikeCount(tableName, targetId),
    targetType === 'post' ? repo.getFavoriteCount(targetId) : Promise.resolve(0),
  ]);
  return {
    isLiked: !!likeRow,
    isFavorited: !!favRow,
    likeCount,
    favoriteCount,
  };
}

export async function batchGetReactionStatus(targetIds: string[], targetType: 'post' | 'comment', userId: string): Promise<Map<string, { isLiked: boolean; isFavorited: boolean }>> {
  const repo = getCommunityRepository();
  const [liked, faved] = await Promise.all([
    repo.getUserReactionTargets(userId, 'like', targetIds),
    targetType === 'post' ? repo.getUserFavoriteTargets(userId, targetIds) : Promise.resolve(new Set<string>()),
  ]);
  const map = new Map<string, { isLiked: boolean; isFavorited: boolean }>();
  for (const id of targetIds) {
    map.set(id, { isLiked: liked.has(id), isFavorited: faved.has(id) });
  }
  return map;
}

export async function listUserFavorites(userId: string, params?: { page?: number; pageSize?: number }): Promise<{ items: Array<{ id: string; title: string; author: AuthorSummary | null }>; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params?.pageSize ?? 20));
  const offset = (page - 1) * pageSize;

  const total = await repo.countUserFavorites(userId);
  const rows = await repo.listUserFavoritePosts(userId, pageSize, offset);
  const authorIds = rows.map((r) => r.author_id);
  const authorMap = await loadAuthorSummaries(authorIds);

  const items = rows.map((r) => ({
    id: r.id,
    title: r.title,
    author: authorMap.get(r.author_id) ?? null,
  }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    pagination: { page, pageSize, total, totalPages },
  };
}

export async function moderateReaction(id: string, action: 'delete', operatorId: string): Promise<void> {
  const repo = getCommunityRepository();
  await repo.deleteReactionById(id);
  await logAdminAction(operatorId, 'community.reaction.delete', id, { targetType: 'reaction', action });
}
