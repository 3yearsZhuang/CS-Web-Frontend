// @vitest-environment jsdom

/**
 * @file BootSequence 冒烟测试（FrontDoc-UID §16.8 质量门禁）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BootSequence } from './boot-sequence';

/** 按偏好存根 matchMedia（jsdom 无原生实现） */
function stubMatchMedia(reduced: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduced,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('BootSequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubMatchMedia(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('挂载后进入逐字输入阶段并逐步打印终端名', () => {
    render(<BootSequence onEnter={() => {}} />);
    // 400ms 起播、70ms/字：830ms 时应打出 6 字
    act(() => { vi.advanceTimersByTime(400 + 6 * 70 + 10); });
    expect(screen.getByRole('status').textContent).toContain('FZTBU-');
    // 再推进 950ms（累计 1780ms）：19 字全部打完，仍未进入 brand（2380ms）
    act(() => { vi.advanceTimersByTime(950); });
    expect(screen.getByRole('status').textContent).toContain('FZTBU-CS ARCHIVE OS');
  });

  it('开场中按 Enter 跳过直达 ENTER SYSTEM', () => {
    render(<BootSequence onEnter={() => {}} />);
    act(() => { vi.advanceTimersByTime(500); });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'ENTER SYSTEM' })).toBeInTheDocument();
  });

  it('点击 ENTER SYSTEM 后回调 onEnter（仅一次）', () => {
    const onEnter = vi.fn();
    render(<BootSequence onEnter={onEnter} />);
    fireEvent.keyDown(document, { key: 'Escape' }); // 跳过
    fireEvent.click(screen.getByRole('button', { name: 'ENTER SYSTEM' }));
    fireEvent.click(screen.getByRole('button', { name: 'ENTER SYSTEM' })); // 重复点击不应重复回调
    act(() => { vi.advanceTimersByTime(800); });
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('prefers-reduced-motion 直接呈现 ENTER SYSTEM', () => {
    stubMatchMedia(true);
    render(<BootSequence onEnter={() => {}} />);
    expect(screen.getByRole('button', { name: 'ENTER SYSTEM' })).toBeInTheDocument();
  });

  it('完整时间轴最终进入 ENTER 阶段', () => {
    render(<BootSequence onEnter={() => {}} />);
    act(() => { vi.advanceTimersByTime(20000); });
    expect(screen.getByRole('button', { name: 'ENTER SYSTEM' })).toBeInTheDocument();
  });
});
