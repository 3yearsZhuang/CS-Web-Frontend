/**
 * @file 博客点赞服务（统一重构：blog_likes → community_reactions）
 */
import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';

/** 切换博客文章点赞（登录用户） */
export function toggleLike(postId: string, userId: string): { liked: boolean; likeCount: number } {
  const db = getDb();
  const post = db
    .prepare("SELECT id FROM community_posts WHERE id = ? AND kind = 'post' AND status = 'published'")
    .get(postId);
  if (!post) throw new AppError('文章不存在或已删除', 'NOT_FOUND');

  const existing = db
    .prepare("SELECT id FROM community_reactions WHERE user_id = ? AND target_type = 'post' AND target_id = ?")
    .get(userId, postId) as { id: string } | undefined;

  let liked: boolean;
  let likeCount: number;
  const tx = db.transaction(() => {
    if (existing) {
      db.prepare('DELETE FROM community_reactions WHERE id = ?').run(existing.id);
      db.prepare("UPDATE community_posts SET like_count = MAX(like_count - 1, 0) WHERE id = ?").run(postId);
      liked = false;
    } else {
      const id = crypto.randomUUID();
      db.prepare(
        "INSERT INTO community_reactions (id, user_id, target_type, target_id) VALUES (?, ?, 'post', ?)",
      ).run(id, userId, postId);
      db.prepare("UPDATE community_posts SET like_count = like_count + 1 WHERE id = ?").run(postId);
      liked = true;
    }
    const row = db.prepare('SELECT like_count FROM community_posts WHERE id = ?').get(postId) as { like_count: number } | undefined;
    likeCount = row?.like_count ?? 0;
  });
  tx();

  return { liked: liked!, likeCount: likeCount! };
}

/** 查询用户是否已点赞 */
export function hasLiked(postId: string, userId: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM community_reactions WHERE user_id = ? AND target_type = 'post' AND target_id = ?")
    .get(userId, postId);
  return !!row;
}
