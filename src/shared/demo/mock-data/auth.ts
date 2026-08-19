/**
 * @file 演示模式 mock — auth / profile（登录闭环）
 *
 * 覆盖端点：
 *   - POST /auth/login-email   → camelCase TokenPair（对齐 BackendTokenPair 传输契约）
 *   - GET  /auth/me            → { user: UserOut(snake_case), roles }
 *   - GET  /profile            → { user: UserOut(snake_case), roles }
 *   - PUT  /profile            → 合并请求体后返回（演示"资料已更新"）
 */
import { registerDemoMock } from '../demo-mode';

/** 演示账号（后端 UserOut camelCase 形状；角色用 user，主流程可逛） */
const DEMO_USER: Record<string, unknown> = {
  id: 1,
  email: 'demo@fztbu.edu.cn',
  username: 'demo',
  displayName: '演示同学',
  bio: '这是后端未连接时的演示账号，仅用于浏览界面，数据均为内置示例。',
  avatarUrl: null,
  avatarType: 'initial',
  githubUrl: null,
  websiteUrl: null,
  techTags: ['Web', 'AI', 'Python'],
  isSuperuser: false,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-08-19T00:00:00Z',
};

registerDemoMock({
  path: '/auth/login-email',
  method: 'POST',
  respond: () => ({
    status: 200,
    body: {
      accessToken: 'demo.access.token',
      refreshToken: 'demo.refresh.token',
    },
  }),
});

registerDemoMock({
  path: '/auth/me',
  method: 'GET',
  respond: () => ({
    status: 200,
    body: { user: DEMO_USER, roles: ['user'] },
  }),
});

registerDemoMock({
  path: '/profile',
  method: 'GET',
  respond: () => ({
    status: 200,
    body: { user: DEMO_USER, roles: ['user'] },
  }),
});

registerDemoMock({
  path: '/profile',
  method: 'PUT',
  respond: ({ body }) => {
    // 演示"资料已更新"：把请求体（前端 camelCase 字段）浅合并进演示用户
    const patch =
      typeof body === 'object' && body !== null
        ? (body as Record<string, unknown>)
        : {};
    return {
      status: 200,
      body: { user: { ...DEMO_USER, ...patch }, roles: ['user'] },
    };
  },
});
