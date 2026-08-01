/**
 * @file Next.js instrumentation 启动钩子
 *
 * 在应用启动时执行一次性初始化逻辑，确保关键监听器在请求到达前已注册。
 *
 * 对应 ADR-013：事件监听器显式初始化
 *   - 替代 notification/server/index.ts 中的模块加载副作用（`_initEvents()`）
 *   - Next.js 按需加载可能导致副作用未触发，通知静默失效（R7）
 *   - 此处显式调用 `initNotificationEvents()`，幂等保护已存在于函数内部
 *
 * 全局错误兜底（O1）：
 *   - 注册 unhandledRejection / uncaughtException 监听器
 *   - 确保所有未捕获的异步 rejection 进入结构化日志（pino），而非仅走默认 console
 *   - 运维可经日志聚合捕获启动失败与运行时崩溃
 *
 * 运行时约束：
 *   - Node.js 专属逻辑拆分到 instrumentation-node.ts，动态导入
 *   - 避免 Turbopack 将 process.on() 编译到 Edge Runtime
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Node.js 专属逻辑（process.on / initNotificationEvents）拆分到独立文件
  // 通过动态导入确保 Turbopack 不会将其编译到 Edge Runtime
  await import('@/instrumentation-node');
}
