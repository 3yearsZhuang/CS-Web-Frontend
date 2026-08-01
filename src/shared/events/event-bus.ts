/**
 * @file 全局事件总线
 *
 * 基于 Node.js EventEmitter 的类型安全事件总线。
 *
 * 设计原则：
 *   - 同步 emit（Node.js EventEmitter 默认同步），保证事务一致性
 *   - 类型安全：emit / on / off 通过 AppEventMap 约束事件名和 payload
 *   - 单例：模块级导出 appBus 实例
 *
 * 使用：
 *   import { appBus } from '@/shared/events/event-bus';
 *   appBus.emit('event.created', { ... });
 *   appBus.on('event.created', (data) => { ... });
 */

import { EventEmitter } from 'node:events';
import type { AppEventMap } from './event-types';

class TypedEventBus extends EventEmitter {
  emit<K extends keyof AppEventMap>(event: K, data: AppEventMap[K]): boolean {
    return super.emit(event, data);
  }

  on<K extends keyof AppEventMap>(event: K, listener: (data: AppEventMap[K]) => void): this {
    return super.on(event, listener);
  }

  off<K extends keyof AppEventMap>(event: K, listener: (data: AppEventMap[K]) => void): this {
    return super.off(event, listener);
  }
}

export const appBus = new TypedEventBus();