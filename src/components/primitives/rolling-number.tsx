'use client';

/**
 * @file RollingNumber — 数字滚动原语（共享组件，跨作用域可用）
 *
 * 用于编号 / 计数器 / 时钟等"数字变化"场景：每位数字是一条 0-9 的竖列，
 * 值变化时整列平移（默认 460ms，对齐 Rhine 终端的滚动节奏），
 * `animate={false}` 时退化为静态文本（无障碍与减少动态效果场景）。
 *
 * 约定：
 * - MUST 通过 `value` 传入字符串（数字会自动按 `digits` 补零）；
 * - MUST NOT 在组件内硬编码颜色/字号 —— 由父级 `className` 与字体变量决定；
 * - 无障碍：外层 `aria-label` 承载可读值，滚动列整体 `aria-hidden`。
 */
import { useEffect, useState } from 'react';

/** RollingNumber Props */
export interface RollingNumberProps {
  /** 目标值：字符串原样渲染；数字按 digits 补零 */
  value: string | number;
  /** value 为数字时的补零位数（默认 3） */
  digits?: number;
  /** 是否启用滚动动画（false 时退化为静态文本） */
  animate?: boolean;
  /** 滚动时长（ms，默认 460） */
  duration?: number;
  /** 附加类名（字号 / 字重由父级决定） */
  className?: string;
  /** 无障碍标签（默认取渲染值） */
  ariaLabel?: string;
}

/** 数字位数补零 */
export function padNumber(value: number, digits: number): string {
  return String(value).padStart(digits, '0');
}

export function RollingNumber({
  value,
  digits = 3,
  animate = true,
  duration = 460,
  className,
  ariaLabel,
}: RollingNumberProps) {
  const text = typeof value === 'number' ? padNumber(value, digits) : value;
  const [mounted, setMounted] = useState(false);

  // 首帧不滚动（避免从 0 跳变的入场动画），挂载后再启用过渡
  useEffect(() => {
    setMounted(true);
  }, []);

  // 无动画（减少动态效果 / 显式关闭）：静态文本，保持与动画态一致的无障碍语义
  if (!animate) {
    return (
      <span className={className} role="img" aria-label={ariaLabel ?? text}>
        {text}
      </span>
    );
  }

  const live = mounted;
  return (
    <span className={`rolling-number${className ? ' ' + className : ''}`} aria-label={ariaLabel ?? text} role="img">
      {text.split('').map((ch, i) => {
        const isDigit = ch >= '0' && ch <= '9';
        if (!isDigit) {
          return (
            <span key={i} className="rolling-static" aria-hidden="true">
              {ch}
            </span>
          );
        }
        return (
          <span key={i} className="rolling-dig" aria-hidden="true">
            <span
              className="rolling-col"
              style={{
                transform: `translateY(-${Number(ch)}em)`,
                transitionDuration: live ? `${duration}ms` : '0ms',
              }}
            >
              {Array.from({ length: 10 }, (_, n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
