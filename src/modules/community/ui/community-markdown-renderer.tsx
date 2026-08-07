/**
 * @file Markdown 渲染器 — 社区主题/回复内容（rehype-sanitize + highlight.js）
 */

'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';

/** Markdown 渲染器属性 */
interface MarkdownRendererProps {
  /** Markdown 原文 */
  content: string;
  /** 额外 className（包裹容器） */
  className?: string;
}

/**
 * 自定义 sanitize schema
 *
 * 在 defaultSchema 基础上：
 *   - 允许 class 属性（rehype-highlight 需要给代码块加 hljs class）
 *   - 允许 img 标签的 src/alt/title
 *   - 允许 a 标签的 href/title/target/rel
 *   - 禁止所有 on* 属性、javascript: 协议、<script>、<iframe>
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className']],
    pre: [...(defaultSchema.attributes?.pre ?? []), ['className']],
    span: [...(defaultSchema.attributes?.span ?? []), ['className']],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      'href',
      'title',
      'target',
      'rel',
    ],
    img: ['src', 'alt', 'title', 'width', 'height'],
  },
  protocols: {
    ...defaultSchema.protocols,
    src: ['http', 'https', 'data'],
    href: ['http', 'https', 'mailto'],
  },
};

/** Markdown 渲染器组件 — react-markdown + GFM + 代码高亮 + sanitize */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const remarkPlugins = useMemo(() => [remarkGfm], []);
  const rehypePlugins = useMemo(
    () => [
      [rehypeSanitize, sanitizeSchema],
      rehypeHighlight,
    ],
    [],
  );

  return (
    <div
      className={`community-markdown text-[clamp(14px,1.2vw,16px)] leading-[1.8] text-[var(--foreground)] ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins as never}
        components={{
          // 标题 — 衬线展示字体
          h1: ({ children }) => (
            <h2 className="display-serif text-[clamp(22px,3vw,30px)] mt-8 mb-4 text-[var(--foreground)]">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="display-serif text-[clamp(20px,2.5vw,26px)] mt-7 mb-3 text-[var(--foreground)]">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="display-serif text-[clamp(18px,2vw,22px)] mt-6 mb-3 text-[var(--foreground)]">
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h5 className="display-serif text-[16px] mt-5 mb-2 text-[var(--foreground)]">
              {children}
            </h5>
          ),
          h5: ({ children }) => (
            <h6 className="meta-mono text-[13px] mt-4 mb-2 text-[var(--foreground)]">
              {children}
            </h6>
          ),
          h6: ({ children }) => (
            <h6 className="meta-mono text-[12px] mt-4 mb-2 text-[var(--muted-foreground)]">
              {children}
            </h6>
          ),
          p: ({ children }) => <p className="my-4">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--foreground)]">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="serif-italic text-[var(--foreground)]">{children}</em>
          ),
          // 删除线
          del: ({ children }) => (
            <del className="text-[var(--muted-foreground)]">{children}</del>
          ),
          // 行内代码
          code: ({ className: codeCls, children, ...props }) => {
            // 含 language- 前缀的 code 在 <pre> 内，由 pre 分支处理
            const isBlock = codeCls?.includes('language-');
            if (isBlock) {
              return (
                <code className={codeCls} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="font-mono text-[0.9em] px-1.5 py-0.5 bg-[var(--accent)] border border-[var(--border)] text-[var(--foreground)]">
                {children}
              </code>
            );
          },
          // 代码块
          pre: ({ children }) => (
            <pre className="my-4 p-4 bg-[var(--muted)] border border-[var(--border)] overflow-x-auto text-[13px] leading-[1.6] font-mono">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 pl-4 border-l-2 border-[var(--primary)] text-[var(--muted-foreground)] italic">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="my-4 pl-6 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-4 pl-6 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
          // 链接 — 新标签页 + ark-link 动效
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="ark-link text-[var(--primary)] underline-grow"
            >
              {children}
            </a>
          ),
          // 图片
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element -- 社区图片为用户上传，next/image 需配置 remotePatterns
            <img
              src={typeof src === 'string' ? src : ''}
              alt={alt ?? ''}
              className="my-4 max-w-full h-auto border border-[var(--border)]"
              loading="lazy"
            />
          ),
          // 表格
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-[14px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-[var(--border)]">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="text-left py-2 px-3 font-mono text-[12px] uppercase tracking-wider text-[var(--foreground)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-2 px-3 border-t border-[var(--border)] text-[var(--foreground)]">
              {children}
            </td>
          ),
          hr: () => <hr className="my-6 border-0 h-px bg-[var(--border)]" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
