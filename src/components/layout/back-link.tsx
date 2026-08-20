/**
 * @file 统一返回链接（工具区/二级页通用）— meta-mono 样式，参照 /tools/auxilio/settings 设计。
 * 用法：<BackLink href="/tools">工具</BackLink>（默认带「←」前缀与 mt-2，CollapsingHero sidebarBottom 场景）；
 * 页面内嵌传 className="mt-0" 覆盖；词条自带箭头（如 backToAll）时传 arrow={false}。
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface BackLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  /** 是否渲染「←」前缀（词条自带箭头时为 false） */
  arrow?: boolean;
}

export default function BackLink({ href, children, className = '', arrow = true }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={`meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px] ${className}`}
    >
      {arrow && '← '}
      {children}
    </Link>
  );
}
