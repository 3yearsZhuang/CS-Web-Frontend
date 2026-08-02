/**
 * @file 活动报名服务（已迁移至 Repository 抽象层，ADR-009）
 */
import crypto from 'node:crypto';
import { getEventsRepository } from '@/shared/db/repositories/events.repo';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';

/** 报名活动 */
export async function registerForEvent(
  userId: string,
  eventId: string,
  formData?: Record<string, string> | null,
): Promise<{ id: string; status: string }> {
  const repo = getEventsRepository();
  const event = await repo.getEventById(eventId);
  if (!event) throw new AppError('活动不存在', 'NOT_FOUND');
  if (event.status !== 'upcoming' && event.status !== 'ongoing') {
    throw new AppError('当前活动不可报名', 'INVALID_STATUS');
  }

  const existing = await repo.getRegistration(userId, eventId);
  if (existing) {
    if (existing.status === 'registered') {
      throw new AppError('您已报名该活动', 'ALREADY_REGISTERED');
    }
    await repo.updateRegistrationStatus(existing.id, 'registered', null);
    await logAdminAction(userId, 'events.register', eventId, { targetType: 'event', reregister: true });
    return { id: existing.id, status: 'registered' };
  }

  const used = await repo.checkCapacityUsed(eventId);
  const capacity = event.capacity || 0;
  const status = capacity > 0 && used >= capacity ? 'waitlisted' : 'registered';

  const id = crypto.randomUUID();
  const formDataStr = formData ? JSON.stringify(formData) : null;
  await repo.insertRegistration({ id, userId, eventId, status, formData: formDataStr });
  await logAdminAction(userId, 'events.register', eventId, { targetType: 'event', status });
  return { id, status };
}

/** 取消报名 */
export async function cancelRegistration(userId: string, eventId: string): Promise<void> {
  const repo = getEventsRepository();
  const registration = await repo.getRegistration(userId, eventId);
  if (!registration) {
    throw new AppError('未报名该活动', 'NOT_REGISTERED');
  }
  if (registration.status === 'cancelled') return;
  await repo.updateRegistrationStatus(registration.id, 'cancelled', new Date().toISOString());
  await logAdminAction(userId, 'events.cancel', eventId, { targetType: 'event' });
}

/** 获取用户的报名记录 */
export async function getRegistration(userId: string, eventId: string) {
  const repo = getEventsRepository();
  return repo.getRegistration(userId, eventId);
}

/** 获取用户已报名的活动列表（供「我的活动」页使用） */
export async function getUserRegisteredEvents(userId: string) {
  const repo = getEventsRepository();
  return repo.listUserRegisteredEvents(userId);
}

/** 管理员代用户报名 */
export async function adminAddRegistration(
  adminId: string,
  userId: string,
  eventId: string,
  formData?: Record<string, string> | null,
): Promise<{ registration: { id: string; status: string } }> {
  const repo = getEventsRepository();
  const event = await repo.getEventById(eventId);
  if (!event) throw new AppError('活动不存在', 'NOT_FOUND');

  const existing = await repo.getRegistration(userId, eventId);
  if (existing) {
    throw new AppError('该用户已报名此活动', 'ALREADY_REGISTERED');
  }

  const used = await repo.checkCapacityUsed(eventId);
  const capacity = event.capacity || 0;
  const status = capacity > 0 && used >= capacity ? 'waitlisted' : 'registered';

  const id = crypto.randomUUID();
  const formDataStr = formData ? JSON.stringify(formData) : null;
  await repo.insertRegistration({ id, userId, eventId, status, formData: formDataStr });
  await logAdminAction(adminId, 'events.register', eventId, { targetType: 'event', byAdmin: true, userId });
  return { registration: { id, status } };
}

/** 管理员更新报名状态 */
export async function adminUpdateRegistrationStatus(
  adminId: string,
  registrationId: string,
  status: 'registered' | 'cancelled' | 'waitlisted',
): Promise<void> {
  const repo = getEventsRepository();
  const cancelledAt = status === 'cancelled' ? new Date().toISOString() : null;
  await repo.updateRegistrationStatus(registrationId, status, cancelledAt);
  await logAdminAction(adminId, 'events.registration.update', registrationId, { targetType: 'registration', status });
}

/** 获取某活动的报名统计 */
export async function getEventRegistrationStats(eventId: string): Promise<{
  total: number;
  registered: number;
  waitlisted: number;
  cancelled: number;
}> {
  const repo = getEventsRepository();
  const [total, registered, waitlisted, cancelled] = await Promise.all([
    repo.countRegistrations(['event_id = ?'], [eventId]),
    repo.countRegistrations(['event_id = ?', "status = 'registered'"], [eventId]),
    repo.countRegistrations(['event_id = ?', "status = 'waitlisted'"], [eventId]),
    repo.countRegistrations(['event_id = ?', "status = 'cancelled'"], [eventId]),
  ]);
  return { total, registered, waitlisted, cancelled };
}

/** 获取某用户的报名状态摘要 */
export async function getStats(userId: string, eventId: string): Promise<{
  registered: boolean;
  total: number;
  isFull: boolean;
}> {
  const repo = getEventsRepository();
  const event = await repo.getEventById(eventId);
  if (!event) throw new AppError('活动不存在', 'NOT_FOUND');
  const [reg, used] = await Promise.all([
    repo.getRegistration(userId, eventId),
    repo.checkCapacityUsed(eventId),
  ]);
  const capacity = event.capacity || 0;
  return {
    registered: !!reg && reg.status === 'registered',
    total: used,
    isFull: capacity > 0 && used >= capacity,
  };
}
