// @vitest-environment jsdom

/**
 * @file TerminalSettings 冒烟测试（C3-1）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TerminalSettingsPanel, SETTINGS_KEY, readSettings } from './terminal-settings';

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

describe('TerminalSettingsPanel', () => {
  beforeEach(() => {
    stubMatchMedia(false);
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('打开时可见且为模态对话框，关闭态不可访问', () => {
    const { rerender } = render(<TerminalSettingsPanel open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog', { name: '终端设置' })).not.toBeInTheDocument();
    rerender(<TerminalSettingsPanel open onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: '终端设置' })).toBeInTheDocument();
  });

  it('切换「减少动态效果」为开启并持久化', () => {
    render(<TerminalSettingsPanel open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '开启' }));
    expect(readSettings().reduceMotion).toBe('on');
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}').reduceMotion).toBe('on');
    expect(screen.getByRole('button', { name: '开启' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('切换画质档位并持久化', () => {
    render(<TerminalSettingsPanel open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'LOW' }));
    expect(readSettings().quality).toBe('low');
    expect(screen.getByRole('button', { name: 'LOW' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('音效开关默认关闭并可切换', () => {
    render(<TerminalSettingsPanel open onClose={() => {}} />);
    const sw = screen.getByRole('switch');
    expect(sw).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'true');
    expect(readSettings().sound).toBe(true);
  });

  it('注入 onReplay 时显示重播开场', () => {
    const onReplay = vi.fn();
    render(<TerminalSettingsPanel open onClose={() => {}} onReplay={onReplay} />);
    fireEvent.click(screen.getByRole('button', { name: /重播开场/ }));
    expect(onReplay).toHaveBeenCalledTimes(1);
  });

  it('关闭按钮触发 onClose', () => {
    const onClose = vi.fn();
    render(<TerminalSettingsPanel open onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /BACK/ }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
