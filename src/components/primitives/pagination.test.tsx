// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from './pagination';

describe('Pagination', () => {
  it('totalPages <= 1 时不渲染', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('渲染页码、上一页/下一页，并标记当前页 active', () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => {}} />);
    // 1..5 共 5 个页码按钮（含 aria-current）
    const current = screen.getByRole('button', { current: 'page' });
    expect(current).toHaveTextContent('02');
    expect(current).toHaveClass('btn-active');
    // 上一页 / 下一页 均可用
    expect(screen.getByLabelText('上一页')).toBeEnabled();
    expect(screen.getByLabelText('下一页')).toBeEnabled();
  });

  it('首页时上一页禁用，末页时下一页禁用', () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={3} onPageChange={() => {}} />,
    );
    expect(screen.getByLabelText('上一页')).toBeDisabled();
    rerender(<Pagination page={3} totalPages={3} onPageChange={() => {}} />);
    expect(screen.getByLabelText('下一页')).toBeDisabled();
  });

  it('点击页码 / 翻页触发 onPageChange', () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole('button', { name: '03' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByLabelText('下一页'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('variant="all" 渲染全部页码', () => {
    render(<Pagination page={2} totalPages={6} onPageChange={() => {}} variant="all" />);
    for (const n of ['01', '02', '03', '04', '05', '06']) {
      expect(screen.getByRole('button', { name: n })).toBeInTheDocument();
    }
  });

  it('variant="ellipsis" 大页码数时渲染首尾页 + 省略号', () => {
    render(<Pagination page={5} totalPages={20} onPageChange={() => {}} variant="ellipsis" />);
    expect(screen.getByRole('button', { name: '01' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '20' })).toBeInTheDocument();
    expect(screen.getAllByText('…').length).toBeGreaterThan(0);
  });

  it('activeVariant="filled" 时当前页为实色主色类', () => {
    render(
      <Pagination page={2} totalPages={5} onPageChange={() => {}} activeVariant="filled" />,
    );
    const current = screen.getByRole('button', { current: 'page' });
    expect(current).toHaveClass('bg-[var(--primary)]');
    expect(current).not.toHaveClass('btn-active');
  });
});
