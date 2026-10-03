/**
 * @file 演示模式 mock — announcements（系统公告）
 *
 * 覆盖：GET /announcements → AnnouncementOut[]（camelCase，toAnnouncement 翻译；P1-8）
 */
import { registerDemoMock } from '../demo-mode';

const DEMO_ANNOUNCEMENTS: Array<Record<string, unknown>> = [
  {
    id: 1,
    title: '欢迎来到 FztbuCS 演示模式',
    content:
      '当前处于演示模式：后端服务未连接，页面展示的是内置示例数据，仅用于预览界面。启动后端服务并刷新页面即可恢复正常使用。',
    level: 'info',
    isActive: true,
    isDismissible: true,
    priority: 10,
    expiresAt: null,
    targetRoles: null,
    createdBy: 1,
    createdAt: '2026-08-19T09:00:00Z',
    updatedAt: '2026-08-19T09:00:00Z',
  },
  {
    id: 2,
    title: '纳新报名通道开启',
    content:
      '2026 年秋季纳新报名已开启，欢迎对 Web / AI / 算法感兴趣的同学通过「加入我们」页面提交申请。',
    level: 'success',
    isActive: true,
    isDismissible: true,
    priority: 5,
    expiresAt: '2026-09-30T23:59:59Z',
    targetRoles: null,
    createdBy: 1,
    createdAt: '2026-08-10T08:00:00Z',
    updatedAt: '2026-08-10T08:00:00Z',
  },
  {
    id: 3,
    title: '本周技术分享会时间调整',
    content: '原定周三的「前端工程化实践」分享会调整至周五晚 19:00，地点不变，请互相转告。',
    level: 'warning',
    isActive: true,
    isDismissible: false,
    priority: 3,
    expiresAt: '2026-08-21T19:00:00Z',
    targetRoles: ['member'],
    createdBy: 1,
    createdAt: '2026-08-18T12:00:00Z',
    updatedAt: '2026-08-18T12:00:00Z',
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
