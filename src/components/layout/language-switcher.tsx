/**
 * @file LanguageSwitcher — 语言切换组件
 *
 * 无 i18n 路由模式：切换语言 = 写 `locale` cookie 后刷新页面。
 * next-intl 的 getRequestConfig 从 cookie 读取 locale，服务端渲染据此取词。
 * 用 next/navigation 的 useRouter + refresh 实现无全页刷新的更新。
 */
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/** 语言选项 */
const LANGUAGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en', label: 'EN' },
];

/** 语言切换器 — 按钮式，显示当前语言，点击切换 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const locale = useLocale();
  const t = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  /** 切换语言：写 cookie 后刷新以重新服务端渲染 */
  const switchLocale = (next: string) => {
    if (next === locale || isPending) return;
    startTransition(() => {
      document.cookie = `locale=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
      // 全页刷新以让 getRequestConfig 读取新 cookie 重新渲染
      window.location.reload();
    });
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label={t('language')}>
      {LANGUAGE_OPTIONS.map((opt) => {
        const active = opt.value === locale;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => switchLocale(opt.value)}
            aria-current={active ? 'true' : undefined}
            className={`focus-amber transition-colors ${
              compact ? 'text-[10px] px-1.5 py-0.5' : 'meta-mono text-[11px] px-2 py-1'
            } ${
              active
                ? 'text-[var(--primary)] underline-grow'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
