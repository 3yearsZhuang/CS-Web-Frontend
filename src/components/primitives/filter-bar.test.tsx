// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from './filter-bar';

// ScrollIndicator 为展示型包裹件，mock 掉避免横向滚动测量在 jsdom 下不稳定
vi.mock('@/components/effects/scroll-indicator', () => ({
  ScrollIndicator: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

/**
 * FilterBar 冒烟测试（2026-08-13 补全 primitives 测试盲区）
 */
const options = [
  { value: 'all', label: '全部' },
  { value: 'open', label: '进行中' },
  { value: 'done', label: '已完成', num: '03', dotClassName: 'bg-emerald-500' },
];

describe('FilterBar', () => {
  it('渲染所有选项标签', () => {
    render(<FilterBar options={options} value="all" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '进行中' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '已完成' })).toBeInTheDocument();
  });

  it('渲染区块 label', () => {
    render(<FilterBar options={options} value="all" onChange={() => {}} label="状态" />);
    expect(screen.getByText('状态')).toBeInTheDocument();
  });

  it('showNumber 时显示编号前缀', () => {
    render(<FilterBar options={options} value="all" onChange={() => {}} showNumber />);
    expect(screen.getByText('03')).toBeInTheDocument();
  });

  it('dotClassName 时渲染状态圆点', () => {
    render(<FilterBar options={options} value="all" onChange={() => {}} />);
    const dot = document.querySelector('span.rounded-full');
    expect(dot).not.toBeNull();
    expect(dot?.className).toContain('bg-emerald-500');
  });

  it('选中项高亮 primary 填充', () => {
    render(<FilterBar options={options} value="open" onChange={() => {}} />);
    const btn = screen.getByRole('button', { name: '进行中' });
    expect(btn.className).toContain('bg-[var(--primary)]');
  });

  it('点击非选中项触发 onChange 携带其值', () => {
    const onChange = vi.fn();
    render(<FilterBar options={options} value="open" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '全部' }));
    expect(onChange).toHaveBeenCalledWith('all');
  });
});
