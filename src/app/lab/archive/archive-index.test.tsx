// @vitest-environment jsdom

/**
 * @file ArchiveIndex 冒烟测试（FrontDoc-UID §16.8 质量门禁）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ArchiveIndex } from './archive-index';

/** 存根 matchMedia（jsdom 无原生实现） */
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

/** 侧栏当前档案标题 */
function sideTitle() {
  return screen.getByRole('complementary', { name: '当前档案' }).textContent;
}

describe('ArchiveIndex', () => {
  beforeEach(() => {
    stubMatchMedia(false);
    localStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('渲染五类类别轨与首类全部 8 行', () => {
    const { container } = render(<ArchiveIndex />);
    const nav = screen.getByRole('navigation', { name: '档案分类' });
    expect(nav.textContent).toContain('文章');
    expect(nav.textContent).toContain('特别策划');
    expect(container.querySelectorAll('.rhine-cat')).toHaveLength(5);
    expect(container.querySelectorAll('.rhine-arow')).toHaveLength(8);
  });

  it('↓ 键翻阅：选中下一份，侧栏同步', () => {
    render(<ArchiveIndex />);
    expect(sideTitle()).toContain('线段树从入门到进阶');
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(sideTitle()).toContain('React 19 服务端组件实战');
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(sideTitle()).toContain('线段树从入门到进阶');
  });

  it('→ 键切类，← 返回时恢复该类别上次选择', () => {
    render(<ArchiveIndex />);
    fireEvent.keyDown(document, { key: 'ArrowDown' }); // 文章类记忆 idx=1
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(sideTitle()).toContain('2026 暑期算法营·第 1 讲');
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(sideTitle()).toContain('React 19 服务端组件实战');
  });

  it('Enter 打开详情覆盖层，Esc 关闭', () => {
    render(<ArchiveIndex />);
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: '档案详情 A-002' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '档案详情 A-002' })).not.toBeInTheDocument();
  });

  it('/ 打开检索，输入关键词过滤，Enter 跳转对应详情', () => {
    render(<ArchiveIndex />);
    fireEvent.keyDown(document, { key: '/' });
    const dialog = screen.getByRole('dialog', { name: '档案检索' });
    fireEvent.change(screen.getByLabelText('检索档案'), { target: { value: 'Git' } });
    // 检索结果行（主列表仍在底层渲染，需限定在对话框内查询）
    expect(within(dialog).getByText('写给新人的 Git 工作流')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: '档案详情 A-008' })).toBeInTheDocument();
  });

  it('S 收藏当前档案并持久化，再按取消', () => {
    render(<ArchiveIndex />);
    fireEvent.keyDown(document, { key: 's' });
    expect(screen.getByRole('button', { name: /SAVED 1/ })).toBeInTheDocument();
    expect(localStorage.getItem('fztbu-lab-archive-favs')).toContain('A-001');
    fireEvent.keyDown(document, { key: 's' });
    expect(screen.getByRole('button', { name: /SAVED 0/ })).toBeInTheDocument();
  });
});
