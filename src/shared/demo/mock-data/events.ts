/**
 * @file 演示模式 mock — events（活动）
 *
 * 覆盖：
 *   - GET /events             → { items: EventOut[], total, page, page_size, total_pages }
 *                               （支持 page / page_size / status / month 筛选）
 *   - GET /events/:id         → EventOut（动态路径）
 *   - GET /events/me/registered → EventOut[]（我的报名）
 *
 * 字段为后端 EventOut snake_case 形状（toEventItem 翻译）。
 */
import { registerDemoMock } from '../demo-mode';

const DEMO_EVENTS: Array<Record<string, unknown>> = [
  {
    id: 1,
    month: '2026-08',
    date: '2026-08-21',
    title: '前端工程化实践分享',
    description: '围绕 Monorepo、契约生成与 CI 门禁，聊聊一个稳定前端工程的长什么样。',
    status: 'upcoming',
    year: 2026,
    topics: ['前端工程化', 'Monorepo', 'CI'],
    tags: ['Web', '工程化'],
    is_pinned: true,
    capacity: 60,
    content_markdown:
      '## 分享内容\n\n- Monorepo 多包管理与依赖编排\n- 基于 OpenAPI 的契约生成与类型安全\n- CI 门禁：类型、测试、契约零漂移\n\n欢迎携带问题现场交流。',
    registration_fields: [],
    created_by: 1,
    created_at: '2026-08-05T10:00:00Z',
    updated_at: '2026-08-18T10:00:00Z',
    registered_count: 42,
  },
  {
    id: 2,
    month: '2026-08',
    date: '2026-08-15',
    title: 'AI 辅助开发工作坊',
    description: '动手实践：用 AI 结对编程完成一个小型功能模块，体验提示词工程与代码评审闭环。',
    status: 'ongoing',
    year: 2026,
    topics: ['AI', '结对编程', '实践'],
    tags: ['AI', 'Python'],
    is_pinned: false,
    capacity: 30,
    content_markdown:
      '## 工作坊流程\n\n1. 环境准备与工具链介绍\n2. 需求拆解与提示词设计\n3. 结对实现与评审\n\n## 前置要求\n\n- 会基础的 Python / TypeScript 语法\n- 自带笔记本电脑',
    registration_fields: [{ key: 'experience', label: 'AI 使用经验', type: 'text' }],
    created_by: 1,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-12T10:00:00Z',
    registered_count: 28,
  },
  {
    id: 3,
    month: '2026-07',
    date: '2026-07-30',
    title: '夏季算法集训营',
    description: '为期两周的算法与数据结构集训，覆盖搜索、DP、图论与竞赛真题。',
    status: 'ended',
    year: 2026,
    topics: ['算法', '数据结构', '竞赛'],
    tags: ['算法'],
    is_pinned: false,
    capacity: 80,
    content_markdown: '## 集训安排\n\n- 每周 3 次线上直播课\n- 每日一题与周赛\n- 结营展示与复盘',
    registration_fields: [],
    created_by: 1,
    created_at: '2026-06-20T10:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
    registered_count: 76,
  },
  {
    id: 4,
    month: '2026-09',
    date: '2026-09-10',
    title: '2026 秋季纳新宣讲会',
    description: '社团介绍、方向讲解与答疑，现场可提交纳新报名。',
    status: 'upcoming',
    year: 2026,
    topics: ['纳新', '社团介绍'],
    tags: ['Web', 'AI', '算法'],
    is_pinned: false,
    capacity: 120,
    content_markdown: '## 宣讲流程\n\n- 社团与方向介绍\n- 往期项目展示\n- Q&A 与现场报名',
    registration_fields: [],
    created_by: 1,
    created_at: '2026-08-16T10:00:00Z',
    updated_at: '2026-08-16T10:00:00Z',
    registered_count: 15,
  },
];

registerDemoMock({
  path: '/events',
  method: 'GET',
  respond: ({ searchParams }) => {
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('page_size')) || 20;
    const status = searchParams.get('status');
    const month = searchParams.get('month');

    let items = DEMO_EVENTS;
    if (status) items = items.filter((e) => e.status === status);
    if (month) items = items.filter((e) => e.month === month);

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
  path: '/events/:id',
  method: 'GET',
  respond: ({ pathParams }) => {
    const ev = DEMO_EVENTS.find((e) => String(e.id) === pathParams.id);
    return ev
      ? { status: 200, body: ev }
      : { status: 404, body: { message: '活动不存在', errorCode: 'NOT_FOUND' } };
  },
});

registerDemoMock({
  path: '/events/me/registered',
  method: 'GET',
  respond: () => ({
    status: 200,
    body: [DEMO_EVENTS[1]],
  }),
});
