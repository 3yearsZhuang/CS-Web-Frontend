// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InlineTabs } from './inline-tabs';

/**
 * InlineTabs 冒烟测试（2026-08-13 补全 primitives 测试盲区）
 */
const options = [
  { value: 'reply', label: '回复' },
  { value: 'preview', label: '预览' },
];

describe('InlineTabs', () => {
  it('渲染所有选项标签', () => {
    render(<InlineTabs options={options} value="reply" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '回复' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '预览' })).toBeInTheDocument();
  });

  it('渲染左侧 label', () => {
    render(<InlineTabs options={options} value="reply" onChange={() => {}} label="视图" />);
    expect(screen.getByText('视图')).toBeInTheDocument();
  });

  it('默认 uppercase 时标签大写', () => {
    render(<InlineTabs options={options} value="reply" onChange={() => {}} />);
    const btn = screen.getByRole('button', { name: '回复' });
    expect(btn.className).toContain('uppercase');
  });

  it('uppercase=false 时不加 uppercase', () => {
    render(<InlineTabs options={options} value="reply" onChange={() => {}} uppercase={false} />);
    const btn = screen.getByRole('button', { name: '回复' });
    expect(btn.className).not.toContain('uppercase');
  });

  it('选中项有 primary 下划线', () => {
    render(<InlineTabs options={options} value="preview" onChange={() => {}} />);
    const btn = screen.getByRole('button', { name: '预览' });
    expect(btn.className).toContain('border-[var(--primary)]');
  });

  it('点击触发 onChange 携带其值', () => {
    const onChange = vi.fn();
    render(<InlineTabs options={options} value="reply" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '预览' }));
    expect(onChange).toHaveBeenCalledWith('preview');
  });
});
