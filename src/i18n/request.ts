/**
 * @file next-intl 请求配置 — 无 i18n 路由模式（URL 不变，locale 从 cookie/localStorage 解析）
 *
 * 语言包沿用现有 src/i18n/languages/*.ts（namespace 结构，兼容 useTranslations）。
 * locale 解析优先级：cookie `locale` > 浏览器 Accept-Language 中支持的语言 > 默认 zh-CN。
 */
import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import type { AppMessages } from './types';
import { zhCN } from './languages/zh-CN';
import { en } from './languages/en';

/** 支持的语言 */
export const locales = ['zh-CN', 'en'] as const;
export type AppLocale = (typeof locales)[number];

/** 默认语言 */
export const defaultLocale: AppLocale = 'zh-CN';

/** 判断是否为受支持的语言 */
export function isSupportedLocale(value: string | undefined): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** 从 Accept-Language 头解析用户偏好语言 */
function detectFromAcceptLanguage(header: string | null): AppLocale | null {
  if (!header) return null;
  const prefs = header
    .split(',')
    .map((part) => {
      const [tag, qStr] = part.trim().split(';q=');
      const q = qStr ? parseFloat(qStr) : 1;
      return { tag: tag?.split('-')[0]?.toLowerCase(), q: Number.isNaN(q) ? 1 : q };
    })
    .sort((a, b) => b.q - a.q);

  const byTag: Record<string, AppLocale> = { zh: 'zh-CN', en: 'en' };
  for (const p of prefs) {
    if (p.tag && byTag[p.tag]) return byTag[p.tag];
  }
  return null;
}

export default getRequestConfig(async () => {
  let locale: AppLocale = defaultLocale;
  try {
    const store = await cookies();
    const stored = store.get('locale')?.value;
    if (isSupportedLocale(stored)) {
      locale = stored;
    } else {
      const headersStore = await headers();
      const detected = detectFromAcceptLanguage(headersStore.get('accept-language'));
      if (detected) locale = detected;
    }
  } catch {
    // 读取失败回退默认
  }

  const messages: Record<AppLocale, AppMessages> = {
    'zh-CN': zhCN,
    en,
  };

  return {
    locale,
    messages: messages[locale],
  };
});
