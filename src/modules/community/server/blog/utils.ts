/**
 * @file 博客工具函数服务（统一重构：BlogPostRow 对应 community_posts 行）
 */
import crypto from 'node:crypto';
import type { BlogPost, BlogPostStatus } from '../../types';

/** community_posts 行（kind='post'） */
export interface BlogPostRow {
  id: string;
  kind: string;
  category_id: string | null;
  author_id: string;
  title: string;
  content_markdown: string;
  status: string;
  is_pinned: number;
  is_featured: number;
  reply_count: number;
  favorite_count: number;
  last_reply_at: string | null;
  last_reply_id: string | null;
  hidden_by: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
  slug: string | null;
  excerpt: string | null;
  cover_image: string | null;
  tags: string | null;
  series_id: string | null;
  series_order: number;
  published_at: string | null;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
}

/** 解析 tags JSON 字符串为字符串数组 */
export function parseTagsJson(tagsStr: string | null | undefined): string[] {
  if (!tagsStr) return [];
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 生成文章的唯一 slug */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base || 'post'}-${suffix}`;
}

/** 将数据库行转换为 BlogPost（= CommunityPost）对象 */
export function toPost(row: BlogPostRow, authorName: string | null): BlogPost {
  const tags = parseTagsJson(row.tags);
  return {
    id: row.id,
    kind: 'post',
    categoryId: row.category_id ?? null,
    authorId: row.author_id,
    title: row.title,
    contentMarkdown: row.content_markdown,
    status: row.status as BlogPostStatus,
    isPinned: row.is_pinned === 1,
    isFeatured: row.is_featured === 1,
    replyCount: row.reply_count,
    favoriteCount: row.favorite_count,
    lastReplyAt: row.last_reply_at ?? null,
    lastReplyId: row.last_reply_id ?? null,
    hiddenBy: row.hidden_by ?? null,
    hiddenAt: row.hidden_at ?? null,
    hiddenReason: row.hidden_reason ?? null,
    slug: row.slug,
    excerpt: row.excerpt,
    coverImage: row.cover_image,
    tags,
    seriesId: row.series_id,
    seriesOrder: row.series_order,
    publishedAt: row.published_at,
    viewCount: row.view_count,
    likeCount: row.like_count,
    author: null,
    authorName: authorName,
    category: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 从 Markdown 提取目录 */
export function extractTableOfContents(markdown: string): Array<{ level: number; text: string; slug: string }> {
  const lines = markdown.split('\n');
  const toc: Array<{ level: number; text: string; slug: string }> = [];
  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[`*_~]/g, '').trim();
      const slug = text.toLowerCase().replace(/[^\w\u4e00-\u9fa5\s-]/g, '').replace(/\s+/g, '-').slice(0, 60);
      toc.push({ level, text, slug });
    }
  }
  return toc;
}
