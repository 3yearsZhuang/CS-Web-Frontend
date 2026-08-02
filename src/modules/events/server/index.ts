/**
 * @file 活动模块服务层统一导出（已迁移至 Repository 抽象层，ADR-009）
 */

import 'server-only';

export {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  autoArchivePastEvents,
  batchUpdateEvents,
} from './crud';

export {
  registerForEvent,
  cancelRegistration,
  getRegistration,
  getEventRegistrationStats,
  getStats,
  getUserRegisteredEvents,
  adminAddRegistration,
  adminUpdateRegistrationStatus,
} from './registration';

export {
  generateCheckinCodes,
  getEventCheckins,
  checkinByCode,
  getCheckinStats,
} from './checkin';

export {
  getEventSettings,
  updateEventSetting,
  resetEventSetting,
  DEFAULT_EVENT_SETTINGS,
  type EventSettings,
} from './setting';

export { getEventStats, type EventStat } from './stats';

export {
  listRegistrations,
  type AdminEventRegistration,
} from './registrations';

export type {
  EventStatus,
  EventRow,
  RegistrationField,
  EventItem,
  EventInput,
  RegistrationStatus,
  EventRegistration,
  EventRegistrationRow,
  PaginatedEvents,
  ListEventsFilters,
  EventCheckin,
  EventCheckinRow,
  CheckinCode,
} from '../types';

export { EVENT_LIMITS } from '../types';
