// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './input';

/** Input 原子件冒烟测试（GENERAL 3.8「tests 覆盖拆分后组件」） */

describe('Input', () => {
  it('渲染默认 input', () => {
    render(<Input placeholder="邮箱" />);
    expect(screen.getByPlaceholderText('邮箱')).toBeInstanceOf(HTMLInputElement);
  });

  it('渲染 label', () => {
    render(<Input label="[ 01 ] Email" />);
    expect(screen.getByText('[ 01 ] Email')).toBeInTheDocument();
  });

  it('渲染 textarea 变体', () => {
    render(<Input as="textarea" placeholder="描述" />);
    expect(screen.getByPlaceholderText('描述')).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('渲染 select 变体及其子选项', () => {
    render(
      <Input as="select">
        <option value="a">A</option>
        <option value="b">B</option>
      </Input>,
    );
    const sel = screen.getByRole('combobox');
    expect(sel).toBeInstanceOf(HTMLSelectElement);
    expect(screen.getByRole('option', { name: 'B' })).toBeInTheDocument();
  });

  it('渲染错误提示', () => {
    render(<Input error="必填" />);
    expect(screen.getByText('必填')).toBeInTheDocument();
  });

  it('支持受控输入', () => {
    render(<Input defaultValue="abc" />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'xyz' } });
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('xyz');
  });
});
