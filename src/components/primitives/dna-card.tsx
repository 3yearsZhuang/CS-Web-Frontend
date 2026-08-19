/**
 * @file DnaCard — 像素融合层 DNA 卡共享组件（FrontDoc-UID §15.3）
 *
 * 封装 .dna-card 皮肤（表面底色 + 边框 + 默认硬阴影 + hover 抬升 + 右上角像素编号），
 * 与 Button 的 pixel / pixel-outline 变体同为「像素融合」设计语言的共享原子。
 *
 * 用法：
 *   <DnaCard corner={1}>…内容…</DnaCard>
 *   <DnaCard corner="// 01" className="opacity-70">…</DnaCard>
 *   <DnaCard as="div">…</DnaCard>
 *
 * 皮肤样式见 globals.css（全局生效，因属共享组件）。
 */

import type { ReactNode } from 'react';

export interface DnaCardProps {
  /** 右上角像素编号：number 自动补零两位（01/02…），string 原样显示；省略则无角标 */
  corner?: string | number;
  /** 附加类名（状态/对齐，如 archived、isLeft 文本右对齐等） */
  className?: string;
  /** 渲染根标签，默认 article（语义容器） */
  as?: 'article' | 'div';
  children: ReactNode;
}

/** DNA 卡共享组件 — 像素融合层卡片皮肤 */
export function DnaCard({ corner, className = '', as: Tag = 'article', children }: DnaCardProps) {
  const cornerText = typeof corner === 'number' ? String(corner).padStart(2, '0') : corner;
  const classes = ['dna-card', className].filter(Boolean).join(' ');
  return (
    <Tag className={classes}>
      {cornerText != null && cornerText !== '' && (
        <span className="dna-corner" aria-hidden="true">
          {cornerText}
        </span>
      )}
      {children}
    </Tag>
  );
}
