/**
 * @file 博客详情页 /community/blog/[slug] — Markdown 渲染 + 右侧浮动目录 + 点赞
 */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Heart, Eye, Calendar, ArrowLeft, Clock } from 'lucide-react';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useAuth } from '@/shared/hooks/use-auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import { SectionLoading } from '@/components';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  contentMarkdown: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  status: string;
  authorId: string;
  authorName: string | null;
  seriesId: string | null;
  viewCount: number;
  likeCount: number;
  publishedAt: string | null;
  createdAt: string;
}

interface TocItem {
  level: 2 | 3;
  text: string;
  anchor: string;
}

/** 从纯文本生成锚点 id — 保留中英文/数字/连字符，空格转连字符 */
function slugifyAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 从 Markdown 原文提取 H2/H3 作为目录项 */
function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('### ')) {
      const text = trimmed.slice(4).trim();
      items.push({ level: 3, text, anchor: slugifyAnchor(text) });
    } else if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3).trim();
      items.push({ level: 2, text, anchor: slugifyAnchor(text) });
    }
  }
  return items;
}

/** 从 ReactMarkdown 的 children 节点中提取纯文本，用于生成 heading id */
function extractTextFromNode(node: ReactNode): string {
  if (node == null || node === false || node === true) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractTextFromNode((node as { props: { children?: ReactNode } }).props?.children);
  }
  return '';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未发布';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/** 估算阅读时长 — 中文按 400 字/分钟，最低 1 分钟 */
