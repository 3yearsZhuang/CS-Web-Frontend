// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionNav } from './section-nav';

/**
 * SectionNav 冒烟测试（2026-08-13 补全 primitives 测试盲区）
 */
const options = [
  { value: 'profile', label: '个人主页', num: '01' },
  { value: 'topics', label: '主题', num: '02' },
];

describe('SectionNav', () => {
  it('渲染标号与标签', () => {
    render(<SectionNav options={options} value="profile" onChange={() => {}} />);
    expect(screen.getByText('[ 01 ]')).toBeInTheDocument();
    expect(screen.getByText('个人主页')).toBeInTheDocument();
    expect(screen.getByText('[ 02 ]')).toBeInTheDocument();
    expect(screen.getByText('主题')).toBeInTheDocument();
  });

  it('选中项 opacity-100，未选中 opacity-40', () => {
    render(<SectionNav options={options} value="topics" onChange={() => {}} />);
    const active = screen.getByRole('button', { name: /主题/ });
    const inactive = screen.getByRole('button', { name: /个人主页/ });
    expect(active.className).toContain('opacity-100');
    expect(inactive.className).toContain('opacity-40');
  });

  it('点击触发 onChange 携带其值', () => {
    const onChange = vi.fn();
    render(<SectionNav options={options} value="profile" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /主题/ }));
    expect(onChange).toHaveBeenCalledWith('topics');
  });
});
