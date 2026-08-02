/**
 * @file 社区关注服务层（已迁移至 Repository 抽象层，ADR-009）
 *
 * 提供关注/取关切换、关注状态查询、关注/粉丝列表与计数。
 * 关注关系表 community_follows，用户计数从 community_follows 实时聚合（不反范式冗余）。
 */
import crypto from 'node:crypto';
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import { loadAuthorSummaries } from '../shared';
import { createNotification } from '@/modules/notification/server/notification-core';
import type { AuthorSummary } from '../shared';

export interface FollowUserSummary extends AuthorSummary {
  isFollowedByMe: boolean;
}

export interface PaginatedFollows {
  items: FollowUserSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/** 关注/取关切换，返回切换后的状态（true=已关注） */
export async function toggleFollow(
  followerId: string,
  followingId: string,
): Promise<{ following: boolean }> {
  if (followerId === followingId) {
    throw new Error('不能关注自己');
  }
  const repo = getCommunityRepository();

  const existing = await repo.getFollow(followerId, followingId);
  if (existing) {
    await repo.deleteFollow(followerId, followingId);
    return { following: false };
  }
  await repo.insertFollow({
    id: crypto.randomUUID(),
    followerId,
    followingId,
  });

  // 通知被关注者（跳过自己由调用方保证，此处双保险）
  try {
    if (followerId !== followingId) {
      await createNotification(
        followingId,
        'follow',
        '有人关注了你',
        '你多了一位关注者',
        followerId,
      );
    }
  } catch {
    // 通知失败不影响关注业务
  }

  return { following: true };
}

/** 查询单条关注状态 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const repo = getCommunityRepository();
  const row = await repo.getFollow(followerId, followingId);
  return row != null;
}

/** 批量查询当前用户对一组用户的关注状态 */
export async function getFollowStates(
  followerId: string,
  targetIds: string[],
): Promise<Set<string>> {
  if (targetIds.length === 0) return new Set();
  const repo = getCommunityRepository();
  return repo.getFollowStates(followerId, targetIds);
}

/** 我关注的人列表（分页） */
export async function listFollowing(
  followerId: string,
  params: { page?: number; pageSize?: number; currentUserId?: string } = {},
): Promise<PaginatedFollows> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const total = await repo.countFollowing(followerId);
  const rows = await repo.listFollowing(followerId, pageSize, offset);
  return buildFollowResult(rows.map((r) => r.following_id), total, page, pageSize, params.currentUserId);
}

/** 我的粉丝列表（分页） */
export async function listFollowers(
  followingId: string,
  params: { page?: number; pageSize?: number; currentUserId?: string } = {},
): Promise<PaginatedFollows> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const total = await repo.countFollowers(followingId);
  const rows = await repo.listFollowers(followingId, pageSize, offset);
  return buildFollowResult(rows.map((r) => r.follower_id), total, page, pageSize, params.currentUserId);
}

/** 关注计数 */
export async function getFollowCounts(userId: string): Promise<{ following: number; followers: number }> {
  const repo = getCommunityRepository();
  const [following, followers] = await Promise.all([
    repo.countFollowing(userId),
    repo.countFollowers(userId),
  ]);
  return { following, followers };
}

/** 我关注的用户 id 列表（用于关注流过滤） */
export async function getFollowingIds(followerId: string): Promise<string[]> {
  const repo = getCommunityRepository();
  return repo.getFollowingIds(followerId);
}

async function buildFollowResult(
  userIds: string[],
  total: number,
  page: number,
  pageSize: number,
  currentUserId?: string,
): Promise<PaginatedFollows> {
  const repo = getCommunityRepository();
  const items: FollowUserSummary[] = [];
  if (userIds.length > 0) {
    const summaryMap = await repo.loadAuthorSummaries(userIds);
    const states = currentUserId
      ? await repo.getFollowStates(currentUserId, userIds)
      : new Set<string>();
    for (const id of userIds) {
      const summary = summaryMap.get(id);
      if (!summary) continue;
      items.push({
        ...summary,
        isFollowedByMe: states.has(id),
      });
    }
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}
