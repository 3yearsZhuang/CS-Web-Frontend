/**
 * @file 社区模块 — Feed 聚合查询（已迁移至 Repository 抽象层，ADR-009）
 *
 * 合并三源（论坛主题、博客文章、成员）为统一 Feed，支持标签筛选、关键词搜索与分页。
 */
import { listTopics } from './forum/topics';
import { listPosts } from './blog/posts';
import { listMembers as _listMembers, listAllTechTags } from './members';
import type {
  FeedItem,
  FeedQuery,
  FeedTag,
  FeedTopicItem,
  FeedPostItem,
  FeedMemberItem,
  PaginatedFeed,
  CommunityPost,
  CommunityPostDetail,
} from '../types';

/** 默认每页条数 — 兼顾信息密度与首屏性能 */
const DEFAULT_PAGE_SIZE = 20;
/** 最大每页条数 — 防止滥用 */
const MAX_PAGE_SIZE = 50;

/** 论坛主题 → Feed 项 */
function toTopicFeed(topic: Awaited<ReturnType<typeof listTopics>>['items'][number]): FeedItem {
  return {
    kind: 'topic',
    sortAt: topic.lastReplyAt ?? topic.createdAt,
    data: topic as unknown as CommunityPost,
  } as FeedItem;
}

/** 博客文章 → Feed 项 */
function toPostFeed(post: Awaited<ReturnType<typeof listPosts>>['items'][number]): FeedItem {
  return {
    kind: 'post',
    sortAt: post.publishedAt ?? post.createdAt,
    data: post as unknown as CommunityPostDetail,
  } as FeedItem;
}

/** 成员 → Feed 项 */
function toMemberFeed(member: Awaited<ReturnType<typeof _listMembers>>[number]): FeedItem {
  return {
    kind: 'member',
    sortAt: member.joinedAt,
    data: member,
  } as FeedItem;
}

/** 标签匹配：检查 Feed 项是否包含指定标签 */
function itemMatchesTag(item: FeedItem, tag: string): boolean {
  const t = tag.toLowerCase();
  switch (item.kind) {
    case 'topic':
      return (
        (item.data.category?.name?.toLowerCase().includes(t) ?? false) ||
        item.data.title.toLowerCase().includes(t)
      );
    case 'post':
      return (
        item.data.tags.some((tag) => tag.toLowerCase().includes(t)) ||
        (item.data.category?.name?.toLowerCase().includes(t) ?? false)
      );
    case 'member':
      return item.data.techTags.some((tag) => tag.toLowerCase().includes(t));
  }
}

/** 关键词匹配：检查 Feed 项标题/摘要是否包含关键词 */
function itemMatchesSearch(item: FeedItem, search: string): boolean {
  const q = search.toLowerCase().trim();
  if (!q) return true;
  switch (item.kind) {
    case 'topic':
      return (
        item.data.title.toLowerCase().includes(q) ||
        item.data.contentMarkdown.toLowerCase().includes(q)
      );
    case 'post':
      return (
        item.data.title.toLowerCase().includes(q) ||
        (item.data.excerpt?.toLowerCase().includes(q) ?? false)
      );
    case 'member':
      return (
        (item.data.displayName?.toLowerCase().includes(q) ?? false) ||
        (item.data.bio?.toLowerCase().includes(q) ?? false)
      );
  }
}

/**
 * 获取聚合 Feed
 *
 * 并行查询三源 → 合并 → 过滤 → 排序 → 分页
 */
export async function getFeed(query: FeedQuery = {}): Promise<PaginatedFeed> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE));

  const [topicsRes, postsRes, members] = await Promise.all([
    query.kind && query.kind !== 'topic' ? Promise.resolve(null) : listTopics({ pageSize: 100 }),
    query.kind && query.kind !== 'post' ? Promise.resolve(null) : listPosts({ status: 'published', pageSize: 100 }),
    query.kind && query.kind !== 'member' ? Promise.resolve([]) : query.excludeMembers ? Promise.resolve([]) : _listMembers(),
  ]);

  const topics = topicsRes?.items ?? [];
  const posts = postsRes?.items ?? [];

  const items: FeedItem[] = [
    ...topics.map(toTopicFeed),
    ...posts.map(toPostFeed),
    ...members.map(toMemberFeed),
  ];

  const filtered = items.filter((item) => {
    if (query.tag && !itemMatchesTag(item, query.tag)) return false;
    if (query.search && !itemMatchesSearch(item, query.search)) return false;
    return true;
  });

  filtered.sort((a, b) => b.sortAt.localeCompare(a.sortAt));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return {
    items: pageItems,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * 获取聚合标签列表
 *
 * 合并三源的标签：论坛版块名、博客分类、成员 techTags
 */
export async function getFeedTags(): Promise<FeedTag[]> {
  const tagMap = new Map<string, { topicCount: number; postCount: number; memberCount: number }>();

  const topicsRes = await listTopics({ pageSize: 200 });
  for (const topic of topicsRes.items) {
    const catName = topic.category?.name;
    if (!catName) continue;
    const entry = tagMap.get(catName) ?? { topicCount: 0, postCount: 0, memberCount: 0 };
    entry.topicCount++;
    tagMap.set(catName, entry);
  }

  const postsRes = await listPosts({ status: 'published', pageSize: 200 });
  for (const post of postsRes.items) {
    for (const tag of post.tags) {
      const entry = tagMap.get(tag) ?? { topicCount: 0, postCount: 0, memberCount: 0 };
      entry.postCount++;
      tagMap.set(tag, entry);
    }
    const catName = post.category?.name;
    if (catName) {
      const catEntry = tagMap.get(catName) ?? { topicCount: 0, postCount: 0, memberCount: 0 };
      catEntry.postCount++;
      tagMap.set(catName, catEntry);
    }
  }

  const memberTags = await listAllTechTags();
  for (const tag of memberTags) {
    const entry = tagMap.get(tag) ?? { topicCount: 0, postCount: 0, memberCount: 0 };
    entry.memberCount = 1;
    tagMap.set(tag, entry);
  }

  return Array.from(tagMap.entries())
    .map(([tag, counts]) => ({ tag, ...counts }))
    .sort((a, b) => b.topicCount + b.postCount + b.memberCount - (a.topicCount + a.postCount + a.memberCount));
}

/**
 * 获取 Feed 总览统计
 */
export async function getFeedStats(): Promise<{
  topicCount: number;
  postCount: number;
  memberCount: number;
}> {
  const [topicsRes, postsRes, members] = await Promise.all([
    listTopics({ pageSize: 1 }),
    listPosts({ status: 'published', pageSize: 1 }),
    _listMembers(),
  ]);
  return {
    topicCount: topicsRes.pagination.total,
    postCount: postsRes.total,
    memberCount: members.length,
  };
}
