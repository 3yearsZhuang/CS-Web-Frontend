/**
 * @file 演示模式 mock — community（社区）
 *
 * 覆盖：
 *   - GET /community/categories → CategoryOut[]（数组）
 *   - GET /community/tags       → { tags: string[] }
 *   - GET /community/posts      → { items: CommunityPost[], total, page, page_size, total_pages }
 *                                （支持 kind/category/tag/search/sort/page/page_size 筛选）
 *   - GET /community/posts/:id  → CommunityPost（动态路径）
 *   - GET /community/members    → MemberOut[]（数组，支持 tag/search/sort/limit）
 *
 * 字段为后端 snake_case 形状（toCommunityCategory / toCommunityPost / toMember 翻译）。
 */
import { registerDemoMock } from '../demo-mode';

/** 演示成员（MemberOut 形状，同时作为帖子 author 嵌套数据源） */
const DEMO_MEMBERS: Array<Record<string, unknown>> = [
  {
    id: 1,
    display_name: '演示同学',
    bio: '前端方向，喜欢折腾工程化。',
    avatar_url: null,
    avatar_type: 'initial',
    github_url: 'https://github.com/demo',
    website_url: null,
    tech_tags: ['Web', 'AI', 'Python'],
    role: 'member',
    joined_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    display_name: '林晚晴',
    bio: '后端 & 算法，维护社区服务。',
    avatar_url: null,
    avatar_type: 'initial',
    github_url: null,
    website_url: null,
    tech_tags: ['Python', '算法', '数据库'],
    role: 'admin',
    joined_at: '2025-09-01T00:00:00Z',
  },
  {
    id: 3,
    display_name: '陈一舟',
    bio: '全栈打杂，摄影爱好者。',
    avatar_url: null,
    avatar_type: 'initial',
    github_url: null,
    website_url: null,
    tech_tags: ['Web', '全栈'],
    role: 'member',
    joined_at: '2025-10-12T00:00:00Z',
  },
  {
    id: 4,
    display_name: '苏晚',
    bio: 'AI 方向，正在学习大模型应用。',
    avatar_url: null,
    avatar_type: 'initial',
    github_url: null,
    website_url: null,
    tech_tags: ['AI', 'Python'],
    role: 'member',
    joined_at: '2026-03-05T00:00:00Z',
  },
  {
    id: 5,
    display_name: '周子墨',
    bio: '算法竞赛退役选手，偶尔写写题解。',
    avatar_url: null,
    avatar_type: 'initial',
    github_url: null,
    website_url: null,
    tech_tags: ['算法', 'C++'],
    role: 'member',
    joined_at: '2025-06-20T00:00:00Z',
  },
  {
    id: 6,
    display_name: '何雨桐',
    bio: 'UI 设计与前端实现都略懂。',
    avatar_url: null,
    avatar_type: 'initial',
    github_url: null,
    website_url: null,
    tech_tags: ['Web', 'UI'],
    role: 'member',
    joined_at: '2026-02-14T00:00:00Z',
  },
];

