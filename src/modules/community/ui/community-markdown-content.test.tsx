// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownContent } from './community-markdown-content';

describe('MarkdownContent', () => {
  it('渲染基础标题与段落', () => {
    const md = '# 一级标题\n\n## 二级标题\n\n普通正文段落';
    const { container } = render(<MarkdownContent content={md} />);
    expect(screen.getByRole('heading', { level: 2, name: '一级标题' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '二级标题' })).toBeInTheDocument();
    expect(container.querySelector('p')).toHaveTextContent('普通正文段落');
  });

  it('渲染格式化文本（加粗、斜体、删除线）', () => {
    const md = '**粗体** *斜体* ~~删除线~~';
    const { container } = render(<MarkdownContent content={md} />);
    expect(container.querySelector('strong')).toHaveTextContent('粗体');
    expect(container.querySelector('em')).toHaveTextContent('斜体');
    expect(container.querySelector('del')).toHaveTextContent('删除线');
  });

  it('渲染行内代码与代码块', () => {
    const md = '行内代码 `console.log(1)`\n\n```javascript\nconst a = 123;\n```';
    const { container } = render(<MarkdownContent content={md} />);
    const codes = container.querySelectorAll('code');
    expect(codes.length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector('pre')).not.toBeNull();
  });

  it('渲染引用块与无序/有序列表', () => {
    const md = '> 引用内容\n\n- 列表项 1\n- 列表项 2\n\n1. 数字项 1\n2. 数字项 2';
    const { container } = render(<MarkdownContent content={md} />);
    expect(container.querySelector('blockquote')).toHaveTextContent('引用内容');
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelector('ol')).not.toBeNull();
  });

  it('渲染表格与水平分割线', () => {
    const md = '| 标题 1 | 标题 2 |\n|---|---|\n| 数据 1 | 数据 2 |\n\n---';
    const { container } = render(<MarkdownContent content={md} />);
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('hr')).not.toBeNull();
  });

  it('渲染链接与图片并安全过滤恶意脚本', () => {
    const md = '[链接文本](https://example.com)\n\n![图片说明](https://example.com/pic.png)\n\n<script>alert("xss")</script>';
    const { container } = render(<MarkdownContent content={md} />);
    const link = screen.getByRole('link', { name: '链接文本' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(container.querySelector('script')).toBeNull();
  });
});
