'use client';

/**
 * @file use-focus-trap.ts — 焦点陷阱 hook（Tab 循环 + Escape 关闭 + 焦点恢复）
 * 参考 WAI-ARIA Dialog Pattern
 */

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseFocusTrapOptions {
  /** 是否激活焦点陷阱 */
  active: boolean;
  /** 触发元素 ref（关闭时恢复焦点到此元素） */
  triggerRef?: RefObject<HTMLElement | null>;
  /** 关闭回调（Escape 键触发时调用） */
  onClose?: () => void;
  /** 是否锁定 body 滚动（默认 true） */
  lockScroll?: boolean;
}

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  active,
  triggerRef,
  onClose,
  lockScroll = true,
}: UseFocusTrapOptions): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // ---------- 1. 锁定 body 滚动 ----------
    let prevOverflow = '';
    if (lockScroll) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    // ---------- 2. 打开时聚焦首个可聚焦元素 ----------
    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusables.length > 0) {
      // 优先聚焦第一个非禁用元素
      const first = focusables[0];
      // 延迟一帧确保 DOM 布局完成（动画/过渡可能还未结束）
      requestAnimationFrame(() => {
        first.focus({ preventScroll: true });
      });
    } else {
      // 无可聚焦元素时聚焦容器本身
      container.setAttribute('tabindex', '-1');
      container.focus({ preventScroll: true });
    }

    // ---------- 3. Tab 键焦点陷阱 ----------
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }

      if (e.key !== 'Tab') return;

      // 重新查询可聚焦元素（可能动态变化）
      const els = container.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (els.length === 0) {
        e.preventDefault();
        return;
      }

      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: 从第一个回绕到最后一个
        if (document.activeElement === first || document.activeElement === container) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else {
        // Tab: 从最后一个回绕到第一个
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);

    // ---------- 4. cleanup ----------
    return () => {
      document.removeEventListener('keydown', onKeyDown);

      if (lockScroll) {
        document.body.style.overflow = prevOverflow;
      }

      // 恢复焦点到触发元素
      if (triggerRef?.current) {
        triggerRef.current.focus({ preventScroll: true });
      }

      // 清理容器上的临时 tabindex
      if (container.hasAttribute('tabindex')) {
        container.removeAttribute('tabindex');
      }
    };
  }, [active, lockScroll, onClose, triggerRef]);

  return containerRef;
}