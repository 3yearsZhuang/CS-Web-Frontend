/**
 * @file 全局页脚 — 左侧 Logo + 版权，右侧导航链接
 */
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

/** 全站页脚 */
export async function Footer() {
  const t = await getTranslations('nav');
  const tc = await getTranslations('footer');

  return (
    <footer className="border-t border-[var(--border)] py-14 px-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 overflow-hidden">
              <Image
                src="/logo.png"
                alt={t('brand')}
                width={28}
                height={28}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[13px] text-[var(--muted-foreground)]">
              {t('brand')}官网(ver.0.9.8) &copy; {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-8">
            <Link
              href="/about"
              className="text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300"
            >
              {tc('aboutJoin')}
            </Link>
            <Link
              href="/events"
              className="text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300"
            >
              {t('events')}
            </Link>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-[11px] text-[var(--muted-foreground)] tracking-wide">
            {tc('madeWith')}
          </p>
        </div>
      </div>
    </footer>
  );
}