/** 演示分类（CategoryOut 形状） */
const DEMO_CATEGORIES: Array<Record<string, unknown>> = [
  {
    id: 1,
    slug: 'tech',
    name: '技术分享',
    description: '项目实战、技术踩坑与学习笔记',
    icon: 'code',
    sort_order: 1,
    post_count: 8,
    created_by: 2,
    created_at: '2025-09-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 2,
    slug: 'activity',
    name: '社团活动',
    description: '分享会、工作坊与纳新动态',
    icon: 'flag',
    sort_order: 2,
    post_count: 5,
    created_by: 2,
    created_at: '2025-09-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 3,
    slug: 'chat',
    name: '闲聊灌水',
    description: '非技术话题，轻松交流',
    icon: 'chat',
    sort_order: 3,
    post_count: 12,
    created_by: 3,
    created_at: '2025-09-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
];

/** 演示帖子（CommunityPost 形状；author/category 嵌套对象） */
const DEMO_POSTS: Array<Record<string, unknown>> = [
  {
    id: 1,
    kind: 'topic',
    category_id: 1,
    author_id: 1,
    title: '【置顶】社区发帖规范与使用指南',
    content_markdown:
      '欢迎来到 FztbuCS 社区。\n\n- 发帖请选择对应分类\n- 技术帖建议附上背景与可复现步骤\n- 禁止广告与人身攻击\n\n如有问题可联系管理员。',
    status: 'published',
    is_pinned: true,
    is_featured: true,
    reply_count: 3,
    favorite_count: 10,
    last_reply_at: '2026-08-18T10:00:00Z',
    last_reply_id: 101,
    slug: 'community-guide',
    excerpt: '社区发帖规范与使用指南，新成员必读。',
    cover_image: null,
    tags: ['公告'],
    series_id: null,
    series_order: 0,
    published_at: '2026-08-01T09:00:00Z',
    view_count: 320,
    like_count: 25,
    author: DEMO_MEMBERS[0],
    category: { id: 1, slug: 'tech', name: '技术分享' },
    is_liked_by_me: false,
    is_favorited_by_me: false,
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-08-18T10:00:00Z',
  },
  {
    id: 2,
    kind: 'post',
    category_id: 1,
    author_id: 4,
    title: '用 FastAPI + SSE 实现一个流式问答助手',
    content_markdown:
      '最近在给学习助手接流式输出，记录几个关键点：\n\n1. SSE 事件格式：`data: {...}\\n\\n`\n2. 前端用 fetch + ReadableStream 逐步消费\n3. 记得设置 `Cache-Control: no-cache`\n\n代码片段见回复。',
    status: 'published',
    is_pinned: false,
    is_featured: false,
    reply_count: 5,
    favorite_count: 8,
    last_reply_at: '2026-08-17T20:00:00Z',
    last_reply_id: 102,
    slug: null,
    excerpt: 'SSE 流式问答助手的实现要点。',
    cover_image: null,
    tags: ['AI', 'Python', 'Web'],
    series_id: null,
    series_order: 0,
    published_at: '2026-08-16T14:00:00Z',
    view_count: 210,
    like_count: 18,
    author: DEMO_MEMBERS[3],
    category: { id: 1, slug: 'tech', name: '技术分享' },
    is_liked_by_me: false,
    is_favorited_by_me: false,
    created_at: '2026-08-16T14:00:00Z',
    updated_at: '2026-08-17T20:00:00Z',
  },
  {
    id: 3,
    kind: 'post',
    category_id: 2,
    author_id: 2,
    title: '本周五技术分享会：前端工程化实践',
    content_markdown:
      '时间：本周五 19:00\n地点：A 楼 302\n\n主题：Monorepo、契约生成与 CI 门禁。欢迎大家来交流，会后有奶茶。',
    status: 'published',
    is_pinned: false,
    is_featured: false,
    reply_count: 2,
    favorite_count: 4,
    last_reply_at: '2026-08-18T09:00:00Z',
    last_reply_id: 103,
    slug: null,
    excerpt: '本周五分享会预告与报名方式。',
    cover_image: null,
    tags: ['活动'],
    series_id: null,
    series_order: 0,
    published_at: '2026-08-15T10:00:00Z',
    view_count: 150,
    like_count: 12,
    author: DEMO_MEMBERS[1],
    category: { id: 2, slug: 'activity', name: '社团活动' },
    is_liked_by_me: false,
    is_favorited_by_me: false,
    created_at: '2026-08-15T10:00:00Z',
    updated_at: '2026-08-18T09:00:00Z',
  },
  {
    id: 4,
    kind: 'post',
    category_id: 3,
    author_id: 3,
    title: '纳新季到了，大家对社团有什么期待？',
    content_markdown:
      '马上要纳新了，想听听老成员的想法：\n\n- 希望新成员具备哪些基础？\n- 今年想做什么新项目？\n\n评论区聊聊～',
    status: 'published',
    is_pinned: false,
    is_featured: false,
    reply_count: 7,
    favorite_count: 2,
    last_reply_at: '2026-08-18T18:00:00Z',
    last_reply_id: 104,
    slug: null,
    excerpt: '纳新前的闲聊征集。',
    cover_image: null,
    tags: ['闲聊'],
    series_id: null,
    series_order: 0,
    published_at: '2026-08-14T12:00:00Z',
    view_count: 98,
    like_count: 6,
    author: DEMO_MEMBERS[2],
    category: { id: 3, slug: 'chat', name: '闲聊灌水' },
    is_liked_by_me: false,
    is_favorited_by_me: false,
    created_at: '2026-08-14T12:00:00Z',
    updated_at: '2026-08-18T18:00:00Z',
  },
  {
    id: 5,
    kind: 'topic',
    category_id: 1,
    author_id: 5,
    title: '题解｜ABC 388 E 的两种做法',
    content_markdown:
      '补一下上周周赛的 E 题：\n\n- 做法一：二分答案 + 贪心配对\n- 做法二：双指针\n\n复杂度均为 O(n log n)，附代码。',
    status: 'published',
    is_pinned: false,
    is_featured: false,
    reply_count: 4,
    favorite_count: 6,
    last_reply_at: '2026-08-16T22:00:00Z',
    last_reply_id: 105,
    slug: null,
    excerpt: '周赛 E 题两种解法与复杂度分析。',
    cover_image: null,
    tags: ['算法', '题解'],
    series_id: null,
    series_order: 0,
    published_at: '2026-08-13T21:00:00Z',
    view_count: 180,
    like_count: 15,
    author: DEMO_MEMBERS[4],
    category: { id: 1, slug: 'tech', name: '技术分享' },
    is_liked_by_me: false,
    is_favorited_by_me: false,
    created_at: '2026-08-13T21:00:00Z',
    updated_at: '2026-08-16T22:00:00Z',
  },
];

registerDemoMock({
  path: '/community/categories',
  method: 'GET',
  respond: () => ({
    status: 200,
    body: DEMO_CATEGORIES,
  }),
});

registerDemoMock({
  path: '/community/tags',
  method: 'GET',
  respond: () => ({
    status: 200,
    body: { tags: ['Web', 'AI', 'Python', '算法', '前端', '后端', '题解', '闲聊'] },
  }),
});

registerDemoMock({
  path: '/community/posts',
  method: 'GET',
  respond: ({ searchParams }) => {
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('page_size')) || 20;
    const kind = searchParams.get('kind');
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'latest';

    let items = DEMO_POSTS;
    if (kind && kind !== 'all') items = items.filter((p) => p.kind === kind);
    if (category) {
      items = items.filter(
        (p) =>
          String((p.category as Record<string, unknown> | null)?.slug) === category ||
          String(p.category_id) === category,
      );
    }
    if (tag) {
      items = items.filter((p) => (p.tags as string[]).includes(tag));
    }
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (p) =>
          String(p.title).toLowerCase().includes(s) ||
          String(p.content_markdown).toLowerCase().includes(s),
      );
    }
    if (sort === 'hot') {
      items = [...items].sort((a, b) => Number(b.view_count) - Number(a.view_count));
    }

    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);
    return {
      status: 200,
      body: {
        items: paged,
        total: items.length,
        page,
        page_size: pageSize,
        total_pages: Math.max(1, Math.ceil(items.length / pageSize)),
      },
    };
  },
});

registerDemoMock({
  path: '/community/posts/:id',
  method: 'GET',
  respond: ({ pathParams }) => {
    const post = DEMO_POSTS.find((p) => String(p.id) === pathParams.id);
    return post
      ? { status: 200, body: post }
      : { status: 404, body: { message: '帖子不存在', errorCode: 'NOT_FOUND' } };
  },
});

registerDemoMock({
  path: '/community/members',
  method: 'GET',
  respond: ({ searchParams }) => {
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);

    let items = DEMO_MEMBERS;
    if (tag) items = items.filter((m) => (m.tech_tags as string[]).includes(tag));
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (m) =>
          String(m.display_name).toLowerCase().includes(s) ||
          String(m.bio).toLowerCase().includes(s),
      );
    }
    return { status: 200, body: items.slice(0, limit) };
  },
});
