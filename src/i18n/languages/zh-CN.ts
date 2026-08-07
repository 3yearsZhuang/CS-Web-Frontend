/**
 * @file i18n 语言包（中文）— 聚合入口
 * 实际内容拆分在 ./messages/*.ts，按业务模块组织。
 */
import type { AppMessages } from '../types';
import { zhCN as commonZh } from '../messages/common';
import { zhCN as communityZh } from '../messages/community';
import { zhCN as eventsZh } from '../messages/events';
import { zhCN as toolsZh } from '../messages/tools';
import { zhCN as adminZh } from '../messages/admin';
import { zhCN as userZh } from '../messages/user';

export const zhCN: AppMessages = {
  ...commonZh,
  ...communityZh,
  ...eventsZh,
  ...toolsZh,
  ...adminZh,
  ...userZh,
};
