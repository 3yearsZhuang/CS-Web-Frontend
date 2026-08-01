/**
 * @file 博客点赞服务
 */

import crypto from 'node:crypto';
import { getDb } from '@/shared/db';

/** 增加文章浏览次数 */
export function incrementViewCount(postId: string): void {
  const db = getDb();
  db.prepare('UPDATE blog_posts SET view_count = view_count + 1 WHERE id = ?').run(postId);
}

/** 切换文章点赞状态 */
export function toggleLike(postId: string, userId: string): { liked: boolean; likeCount: number } {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM blog_likes WHERE post_id = ? AND user_id = ?').get(postId, userId) as { id: string } | undefined;

  if (existing) {
    db.prepare('DELETE FROM blog_likes WHERE id = ?').run(existing.id);
    db.prepare('UPDATE blog_posts SET like_count = like_count - 1 WHERE id = ?').run(postId);
    const row = db.prepare('SELECT like_count FROM blog_posts WHERE id = ?').get(postId) as { like_count: number };
    return { liked: false, likeCount: row.like_count };
  }

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO blog_likes (id, post_id, user_id) VALUES (?, ?, ?)').run(id, postId, userId);
  db.prepare('UPDATE blog_posts SET like_count = like_count + 1 WHERE id = ?').run(postId);
  const row = db.prepare('SELECT like_count FROM blog_posts WHERE id = ?').get(postId) as { like_count: number };
  return { liked: true, likeCount: row.like_count };
}

/** 检查用户是否已点赞 */
export function hasLiked(postId: string, userId: string): boolean {
  const db = getDb();
  return !!db.prepare('SELECT id FROM blog_likes WHERE post_id = ? AND user_id = ?').get(postId, userId);
}
