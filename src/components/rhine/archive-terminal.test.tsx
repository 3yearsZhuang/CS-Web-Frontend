// @vitest-environment jsdom

/**
 * @file ArchiveTerminal HUD/键盘/降级测试：ArchiveScene 控制器打桩，
 * 验证 React 侧状态机（loading → ready/failed）、键盘命令转发与降级面板。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const sceneInstances: Array<{
  start: ReturnType<typeof vi.fn>;
  setQuality: ReturnType<typeof vi.fn>;
  setReduceMotion: ReturnType<typeof vi.fn>;
  moveCol: ReturnType<typeof vi.fn>;
  moveRow: ReturnType<typeof vi.fn>;
  openDetail: ReturnType<typeof vi.fn>;
  closeDetail: ReturnType<typeof vi.fn>;
  resetView: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  callbacks: Record<string, ((...args: unknown[]) => unknown) | undefined>;
}> = [];

let startBehavior: 'ok' | 'glbFallback' | 'fail' = 'ok';

vi.mock('./archive-scene', () => {
  class FakeScene {
    start = vi.fn(async () => {
      const inst = sceneInstances[sceneInstances.length - 1];
      if (startBehavior === 'fail') {
        inst.callbacks.onFail?.();
        throw new Error('WebGL2 not supported');
      }
      inst.callbacks.onReady?.(startBehavior === 'ok');
    });
    setQuality = vi.fn();
    setReduceMotion = vi.fn();
    moveCol = vi.fn();
    moveRow = vi.fn();
    openDetail = vi.fn();
    closeDetail = vi.fn();
    resetView = vi.fn();
    resize = vi.fn();
    dispose = vi.fn();
    callbacks: Record<string, unknown> = {};
    constructor(opts: { callbacks?: Record<string, unknown> }) {
      this.callbacks = opts.callbacks ?? {};
      sceneInstances.push(this as never);
    }
  }
  return {
    ArchiveScene: FakeScene,
    rowsForQuality: (q: string) => (q === 'low' ? 6 : 8),
  };
});

vi.mock('./archive-demo-data', () => ({
  ARCHIVE_CATS: [
    {
      key: 'resources',
      name: '资源',
      en: 'RESOURCES',
      items: [
        { id: 'R-001', title: '课件一', en: 'SLIDES', owner: '甲', date: '2026-09' },
        { id: 'R-002', title: '课件二', en: 'NOTES', owner: '乙', date: '2026-09' },
      ],
    },
  ],
}));

vi.mock('./terminal-settings', () => ({
  TerminalSettingsPanel: () => null,
  useMotionPreference: vi.fn(() => false),
  useTerminalSettings: () => ({
    settings: { quality: 'medium', reduceMotion: false, sound: false },
  }),
}));

import { ArchiveTerminal } from './archive-terminal';

beforeEach(() => {
  sceneInstances.length = 0;
  startBehavior = 'ok';
  vi.stubGlobal('location', { ...window.location, reload: vi.fn() });
});

describe('ArchiveTerminal', () => {
  it('就绪路径：场景启动、键盘命令转发、HUD 渲染', async () => {
    render(<ArchiveTerminal />);
    await waitFor(() => expect(screen.queryByText('LOADING 3D ARCHIVE')).toBeNull());
    const inst = sceneInstances[0];
    expect(inst.start).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(inst.moveCol).toHaveBeenCalledWith(1);
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(inst.moveCol).toHaveBeenCalledWith(-1);
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(inst.moveRow).toHaveBeenCalledWith(-1);
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(inst.moveRow).toHaveBeenCalledWith(-1);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(inst.openDetail).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(inst.closeDetail).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'r' });
    expect(inst.resetView).toHaveBeenCalledTimes(1);

    expect(screen.getByText('FZTBU·CS')).toBeTruthy();
    expect(screen.getByRole('img', { name: '三维档案阵列' })).toBeTruthy();
  });

  it('GLB 降级：onReady(false) 显示 FALLBACK GEOMETRY 标注', async () => {
    startBehavior = 'glbFallback';
    render(<ArchiveTerminal />);
    await waitFor(() => expect(screen.getByText('FALLBACK GEOMETRY')).toBeTruthy());
  });

  it('失败路径：start 拒绝 → 降级面板 + 重试触发 reload', async () => {
    startBehavior = 'fail';
    render(<ArchiveTerminal />);
    await waitFor(() => expect(screen.getByText('3D SCENE UNAVAILABLE')).toBeTruthy());
    fireEvent.click(screen.getByText('重试 RETRY'));
    expect(vi.mocked(window.location.reload)).toHaveBeenCalledTimes(1);
  });

  it('卸载时释放场景资源', async () => {
    const { unmount } = render(<ArchiveTerminal />);
    await waitFor(() => expect(sceneInstances.length).toBe(1));
    unmount();
    expect(sceneInstances[0].dispose).toHaveBeenCalledTimes(1);
  });
});
