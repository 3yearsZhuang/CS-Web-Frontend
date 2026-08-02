/**
 * @file 博客点赞服务（已迁移至 Repository 抽象层，ADR-009）
 * 统一使用 community_reactions，target_type = 'post'。
 */
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import { toggleLike as toggleReaction } from '../forum/reactions';
import { AppError } from '@/shared/app-error';

/** 切换博客文章点赞（登录用户） */
export async function toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
  const repo = getCommunityRepository();
  const post = await repo.getPostById(postId);
  if (!post || post.kind !== 'post' || post.status !== 'published') {
    throw new AppError('文章不存在或已删除', 'NOT_FOUND');
  }
  return toggleReaction(postId, 'post', userId);
}

/** 查询用户是否已点赞 */
export async function hasLiked(postId: string, userId: string): Promise<boolean> {
  const repo = getCommunityRepository();
  const row = await repo.getReaction(userId, 'like', postId);
  return !!row;
}
