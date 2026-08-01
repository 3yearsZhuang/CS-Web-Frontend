'use client';

/**
 * @file 通用动画原语 — StaggerContainer / RevealItem / RevealTitle
 */
import { motion, type Variants } from 'motion/react';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { EASE } from '@/shared/utils/ui-constants';

/** Hero 入场时序（毫秒）— 与 useCollapsingHero 对齐
 *
 * 时序链路（事件驱动先后排序）：
 *   页面挂载(≈初始加载就绪)
 *     → LOAD_DELAY 缓冲（StaggerContainer delayChildren，字体不立即浮现）
 *     → 字体浮现（StaggerContainer 子项逐个完成，全部完成触发 onComplete）
 *     → FOLD_DELAY 等待（onComplete 后开始倒计时）
 *     → Hero 折叠为 sticky 悬浮态
 * - LOAD_DELAY：挂载后到字体浮现开始的缓冲
 * - FOLD_DELAY：字体浮现完成后到折叠的等待
 * - SAFETY_MAX：兜底，若 onComplete 未触发，强制推进的最大时长 */
export const HERO_TIMING = {
  LOAD_DELAY: 300,
  FOLD_DELAY: 600,
  SAFETY_MAX: 3000,
} as const;

/** StaggerContainer ↔ RevealItem/RevealTitle 完成计数协议
 *
 * - 子项挂载时调用 register() 自报计数
 * - 子项卸载时调用 unregister() 撤消计数
 * - 子项动画完成时调用 notifyComplete() 递减
 * - 当已完成数 ≥ 已注册数，StaggerContainer 触发 onComplete（仅触发一次）
 * - 通过 register/unregister 成对调用，兼容 React Strict Mode 的 double-mount 机制 */
interface StaggerCompleteContextValue {
  register: () => void;
  unregister: () => void;
  notifyComplete: () => void;
}

const StaggerCompleteContext = createContext<StaggerCompleteContextValue | null>(null);

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 自定义延迟 */
  delay?: number;
  /** 自定义 stagger */
  stagger?: number;
  /** 全部子项动画完成后触发（先后排序信号，供 useCollapsingHero 监听） */
  onComplete?: () => void;
}

/** 交错容器 — 子项 stagger 0.08s, 起始延迟 = 加载就绪缓冲(HERO_TIMING.LOAD_DELAY)
 *
 * 完成检测：通过 context 收集子项（RevealItem/RevealTitle）的注册与完成回调，
 * 全部完成后触发 onComplete，避免依赖固定时长估算。 */
export function StaggerContainer({
  children,
  className,
  style,
  delay = HERO_TIMING.LOAD_DELAY / 1000,
  stagger = 0.08,
  onComplete,
}: StaggerContainerProps) {
  const registeredRef = useRef(0);
  const completedRef = useRef(0);
  const firedRef = useRef(false);

  const [ctx] = useState<StaggerCompleteContextValue>(() => ({
    register: () => {
      registeredRef.current += 1;
    },
    unregister: () => {
      registeredRef.current = Math.max(0, registeredRef.current - 1);
    },
    notifyComplete: () => {
      completedRef.current += 1;
      if (!firedRef.current && completedRef.current >= registeredRef.current && registeredRef.current > 0) {
        firedRef.current = true;
        onComplete?.();
      }
    },
  }));

  const variants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };
  return (
    <motion.div
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      <StaggerCompleteContext.Provider value={ctx}>
        {children}
      </StaggerCompleteContext.Provider>
    </motion.div>
  );
}

interface RevealItemProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 自定义入场时长 */
  duration?: number;
  /** 自定义 y 偏移 */
  y?: number;
}

/** 通用揭示项 — opacity + y + blur；挂载注册、卸载撤消、完成上报 StaggerContainer */
export function RevealItem({
  children,
  className,
  style,
  duration = 0.7,
  y = 16,
}: RevealItemProps) {
  const ctx = useContext(StaggerCompleteContext);
  useEffect(() => {
    ctx?.register();
    return () => ctx?.unregister();
  }, [ctx]);

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y,
      filter: 'blur(6px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration, ease: EASE },
    },
  };
  return (
    <motion.div
      className={className}
      style={style}
      variants={variants}
      onAnimationComplete={() => ctx?.notifyComplete()}
    >
      {children}
    </motion.div>
  );
}

interface RevealTitleProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 自定义入场时长 */
  duration?: number;
}

/** 大标题专用 — 影院级焦点拉近（更大 scale + blur）；挂载注册、卸载撤消、完成上报 StaggerContainer */
export function RevealTitle({
  children,
  className,
  style,
  duration = 1.1,
}: RevealTitleProps) {
  const ctx = useContext(StaggerCompleteContext);
  useEffect(() => {
    ctx?.register();
    return () => ctx?.unregister();
  }, [ctx]);

  const variants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 1.015,
      filter: 'blur(12px)',
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration, ease: EASE },
    },
  };
  return (
    <motion.div
      className={className}
      style={style}
      variants={variants}
      onAnimationComplete={() => ctx?.notifyComplete()}
    >
      {children}
    </motion.div>
  );
}
