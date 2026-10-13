// @vitest-environment jsdom

/**
 * @file useOverlayFocusTrap 测试（对齐上游模态 a11y：Tab 循环包含链接）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useOverlayFocusTrap } from './use-overlay-focus-trap';

/** 带焦点陷阱的测试容器：含链接、按钮、输入 */
function TrapHarness({ open }: { open: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useOverlayFocusTrap(ref, open);
  return (
    <div ref={ref} role="dialog" aria-label="测试覆盖层" aria-hidden={!open}>
      <button type="button" data-autofocus>
        BACK
      </button>
      <a href="https://example.com" tabIndex={open ? 0 : -1}>
        OPEN LINK
      </a>
      <input aria-label="检索" tabIndex={open ? 0 : -1} />
      <button type="button" tabIndex={open ? 0 : -1}>
        SAVE
      </button>
    </div>
  );
}

describe('useOverlayFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('打开时聚焦 data-autofocus 元素', () => {
    render(<TrapHarness open />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'BACK' }));
  });

  it('Tab 在覆盖层内循环，且包含链接', () => {
    render(<TrapHarness open />);
    const order = ['BACK', 'OPEN LINK', '检索', 'SAVE'];
    const items = order.map((n) => screen.getByRole(n === 'OPEN LINK' ? 'link' : n === '检索' ? 'textbox' : 'button', { name: n }));
    // BACK → OPEN LINK → 检索 → SAVE → 回 BACK
    fireEvent.keyDown(items[0], { key: 'Tab' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1], { key: 'Tab' });
    expect(document.activeElement).toBe(items[2]);
    fireEvent.keyDown(items[2], { key: 'Tab' });
    expect(document.activeElement).toBe(items[3]);
    fireEvent.keyDown(items[3], { key: 'Tab' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('Shift+Tab 反向循环', () => {
    render(<TrapHarness open />);
    const back = screen.getByRole('button', { name: 'BACK' });
    fireEvent.keyDown(back, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'SAVE' }));
  });

  it('焦点不在覆盖层内时，Tab 聚焦第一个元素', () => {
    render(<TrapHarness open />);
    (document.activeElement as HTMLElement)?.blur?.();
    const back = screen.getByRole('button', { name: 'BACK' });
    fireEvent.keyDown(back, { key: 'Tab' });
    expect(document.activeElement).toBe(back);
  });

  it('关闭时不设置焦点也不拦截 Tab', () => {
    const { container } = render(<TrapHarness open={false} />);
    expect(document.activeElement).toBe(document.body);
    // 关闭态覆盖层 aria-hidden，role 查询不可达，改用选择器
    const back = container.querySelector('button');
    expect(back).not.toBeNull();
    const tabSpy = vi.spyOn(KeyboardEvent.prototype, 'preventDefault');
    fireEvent.keyDown(back as HTMLElement, { key: 'Tab' });
    expect(tabSpy).not.toHaveBeenCalled();
    tabSpy.mockRestore();
  });
});
