/**
 * @file 社区左侧栏 — 版块导航 + 快速入口（<md 时隐藏）
 */
'use client';

import Link from 'next/link';
import type { CommunityCategory } from '@/modules/community/types';

interface CommunitySidebarNavProps {
  categories: CommunityCategory[];
  activeSection?: string;
  className?: string;
}

export function CommunitySidebarNav({
  categories,
  activeSection,
  className = '',
}: CommunitySidebarNavProps) {
  return (
    <aside className={`space-y-6 ${className}`}>
      {/* 版块导航 */}
      <section>
        <h3 className="meta-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-4">
          Sections
        </h3>
        <nav className="space-y-0">
          <Link
            href="/community?tab=topic"
            className={`block py-2.5 font-mono text-[12px] transition-colors focus-amber ${
              activeSection === 'all'
                ? 'text-[var(--primary)] border-l-2 border-[var(--primary)] pl-3'
                : 'text-[var(--foreground)] hover:text-[var(--primary)] pl-[14px]'
            }`}
          >
            全部版块
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/community?tab=topic`}
              className={`block py-2.5 font-mono text-[12px] transition-colors focus-amber ${
                activeSection === cat.slug
                  ? 'text-[var(--primary)] border-l-2 border-[var(--primary)] pl-3'
                  : 'text-[var(--foreground)] hover:text-[var(--primary)] pl-[14px]'
              }`}
            >
              <span className="tabular-nums mr-1.5 text-[var(--muted-foreground)]">
                {String(cat.topicCount).padStart(2, '0')}
              </span>
              {cat.name}
            </Link>
          ))}
        </nav>
      </section>

      {/* 快速入口 */}
      <section className="border-t border-[var(--border)] pt-6">
        <h3 className="meta-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] mb-4">
          Quick Links
        </h3>
        <nav className="space-y-0">
          <Link
            href="/community?tab=topic"
            className="block py-2.5 font-mono text-[12px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors focus-amber"
          >
            → 论坛首页
          </Link>
          <Link
            href="/community?tab=post"
            className="block py-2.5 font-mono text-[12px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors focus-amber"
          >
            → 博客
          </Link>
          <Link
            href="/members"
            className="block py-2.5 font-mono text-[12px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors focus-amber"
          >
            → 成员列表
          </Link>
        </nav>
      </section>
    </aside>
  );
}