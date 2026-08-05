/**
 * @file i18n 入口 — 轻量 `t()` 取词函数 + 语言切换（无第三方依赖，GENERAL 3.2）
 *
 * 骨架期落地：集中 key 定义（types.ts）+ 中英文语言包（languages/），
 * 提供类型安全的 `t(key)` 取词与 `setLanguage/getLanguage`。
 *
 * 说明：项目当前 UI 大量内联「中文 / English」双语标签，全量迁移至本模块
 * 属后续迭代；本文件确立命名约定与取词范式，供新文案接入。
 */

import type { AppMessages, Language, MessageKey } from './types';
import { zhCN } from './languages/zh-CN';
import { en } from './languages/en';

const MESSAGES: Record<Language, AppMessages> = {
  'zh-CN': zhCN,
  en,
};

let currentLanguage: Language = 'zh-CN';

/** 设置当前语言 */
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

/** 获取当前语言 */
export function getLanguage(): Language {
  return currentLanguage;
}

/** 按 key 取词，类型安全（如 `t('common.loading')`） */
export function t(key: MessageKey): string {
  const [section, field] = key.split('.') as [keyof AppMessages, string];
  const msg = MESSAGES[currentLanguage][section];
  return msg?.[field as keyof typeof msg] ?? key;
}

/** 获取语言包（用于批量/默认值场景） */
export function getMessages(): AppMessages {
  return MESSAGES[currentLanguage];
}

export type { Language, AppMessages, MessageKey } from './types';
