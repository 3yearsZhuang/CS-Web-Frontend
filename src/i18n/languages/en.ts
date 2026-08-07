/**
 * @file i18n 语言包（英文）— 聚合入口
 * 实际内容拆分在 ./messages/*.ts，按业务模块组织。
 */
import type { AppMessages } from '../types';
import { en as commonEn } from '../messages/common';
import { en as communityEn } from '../messages/community';
import { en as eventsEn } from '../messages/events';
import { en as toolsEn } from '../messages/tools';
import { en as adminEn } from '../messages/admin';
import { en as userEn } from '../messages/user';

export const en: AppMessages = {
  ...commonEn,
  ...communityEn,
  ...eventsEn,
  ...toolsEn,
  ...adminEn,
  ...userEn,
};
