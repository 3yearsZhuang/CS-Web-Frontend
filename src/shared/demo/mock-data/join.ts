/**
 * @file 演示模式 mock — join / notifications / public-profile
 *
 * 覆盖：
 *   - GET  /join/mine                → JoinApplicationOut[]（camelCase，toJoinApplication 翻译；P1-8）
 *   - POST /join                     → JoinApplicationOut（201，合并请求体后返回；请求体保持后端 snake_case 入参契约）
 *   - GET  /notifications/unread-count → { unread_count }
 *   - GET  /users/:id/public-profile → { user: PublicUserOut(camelCase), stats }（前端直透）
 */
import { registerDemoMock } from '../demo-mode';

const DEMO_APPLICATION: Record<string, unknown> = {
  id: 7,
  applicantName: '演示同学',
  studentId: '20260001',
  major: '计算机科学与技术',
  techTags: ['Web', 'AI'],
  reason: '对 Web 与 AI 方向感兴趣，希望加入社团一起学习交流。',
  contactQq: '123456789',
  contactPhone: null,
  userId: 1,
  status: 'pending',
  reviewedBy: null,
  reviewNote: null,
  createdAt: '2026-08-18T10:00:00Z',
  updatedAt: '2026-08-18T10:00:00Z',
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
        applicantName: b.applicant_name ?? '演示同学',
        studentId: b.student_id ?? '20260001',
        major: b.major ?? '计算机科学与技术',
        techTags: Array.isArray(b.tech_tags) ? b.tech_tags : ['Web'],
        reason: b.reason ?? '希望加入社团一起学习',
        contactQq: b.contact_qq ?? null,
        contactPhone: b.contact_phone ?? null,
        userId: 1,
        status: 'pending',
        reviewedBy: null,
        reviewNote: null,
        createdAt: '2026-08-19T00:00:00Z',
        updatedAt: '2026-08-19T00:00:00Z',
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
