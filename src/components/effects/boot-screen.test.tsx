// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { BootScreen } from './boot-screen';

describe('BootScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('正常流程：挂载、逐行显示、淡出并在结束后调用 onRevealComplete', () => {
    const onRevealComplete = vi.fn();
    render(
      <BootScreen
        onRevealComplete={onRevealComplete}
        lineInterval={100}
        holdMs={100}
        fadeMs={100}
      />,
    );

    // 挂载初态
    expect(onRevealComplete).not.toHaveBeenCalled();

    // 快进时间
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onRevealComplete).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('fztbu_boot_seen')).toBe('1');
  });

  it('会话内已播放标记存在时直接跳过动画并立即完成', () => {
    sessionStorage.setItem('fztbu_boot_seen', '1');
    const onRevealComplete = vi.fn();
    const { container } = render(
      <BootScreen onRevealComplete={onRevealComplete} />,
    );

    expect(onRevealComplete).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toBeNull();
  });

  it('开启 prefers-reduced-motion 时跳过动画立即触发完成', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const onRevealComplete = vi.fn();
    render(<BootScreen onRevealComplete={onRevealComplete} />);

    expect(onRevealComplete).toHaveBeenCalledTimes(1);
  });
});
