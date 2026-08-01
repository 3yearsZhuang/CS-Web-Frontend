/**
 * @file 发新主题 /community/forum/new — 版块选择 + 标题 + Markdown 正文
 * 编辑器复用 MarkdownEditor（内置工具栏 + 图片上传 + 预览切换）
 */

'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { MarkdownEditor } from '@/modules/community/ui/forum-markdown-editor';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button, SectionLoading } from '@/components';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import type { CommunityCategory } from '@/modules/community/types';

/** 后端长度限制（与 server/forum.ts LIMITS 保持一致） */
const LIMITS = {
  TITLE_MIN: 4,
  TITLE_MAX: 120,
  CONTENT_MIN: 10,
  CONTENT_MAX: 20000,
} as const;

interface CurrentUserResponse {
  user: {
    id: string;
    role: 'user' | 'admin';
  };
}

interface CategoriesResponse {
  items: CommunityCategory[];
}

interface CreateTopicResponse {
  ok: true;
  topic: {
    id: string;
    categoryId: string;
    category?: { slug: string; name: string } | null;
  };
}

interface ErrorResponse {
  error: string;
}

function ComposePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { confirm } = useConfirm();

  // Hero 进入 1s 后自动收缩并悬浮于页首（动画期间锁定滚动）
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  // 预选版块（来自 query string，例如从 /community/forum/[category] 跳转过来）
  const initialCategory = searchParams.get('category') ?? '';

  // 数据状态
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 表单状态
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // 提交状态
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    content?: string;
    categoryId?: string;
  }>({});

  /** 加载当前用户 + 版块列表 */
  const loadInitial = useCallback(async () => {
    setLoadingCats(true);
    try {
      const [meRes, catRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/community/forum/categories'),
      ]);

      // 鉴权
      if (meRes.ok) {
        const me = (await meRes.json()) as CurrentUserResponse;
        setIsLoggedIn(Boolean(me?.user?.id));
      } else {
        setIsLoggedIn(false);
      }
      setAuthChecked(true);

      // 版块列表
      if (catRes.ok) {
        const catData = (await catRes.json()) as CategoriesResponse;
        const cats = catData.items ?? [];
        setCategories(cats);
        // 自动选择预选版块或第一个版块
        if (initialCategory) {
          const matched = cats.find((c) => c.slug === initialCategory);
          if (matched) {
            setCategoryId(matched.id);
          }
        }
        if (!categoryId && cats.length > 0) {
          setCategoryId(cats[0].id);
        }
      }
    } catch {
      setFormError('加载失败，请刷新重试');
    } finally {
      setLoadingCats(false);
    }
    // 仅初始挂载时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  /** 表单校验 */
  const validate = (): boolean => {
    const errs: typeof fieldErrors = {};

    if (!categoryId) {
      errs.categoryId = '请选择一个版块';
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < LIMITS.TITLE_MIN) {
      errs.title = `标题至少 ${LIMITS.TITLE_MIN} 个字符`;
    } else if (trimmedTitle.length > LIMITS.TITLE_MAX) {
      errs.title = `标题不能超过 ${LIMITS.TITLE_MAX} 个字符`;
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length < LIMITS.CONTENT_MIN) {
      errs.content = `正文至少 ${LIMITS.CONTENT_MIN} 个字符`;
    } else if (trimmedContent.length > LIMITS.CONTENT_MAX) {
      errs.content = `正文不能超过 ${LIMITS.CONTENT_MAX} 个字符`;
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /** 提交新主题 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/community/forum/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          title: title.trim(),
          contentMarkdown: content,
        }),
      });

      const data = (await res.json()) as CreateTopicResponse | ErrorResponse;
      if (!res.ok) {
        const errMsg = (data as ErrorResponse).error ?? '发布失败';
        setFormError(errMsg);
        return;
      }

      // 成功 — 跳转主题详情
      const ok = data as CreateTopicResponse;
      const slug = ok.topic.category?.slug ?? initialCategory ?? '';
      if (slug) {
        router.push(`/community/forum/${slug}/${ok.topic.id}`);
      } else {
        // 兜底：跳回论坛首页
        router.push('/community/forum');
      }
    } catch {
      setFormError('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 鉴权未完成 — 显示 Loading
  if (!authChecked || loadingCats) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  // 未登录 — 提示登录
  if (!isLoggedIn) {
    return (
      <main className="relative pt-16">
        <section className="px-4 sm:px-6 md:px-8 py-20 sm:py-32 min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="section-marker mb-6">[ 00 ]</div>
            <h1 className="display-serif text-[clamp(28px,5vw,48px)] text-[var(--foreground)] leading-[1.1] mb-6">
              请先 <span className="text-[var(--primary)]">登录</span>
            </h1>
            <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] leading-[1.8] mb-8">
              {'// 发帖需要登录账户，加入社区讨论'}
            </p>
            <Button
              onClick={() => router.push('/login?redirect=/community/forum/new')}
            >
              立即登录 →
            </Button>
          </div>
        </section>
      </main>
    );
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <main className="relative pt-16">
      {/* ============ [ 00 ] Hero — 1s 后自动收缩悬浮 ============ */}
      <CollapsingHero
        index="00"
        label="Compose"
        hero={hero}
        pageKey="forum-new"
      >
        <RevealTitle>
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2] mb-0'
                : 'text-[clamp(36px,7vw,88px)] leading-[1.05] mb-4'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            发起 <span className="text-[var(--primary)]">讨论</span>
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              / Compose
            </span>
          </h1>
        </RevealTitle>
        <div
          className={`overflow-hidden transition-all hero-reveal ${
            hero.collapsed ? 'max-h-0 opacity-0' : 'max-h-[200px] opacity-100'
          }`}
        >
          <RevealItem>
            <p className="max-w-2xl text-[var(--muted-foreground)] text-[15px] leading-[1.8]">
              <span className="ark-divider mr-2">{'//'}</span>
              选择版块，写下你的问题、思考或作品。支持 Markdown 与图片上传。
            </p>
          </RevealItem>
        </div>
      </CollapsingHero>

      {/* ============ [ 01 ] Form ============ */}
      <section
        data-section-nav="01|Form"
        className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]"
      >
        <div className="max-w-[1600px] mx-auto w-full">
          <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-0">
            {/* 左侧章节标记 */}
            <div className="col-span-12 md:col-span-2 mb-6 md:mb-0">
              <div className="section-marker">[ 01 ]</div>
              <div className="meta-mono mt-2">表单 / Form</div>
            </div>

            {/* 右侧表单 */}
            <div className="col-span-12 md:col-span-10">
              {/* 版块选择 */}
              <div className="mb-8">
                <label
                  htmlFor="category-select"
                  className="meta-mono block mb-3 text-[var(--foreground)]"
                >
                  Category <span className="text-[var(--primary)]">*</span>
                </label>
                <div className="relative">
                  <select
                    id="category-select"
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      setFieldErrors((f) => ({ ...f, categoryId: undefined }));
                    }}
                    className={`${INPUT_CLASS} appearance-none pr-10 cursor-pointer`}
                    disabled={categories.length === 0}
                  >
                    {categories.length === 0 ? (
                      <option value="">无可用版块</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                          {cat.description ? ` — ${cat.description.slice(0, 30)}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  {/* 自定义下拉箭头 */}
                  <span
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 meta-mono text-[var(--muted-foreground)]"
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </div>
                {fieldErrors.categoryId && (
                  <div className="mt-2 meta-mono text-[var(--destructive)]">
                    {fieldErrors.categoryId}
                  </div>
                )}
                {selectedCategory?.description && (
                  <div className="mt-3 meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[12px] leading-[1.7]">
                    {'// '}{selectedCategory.description}
                  </div>
                )}
              </div>

              {/* 标题输入 */}
              <div className="mb-8">
                <label
                  htmlFor="title-input"
                  className="meta-mono block mb-3 text-[var(--foreground)]"
                >
                  Title <span className="text-[var(--primary)]">*</span>
                </label>
                <input
                  id="title-input"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFieldErrors((f) => ({ ...f, title: undefined }));
                  }}
                  maxLength={LIMITS.TITLE_MAX}
                  placeholder="简明扼要地描述主题..."
                  className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="meta-mono text-[var(--muted-foreground)]">
                    {fieldErrors.title && (
                      <span className="text-[var(--destructive)]">
                        {fieldErrors.title}
                      </span>
                    )}
                  </div>
                  <div className="meta-mono text-[var(--muted-foreground)]">
                    {title.length} / {LIMITS.TITLE_MAX}
                  </div>
                </div>
              </div>

              {/* 正文编辑器 */}
              <div className="mb-8">
                <label className="meta-mono block mb-3 text-[var(--foreground)]">
                  Content <span className="text-[var(--primary)]">*</span>
                </label>
                <MarkdownEditor
                  value={content}
                  onChange={(v) => {
                    setContent(v);
                    setFieldErrors((f) => ({ ...f, content: undefined }));
                  }}
                  placeholder="在此输入正文...（支持 Markdown 语法，可上传图片）"
                  minHeight={360}
                />
                <div className="flex items-center justify-between mt-2">
                  <div className="meta-mono text-[var(--muted-foreground)]">
                    {fieldErrors.content && (
                      <span className="text-[var(--destructive)]">
                        {fieldErrors.content}
                      </span>
                    )}
                  </div>
                  <div className="meta-mono text-[var(--muted-foreground)]">
                    {content.length} / {LIMITS.CONTENT_MAX} chars
                  </div>
                </div>
              </div>

              {/* 全局错误提示 */}
              {formError && (
                <div className="mb-6 px-4 py-3 border border-[var(--destructive)] bg-[var(--destructive)]/5 meta-mono text-[var(--destructive)]">
                  {formError}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--border)]">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 font-mono uppercase tracking-wider text-[12px]"
                >
                  {submitting ? 'Posting...' : '发布主题 →'}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={async () => {
                    const hasContent = title.trim() || content.trim();
                    if (!hasContent) {
                      setTitle('');
                      setContent('');
                      setFieldErrors({});
                      setFormError(null);
                      return;
                    }
                    const confirmed = await confirm({
                      title: '清空内容',
                      message: '确定要清空所有内容吗？',
                      variant: 'warning',
                      confirmLabel: '确认清空',
                    });
                    if (confirmed) {
                      setTitle('');
                      setContent('');
                      setFieldErrors({});
                      setFormError(null);
                    }
                  }}
                  disabled={submitting}
                >
                  清空
                </Button>
                <Link
                  href="/community"
                  className="px-6 py-3 border border-[var(--border)] text-[var(--muted-foreground)] font-mono uppercase tracking-wider text-[12px] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors focus-amber flex items-center"
                >
                  取消
                </Link>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* ============ [ 02 ] Hints ============ */}
      <section
        data-section-nav="02|Hints"
        className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]"
      >
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="grid grid-cols-12 gap-0">
            <div className="col-span-12 md:col-span-2 mb-6 md:mb-0">
              <div className="section-marker">[ 02 ]</div>
              <div className="meta-mono mt-2">提示 / Hints</div>
            </div>
            <div className="col-span-12 md:col-span-10">
              <h2 className="display-serif text-[clamp(24px,4vw,40px)] text-[var(--foreground)] mb-8">
                发帖 <span className="text-[var(--primary)]">提示</span>
              </h2>
              <div className="border-t border-[var(--border)] pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 max-w-3xl">
                <div>
                  <div className="ark-divider mb-3">{'// 01 标题'}</div>
                  <p className="text-[14px] leading-[1.7] text-[var(--muted-foreground)]">
                    简明描述问题或主题，避免「求助」「跪求」等无信息量词汇。
                  </p>
                </div>
                <div>
                  <div className="ark-divider mb-3">{'// 02 正文'}</div>
                  <p className="text-[14px] leading-[1.7] text-[var(--muted-foreground)]">
                    提供必要的背景、代码、报错信息。代码请用 ``` 包裹。
                  </p>
                </div>
                <div>
                  <div className="ark-divider mb-3">{'// 03 图片'}</div>
                  <p className="text-[14px] leading-[1.7] text-[var(--muted-foreground)]">
                    支持上传 ≤5MB 的 JPEG/PNG/WebP/GIF，单帖 ≤5 张。
                  </p>
                </div>
                <div>
                  <div className="ark-divider mb-3">{'// 04 审核'}</div>
                  <p className="text-[14px] leading-[1.7] text-[var(--muted-foreground)]">
                    事后审核：发帖即发布，管理员有权隐藏违规内容。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <main className="relative pt-16 min-h-screen flex items-center justify-center">
          <SectionLoading label="Loading..." />
        </main>
      }
    >
      <ComposePageContent />
    </Suspense>
  );
}
