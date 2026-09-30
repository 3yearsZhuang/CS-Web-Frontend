// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { CjkFontLoader } from './cjk-font-loader';

describe('CjkFontLoader', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('在无 requestIdleCallback 环境下使用 setTimeout 调度', () => {
    // @ts-expect-error test env override
    delete window.requestIdleCallback;
    const { container } = render(<CjkFontLoader />);
    expect(container.firstChild).toBeNull();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('在有 requestIdleCallback 环境下正常注册回调并在卸载时取消', () => {
    const cancelSpy = vi.fn();
    const idleSpy = vi.fn().mockImplementation((cb: () => void) => {
      cb();
      return 42;
    });
    window.requestIdleCallback = idleSpy;
    window.cancelIdleCallback = cancelSpy;

    const { unmount } = render(<CjkFontLoader />);
    expect(idleSpy).toHaveBeenCalledTimes(1);

    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(42);
  });
});
