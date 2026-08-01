/**
 * @file 通知模块 — 事件订阅（业务事件 → 站内通知，发送失败不影响业务操作）
 */
import { appBus } from '@/shared/events/event-bus';
import { logger } from '@/shared/logger';
import {
  createNotification,
  createNotificationForAll,
} from './notification-core';

let initialized = false;

/**
 * 初始化通知事件监听器
 *
 * 订阅全局事件总线中的业务事件（活动创建/报名/取消、用户注册、论坛回复提及），
 * 自动转换为站内通知。重复调用幂等，仅首次执行注册。
 */
export function initNotificationEvents(): void {
  if (initialized) return;
  initialized = true;

  // ===== 活动事件 → 通知 =====

  appBus.on('event.created', (data) => {
    try {
      const content = data.description
        ? `${data.description}\n\n点击通知或前往「活动」页面查看详情。`
        : '点击通知或前往「活动」页面查看详情。';
      createNotificationForAll('activity', `新活动发布：${data.title}`, content, data.adminId);
    } catch (err) {
      logger.error({ err }, 'event.created 通知发送失败');
    }
  });

  appBus.on('event.registered', (data) => {
    try {
      createNotification(
        data.userId,
        'activity',
        '活动报名成功',
        `你已成功报名「${data.eventTitle}」，我们期待你的参与！`,
      );
    } catch (err) {
      logger.error({ err }, 'event.registered 通知发送失败');
    }
  });

  appBus.on('event.cancelled', (data) => {
    try {
      createNotification(
        data.userId,
        'activity',
        '活动取消报名',
        `你已取消「${data.eventTitle}」的报名。如有疑问请联系管理员。`,
      );
    } catch (err) {
      logger.error({ err }, 'event.cancelled 通知发送失败');
    }
  });

  // ===== 用户事件 → 通知 =====

  appBus.on('user.registered', (data) => {
    try {
      createNotification(
        data.userId,
        'system',
        '欢迎加入',
        '欢迎加入我们的社区！在这里你可以参与各类活动，结识志同道合的伙伴。',
      );
    } catch (err) {
      logger.error({ err }, 'user.registered 通知发送失败');
    }
  });

  // ===== 论坛事件 → 通知 =====

  appBus.on('reply.created', (data) => {
    try {
      for (const mentionedUserId of data.mentionedUserIds) {
        if (mentionedUserId === data.authorId) continue;
        createNotification(
          mentionedUserId,
          'system',
          '你在论坛回复中被提及',
          '某条回复中提到了你，点击查看。',
          data.authorId,
        );
      }
    } catch (err) {
      logger.error({ err }, 'reply.created 通知发送失败');
    }
  });
}