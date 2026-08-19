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

  it('支持 outline-danger 变体（md / sm）', () => {
    const { rerender } = render(<Button variant="outline-danger">删除</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-outline-danger');
    rerender(<Button variant="outline-danger" size="sm">删除</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-outline-danger-sm');
  });

  it('danger 变体支持 sm 尺寸（渲染 btn-danger-sm，修复 MD 误用）', () => {
    const { rerender } = render(<Button variant="danger">删除</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
    rerender(
      <Button variant="danger" size="sm">
        清空
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('btn-danger-sm');
    expect(screen.getByRole('button')).not.toHaveClass('btn-danger');
    rerender(
      <Button variant="danger" size="xs">
        清空
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('btn-danger-sm');
  });

  it('支持 amber 变体（md / sm）', () => {
    const { rerender } = render(<Button variant="amber">关闭</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-amber');
    rerender(
      <Button variant="amber" size="sm">
        关闭
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('btn-amber-sm');
  });

  it('支持 filled 变体（md / sm）', () => {
    const { rerender } = render(<Button variant="filled">保存</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-filled');
    rerender(
      <Button variant="filled" size="sm">
        保存
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('btn-filled-sm');
  });

  it('支持 ghost 变体', () => {
    render(<Button variant="ghost">取消</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-ghost');
  });

  it('支持 primary-outline 变体（md / sm / xs）', () => {
    const { rerender } = render(<Button variant="primary-outline">新建</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary-outline');
    rerender(
      <Button variant="primary-outline" size="sm">
        新建
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('btn-primary-outline-sm');
    expect(screen.getByRole('button')).not.toHaveClass('btn-primary-outline');
    rerender(
      <Button variant="primary-outline" size="xs">
        新建
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('btn-primary-outline-sm');
  });

  it('size="xs" 复用 sm 视觉类（outline → btn-outline-sm）', () => {
    render(
      <Button variant="outline" size="xs">
        关注
      </Button>,
    );
    expect(screen.getByRole('button')).toHaveClass('btn-outline-sm');
  });

  it('active 时附加 btn-active 且设置 aria-pressed', () => {
    render(
      <Button variant="outline" active>
        已固定
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('btn-active');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('焦点环使用 focus-ring（非历史别名 focus-amber）', () => {
    render(<Button>保存</Button>);
    expect(screen.getByRole('button')).toHaveClass('focus-ring');
    expect(screen.getByRole('button')).not.toHaveClass('focus-amber');
  });
});
