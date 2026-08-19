// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  it('渲染文本内容', () => {
    render(<Badge>ACTIVE</Badge>);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('默认使用 muted 样式', () => {
    render(<Badge>DRAFT</Badge>);
    expect(screen.getByText('DRAFT')).toHaveClass('badge badge-muted');
  });

  it('支持语义色变体', () => {
    const { rerender } = render(<Badge variant="success">ONLINE</Badge>);
    expect(screen.getByText('ONLINE')).toHaveClass('badge-success');
    rerender(<Badge variant="amber">PENDING</Badge>);
    expect(screen.getByText('PENDING')).toHaveClass('badge-amber');
    rerender(<Badge variant="danger">MUTED</Badge>);
    expect(screen.getByText('MUTED')).toHaveClass('badge-danger');
    rerender(<Badge variant="primary">PIN</Badge>);
    expect(screen.getByText('PIN')).toHaveClass('badge-primary');
  });
});
