/**
 * @file shared/utils 统一导出
 *
 * image-utils/mail 为 server-only 模块；utils/ui-constants/tech-tags/pagination/monitoring 为同构模块。
 */

export { formatDate, formatDateTime, formatRelativeTime } from './utils';

export {
  computePagination,
  computeTotalPages,
} from './pagination';
export type { PaginationInput, PaginationMeta } from './pagination';

export { validateImageMagicBytes } from './image-utils';

export {
  TECH_TAGS,
  TECH_TAGS_MAX,
  validateTechTags,
} from './tech-tags';
export type { TechTag } from './tech-tags';

export {
  Z,
  INPUT_CLASS,
  FORM_LIMITS,
  EASE,
} from './ui-constants';

export {
  captureError,
  captureMessage,
  captureErrorSync,
  isMonitoringEnabled,
} from './monitoring';

export { sendVerificationCode } from './mail';

export {
  maskEmail,
  maskPhone,
  maskName,
  maskStudentId,
  maskString,
  maskSensitiveFields,
} from './mask';
