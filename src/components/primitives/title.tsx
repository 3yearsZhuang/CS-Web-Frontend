import type { ElementType, ReactNode } from 'react';
import { GhostTitle } from './ghost-title';

export type TitleLevel = 1 | 2 | 3 | 4;

/**
 * 标准尺寸预设（display-serif 衬线族，双主题自适应）。
 * level 1 = Hero 主标题；level 2 = 区块标题；level 3 = 卡片/子标题；level 4 = 最小子标题。
 * Hero（level 1 + collapsed）的动态尺寸由 Title 内部按收缩态切换，不在此预设内。
 */
const LEVEL_PRESET: Record<TitleLevel, string> = {
  1: 'display-serif text-[var(--foreground)] text-[clamp(32px,7vw,72px)] leading-[1.05]',
  2: 'display-serif text-[var(--foreground)] text-[clamp(28px,5vw,56px)] leading-[1.05]',
  3: 'display-serif text-[var(--foreground)] text-[clamp(18px,2.5vw,24px)] leading-[1.3]',
  4: 'display-serif text-[var(--foreground)] text-[clamp(16px,2vw,20px)] leading-[1.2]',
};

const HERO_COLLAPSED_SIZE = 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]';
const HERO_EXPANDED_SIZE = 'text-[clamp(32px,7vw,72px)] leading-[1.05]';

export interface TitleProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'> {
  /** 语义层级，决定默认标签与尺寸预设。默认 2（区块标题）。*/
  level?: TitleLevel;
  /** 渲染标签，默认按 level 推导（h1/h2/h3/h4）。*/
  as?: ElementType;
  children: ReactNode;
  /**
   * 标题上方 eyebrow / 区块标记（如 `[ 00 ]` 或 meta-mono 小标签）。
   * 传 ReactNode 原样渲染（通常配合 <SectionMarker>）；留空则不渲染。
   */
  eyebrow?: ReactNode;
  /**
   * 标题行内静音英文/描述后缀（斜体 muted，与项目现有 hero 后缀一致）。
   * 始终作为标题行内的 inline span 渲染：非 Hero 用固定尺寸；Hero 折叠态切换字号与间距。
   * 例：<Title level={2} subtitle={t('en')}>社区</Title> → 「社区 <i>Community</i>」
   */
  subtitle?: ReactNode;
  /**
   * 是否启用底部像素虚影（标题选项 A · 像素错位虚影）。
   * 默认 level<=2 启用，level>=3 关闭。
   */
  ghost?: boolean;
  /**
   * 折叠 Hero 收缩态（仅 level=1 配合 CollapsingHero 使用）：
   * 传入 boolean 时进入 Hero 模式，按收缩态切换尺寸并附加 transition/hero-reveal。
   */
  collapsed?: boolean;
  /** 收缩态自定义尺寸类（覆盖默认；含 cursor-pointer 等交互态）。*/
  collapsedSize?: string;
  /** 展开态自定义尺寸类（覆盖默认 Hero 尺寸）。*/
  expandedSize?: string;
  /** 虚影内容（复杂标题显式传入，与正文同构）。*/
  echo?: ReactNode;
  /** 是否用 .ghost-title__content 包裹（块级子节点设 false）。*/
  wrapContent?: boolean;
  className?: string;
}

/**
 * 统一标题组件。
 *
 * 在 <GhostTitle>（底部像素虚影）之上，补齐「eyebrow 标记 + 衬线标题 + subtitle 行内后缀」
 * 三段式标题结构，并把 display-serif 衬线族 + clamp 尺寸做成 `level` 预设，
 * 取代散落在各页的重复 className 签名。
 *
 * @example
 * // 区块标题（自动虚影 + 标准尺寸）
 * <Title level={2}>{t('sectionTitle')}</Title>
 *
 * @example
 * // Hero 主标题（配合 CollapsingHero 折叠态 + 行内英文后缀）
 * <Title
 *   level={1}
 *   collapsed={hero.collapsed}
 *   collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
 *   expandedSize="text-[clamp(32px,7vw,72px)] leading-[1.05]"
 *   echo={`${t('heroTitle')} ${t('heroTitleEn')}`}
 *   subtitle={t('heroTitleEn')}
 *   onClick={hero.collapsed ? hero.onTitleClick : undefined}
 * >
 *   {t('heroTitle')}
 * </Title>
 *
 * @example
 * // 带 eyebrow 标记与英文副标题
 * <Title level={2} eyebrow={<SectionMarker>[ 00 ]</SectionMarker>} subtitle={t('sectionEn')}>
 *   {t('sectionTitle')}
 * </Title>
 */
