// @vitest-environment jsdom

/**
 * @file RollingNumber 原语冒烟测试（FrontDoc-UID §16.8「新增共享 UI 必须配套回归测试」）
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RollingNumber, padNumber } from './rolling-number';

describe('RollingNumber', () => {
  it('渲染可读值（无障碍标签）', () => {
    render(<RollingNumber value="007" />);
    expect(screen.getByRole('img', { name: '007' })).toBeInTheDocument();
  });

  it('每位数字生成一条 0-9 竖列', () => {
    const { container } = render(<RollingNumber value="12" />);
    expect(container.querySelectorAll('.rolling-dig')).toHaveLength(2);
    expect(container.querySelectorAll('.rolling-col span')).toHaveLength(20);
  });

  it('按位值位移竖列', () => {
    const { container } = render(<RollingNumber value="042" />);
    const cols = container.querySelectorAll<HTMLElement>('.rolling-col');
    expect(cols[0].style.transform).toBe('translateY(-0em)');
    expect(cols[1].style.transform).toBe('translateY(-4em)');
    expect(cols[2].style.transform).toBe('translateY(-2em)');
  });

  it('animate=false 退化为静态文本', () => {
    const { container } = render(<RollingNumber value="009" animate={false} />);
    expect(container.textContent).toContain('009');
    expect(container.querySelectorAll('.rolling-dig')).toHaveLength(0);
  });

  it('数字入参按 digits 补零', () => {
    expect(padNumber(7, 3)).toBe('007');
    render(<RollingNumber value={7} digits={3} animate={false} />);
    expect(screen.getByRole('img', { name: '007' })).toBeInTheDocument();
  });

  it('非数字字符渲染为静态列', () => {
    const { container } = render(<RollingNumber value="A-01" />);
    expect(container.querySelectorAll('.rolling-static')).toHaveLength(2);
    expect(container.querySelectorAll('.rolling-dig')).toHaveLength(2);
  });
});
