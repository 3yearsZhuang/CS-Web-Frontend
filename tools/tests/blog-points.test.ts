/**
 * @file 博客系统 + 积分系统集成测试
 *
 * 覆盖核心服务层逻辑：
 *   - 博客文章 CRUD + 发布流程
 *   - 点赞 toggle
 *   - 积分发放 + 余额 + 排行榜
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { _setDbEngineForTest } from '@/shared/db/drivers';
import { createSqliteTestEngine } from './dbEngine';

const inMemoryDb = new Database(':memory:');

const testEngine = createSqliteTestEngine(inMemoryDb);
_setDbEngineForTest(testEngine);

vi.mock('@/shared/db', () => ({
  getDb: () => inMemoryDb,
  __esModule: true,
}));

vi.mock('@/modules/auth/server', () => ({
  hashPassword: (s: string) => `salt:${s}`,
  verifyPassword: (s: string, stored: string) => stored === `salt:${s}`,
  __esModule: true,
}));

vi.mock('@/modules/admin/server', () => ({
  logAdminAction: () => {},
  __esModule: true,
}));

import {
  createPost,
  getPostById,
  getPostBySlug,
  updatePost,
  publishPost,
  deletePost,
  listPosts,
  toggleBlogLike,
  incrementViewCount,
  createSeries,
  listSeries,
  deleteSeries,
  extractTableOfContents,
} from '@/modules/community/server';
import {
  addPoints,
  getUserPointsBalance,
  getUserPointsProfile,
  getLeaderboard,
  calculateLevel,
  LEVEL_THRESHOLDS,
} from '@/modules/tools/server';

/** 初始化测试数据库 schema（统一社区表） */
function initTestSchema() {
  inMemoryDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL DEFAULT '',
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      avatar_type TEXT DEFAULT 'initial',
      github_url TEXT,
      website_url TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      github_id TEXT,
      tech_tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS community_categories (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      post_count INTEGER NOT NULL DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      category_id TEXT,
      author_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_markdown TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      reply_count INTEGER NOT NULL DEFAULT 0,
      favorite_count INTEGER NOT NULL DEFAULT 0,
      last_reply_at TEXT,
      last_reply_id TEXT,
      hidden_by TEXT,
      hidden_at TEXT,
      hidden_reason TEXT,
      slug TEXT UNIQUE,
      excerpt TEXT,
      cover_image TEXT,
      tags TEXT DEFAULT '[]',
      series_id TEXT,
      series_order INTEGER DEFAULT 0,
      published_at TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES community_categories(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (series_id) REFERENCES blog_series(id) ON DELETE SET NULL,
      FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS community_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      parent_comment_id TEXT,
      content_markdown TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      like_count INTEGER NOT NULL DEFAULT 0,
      reply_count INTEGER NOT NULL DEFAULT 0,
      hidden_by TEXT,
      hidden_at TEXT,
      hidden_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_comment_id) REFERENCES community_comments(id) ON DELETE CASCADE,
      FOREIGN KEY (hidden_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS community_reactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, target_type, target_id)
    );

    CREATE TABLE IF NOT EXISTS community_favorites (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, target_type, target_id)
    );

    CREATE TABLE IF NOT EXISTS blog_series (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      slug TEXT UNIQUE NOT NULL,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS points_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'system',
      source_id TEXT,
      balance_after INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_actions (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      action TEXT NOT NULL,
      target_user_id TEXT,
      details TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 插入测试用户
  inMemoryDb.prepare(
    'INSERT OR IGNORE INTO users (id, email, display_name, role) VALUES (?, ?, ?, ?)',
  ).run('author-1', 'author@example.com', '作者', 'user');
  inMemoryDb.prepare(
    'INSERT OR IGNORE INTO users (id, email, display_name, role) VALUES (?, ?, ?, ?)',
  ).run('user-1', 'user@example.com', '普通用户', 'user');
  inMemoryDb.prepare(
    'INSERT OR IGNORE INTO users (id, email, display_name, role) VALUES (?, ?, ?, ?)',
  ).run('user-2', 'user2@example.com', '用户2', 'user');
  inMemoryDb.prepare(
    'INSERT OR IGNORE INTO users (id, email, display_name, role) VALUES (?, ?, ?, ?)',
  ).run('admin', 'admin@example.com', '管理员', 'admin');
}

describe('博客系统', () => {
  beforeEach(() => {
    initTestSchema();
    inMemoryDb.exec('DELETE FROM community_reactions');
    inMemoryDb.exec('DELETE FROM community_favorites');
    inMemoryDb.exec('DELETE FROM community_comments');
    inMemoryDb.exec('DELETE FROM community_posts');
    inMemoryDb.exec('DELETE FROM community_categories');
    inMemoryDb.exec('DELETE FROM blog_series');
    inMemoryDb.exec('DELETE FROM points_transactions');
    inMemoryDb.exec('DELETE FROM admin_actions');
  });

  it('创建 → 发布 → 浏览 → 点赞 完整流程', async () => {
    // 1. 创建草稿
    const post = await createPost({
      title: '测试文章',
      excerpt: '这是一篇测试文章',
      contentMarkdown: '# Hello\n\n世界',
      categoryId: 'frontend',
      tags: ['React', 'TypeScript'],
      status: 'draft',
    }, 'author-1');
    await expect(post.id).toBeTruthy();

    const draft = await getPostById(post.id);
    await expect(draft!.status).toBe('draft');
    await expect(draft!.slug).toBeTruthy();
    await expect(draft!.tags).toEqual(['React', 'TypeScript']);

    // 2. 发布
    await publishPost(post.id, 'author-1');
    const published = await getPostById(post.id);
    await expect(published!.status).toBe('published');

    // 3. 按 slug 查询
    const found = await getPostBySlug(published!.slug ?? '');
    await expect(found).toBeTruthy();
    await expect(found!.title).toBe('测试文章');

    // 4. 浏览计数
    await incrementViewCount(post.id);
    const viewed = await getPostById(post.id);
    await expect(viewed!.viewCount).toBe(1);

    // 5. 点赞
    const likeResult = await toggleBlogLike(post.id, 'user-1');
    await expect(likeResult.liked).toBe(true);
    await expect(likeResult.likeCount).toBe(1);

    // 6. 取消点赞
    const unlikeResult = await toggleBlogLike(post.id, 'user-1');
    await expect(unlikeResult.liked).toBe(false);
    await expect(unlikeResult.likeCount).toBe(0);
  });

  it('作者只能编辑自己的文章', async () => {
    const post = await createPost({
      title: '原创文章',
      contentMarkdown: '内容',
    }, 'author-1');

    // 非作者非管理员不能编辑
    await expect(updatePost(post.id, { title: '篡改' }, 'user-1')).rejects.toThrow();

    // 作者可以编辑
    await updatePost(post.id, { title: '修改标题' }, 'author-1');
    const updated = await getPostById(post.id);
    await expect(updated!.title).toBe('修改标题');

    // 管理员可以编辑
    await updatePost(post.id, { title: '管理员修改' }, 'admin');
    const adminUpdated = await getPostById(post.id);
    await expect(adminUpdated!.title).toBe('管理员修改');
  });

  it('系列管理', async () => {
    const series = await createSeries('author-1', {
      title: 'React 系列',
      description: '从入门到精通',
    });
    await expect(series.title).toBe('React 系列');
    await expect(series.postCount).toBe(0);

    const list = await listSeries();
    await expect(list).toHaveLength(1);

    // 删除系列
    await deleteSeries('author-1', series.id, false);
    await expect(await listSeries()).toHaveLength(0);
  });

  it('目录提取', async () => {
    const md = `# Title

## 第一章

内容

### 子节

## 第二章
`;
    const toc = extractTableOfContents(md);
    await expect(toc).toHaveLength(3);
    await expect(toc[0].level).toBe(2);
    await expect(toc[0].text).toBe('第一章');
    await expect(toc[1].level).toBe(3);
    await expect(toc[2].level).toBe(2);
  });
});

describe('积分系统', () => {
  beforeEach(() => {
    initTestSchema();
    inMemoryDb.exec('DELETE FROM points_transactions');
    inMemoryDb.exec('DELETE FROM admin_actions');
  });

  it('发放积分 → 余额 → 等级', async () => {
    await expect(await getUserPointsBalance('user-1')).toBe(0);

    await addPoints('user-1', 30, 'task_reward', 'task-1', '完成任务');
    await expect(await getUserPointsBalance('user-1')).toBe(30);

    await addPoints('user-1', 25, 'exam_bonus', 'exam-1', '考试奖励');
    await expect(await getUserPointsBalance('user-1')).toBe(55);

    const profile = await getUserPointsProfile('user-1');
    await expect(profile.balance).toBe(55);
    await expect(profile.level).toBe(2); // 55 >= 50
    await expect(profile.levelTitle).toBe('初级成员');
    await expect(profile.transactions).toHaveLength(2);
  });

  it('排行榜', async () => {
    await addPoints('user-1', 100, 'system', null, '奖励1');
    await addPoints('user-2', 200, 'system', null, '奖励2');

    const board = await getLeaderboard(10);
    await expect(board).toHaveLength(2);
    await expect(board[0].userId).toBe('user-2');
    await expect(board[0].balance).toBe(200);
    await expect(board[1].userId).toBe('user-1');
    await expect(board[1].balance).toBe(100);
  });

  it('等级计算', async () => {
    await expect(calculateLevel(0).level).toBe(1);
    await expect(calculateLevel(49).level).toBe(1);
    await expect(calculateLevel(50).level).toBe(2);
    await expect(calculateLevel(150).level).toBe(3);
    await expect(calculateLevel(5000).level).toBe(7);
    await expect(LEVEL_THRESHOLDS).toHaveLength(7);
  });
});
