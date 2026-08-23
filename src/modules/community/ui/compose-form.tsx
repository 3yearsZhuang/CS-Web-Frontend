/**
 * @file Compose form — editor-first layout with compact publishing settings
 */
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { MarkdownEditor } from '@/modules/community/ui/community-markdown-editor';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import type { ComposeState } from './hooks/use-compose';

export function ComposeForm(props: ComposeState) {
  const t = useTranslations('communityNew');
  const { confirm } = useConfirm();
  const {
    categories, categoryId, setCategoryId, setFieldErrors, title, setTitle, content, setContent,
    submitting, formError, fieldErrors, selectedCategory, LIMITS, handleSubmit, clearForm,
  } = props;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-6 lg:gap-8">
      <div className="col-span-12 min-w-0 lg:col-span-9">
        <section className="border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] p-4 sm:p-5">
            <input
              id="title-input"
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setFieldErrors((fields) => ({ ...fields, title: undefined }));
              }}
              maxLength={LIMITS.TITLE_MAX}
              placeholder={t('titlePlaceholder')}
              className="w-full bg-transparent display-serif text-[clamp(24px,4vw,38px)] leading-tight text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]/60"
            />
            <div className="mt-3 flex justify-between gap-4">
              <span className="text-xs text-[var(--destructive)]">{fieldErrors.title}</span>
              <span className="meta-mono">{title.length} / {LIMITS.TITLE_MAX}</span>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            <MarkdownEditor
              value={content}
              onChange={(value) => {
                setContent(value);
                setFieldErrors((fields) => ({ ...fields, content: undefined }));
              }}
              placeholder={t('contentPlaceholder')}
              minHeight={480}
            />
            <div className="mt-3 flex justify-between gap-4 px-1">
              <span className="text-xs text-[var(--destructive)]">{fieldErrors.content}</span>
              <span className="meta-mono">{content.length} / {LIMITS.CONTENT_MAX}</span>
            </div>
          </div>
        </section>
      </div>

      <aside className="col-span-12 lg:col-span-3">
        <div className="space-y-6 lg:sticky lg:top-36">
          <section className="border border-[var(--border)] bg-[var(--card)] p-5">
            <label htmlFor="category-select" className="mb-3 block text-sm font-semibold text-[var(--foreground)]">Category</label>
            <select
              id="category-select"
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setFieldErrors((fields) => ({ ...fields, categoryId: undefined }));
              }}
              className={`${INPUT_CLASS} appearance-none cursor-pointer pr-8`}
              disabled={categories.length === 0}
            >
              {categories.length === 0
                ? <option value="">{t('noCategories')}</option>
                : categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {fieldErrors.categoryId && <p className="mt-2 text-xs text-[var(--destructive)]">{fieldErrors.categoryId}</p>}
            {selectedCategory?.description && <p className="mt-3 text-xs leading-6 text-[var(--muted-foreground)]">{selectedCategory.description}</p>}
          </section>

          {formError && <div className="border border-[var(--destructive)] bg-[var(--destructive)]/5 p-4 text-sm text-[var(--destructive)]">{formError}</div>}

          <div className="grid gap-3">
            <Button type="submit" disabled={submitting} className="w-full justify-center">{submitting ? t('posting') : t('submit')}</Button>
            <Button
              variant="outline"
              type="button"
              disabled={submitting}
              className="w-full justify-center"
              onClick={async () => {
                if (!title.trim() && !content.trim()) return clearForm();
                const confirmed = await confirm({ title: t('clearTitle'), message: t('clearMessage'), variant: 'warning', confirmLabel: t('clearConfirm') });
                if (confirmed) clearForm();
              }}
            >
              {t('clearBtn')}
            </Button>
            <Link href="/community" className="btn-outline flex min-h-11 items-center justify-center">{t('cancelBtn')}</Link>
          </div>
        </div>
      </aside>
    </form>
  );
}
