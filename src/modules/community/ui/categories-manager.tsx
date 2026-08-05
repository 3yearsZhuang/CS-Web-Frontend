/**
 * @file 版块管理子面板 — 从 forum-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button, SectionLoading } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import type { CommunityCategory } from '@/modules/community/types';
import { getError, type CategoryInput, type CategoriesResponse } from './forum-admin-utils';

/** 版块管理 — 新建/编辑/删除版块 */
export function CategoriesManager() {
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/community/forum/categories');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getError(data, '加载失败'));
      }
      const data = (await res.json()) as CategoriesResponse;
      setCategories(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  /** 新建版块 */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!createForm.slug.trim() || !createForm.name.trim()) {
      setCreateError('slug 与 name 必填');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/community/forum/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: createForm.slug.trim(),
          name: createForm.name.trim(),
          description: createForm.description?.trim() || null,
          icon: createForm.icon?.trim() || null,
          sortOrder: createForm.sortOrder ?? 0,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(getError(data, '创建失败'));
      }
      setCreateForm({ slug: '', name: '', description: '', icon: '', sortOrder: 0 });
      await loadCategories();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
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
      setEditError('slug 与 name 必填');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/community/forum/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: editForm.slug.trim(),
          name: editForm.name.trim(),
          description: editForm.description?.trim() || null,
          icon: editForm.icon?.trim() || null,
          sortOrder: editForm.sortOrder ?? 0,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(getError(data, '保存失败'));
      }
      setEditingId(null);
      await loadCategories();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingEdit(false);
    }
  };

  /** 删除版块（带二次确认） */
  const handleDelete = async (cat: CommunityCategory) => {
    const confirmed = await confirm({
      title: '删除版块',
      message: `确定要删除版块「${cat.name}」吗？\n该操作将级联删除其下所有主题与回复，且不可恢复。`,
      variant: 'danger',
      confirmLabel: '确认删除',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/community/forum/categories/${cat.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(getError(data, '删除失败'));
      }
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
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
          新建版块
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">标识 / Slug *</label>
            <input type="text" value={createForm.slug} onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))} placeholder="web" maxLength={50} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">名称 / Name *</label>
            <input type="text" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="Web 开发" maxLength={50} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">图标 / Icon</label>
            <input type="text" value={createForm.icon ?? ''} onChange={(e) => setCreateForm((f) => ({ ...f, icon: e.target.value }))} placeholder="</>" maxLength={20} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">排序 / Sort Order</label>
            <input type="number" value={createForm.sortOrder ?? 0} onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} min={0} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">描述 / Description</label>
            <input type="text" value={createForm.description ?? ''} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} placeholder="版块描述..." maxLength={200} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
        </div>
        {createError && (
          <div className="mt-3 meta-mono text-[var(--destructive)]">{createError}</div>
        )}
        <div className="mt-4">
          <Button size="sm" type="submit" disabled={creating}>
            {creating ? '创建中 / Creating...' : '创建 / Create →'}
          </Button>
        </div>
      </form>

      {/* 版块列表 */}
      {categories.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{'// 暂无版块'}</div>
      ) : (
        <div className="border-t border-[var(--border)]">
          {/* 表头 */}
          <div className="hidden md:grid grid-cols-12 gap-3 py-3 border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
            <div className="col-span-1">排序 / Sort</div>
            <div className="col-span-2">标识 / Slug</div>
            <div className="col-span-2">名称 / Name</div>
            <div className="col-span-3">描述 / Description</div>
            <div className="col-span-1 text-right">主题 / Topics</div>
            <div className="col-span-1 text-right">帖子 / Posts</div>
            <div className="col-span-2 text-right">操作 / Actions</div>
          </div>
          {categories.map((cat) => (
            <div key={cat.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 py-4 border-b border-[var(--border)] items-center">
              {editingId === cat.id ? (
                // 编辑模式
                <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 border border-[var(--primary)] bg-[var(--primary)]/[0.03]">
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">标识 / Slug</label>
                    <input type="text" value={editForm.slug} onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
                  </div>
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">名称 / Name</label>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
                  </div>
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">图标 / Icon</label>
                    <input type="text" value={editForm.icon ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
                  </div>
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">排序 / Sort Order</label>
                    <input type="number" value={editForm.sortOrder ?? 0} onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">描述 / Description</label>
                    <input type="text" value={editForm.description ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
                  </div>
                  {editError && (
                    <div className="sm:col-span-2 lg:col-span-4 meta-mono text-[var(--destructive)]">{editError}</div>
                  )}
                  <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
                    <Button size="sm" type="button" onClick={() => handleSaveEdit(cat.id)} disabled={savingEdit}>
                      {savingEdit ? '保存中 / Saving...' : '保存 / Save'}
                    </Button>
                    <Button variant="outline" size="sm" type="button" onClick={() => { setEditingId(null); setEditError(null); }} disabled={savingEdit}>
                      取消 / Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // 展示模式
                <>
                  <div className="md:col-span-1 meta-mono text-[var(--muted-foreground)]">
                    <span className="md:hidden meta-mono text-[10px] text-[var(--muted-foreground)] mr-2">排序:</span>
                    {cat.sortOrder}
                  </div>
                  <div className="md:col-span-2">
                    <span className="md:hidden meta-mono text-[10px] text-[var(--muted-foreground)] mr-2">标识:</span>
                    <span className="meta-mono text-[var(--primary)]">{cat.slug}</span>
                  </div>
                  <div className="md:col-span-2 text-[var(--foreground)] font-mono text-[13px]">
                    {cat.icon && <span className="mr-2 text-[var(--muted-foreground)]">{cat.icon}</span>}
                    {cat.name}
                  </div>
                  <div className="md:col-span-3 text-[12px] text-[var(--muted-foreground)] line-clamp-1">{cat.description ?? '—'}</div>
                  <div className="md:col-span-1 md:text-right font-mono text-[12px] text-[var(--foreground)] tabular-nums">
                    <span className="md:hidden meta-mono text-[10px] text-[var(--muted-foreground)] mr-2">主题:</span>
                    {cat.topicCount}
                  </div>
                  <div className="md:col-span-1 md:text-right font-mono text-[12px] text-[var(--foreground)] tabular-nums">
                    <span className="md:hidden meta-mono text-[10px] text-[var(--muted-foreground)] mr-2">帖子:</span>
                    {cat.postCount}
                  </div>
                  <div className="md:col-span-2 flex gap-2 md:justify-end">
                    <button type="button" onClick={() => startEdit(cat)} className="px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] font-mono text-[10px] uppercase tracking-wider hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors focus-amber">
                      编辑 / Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(cat)} className="px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] font-mono text-[10px] uppercase tracking-wider hover:text-[var(--destructive)] hover:border-[var(--destructive)] transition-colors focus-amber">
                      删除 / Del
                    </button>
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
