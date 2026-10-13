'use client';

/**
 * @file useOverlayFocusTrap — 覆盖层焦点陷阱（Rhine 覆盖层共用）
 *
 * 对齐上游 RhineLabUI PR #13「模态键盘导航包含链接」：
 * - 打开时聚焦 `data-autofocus` 标记的主控件（缺省取第一个可聚焦元素）
 * - Tab / Shift+Tab 在覆盖层内循环，**包含链接（a[href]）**、按钮与输入
 * - 关闭（open=false）即解除，不残留监听
 *
 * 依赖覆盖层骨架已具备的两点：交互元素在关闭态置 `tabIndex={-1}`
 * （见 archive-index / terminal-settings），顶栏为 flex-none 常驻（即上游 PR #11
 * 的 sticky 诉求在本站骨架下天然满足，无需额外处理）。
 */
import { useEffect, type RefObject } from 'react';

/** 可聚焦元素选择器（含链接，对齐上游 a11y 修复） */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 收集覆盖层内当前可聚焦元素（排除 aria-hidden 子树与关闭态 tabIndex=-1 元素） */
function focusableItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest('[aria-hidden="true"]'),
  );
}

/**
 * 覆盖层焦点陷阱
 * @param ref 覆盖层根节点（role="dialog" 容器）
 * @param open 是否打开
 */
export function useOverlayFocusTrap(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
): void {
  useEffect(() => {
    const root = ref.current;
    if (!open || !root) return;

    // 初始焦点：data-autofocus 优先，否则第一个可聚焦元素
    const preferred = root.querySelector<HTMLElement>('[data-autofocus]');
    (preferred ?? focusableItems(root)[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusableItems(root);
      if (!items.length) return;
      e.preventDefault();
      const idx = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey
        ? idx <= 0
          ? items[items.length - 1]
          : items[idx - 1]
        : idx === -1 || idx === items.length - 1
          ? items[0]
          : items[idx + 1];
      next.focus();
    };

    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [open, ref]);
}
