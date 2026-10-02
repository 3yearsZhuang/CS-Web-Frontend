// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MarkdownRenderer } from './community-markdown-renderer';

describe('MarkdownRenderer', () => {
  it('正确导出并可挂载', () => {
    const { container } = render(<MarkdownRenderer content="测试正文" />);
    expect(container).not.toBeNull();
  });
});
