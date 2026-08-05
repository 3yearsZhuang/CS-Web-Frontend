// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

/**
 * Button 原子件冒烟测试（GENERAL 3.8「tests 覆盖拆分后组件」、2.4「拆分即补测」）
 */

describe('Button', () => {
  it('渲染 children', () => {
    render(<Button>点击</Button>);
    expect(screen.getByRole('button', { name: '点击' })).toBeInTheDocument();
  });

  it('默认使用 primary 样式', () => {
    render(<Button>保存</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('支持 outline 变体', () => {
    render(<Button variant="outline">取消</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-outline');
  });

  it('loading 时禁用并显示 Spinner', () => {
    render(<Button loading>提交</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.querySelector('span[aria-hidden="true"]')).not.toBeNull();
  });

  it('disabled 属性生效', () => {
    render(<Button disabled>禁用</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('触发 onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>确认</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
