/**
 * @file 活动页（/events）— RSC 壳：服务端预取默认视图，客户端组件首屏直出
 *
 * 预取数据通过 props 注入 events-client，首帧即带内容渲染（不再经历
 * 「挂载 → 发请求 → 骨架屏 → 内容」的水合后等待）。
 * 预取失败时 initialEvents 为空数组，客户端保持原有加载与错误处理逻辑。
 */
import { prefetchEvents } from './server-events';
import EventsClient from './events-client';

export default async function EventsPage() {
  const initialEvents = await prefetchEvents();
  return <EventsClient initialEvents={initialEvents} />;
}
