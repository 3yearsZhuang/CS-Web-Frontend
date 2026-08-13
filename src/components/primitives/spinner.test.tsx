// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './spinner';

/**
 * Spinner 冒烟测试（2026-08-13 补全 primitives 测试盲区）
 */
describe('Spinner', () => {
  it('默认 primary 变体带 spin 动画', () => {
    render(<Spinner />);
    const el = document.querySelector('span[aria-hidden="true"]');
    expect(el).not.toBeNull();
    expect(el).toHaveClass('animate-spin');
    expect(el?.className).toContain('border-[var(--primary)]');
  });

  it('inverted 变体使用 primary-foreground 边框色', () => {
    render(<Spinner variant="inverted" />);
    const el = document.querySelector('span[aria-hidden="true"]');
    expect(el?.className).toContain('border-[var(--primary-foreground)]');
  });

  it('透传自定义 className', () => {
    render(<Spinner className="w-8 h-8" />);
    const el = document.querySelector('span[aria-hidden="true"]');
    expect(el).toHaveClass('w-8 h-8');
  });
});
