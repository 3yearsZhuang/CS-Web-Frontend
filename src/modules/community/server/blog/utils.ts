/**
 * @file 博客工具函数服务
 */

import crypto from 'node:crypto';
import type { BlogPost, BlogPostStatus } from '../../types';

interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_markdown: string;
  cover_image: string | null;
  category: string;
  tags: string;
  status: string;
  author_id: string;
  series_id: string | null;
  series_order: number;
  view_count: number;
  like_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 解析 blog_posts.tags JSON 字符串为字符串数组，失败时返回空数组 */
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

/** 将数据库行转换为 BlogPost 对象 */
export function toPost(row: BlogPostRow, authorName: string | null): BlogPost {
  const tags = parseTagsJson(row.tags);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    contentMarkdown: row.content_markdown,
    coverImage: row.cover_image,
    category: row.category || 'general',
    tags,
    status: row.status as BlogPostStatus,
    authorId: row.author_id,
    authorName,
    seriesId: row.series_id,
    seriesOrder: row.series_order,
    viewCount: row.view_count,
    likeCount: row.like_count,
    publishedAt: row.published_at,
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

export { type BlogPostRow };