function estimateReadTime(markdown: string): number {
  const chars = markdown.replace(/\s+/g, '').length;
  return Math.max(1, Math.ceil(chars / 400));
}

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };
  const { isLoggedIn } = useAuth();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [likeError, setLikeError] = useState<string | null>(null);

  // 拉取文章详情
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    fetch(`/api/community/blog/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return null;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `请求失败 (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setPost(data.post as BlogPost);
        setLikeCount((data.post as BlogPost).likeCount ?? 0);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '加载失败');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const toc = useMemo<TocItem[]>(
    () => (post ? extractToc(post.contentMarkdown) : []),
    [post],
  );

  const handleLike = async () => {
    if (!slug || !post || likeLoading) return;
    if (!isLoggedIn) {
      window.location.href = `/login?redirect=${encodeURIComponent(`/community/blog/${slug}`)}`;
      return;
    }
    setLikeLoading(true);
    setLikeError(null);
    try {
      const res = await fetch(`/api/community/blog/${encodeURIComponent(slug)}/like`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || '点赞失败');
      }
      const data = await res.json();
      setLiked(Boolean(data.liked));
      setLikeCount(Number(data.likeCount) ?? 0);
    } catch (e: unknown) {
      setLikeError(e instanceof Error ? e.message : '点赞失败');
    } finally {
      setLikeLoading(false);
    }
  };

  // 加载态
  if (loading) {
    return (
      <main className="relative pt-16 min-h-screen">
        <section className="px-4 sm:px-6 md:px-8 py-20 sm:py-32 min-h-[50vh] flex items-center justify-center">
          <SectionLoading label="// 加载中..." />
        </section>
      </main>
    );
  }

  // 404 态
  if (notFound) {
    return (
      <main className="relative pt-16 min-h-screen">
        <section className="px-4 sm:px-6 md:px-8 py-20 sm:py-32 min-h-[50vh] flex flex-col items-center justify-center gap-6 text-center">
          <div className="section-marker">[ 404 ]</div>
          <h1 className="display-serif text-[clamp(36px,6vw,72px)] text-[var(--foreground)] leading-[1.1]">
            文章不存在
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">
            该文章可能已被删除或链接错误
          </p>
          <Link
            href="/community"
            className="meta-mono text-[12px] text-[var(--primary)] hover:underline inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> 返回博客
          </Link>
        </section>
      </main>
    );
  }

  // 错误态
  if (error && !post) {
    return (
      <main className="relative pt-16 min-h-screen">
        <section className="px-4 sm:px-6 md:px-8 py-20 sm:py-32 min-h-[50vh] flex flex-col items-center justify-center gap-6 text-center">
          <div className="section-marker">[ ERR ]</div>
          <h1 className="display-serif text-[clamp(36px,6vw,72px)] text-[var(--foreground)] leading-[1.1]">
            加载失败
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">{error}</p>
          <Link
            href="/community"
            className="meta-mono text-[12px] text-[var(--primary)] hover:underline inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> 返回博客
          </Link>
        </section>
      </main>
    );
  }

  if (!post) return null;

  const readTime = estimateReadTime(post.contentMarkdown);

  return (
    <main className="relative pt-16">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label="文章"
        hero={hero}
        pageKey="blog"
        minHeight="50vh"
      >
        <RevealTitle>
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(18px,3.6vw,32px)] leading-[1.2] line-clamp-1'
                : 'text-[clamp(28px,6vw,80px)] leading-[1.1] sm:leading-[1.05]'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {post.title}
          </h1>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed
                ? 'max-h-[16px] opacity-40 mt-1'
                : 'max-h-[200px] opacity-100 mt-6 sm:mt-8'
            }`}
          >
            <div
              className={`flex flex-wrap items-center gap-x-5 gap-y-2 meta-mono text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[9px]'
                  : 'text-[11px] sm:text-[12px] uppercase tracking-wider'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {formatDate(post.publishedAt ?? post.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-3 h-3" />
                {post.viewCount} 次浏览
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                约 {readTime} 分钟
              </span>
              <span>{post.authorName || '匿名'}</span>
              <span className="px-2 py-0.5 border border-[var(--border)]">
                {post.category}
              </span>
            </div>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ [ 01 ] 正文 ============ */}
      <section
        data-section-nav="01|正文"
        className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]"
      >
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <div className="grid grid-cols-12 gap-8 lg:gap-12">
            {/* 主内容 */}
            <article className="col-span-12 lg:col-span-9 max-w-3xl">
              {/* 返回链接 */}
              <Link
                href="/community"
                className="inline-flex items-center gap-2 meta-mono text-[12px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors mb-8"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                返回博客列表
              </Link>

              {/* 摘要 */}
              {post.excerpt && (
                <p className="display-serif italic text-[var(--muted-foreground)] text-[16px] sm:text-[18px] leading-[1.7] mb-10 pb-8 border-b border-[var(--border)]">
                  {post.excerpt}
                </p>
              )}

              {/* 标签 */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-10">
                  {post.tags.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="meta-mono text-[10px] px-2 py-1 border border-[var(--border)] text-[var(--muted-foreground)] uppercase tracking-wider"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Markdown 正文 */}
              <div className="blog-markdown text-[clamp(14px,1.2vw,16px)] leading-[1.8] text-[var(--foreground)]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize, rehypeHighlight]}
                  components={{
                    h2: ({ children }) => {
                      const id = slugifyAnchor(extractTextFromNode(children));
                      return (
                        <h2
                          id={id}
                          className="display-serif text-[clamp(22px,3vw,30px)] mt-10 mb-4 text-[var(--foreground)] scroll-mt-28"
                        >
                          {children}
                        </h2>
                      );
                    },
                    h3: ({ children }) => {
                      const id = slugifyAnchor(extractTextFromNode(children));
                      return (
                        <h3
                          id={id}
                          className="display-serif text-[clamp(18px,2.2vw,24px)] mt-8 mb-3 text-[var(--foreground)] scroll-mt-28"
                        >
                          {children}
                        </h3>
                      );
                    },
                    h1: ({ children }) => (
                      <h2 className="display-serif text-[clamp(22px,3vw,30px)] mt-10 mb-4 text-[var(--foreground)]">
                        {children}
                      </h2>
                    ),
                    h4: ({ children }) => (
                      <h4 className="display-serif text-[16px] mt-5 mb-2 text-[var(--foreground)]">
                        {children}
                      </h4>
                    ),
                    h5: ({ children }) => (
                      <h5 className="meta-mono text-[13px] mt-4 mb-2 text-[var(--foreground)]">
                        {children}
                      </h5>
                    ),
                    h6: ({ children }) => (
                      <h6 className="meta-mono text-[12px] mt-4 mb-2 text-[var(--muted-foreground)]">
                        {children}
                      </h6>
                    ),
                    p: ({ children }) => <p className="my-4">{children}</p>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-[var(--foreground)]">
                        {children}
                      </strong>
                    ),
                    em: ({ children }) => (
                      <em className="serif-italic text-[var(--foreground)]">{children}</em>
                    ),
                    del: ({ children }) => (
                      <del className="text-[var(--muted-foreground)]">{children}</del>
                    ),
                    code: ({ className: codeCls, children, ...props }) => {
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
                    img: ({ src, alt }) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={typeof src === 'string' ? src : ''}
                        alt={alt ?? ''}
                        className="my-4 max-w-full h-auto border border-[var(--border)]"
                        loading="lazy"
                      />
                    ),
                    table: ({ children }) => (
                      <div className="my-4 overflow-x-auto">
                        <table className="w-full border-collapse text-[14px]">{children}</table>
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
                  {post.contentMarkdown}
                </ReactMarkdown>
              </div>

              {/* 底部点赞 + 作者信息 */}
              <div className="mt-16 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <div className="meta-mono text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                    作者
                  </div>
                  <div className="display-serif text-[18px] text-[var(--foreground)]">
                    {post.authorName || '匿名'}
                  </div>
                  {likeError && (
                    <div className="meta-mono text-[10px] text-rose-500 mt-1">{likeError}</div>
                  )}
                </div>

                <button
                  onClick={handleLike}
                  disabled={likeLoading}
                  className={`group inline-flex items-center gap-2.5 px-5 py-3 border transition-all ${
                    liked
                      ? 'border-rose-500/40 bg-rose-500/5 text-rose-500'
                      : 'border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.03] text-[var(--foreground)]'
                  } ${likeLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Heart
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      liked ? 'fill-current' : ''
                    }`}
                  />
                  <span className="meta-mono text-[12px] uppercase tracking-wider">
                    {liked ? '已点赞' : '点赞'} · {likeCount}
                  </span>
                </button>
              </div>

              {/* 底部返回 */}
              <div className="mt-10">
                <Link
                  href="/community"
                  className="inline-flex items-center gap-2 meta-mono text-[12px] text-[var(--primary)] hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  查看更多文章
                </Link>
              </div>
            </article>

            {/* 右侧浮动目录 */}
            {toc.length > 0 && (
              <aside className="col-span-12 lg:col-span-3 lg:order-last">
                <div className="lg:sticky lg:top-28">
                  <div className="meta-mono text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider mb-4">
                    {'// '}目录
                  </div>
                  <nav className="flex flex-col border-l border-[var(--border)]">
                    {toc.map((item) => (
                      <a
                        key={item.anchor}
                        href={`#${item.anchor}`}
                        className={`block text-[13px] leading-[1.5] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors -ml-px border-l border-transparent hover:border-[var(--primary)] py-1.5 ${
                          item.level === 3 ? 'pl-5' : 'pl-3'
                        }`}
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
