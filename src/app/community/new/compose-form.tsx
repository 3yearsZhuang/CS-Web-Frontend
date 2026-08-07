'use client';

/**
 * @file ComposeForm — 发布内容表单主体（社区发布页子组件）
 *
 * 从 `app/community/new/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `ComposeState` 提供（GENERAL 2.2）。
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MarkdownEditor } from '@/modules/community/ui/forum-markdown-editor';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { Button } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import type { ComposeState } from './use-compose';

export function ComposeForm(props: ComposeState) {
  const t = useTranslations('communityNew');
  const {
    categories,
    categoryId,
    setCategoryId,
    setFieldErrors,
    title,
    setTitle,
    content,
    setContent,
    submitting,
    formError,
    fieldErrors,
    selectedCategory,
    LIMITS,
    handleSubmit,
    clearForm,
  } = props;

  const { confirm } = useConfirm();

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-0">
      {/* 左侧章节标记 */}
      <div className="col-span-12 md:col-span-2 mb-6 md:mb-0">
        <div className="section-marker">[ 01 ]</div>
        <div className="meta-mono mt-2">{t('formLabel')}</div>
      </div>

      {/* 右侧表单 */}
      <div className="col-span-12 md:col-span-10">
        {/* 版块选择 */}
        <div className="mb-8">
          <label htmlFor="category-select" className="meta-mono block mb-3 text-[var(--foreground)]">
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
                <option value="">{t('noCategories')}</option>
              ) : (
                categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                    {cat.description ? ` — ${cat.description.slice(0, 30)}` : ''}
                  </option>
                ))
              )}
            </select>
            <span
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 meta-mono text-[var(--muted-foreground)]"
              aria-hidden="true"
            >
              ▼
            </span>
          </div>
          {fieldErrors.categoryId && (
            <div className="mt-2 meta-mono text-[var(--destructive)]">{fieldErrors.categoryId}</div>
          )}
          {selectedCategory?.description && (
            <div className="mt-3 meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[12px] leading-[1.7]">
              {'// '}
              {selectedCategory.description}
            </div>
          )}
        </div>

        {/* 标题输入 */}
        <div className="mb-8">
          <label htmlFor="title-input" className="meta-mono block mb-3 text-[var(--foreground)]">
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
            placeholder={t('titlePlaceholder')}
            className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="meta-mono text-[var(--muted-foreground)]">
              {fieldErrors.title && <span className="text-[var(--destructive)]">{fieldErrors.title}</span>}
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
            placeholder={t('contentPlaceholder')}
            minHeight={360}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="meta-mono text-[var(--muted-foreground)]">
              {fieldErrors.content && <span className="text-[var(--destructive)]">{fieldErrors.content}</span>}
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
          <Button type="submit" disabled={submitting} className="px-8 py-3 font-mono uppercase tracking-wider text-[12px]">
            {submitting ? t('posting') : t('submit')}
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={async () => {
              const hasContent = title.trim() || content.trim();
              if (!hasContent) {
                clearForm();
                return;
              }
              const confirmed = await confirm({
                title: t('clearTitle'),
                message: t('clearMessage'),
                variant: 'warning',
                confirmLabel: t('clearConfirm'),
              });
              if (confirmed) clearForm();
            }}
            disabled={submitting}
          >
            {t('clearBtn')}
          </Button>
          <Link
            href="/community"
            className="px-6 py-3 border border-[var(--border)] text-[var(--muted-foreground)] font-mono uppercase tracking-wider text-[12px] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors focus-amber flex items-center"
          >
            {t('cancelBtn')}
          </Link>
        </div>
      </div>
    </form>
  );
}
