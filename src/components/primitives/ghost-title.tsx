import { useEffect, useRef, useState, type ElementType, type ReactNode, type Ref } from 'react';

export interface GhostTitleProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'> {
  /** 渲染的语义标签，默认 h2 */
  as?: ElementType;
  className?: string;
  children: ReactNode;
  /**
   * 虚影（底部排印回声）内容。
   * 不传时：若 children 为纯字符串，自动复用同一文本作为虚影；
   * 若 children 为复杂节点（含 <br/>、彩色 span 等），需显式传入与正文同构的节点。
   */
  echo?: ReactNode;
  /**
   * 是否用 .ghost-title__content 包裹真实标题。
   * 当 children 是块级组件（如 TypewriterTitle 渲染 h1）时设 false，
   * 由 CSS `:last-child` 规则保证真标题 z-index 高于虚影。
   */
  wrapContent?: boolean;
  /**
   * 是否启用「虚影高度保护」。默认 true：当真实标题的渲染高度高于虚影
   * （即真实标题行数多于虚影能展示的行数——自然换行、或首页 Hero 在 <br/> 之外又自然换行等）
   * 时隐藏虚影，避免「像素虚影单行 / 衬线标题多行」错位。设 false 可强制始终显示虚影
   * （仅当虚影与真标题行结构保证逐行一致时使用）。
   */
  hideOnWrap?: boolean;
}

/**
 * 标题底部虚影（像素融合 · 标题选项 A · 像素错位虚影）。
 *
 * 真实标题用衬线，背后叠一份像素字体的相同文本，向右下硬偏移、低透明度，
 * 形成「衬线 × 像素」的错位回声。虚影 z-index 低于真标题、pointer-events:none、aria-hidden，纯装饰。
 * 仅用于大号衬线主标题（页面 Hero / 章节标题），不用于卡片/列表项/统计数字等小标题。
 *
 * @example
 * // 纯文本标题：虚影自动复用文本
 * <GhostTitle as="h2" className="display-serif ...">{t('beliefsTitle')}</GhostTitle>
 *
 * @example
 * // 复杂多行标题（如 Hero 的 TypewriterTitle）：显式传入 echo 并关闭 content 包裹
 * <GhostTitle as="div" className="display-serif ..." wrapContent={false}
 *   echo={<><span>{t('a')}</span><span>{t('b')}</span><br />{t('c')}</>}>
 *   <TypewriterTitle ...>...</TypewriterTitle>
 * </GhostTitle>
 */
export function GhostTitle({
  as: Tag = 'h2',
  className = '',
  children,
  echo,
  wrapContent = true,
  hideOnWrap = true,
  ...rest
}: GhostTitleProps) {
  const echoNode: ReactNode | null =
    echo !== undefined ? echo : typeof children === 'string' ? children : null;

  // 虚影高度保护：真实标题渲染高度高于虚影（行数更多）时隐藏虚影，避免错位。
  // 比较「真实标题 scrollHeight」与「虚影 offsetHeight」——覆盖自然换行，以及首页 Hero
  // 在 <br/> 之外又自然换行的情况。虚影用 visibility 切换（保留布局高度，可随宽度变化恢复显示）。
  const tagRef = useRef<HTMLElement>(null);
  const echoRef = useRef<HTMLSpanElement>(null);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    if (hideOnWrap === false) {
      setHide(false);
      return;
    }
    const el = tagRef.current;
    const echoEl = echoRef.current;
    if (!el || !echoEl) return;
    const measure = () => {
      const echoH = echoEl.offsetHeight;
      if (echoH === 0) return; // 尚未布局，等 ResizeObserver 下次触发
      setHide(el.scrollHeight > echoH + 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hideOnWrap]);

  return (
    <Tag ref={tagRef as Ref<HTMLElement>} className={`ghost-title ${className}`} {...rest}>
      {echoNode !== null && (
        <span
          ref={echoRef}
          className="ghost-title__echo"
          aria-hidden="true"
          style={{ visibility: hide ? 'hidden' : 'visible' }}
        >
          {echoNode}
        </span>
      )}
      {wrapContent ? (
        <span className="ghost-title__content">{children}</span>
      ) : (
        children
      )}
    </Tag>
  );
}

export default GhostTitle;
