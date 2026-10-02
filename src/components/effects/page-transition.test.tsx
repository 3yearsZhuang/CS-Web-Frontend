// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageTransition } from './page-transition';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
}));

describe('PageTransition', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
    });
  });

  it('渲染子内容', () => {
    render(
      <PageTransition>
        <div data-testid="page-child">页面内容</div>
      </PageTransition>,
    );
    expect(screen.getByTestId('page-child')).toBeInTheDocument();
  });
});
