/**
 * @file 活动模块服务层统一导出
 */

import 'server-only';

export {
  toEventItem,
  toEventRegistration,
  validateInput,
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getRegisteredCount,
  batchUpdateEvents,
} from './crud';

export {
  getUserRegistration,
  getEventRegistrations,
  registerEvent,
  cancelEventRegistration,
  getUserRegisteredEvents,
  adminAddRegistration,
  adminUpdateRegistrationStatus,
  getEventRegistrationStats,
} from './registration';

export { autoArchivePastEvents } from './archive';

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

export { getDb } from '@/shared/db';

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