/**
 * @file 全局页脚 — 左侧 Logo + 版权，右侧导航链接
 */
import Link from 'next/link';
import Image from 'next/image';

/** 全站页脚 */
export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-14 px-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden">
              <Image
                src="/logo.png"
                alt="计算机协会 Logo"
                width={28}
                height={28}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[13px] text-[var(--muted-foreground)]">
              计算机协会 &copy; {new Date().getFullYear()}
            </span>
          </div>

          <div className="flex items-center gap-8">
            <Link
              href="/about"
              className="text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300"
            >
              关于我们 & 加入
            </Link>
            <Link
              href="/events"
              className="text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-300"
            >
              活动
            </Link>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-[11px] text-[var(--muted-foreground)] tracking-wide">
            Made with passion by Computer Association
          </p>
        </div>
      </div>
    </footer>
  );
}