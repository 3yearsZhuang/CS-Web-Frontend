/**
 * @file 版块管理子面板 — 从 community-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, SectionLoading } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import type { CommunityCategory } from '@/modules/community/types';
import { getError, type CategoryInput } from './community-admin-utils';
import { useCategoriesManager } from './use-categories-manager';

/** 版块管理 — 新建/编辑/删除版块 */
export function CategoriesManager() {
  const t = useTranslations('communityAdmin');
  const { categories, loading, error, loadCategories, createCategory, updateCategory, deleteCategory } =
    useCategoriesManager();
  const { confirm } = useConfirm();

  // 新建表单
  const [createForm, setCreateForm] = useState<CategoryInput>({
    slug: '',
    name: '',
    description: '',
    icon: '',
    sortOrder: 0,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 编辑状态（id 为空表示未编辑）
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryInput>({
    slug: '',
    name: '',
    description: '',
    icon: '',
    sortOrder: 0,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  /** 新建版块 */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!createForm.slug.trim() || !createForm.name.trim()) {
      setCreateError(t('slugNameRequired'));
      return;
    }
    setCreating(true);
    const result = await createCategory(createForm);
    if (!result.ok) {
      setCreateError(getError(result.data, t('createFailed')));
    } else {
      setCreateForm({ slug: '', name: '', description: '', icon: '', sortOrder: 0 });
    }
    setCreating(false);
  };

  /** 进入编辑模式 */
  const startEdit = (cat: CommunityCategory) => {
    setEditingId(cat.id);
    setEditForm({
      slug: cat.slug,
      name: cat.name,
      description: cat.description ?? '',
      icon: cat.icon ?? '',
      sortOrder: cat.sortOrder,
    });
    setEditError(null);
  };

  /** 保存编辑 */
  const handleSaveEdit = async (id: string) => {
    setEditError(null);
    if (!editForm.slug.trim() || !editForm.name.trim()) {
      setEditError(t('slugNameRequired'));
      return;
    }
    setSavingEdit(true);
    const result = await updateCategory(id, editForm);
    if (!result.ok) {
      setEditError(getError(result.data, t('saveFailed')));
    } else {
      setEditingId(null);
    }
    setSavingEdit(false);
  };

  /** 删除版块（带二次确认） */
  const handleDelete = async (cat: CommunityCategory) => {
    const confirmed = await confirm({
      title: t('deleteTitle'),
      message: t('deleteMessage', { name: cat.name }),
      variant: 'danger',
      confirmLabel: t('confirmDelete'),
    });
    if (!confirmed) return;
    await deleteCategory(cat.id);
  };

  if (loading) {
    return <SectionLoading label="Loading..." />;
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="px-4 py-3 border border-[var(--destructive)] bg-[var(--destructive)]/5 meta-mono text-[var(--destructive)]">
          {error}
        </div>
      )}

      {/* 新建版块表单 */}
      <form onSubmit={handleCreate} className="border border-[var(--border)] p-4 sm:p-6">
        <div className="meta-mono text-[var(--foreground)] mb-4">
          <span className="ark-divider mr-2">{'//'}</span>
          {t('createSection')}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('slugLabelRequired')}</label>
            <input type="text" value={createForm.slug} onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))} placeholder="web" maxLength={50} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('nameLabelRequired')}</label>
            <input type="text" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder={t('namePlaceholder')} maxLength={50} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('iconLabel')}</label>
            <input type="text" value={createForm.icon ?? ''} onChange={(e) => setCreateForm((f) => ({ ...f, icon: e.target.value }))} placeholder="</>" maxLength={20} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('sortOrderLabel')}</label>
            <input type="number" value={createForm.sortOrder ?? 0} onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} min={0} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('descriptionLabel')}</label>
            <input type="text" value={createForm.description ?? ''} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} placeholder={t('descPlaceholder')} maxLength={200} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
        </div>
        {createError && (
          <div className="mt-3 meta-mono text-[var(--destructive)]">{createError}</div>
        )}
        <div className="mt-4">
          <Button size="sm" type="submit" disabled={creating}>
            {creating ? t('creatingBtn') : t('createBtn')}
          </Button>
        </div>
      </form>

      {/* 版块列表 */}
      {categories.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{t('noCategories')}</div>
      ) : (
        <div className="border-t border-[var(--border)]">
          {/* 表头 */}
          <div className="hidden md:grid grid-cols-12 gap-3 py-3 border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
            <div className="col-span-1">{t('colSort')}</div>
            <div className="col-span-2">{t('colSlug')}</div>
            <div className="col-span-2">{t('colName')}</div>
            <div className="col-span-3">{t('colDesc')}</div>
            <div className="col-span-1 text-right">{t('colTopics')}</div>
            <div className="col-span-1 text-right">{t('colPosts')}</div>
            <div className="col-span-2 text-right">{t('colActions')}</div>
          </div>
          {categories.map((cat) => (
            <div key={cat.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 py-4 border-b border-[var(--border)] items-center">
              {editingId === cat.id ? (
                // 编辑模式
                <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 border border-[var(--primary)] bg-[var(--primary)]/[0.03]">
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('slugLabel')}</label>
                    <input type="text" value={editForm.slug} onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
                  </div>
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('nameLabel')}</label>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
                  </div>
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('iconLabel')}</label>
                    <input type="text" value={editForm.icon ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
                  </div>
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('sortOrderLabel')}</label>
                    <input type="number" value={editForm.sortOrder ?? 0} onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('descriptionLabel')}</label>
                    <input type="text" value={editForm.description ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
                  </div>
                  {editError && (
                    <div className="sm:col-span-2 lg:col-span-4 meta-mono text-[var(--destructive)]">{editError}</div>
                  )}
                  <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
                    <Button size="sm" type="button" onClick={() => handleSaveEdit(cat.id)} disabled={savingEdit}>
                      {savingEdit ? t('savingBtn') : t('saveBtn')}
                    </Button>
                    <Button variant="outline" size="sm" type="button" onClick={() => { setEditingId(null); setEditError(null); }} disabled={savingEdit}>
                      {t('cancelBtn')}
                    </Button>
                  </div>
                </div>
              ) : (
                // 展示模式
                <>
                  <div className="md:col-span-1 meta-mono text-[var(--muted-foreground)]">
                    <span className="md:hidden meta-mono text-[10px] text-[var(--muted-foreground)] mr-2">{t('sortMobile')}</span>
                    {cat.sortOrder}
                  </div>
                  <div className="md:col-span-2">
                    <span className="md:hidden meta-mono text-[10px] text-[var(--muted-foreground)] mr-2">{t('slugMobile')}</span>
                    <span className="meta-mono text-[var(--primary)]">{cat.slug}</span>
                  </div>
                  <div className="md:col-span-2 text-[var(--foreground)] font-mono text-[13px]">
                    {cat.icon && <span className="mr-2 text-[var(--muted-foreground)]">{cat.icon}</span>}
                    {cat.name}
                  </div>
                  <div className="md:col-span-3 text-[12px] text-[var(--muted-foreground)] line-clamp-1">{cat.description ?? '—'}</div>
                  <div className="md:col-span-1 md:text-right font-mono text-[12px] text-[var(--foreground)] tabular-nums">
                    <span className="md:hidden meta-mono text-[10px] text-[var(--muted-foreground)] mr-2">{t('topicsMobile')}</span>
                    {cat.topicCount}
                  </div>
                  <div className="md:col-span-1 md:text-right font-mono text-[12px] text-[var(--foreground)] tabular-nums">
                    <span className="md:hidden meta-mono text-[10px] text-[var(--muted-foreground)] mr-2">{t('postsMobile')}</span>
                    {cat.postCount}
                  </div>
                  <div className="md:col-span-2 flex gap-2 md:justify-end">
                    <Button variant="outline" size="sm" type="button" onClick={() => startEdit(cat)}>{t('editBtn')}</Button>
                    <Button variant="outline-danger" size="sm" type="button" onClick={() => handleDelete(cat)}>{t('deleteBtn')}</Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