export function Title({
  level = 2,
  as,
  children,
  eyebrow,
  subtitle,
  ghost,
  collapsed,
  collapsedSize = HERO_COLLAPSED_SIZE,
  expandedSize = HERO_EXPANDED_SIZE,
  echo,
  wrapContent,
  className = '',
  ...rest
}: TitleProps) {
  const useGhost = ghost ?? level <= 2;
  const heroMode = collapsed !== undefined;
  const Tag = (as ?? `h${level}`) as ElementType;

  // 调用方已在 className 显式指定字号时，不再叠加 level 预设，避免 Tailwind font-size 冲突。
  const hasExplicitSize = /\btext-(\[|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|lg|base|sm)\b/.test(
    className,
  );
  // 尺寸类：Hero 模式按收缩态切换；其余按 level 预设（未显式指定字号时）。
  const sizeClass = heroMode
    ? `transition-all hero-reveal ${collapsed ? collapsedSize : expandedSize}`
    : hasExplicitSize
      ? ''
      : LEVEL_PRESET[level];
  const headingClass = `display-serif text-[var(--foreground)] ${sizeClass} ${className}`.trim();

  // 英文/静音后缀：始终作为标题行内 inline span（与项目现有 hero 后缀一致）。
  // Hero 折叠态切换字号与间距；非 Hero 用固定尺寸。
  const subtitleClass = heroMode
    ? `display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal align-baseline ${
        collapsed ? 'text-[clamp(12px,1.6vw,18px)] ml-2' : 'text-[clamp(14px,2vw,24px)] ml-3'
      }`
    : 'display-serif italic text-[var(--muted-foreground)] text-[clamp(14px,2vw,24px)] ml-2 align-baseline';

  const headingInner = (
    <>
      {children}
      {subtitle != null && <span className={subtitleClass}>{subtitle}</span>}
    </>
  );

  const heading = useGhost ? (
    <GhostTitle as={Tag} className={headingClass} echo={echo} wrapContent={wrapContent} {...rest}>
      {headingInner}
    </GhostTitle>
  ) : (
    <Tag className={headingClass} {...rest}>
      {headingInner}
    </Tag>
  );

  return (
    <>
      {eyebrow != null && <div className="mb-3">{eyebrow}</div>}
      {heading}
    </>
  );
}

export default Title;

/**
 * 区块标记（section-marker）封装 —— 渲染 `[ content ]` 形式的 mono 标记。
 * 对应 globals.css 的 `.section-marker` 类（11px mono）。
 *
 * @example
 * <SectionMarker>[ 00 ]</SectionMarker>        // → [ 00 ]
 * <SectionMarker>[ 00 — Index ]</SectionMarker> // → [ 00 — Index ]
 */
export function SectionMarker({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`section-marker ${className}`}>{children}</div>;
}

/**
 * 工业双斜杠分隔标签（ark-divider）封装 —— 渲染 `// content` 形式的标签。
 * 对应 globals.css 的 `.ark-divider` 类（::before/::after 注入 `//`）。
 *
 * @example
 * <ArkDivider>Resources</ArkDivider>   // → // Resources
 * <ArkDivider ml-2>Submit</ArkDivider> // → // Submit（带左间距）
 */
export function ArkDivider({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`ark-divider ${className}`}>{children}</span>;
}
