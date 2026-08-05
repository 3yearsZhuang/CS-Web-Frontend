/**
 * @file shared/config 统一导出 — 认证常量、头像预设、管理员头像、页首背景图
 */

export {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE,
  OAUTH_2FA_COOKIE_NAME,
  OAUTH_2FA_COOKIE_MAX_AGE,
  EMAIL_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_COMPLEXITY,
  PASSWORD_HISTORY_LIMIT,
  ALLOWED_ORIGINS,
  COOKIE_SECURE,
} from './auth-constants';

export {
  AVATAR_PRESETS,
  getPresetById,
  isValidPresetId,
} from './avatar-presets';
export type { AvatarPreset } from './avatar-presets';

export {
  ADMIN_AVATARS,
  getQqAvatarUrl,
  getAdminAvatarUrl,
} from './admin-avatars';
export type { AdminAvatar } from './admin-avatars';

export {
  HEADER_IMAGES,
  getHeaderImage,
} from './header-images';
export type { HeaderImageConfig } from './header-images';
