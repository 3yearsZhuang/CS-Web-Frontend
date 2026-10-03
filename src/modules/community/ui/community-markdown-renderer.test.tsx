// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarkdownRenderer } from './community-markdown-renderer';

describe('MarkdownRenderer', () => {
  it('正确导出并可挂载', () => {
    const { container } = render(<MarkdownRenderer content="测试正文" />);
    expect(container).not.toBeNull();
  });

  it('XSS 防护：剥离 script/事件属性/javascript: 协议', async () => {
    const malicious = [
      '<script>alert(1)</script>',
      '',
      '[恶意链接](javascript:alert(2))',
      '',
      '<img src=x onerror="alert(3)">',
      '',
      '安全正文',
    ].join('\n');
    const { container } = render(<MarkdownRenderer content={malicious} />);

    // 等待 dynamic chunk 加载并渲染出安全正文
    await screen.findByText('安全正文');
    await waitFor(() => {
      expect(container.querySelector('script')).toBeNull();
    });
    const html = container.innerHTML;
    expect(html).not.toContain('alert');
    expect(html).not.toContain('onerror');
    const link = container.querySelector('a');
    if (link) {
      expect(link.getAttribute('href') ?? '').not.toContain('javascript:');
    }
  });
});
