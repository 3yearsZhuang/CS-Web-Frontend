/**
 * @file shared/utils 统一导出（同构模块）
 *
 * ⚠️ image-utils / mail 为 server-only 模块（含 server-only 与 Node 原生依赖），
 *    禁止使用本 barrel 导出或在客户端组件里从 `@/shared/utils` 引入，
 *    服务端调用方请直接 import 子模块路径：
 *      - import { validateImageMagicBytes } from '@/shared/utils/image-utils';
 *      - import { sendVerificationCode } from '@/shared/utils/mail';
 */

export { formatDate, formatDateTime, formatRelativeTime } from './utils';

export {
  computePagination,
  computeTotalPages,
} from './pagination';
export type { PaginationInput, PaginationMeta } from './pagination';

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

export {
  maskEmail,
  maskPhone,
  maskSensitiveFields,
} from './mask';
