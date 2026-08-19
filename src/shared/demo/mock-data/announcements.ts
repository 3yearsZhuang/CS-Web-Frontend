/**
 * @file 演示模式 mock — announcements（系统公告）
 *
 * 覆盖：GET /announcements → AnnouncementOut[]（snake_case，toAnnouncement 翻译）
 */
import { registerDemoMock } from '../demo-mode';

const DEMO_ANNOUNCEMENTS: Array<Record<string, unknown>> = [
  {
    id: 1,
    title: '欢迎来到 FztbuCS 演示模式',
    content:
      '当前处于演示模式：后端服务未连接，页面展示的是内置示例数据，仅用于预览界面。启动后端服务并刷新页面即可恢复正常使用。',
    level: 'info',
    is_active: true,
    is_dismissible: true,
    priority: 10,
    expires_at: null,
    target_roles: null,
    created_by: 1,
    created_at: '2026-08-19T09:00:00Z',
    updated_at: '2026-08-19T09:00:00Z',
  },
  {
    id: 2,
    title: '纳新报名通道开启',
    content:
      '2026 年秋季纳新报名已开启，欢迎对 Web / AI / 算法感兴趣的同学通过「加入我们」页面提交申请。',
    level: 'success',
    is_active: true,
    is_dismissible: true,
    priority: 5,
    expires_at: '2026-09-30T23:59:59Z',
    target_roles: null,
    created_by: 1,
    created_at: '2026-08-10T08:00:00Z',
    updated_at: '2026-08-10T08:00:00Z',
  },
  {
    id: 3,
    title: '本周技术分享会时间调整',
    content: '原定周三的「前端工程化实践」分享会调整至周五晚 19:00，地点不变，请互相转告。',
    level: 'warning',
    is_active: true,
    is_dismissible: false,
    priority: 3,
    expires_at: '2026-08-21T19:00:00Z',
    target_roles: ['member'],
    created_by: 1,
    created_at: '2026-08-18T12:00:00Z',
    updated_at: '2026-08-18T12:00:00Z',
  },
];

registerDemoMock({
  path: '/announcements',
  method: 'GET',
  respond: () => ({
    status: 200,
    body: DEMO_ANNOUNCEMENTS,
  }),
});
