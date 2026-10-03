// @vitest-environment jsdom

/**
 * @file LabTerminal 门控状态测试：未判定遮罩 / 开场触发 / 会话内直达大厅。
 * BootSequence 与终端设置面板打桩，仅验证状态机与 sessionStorage 契约。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const onEnterSpy = vi.fn();

vi.mock('@/components/effects/boot-sequence', () => ({
  BootSequence: ({ onEnter }: { onEnter: () => void }) => (
    <button type="button" data-testid="boot" onClick={onEnter}>
      BOOT
    </button>
  ),
}));

vi.mock('@/components/rhine/terminal-settings', () => ({
  TerminalSettingsPanel: () => null,
  useMotionPreference: () => false,
}));

import { LabTerminal } from './lab-terminal';

beforeEach(() => {
  onEnterSpy.mockClear();
  sessionStorage.clear();
});

describe('LabTerminal', () => {
  it('会话未进入：渲染开场，触发 onEnter 后写标记并进入大厅', () => {
    render(<LabTerminal />);
    expect(screen.getByTestId('boot')).toBeTruthy();
    fireEvent.click(screen.getByTestId('boot'));
    expect(sessionStorage.getItem('fztbu-lab-booted')).toBe('1');
    expect(screen.getByText('实验室 · 档案终端')).toBeTruthy();
  });

  it('会话内已进入：跳过开场直达大厅（ROADMAP 状态行渲染）', () => {
    sessionStorage.setItem('fztbu-lab-booted', '1');
    render(<LabTerminal />);
    expect(screen.queryByTestId('boot')).toBeNull();
    expect(screen.getByText('实验室 · 档案终端')).toBeTruthy();
    expect(screen.getByText('FZTBU·CS ARCHIVE TERMINAL')).toBeTruthy();
  });
});
