/**
 * @file 全局事件类型定义
 *
 * 所有跨模块通信必须通过事件总线，不得直接 import 其他模块的 server 代码。
 * 新增事件时在此处添加类型定义。
 */

/** 应用事件映射表 */
export interface AppEventMap {
  'event.created': { eventId: string; title: string; description: string | null; adminId: string };
  'event.registered': { userId: string; eventId: string; eventTitle: string };
  'event.cancelled': { userId: string; eventId: string; eventTitle: string };
  'event.checkin.generated': { eventId: string; adminId: string; generated: number };
  'reply.created': { replyId: string; topicId: string; authorId: string; contentMarkdown: string; mentionedUserIds: string[] };
  'user.registered': { userId: string };
  'task.claim.approved': { userId: string; taskId: string; taskTitle: string; points: number };
  'exam.passed': { userId: string; examId: string; examTitle: string; score: number; points: number };
}