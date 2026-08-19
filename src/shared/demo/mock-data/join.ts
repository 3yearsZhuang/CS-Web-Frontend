/**
 * @file 演示模式 mock — join / notifications / public-profile
 *
 * 覆盖：
 *   - GET  /join/mine                → JoinApplicationOut[]（snake_case，toJoinApplication 翻译）
 *   - POST /join                     → JoinApplicationOut（201，合并请求体后返回）
 *   - GET  /notifications/unread-count → { unread_count }
 *   - GET  /users/:id/public-profile → { user: PublicUserOut(camelCase), stats }（前端直透）
 */
import { registerDemoMock } from '../demo-mode';

const DEMO_APPLICATION: Record<string, unknown> = {
  id: 7,
  applicant_name: '演示同学',
  student_id: '20260001',
  major: '计算机科学与技术',
  tech_tags: ['Web', 'AI'],
  reason: '对 Web 与 AI 方向感兴趣，希望加入社团一起学习交流。',
  contact_qq: '123456789',
  contact_phone: null,
  user_id: 1,
  status: 'pending',
  reviewed_by: null,
  review_note: null,
  created_at: '2026-08-18T10:00:00Z',
  updated_at: '2026-08-18T10:00:00Z',
};

registerDemoMock({
  path: '/join/mine',
  method: 'GET',
  respond: () => ({
    status: 200,
    body: [DEMO_APPLICATION],
  }),
});

registerDemoMock({
  path: '/join',
  method: 'POST',
  respond: ({ body }) => {
    const b =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {};
    return {
      status: 201,
      body: {
        id: 99,
        applicant_name: b.applicant_name ?? '演示同学',
        student_id: b.student_id ?? '20260001',
        major: b.major ?? '计算机科学与技术',
        tech_tags: Array.isArray(b.tech_tags) ? b.tech_tags : ['Web'],
        reason: b.reason ?? '希望加入社团一起学习',
        contact_qq: b.contact_qq ?? null,
        contact_phone: b.contact_phone ?? null,
        user_id: 1,
        status: 'pending',
        reviewed_by: null,
        review_note: null,
        created_at: '2026-08-19T00:00:00Z',
        updated_at: '2026-08-19T00:00:00Z',
      },
    };
  },
});

registerDemoMock({
  path: '/notifications/unread-count',
  method: 'GET',
  respond: () => ({
    status: 200,
    body: { unread_count: 3 },
  }),
});

registerDemoMock({
  path: '/users/:id/public-profile',
  method: 'GET',
  respond: ({ pathParams }) => ({
    status: 200,
    body: {
      user: {
        id: Number(pathParams.id) || 1,
        email: 'demo@fztbu.edu.cn',
        displayName: '演示同学',
        bio: '前端方向，喜欢折腾工程化。',
        avatarUrl: null,
        avatarType: 'initial',
        githubUrl: 'https://github.com/demo',
        websiteUrl: null,
        techTags: ['Web', 'AI', 'Python'],
        createdAt: '2026-01-01T00:00:00Z',
      },
      stats: {
        topics: 2,
        replies: 8,
        likes: 15,
      },
    },
  }),
});
