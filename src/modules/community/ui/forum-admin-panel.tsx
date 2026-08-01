/**
 * @file 管理员论坛面板 — 版块管理 + 主题审核（categories/topics 子视图切换）
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { Button, SectionLoading } from '@/components';
import { formatDateTime } from '@/shared/utils/utils';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import type {
  ForumCategory,
  ForumTopic,
  PaginatedTopics,
} from '@/modules/community/types';

/* ============= 类型定义 ============= */

type SubView = 'categories' | 'topics' | 'users' | 'dashboard' | 'announcements';

type TopicStatus = 'published' | 'hidden';

interface CategoryInput {
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number;
}

interface CategoriesResponse {
  items: ForumCategory[];
}

/* ============= 常量 ============= */

const TOPICS_PAGE_SIZE = 15;

const STATUS_OPTIONS: { value: TopicStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部 / All' },
  { value: 'published', label: '已发布 / Published' },
  { value: 'hidden', label: '已隐藏 / Hidden' },
];

const SORT_OPTIONS = [
  { value: 'latest', label: '最新 / Latest' },
  { value: 'hot', label: '热门 / Hot' },
  { value: 'top', label: '顶 / Top' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

/** 统一错误提取 */
function getError(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === 'string') return err;
  }
  return fallback;
}

/* ============= 主组件 ============= */

export function AdminForumPanel() {
  const [subView, setSubView] = useState<SubView>('categories');

  return (
    <>
      {/* 子视图切换 */}
      <div className="flex items-center gap-6 mb-6 border-b border-[var(--border)] pb-4">
        <button
          type="button"
          onClick={() => setSubView('categories')}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'categories'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          [ 版块管理 / Categories ]
        </button>
        <button
          type="button"
          onClick={() => setSubView('topics')}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'topics'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          [ 主题审核 / Topics ]
        </button>
        <button
          type="button"
          onClick={() => setSubView('users')}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'users'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          [ 用户管理 / Users ]
        </button>
        <button
          type="button"
          onClick={() => setSubView('announcements')}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'announcements'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          [ 公告管理 / Announcements ]
        </button>
        <button
          type="button"
          onClick={() => setSubView('dashboard')}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'dashboard'
              ? 'text-[var(--primary)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          [ 数据看板 / Dashboard ]
        </button>
      </div>

      {subView === 'categories' ? <CategoriesManager /> : subView === 'topics' ? <TopicsManager /> : subView === 'users' ? <UsersManager /> : subView === 'announcements' ? <AnnouncementsManager /> : <DashboardManager />}
    </>
  );
}

/* ============= 版块管理 ============= */

function CategoriesManager() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
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
      const res = await fetch('/api/admin/community/community/forum/categories');
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
      const res = await fetch('/api/admin/community/community/forum/categories', {
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
      // 重置表单 + 重新加载
      setCreateForm({ slug: '', name: '', description: '', icon: '', sortOrder: 0 });
      await loadCategories();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  /** 进入编辑模式 */
  const startEdit = (cat: ForumCategory) => {
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
      const res = await fetch(`/api/admin/community/community/forum/categories/${id}`, {
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
  const handleDelete = async (cat: ForumCategory) => {
    const confirmed = await confirm({
      title: '删除版块',
      message: `确定要删除版块「${cat.name}」吗？\n该操作将级联删除其下所有主题与回复，且不可恢复。`,
      variant: 'danger',
      confirmLabel: '确认删除',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/community/community/forum/categories/${cat.id}`, {
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
      <form
        onSubmit={handleCreate}
        className="border border-[var(--border)] p-4 sm:p-6"
      >
        <div className="meta-mono text-[var(--foreground)] mb-4">
          <span className="ark-divider mr-2">{'//'}</span>
          新建版块
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
              标识 / Slug *
            </label>
            <input
              type="text"
              value={createForm.slug}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, slug: e.target.value }))
              }
              placeholder="web"
              maxLength={50}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
              名称 / Name *
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Web 开发"
              maxLength={50}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
              图标 / Icon
            </label>
            <input
              type="text"
              value={createForm.icon ?? ''}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, icon: e.target.value }))
              }
              placeholder="</>"
              maxLength={20}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
              排序 / Sort Order
            </label>
            <input
              type="number"
              value={createForm.sortOrder ?? 0}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  sortOrder: Number(e.target.value) || 0,
                }))
              }
              min={0}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
              描述 / Description
            </label>
            <input
              type="text"
              value={createForm.description ?? ''}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="版块描述..."
              maxLength={200}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            />
          </div>
        </div>
        {createError && (
          <div className="mt-3 meta-mono text-[var(--destructive)]">
            {createError}
          </div>
        )}
        <div className="mt-4">
          <Button
            size="sm"
            type="submit"
            disabled={creating}
          >
            {creating ? '创建中 / Creating...' : '创建 / Create →'}
          </Button>
        </div>
      </form>

      {/* 版块列表 */}
      {categories.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">
          {'// 暂无版块'}
        </div>
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
            <div
              key={cat.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 py-4 border-b border-[var(--border)] items-center"
            >
              {editingId === cat.id ? (
                // 编辑模式
                <div className="md:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 border border-[var(--primary)] bg-[var(--primary)]/[0.03]">
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
                      标识 / Slug
                    </label>
                    <input
                      type="text"
                      value={editForm.slug}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, slug: e.target.value }))
                      }
                      className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
                    />
                  </div>
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
                      名称 / Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
                    />
                  </div>
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
                      图标 / Icon
                    </label>
                    <input
                      type="text"
                      value={editForm.icon ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, icon: e.target.value }))
                      }
                      className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
                    />
                  </div>
                  <div>
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
                      排序 / Sort Order
                    </label>
                    <input
                      type="number"
                      value={editForm.sortOrder ?? 0}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          sortOrder: Number(e.target.value) || 0,
                        }))
                      }
                      className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
                      描述 / Description
                    </label>
                    <input
                      type="text"
                      value={editForm.description ?? ''}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, description: e.target.value }))
                      }
                      className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
                    />
                  </div>
                  {editError && (
                    <div className="sm:col-span-2 lg:col-span-4 meta-mono text-[var(--destructive)]">
                      {editError}
                    </div>
                  )}
                  <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={savingEdit}
                    >
                      {savingEdit ? '保存中 / Saving...' : '保存 / Save'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditError(null);
                      }}
                      disabled={savingEdit}
                    >
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
                  <div className="md:col-span-3 text-[12px] text-[var(--muted-foreground)] line-clamp-1">
                    {cat.description ?? '—'}
                  </div>
                  <div className="md:col-span-1 md:text-right font-mono text-[12px] text-[var(--foreground)] tabular-nums">
                    <span className="md:hidden meta-mono text-[10px] text-[var(--muted-foreground)] mr-2">主题:</span>
                    {cat.topicCount}
                  </div>
                  <div className="md:col-span-1 md:text-right font-mono text-[12px] text-[var(--foreground)] tabular-nums">
                    <span className="md:hidden meta-mono text-[10px] text-[var(--muted-foreground)] mr-2">帖子:</span>
                    {cat.postCount}
                  </div>
                  <div className="md:col-span-2 flex gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] font-mono text-[10px] uppercase tracking-wider hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors focus-amber"
                    >
                      编辑 / Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] font-mono text-[10px] uppercase tracking-wider hover:text-[var(--destructive)] hover:border-[var(--destructive)] transition-colors focus-amber"
                    >
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

/* ============= 公告管理 ============= */

interface AnnouncementItem {
  id: string;
  title: string;
  content: string | null;
  level: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  isDismissible: boolean;
  priority: number;
  expiresAt: string | null;
  createdAt: string;
}

interface AnnouncementsResponse {
  items: AnnouncementItem[];
  total: number;
}

const LEVEL_OPTIONS: { value: AnnouncementItem['level']; label: string }[] = [
  { value: 'info', label: '信息 / Info' },
  { value: 'warning', label: '警告 / Warning' },
  { value: 'success', label: '成功 / Success' },
  { value: 'error', label: '错误 / Error' },
];

function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', content: '', level: 'info' as AnnouncementItem['level'], priority: 0 });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const { confirm } = useConfirm();

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/announcements');
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getError(data, '加载失败'));
      }
      const data = (await res.json()) as AnnouncementsResponse;
      setAnnouncements(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAnnouncements(); }, [loadAnnouncements]);

  const doAction = async (id: string, action: () => Promise<Response>) => {
    setActionError(null);
    setBusyIds((s) => new Set(s).add(id));
    try {
      const res = await action();
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getError(data, '操作失败'));
      await loadAnnouncements();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  const handleToggleActive = (item: AnnouncementItem) => {
    void doAction(item.id, () =>
      fetch(`/api/admin/announcements/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      }),
    );
  };

  const handleDelete = (item: AnnouncementItem) => {
    void (async () => {
      const confirmed = await confirm({
        title: '删除公告',
        message: `确认删除公告「${item.title}」？`,
        variant: 'danger',
        confirmLabel: '确认删除',
      });
      if (!confirmed) return;
      doAction(item.id, () =>
        fetch(`/api/admin/announcements/${item.id}`, { method: 'DELETE' }),
      );
    })();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      setCreateError('标题不能为空');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getError(data, '创建失败'));
      setShowCreate(false);
      setCreateForm({ title: '', content: '', level: 'info', priority: 0 });
      await loadAnnouncements();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="px-4 py-3 border border-[var(--destructive)] bg-[var(--destructive)]/5 meta-mono text-[var(--destructive)]">
          {actionError}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="meta-mono text-[var(--muted-foreground)]">
          {'// 共 '}<span className="text-[var(--foreground)] tabular-nums">{announcements.length}</span>{' 条公告'}
        </div>
        <Button size="sm" type="button" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '取消 / Cancel' : '新建公告 / New'}
        </Button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="border border-[var(--border)] p-4 sm:p-6 space-y-4">
          <div className="meta-mono text-[var(--foreground)] mb-2">
            <span className="ark-divider mr-2">{'//'}</span>
            新建公告
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">标题 / Title</label>
            <input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} placeholder="公告标题..." maxLength={200} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
          </div>
          <div>
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">内容 / Content</label>
            <textarea value={createForm.content} onChange={(e) => setCreateForm((f) => ({ ...f, content: e.target.value }))} placeholder="公告内容（支持 Markdown）..." maxLength={5000} rows={4} className={`${INPUT_CLASS} px-3 py-2 text-[13px] resize-y`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">级别 / Level</label>
              <select value={createForm.level} onChange={(e) => setCreateForm((f) => ({ ...f, level: e.target.value as AnnouncementItem['level'] }))} className={`${INPUT_CLASS} appearance-none pr-8 cursor-pointer`}>
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">优先级 / Priority</label>
              <input type="number" value={createForm.priority} onChange={(e) => setCreateForm((f) => ({ ...f, priority: Number(e.target.value) || 0 }))} min={0} max={100} className={`${INPUT_CLASS} px-3 py-2 text-[13px]`} />
            </div>
          </div>
          {createError && <div className="meta-mono text-[var(--destructive)]">{createError}</div>}
          <Button size="sm" type="submit" disabled={creating}>{creating ? '创建中...' : '创建 / Create'}</Button>
        </form>
      )}

      {loading ? (
        <SectionLoading label="Loading..." />
      ) : error ? (
        <div className="py-12 text-center meta-mono text-[var(--destructive)]">{error}</div>
      ) : announcements.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{'// 暂无公告'}</div>
      ) : (
        <div className="border-t border-[var(--border)]">
          <div className="hidden lg:grid grid-cols-12 gap-3 py-3 border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
            <div className="col-span-4">标题 / Title</div>
            <div className="col-span-1">级别 / Level</div>
            <div className="col-span-1">状态 / Status</div>
            <div className="col-span-1">优先级 / Priority</div>
            <div className="col-span-3">创建 / Created</div>
            <div className="col-span-2 text-right">操作 / Actions</div>
          </div>
          {announcements.map((item) => {
            const busy = busyIds.has(item.id);
            return (
              <div key={item.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 py-4 border-b border-[var(--border)] items-center">
                <div className="lg:col-span-4">
                  <span className="font-mono text-[13px] text-[var(--foreground)] line-clamp-1">{item.title}</span>
                  {item.content && <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 mt-0.5">{item.content}</p>}
                </div>
                <div className="lg:col-span-1">
                  <span className={`meta-mono text-[10px] px-2 py-0.5 border ${
                    item.level === 'error' ? 'border-[var(--destructive)] text-[var(--destructive)]' :
                    item.level === 'warning' ? 'border-amber-500 text-amber-400' :
                    item.level === 'success' ? 'border-green-500 text-green-400' :
                    'border-[var(--border)] text-[var(--muted-foreground)]'
                  }`}>{item.level.toUpperCase()}</span>
                </div>
                <div className="lg:col-span-1">
                  <span className={`meta-mono text-[10px] px-2 py-0.5 border ${item.isActive ? 'border-green-500 text-green-400' : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}>
                    {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div className="lg:col-span-1 font-mono text-[12px] text-[var(--foreground)] tabular-nums">{item.priority}</div>
                <div className="lg:col-span-3 meta-mono text-[10px] text-[var(--muted-foreground)]">{formatDateTime(item.createdAt)}</div>
                <div className="lg:col-span-2 flex flex-wrap gap-1.5 lg:justify-end">
                  <Button variant="outline" size="sm" type="button" onClick={() => handleToggleActive(item)} disabled={busy}>
                    {item.isActive ? '停用' : '启用'}
                  </Button>
                  <button type="button" onClick={() => handleDelete(item)} disabled={busy} className="px-2.5 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] font-mono text-[10px] uppercase tracking-wider hover:text-[var(--destructive)] hover:border-[var(--destructive)] transition-colors focus-amber disabled:opacity-50">
                    Del
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============= 数据看板 ============= */

interface DashboardStats {
  totalUsers: number;
  totalTopics: number;
  totalReplies: number;
  totalBlogPosts: number;
  totalCategories: number;
  totalAnnouncements: number;
  onlineUsers: number;
}

function DashboardManager() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/users?pageSize=1').then((r) => r.json()),
      fetch('/api/community/feed?stats=1').then((r) => r.json()),
      fetch('/api/admin/announcements').then((r) => r.json()),
      fetch('/api/admin/community/community/forum/categories').then((r) => r.json()),
    ])
      .then(([usersData, feedStats, announcementsData, categoriesData]) => {
        setStats({
          totalUsers: usersData.total ?? 0,
          totalTopics: feedStats.topicCount ?? 0,
          totalReplies: (feedStats.topicCount ?? 0) + (feedStats.postCount ?? 0),
          totalBlogPosts: feedStats.postCount ?? 0,
          totalCategories: (categoriesData.items ?? []).length,
          totalAnnouncements: announcementsData.total ?? 0,
          onlineUsers: 0,
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: '总用户', value: stats.totalUsers, color: 'var(--primary)' },
    { label: '论坛主题', value: stats.totalTopics, color: '#5bc9c5' },
    { label: '回复/评论', value: stats.totalReplies, color: '#d4a574' },
    { label: '博客文章', value: stats.totalBlogPosts, color: '#a78bfa' },
    { label: '版块', value: stats.totalCategories, color: '#f59e0b' },
    { label: '公告', value: stats.totalAnnouncements, color: '#ef4444' },
  ] : [];

  if (loading) {
    return <SectionLoading label="Loading..." />;
  }

  if (error) {
    return <div className="py-12 text-center meta-mono text-[var(--destructive)]">{error}</div>;
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div className="meta-mono text-[var(--muted-foreground)]">
        {'// 社区运营数据概览'}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="border border-[var(--border)] p-6 card-minimal">
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-2">{card.label}</div>
            <div className="font-mono text-[28px] sm:text-[32px] tabular-nums" style={{ color: card.color }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============= 用户管理与禁言 ============= */

interface AdminUserItem {
  id: string;
  displayName: string | null;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
}

interface UsersResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  totalPages: number;
}

function UsersManager() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const { confirm } = useConfirm();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getError(data, '加载失败'));
      }
      const data = (await res.json()) as UsersResponse;
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const doUserAction = async (userId: string, action: () => Promise<Response>) => {
    setActionError(null);
    setBusyIds((s) => new Set(s).add(userId));
    try {
      const res = await action();
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getError(data, '操作失败'));
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleDisable = (user: AdminUserItem) => {
    void (async () => {
      const confirmed = await confirm({
        title: '禁言用户',
        message: `确认禁言「${user.displayName ?? user.email}」吗？\n禁言后该用户将无法发帖和回复。`,
        variant: 'danger',
        confirmLabel: '确认禁言',
      });
      if (!confirmed) return;
      doUserAction(user.id, () =>
        fetch(`/api/admin/users/${user.id}/disable`, { method: 'POST' }),
      );
    })();
  };

  const handleEnable = (user: AdminUserItem) => {
    void doUserAction(user.id, () =>
      fetch(`/api/admin/users/${user.id}/enable`, { method: 'POST' }),
    );
  };

  const pageNums = (() => {
    const max = totalPages;
    const cur = page;
    const range: number[] = [];
    const start = Math.max(1, Math.min(cur - 2, max - 4));
    const end = Math.min(max, start + 4);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  })();

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="px-4 py-3 border border-[var(--destructive)] bg-[var(--destructive)]/5 meta-mono text-[var(--destructive)]">
          {actionError}
        </div>
      )}

      <div className="border border-[var(--border)] p-4 sm:p-6 space-y-4">
        <div>
          <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
            搜索 / Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜索用户名或邮箱..."
            maxLength={80}
            className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
          />
        </div>
      </div>

      <div className="meta-mono text-[var(--muted-foreground)]">
        {loading ? '// 加载中...' : error ? <span className="text-[var(--destructive)]">{'// '}{error}</span> : <>{'// 共 '}<span className="text-[var(--foreground)] tabular-nums">{total}</span>{' 位用户'}</>}
      </div>

      {loading ? (
        <SectionLoading label="Loading..." />
      ) : error ? (
        <div className="py-12 text-center meta-mono text-[var(--destructive)]">{error}</div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{'// 暂无用户'}</div>
      ) : (
        <div className="border-t border-[var(--border)]">
          <div className="hidden lg:grid grid-cols-12 gap-3 py-3 border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
            <div className="col-span-3">用户 / User</div>
            <div className="col-span-2">邮箱 / Email</div>
            <div className="col-span-1">角色 / Role</div>
            <div className="col-span-1">状态 / Status</div>
            <div className="col-span-2">注册 / Created</div>
            <div className="col-span-3 text-right">操作 / Actions</div>
          </div>
          {users.map((user) => {
            const busy = busyIds.has(user.id);
            return (
              <div key={user.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 py-4 border-b border-[var(--border)] items-center">
                <div className="lg:col-span-3">
                  <span className="font-mono text-[13px] text-[var(--foreground)]">
                    {user.displayName ?? '未命名用户'}
                  </span>
                </div>
                <div className="lg:col-span-2">
                  <span className="font-mono text-[12px] text-[var(--muted-foreground)] truncate block">
                    {user.email}
                  </span>
                </div>
                <div className="lg:col-span-1">
                  <span className={`meta-mono text-[10px] px-2 py-0.5 border ${user.role === 'admin' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}>
                    {user.role === 'admin' ? 'ADMIN' : 'USER'}
                  </span>
                </div>
                <div className="lg:col-span-1">
                  <span className={`meta-mono text-[10px] px-2 py-0.5 border ${user.isActive ? 'border-[var(--border)] text-[var(--muted-foreground)]' : 'border-[var(--destructive)] text-[var(--destructive)]'}`}>
                    {user.isActive ? 'ACTIVE' : 'MUTED'}
                  </span>
                </div>
                <div className="lg:col-span-2 meta-mono text-[10px] text-[var(--muted-foreground)]">
                  {formatDateTime(user.createdAt)}
                </div>
                <div className="lg:col-span-3 flex flex-wrap gap-1.5 lg:justify-end">
                  {user.isActive ? (
                    <Button variant="outline" size="sm" type="button" onClick={() => handleDisable(user)} disabled={busy} className="hover:text-[var(--destructive)] hover:border-[var(--destructive)]">
                      禁言 / Mute
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" type="button" onClick={() => handleEnable(user)} disabled={busy}>
                      解禁 / Enable
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-6 border-t border-[var(--border)]">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber">←</button>
          {pageNums.map((n) => (
            <button key={n} onClick={() => setPage(n)} className={`font-mono text-[12px] px-3 py-1.5 border transition-colors focus-amber ${page === n ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)]'}`}>
              {String(n).padStart(2, '0')}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber">→</button>
        </div>
      )}
    </div>
  );
}

/* ============= 主题审核 ============= */

function TopicsManager() {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortValue>('latest');

  // 分页
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // 操作中状态（按 topicId 隔离）
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const { confirm } = useConfirm();

  /** 加载版块（用于筛选下拉） */
  useEffect(() => {
    fetch('/api/admin/community/community/forum/categories')
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as CategoriesResponse;
        return data.items ?? [];
      })
      .then((cats) => {
        if (cats) setCategories(cats);
      })
      .catch(() => {
        // 静默失败 — 筛选下拉仅作辅助
      });
  }, []);

  /** 加载主题列表 */
  const loadTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        sort,
        page: String(page),
        page_size: String(TOPICS_PAGE_SIZE),
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/community/community/forum/topics?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getError(data, '加载失败'));
      }
      const data = (await res.json()) as PaginatedTopics;
      setTopics(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, search, sort, page]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  /** 通用操作调用 — 设置 busy + 错误处理 + 成功后刷新 */
  const doAction = async (
    topicId: string,
    action: () => Promise<Response>,
    successMsg?: string,
  ) => {
    setActionError(null);
    setBusyIds((s) => new Set(s).add(topicId));
    try {
      const res = await action();
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(getError(data, '操作失败'));
      }
      // 成功 — 重新加载当前页
      await loadTopics();
      if (successMsg) {
        // 可选：用 toast/notice 反馈，此处静默
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(topicId);
        return next;
      });
    }
  };

  /** 隐藏主题 */
  const handleHide = (topic: ForumTopic) => {
    const reason = window.prompt(`隐藏主题「${topic.title}」\n请输入隐藏原因（可选）：`) ?? '';
    void doAction(topic.id, () =>
      fetch(`/api/admin/community/community/forum/topics/${topic.id}/hide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      }),
    );
  };

  /** 恢复主题 */
  const handleRestore = (topic: ForumTopic) => {
    void doAction(topic.id, () =>
      fetch(`/api/admin/community/community/forum/topics/${topic.id}/restore`, { method: 'POST' }),
    );
  };

  /** 切换置顶 */
  const handleTogglePin = (topic: ForumTopic) => {
    void doAction(topic.id, () =>
      fetch(`/api/admin/community/community/forum/topics/${topic.id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !topic.isPinned }),
      }),
    );
  };

  /** 切换加精 */
  const handleToggleFeature = (topic: ForumTopic) => {
    void doAction(topic.id, () =>
      fetch(`/api/admin/community/community/forum/topics/${topic.id}/feature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: !topic.isFeatured }),
      }),
    );
  };

  /** 硬删除主题 */
  const handleHardDelete = (topic: ForumTopic) => {
    void (async () => {
      const confirmed = await confirm({
        title: '硬删除主题',
        message: `硬删除主题「${topic.title}」？\n该操作不可恢复，将级联删除所有回复、点赞、收藏。`,
        variant: 'danger',
        confirmLabel: '确认删除',
      });
      if (!confirmed) return;
      doAction(topic.id, () =>
        fetch(`/api/admin/community/community/forum/topics/${topic.id}`, { method: 'DELETE' }),
      );
    })();
  };

  /** 当前页码范围 */
  const pageNums = (() => {
    const max = totalPages;
    const cur = page;
    const range: number[] = [];
    const start = Math.max(1, Math.min(cur - 2, max - 4));
    const end = Math.min(max, start + 4);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  })();

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="px-4 py-3 border border-[var(--destructive)] bg-[var(--destructive)]/5 meta-mono text-[var(--destructive)]">
          {actionError}
        </div>
      )}

      {/* 筛选区 */}
      <div className="border border-[var(--border)] p-4 sm:p-6 space-y-4">
        {/* 搜索 */}
        <div>
          <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
            搜索 / Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="搜索标题或正文..."
            maxLength={80}
            className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 状态筛选 */}
          <div className="flex-shrink-0">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
              状态 / Status
            </label>
            <div className="flex gap-0">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap px-3 py-2 text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* 版块筛选 */}
          <div className="flex-shrink-0">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
              分类 / Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className={`${INPUT_CLASS} appearance-none pr-8 cursor-pointer`}
            >
              <option value="">全部 / All</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          {/* 排序 */}
          <div className="flex-shrink-0 sm:ml-auto">
            <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">
              排序 / Sort
            </label>
            <div className="flex gap-0">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setSort(opt.value);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap px-3 py-2 text-[10px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                    sort === opt.value
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                      : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 统计 */}
      <div className="meta-mono text-[var(--muted-foreground)]">
        {loading ? (
          '// 加载中...'
        ) : error ? (
          <span className="text-[var(--destructive)]">{'// '}{error}</span>
        ) : (
          <>
            {'// 共 '}<span className="text-[var(--foreground)] tabular-nums">{total}</span>{' 条主题'}
          </>
        )}
      </div>

      {/* 主题列表 */}
      {loading ? (
        <SectionLoading label="Loading..." />
      ) : error ? (
        <div className="py-12 text-center meta-mono text-[var(--destructive)]">
          {error}
        </div>
      ) : topics.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">
          {'// 暂无主题'}
        </div>
      ) : (
        <div className="border-t border-[var(--border)]">
          {/* 表头 */}
          <div className="hidden lg:grid grid-cols-12 gap-3 py-3 border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
            <div className="col-span-5">标题 / 作者 / Title / Author</div>
            <div className="col-span-1">状态 / Status</div>
            <div className="col-span-1">统计 / Stats</div>
            <div className="col-span-1">创建 / Created</div>
            <div className="col-span-4 text-right">操作 / Actions</div>
          </div>
          {topics.map((topic) => {
            const busy = busyIds.has(topic.id);
            const slug = topic.category?.slug ?? '';
            const topicHref = slug ? `/community/forum/${slug}/${topic.id}` : '/community/forum';
            return (
              <div
                key={topic.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 py-4 border-b border-[var(--border)]"
              >
                {/* 标题 + 作者 */}
                <div className="lg:col-span-5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    {topic.isPinned && (
                      <span className="meta-mono text-[9px] px-1.5 py-0.5 border border-[var(--primary)] text-[var(--primary)]">
                        PIN
                      </span>
                    )}
                    {topic.isFeatured && (
                      <span className="meta-mono text-[9px] px-1.5 py-0.5 border border-[var(--primary)] text-[var(--primary)]">
                        FEAT
                      </span>
                    )}
                  </div>
                  <Link
                    href={topicHref}
                    target="_blank"
                    className="display-serif text-[14px] sm:text-[15px] text-[var(--foreground)] hover:text-[var(--primary)] transition-colors line-clamp-1"
                  >
                    {topic.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar
                      email={topic.author?.email ?? 'anonymous'}
                      displayName={topic.author?.displayName}
                      avatarUrl={topic.author?.avatarUrl}
                      avatarType={topic.author?.avatarType}
                      size={16}
                    />
                    <span className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[11px]">
                      {topic.author?.displayName ?? '匿名'}
                    </span>
                    {topic.category && (
                      <>
                        <span className="meta-mono text-[var(--muted-foreground)] text-[10px]">·</span>
                        <span className="meta-mono text-[var(--primary)] text-[10px]">
                          {topic.category.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 状态 */}
                <div className="lg:col-span-1">
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)] lg:hidden mr-2">状态:</span>
                  <span
                    className={`meta-mono text-[10px] px-2 py-0.5 border ${
                      topic.status === 'hidden'
                        ? 'border-[var(--destructive)] text-[var(--destructive)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)]'
                    }`}
                  >
                    {topic.status === 'hidden' ? 'HIDDEN' : 'PUBLISHED'}
                  </span>
                </div>

                {/* 统计 */}
                <div className="lg:col-span-1 meta-mono text-[10px] text-[var(--muted-foreground)]">
                  <span className="lg:hidden mr-2">Stats:</span>
                  <span className="tabular-nums">R:{topic.replyCount}</span>
                  <span className="mx-1">·</span>
                  <span className="tabular-nums">V:{topic.viewCount}</span>
                  <span className="mx-1">·</span>
                  <span className="tabular-nums">L:{topic.likeCount}</span>
                </div>

                {/* 创建时间 */}
                <div className="lg:col-span-1 meta-mono text-[10px] text-[var(--muted-foreground)]">
                  <span className="lg:hidden mr-2">Created:</span>
                  {formatDateTime(topic.createdAt)}
                </div>

                {/* 操作 */}
                <div className="lg:col-span-4 flex flex-wrap gap-1.5 lg:justify-end">
                  {/* 置顶 */}
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => handleTogglePin(topic)}
                    disabled={busy}
                    className={
                      topic.isPinned
                        ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5'
                        : ''
                    }
                    title={topic.isPinned ? '取消置顶' : '置顶'}
                  >
                    {topic.isPinned ? '取消置顶 / Unpin' : '置顶 / Pin'}
                  </Button>
                  {/* 加精 */}
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => handleToggleFeature(topic)}
                    disabled={busy}
                    className={
                      topic.isFeatured
                        ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5'
                        : ''
                    }
                    title={topic.isFeatured ? '取消加精' : '加精'}
                  >
                    {topic.isFeatured ? '取消加精 / Unfeat' : '加精 / Feat'}
                  </Button>
                  {/* 隐藏 / 恢复 */}
                  {topic.status === 'published' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => handleHide(topic)}
                      disabled={busy}
                      className="hover:text-[var(--destructive)] hover:border-[var(--destructive)]"
                    >
                      隐藏 / Hide
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => handleRestore(topic)}
                      disabled={busy}
                    >
                      恢复 / Restore
                    </Button>
                  )}
                  {/* 硬删除 */}
                  <button
                    type="button"
                    onClick={() => handleHardDelete(topic)}
                    disabled={busy}
                    className="px-2.5 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] font-mono text-[10px] uppercase tracking-wider hover:text-[var(--destructive)] hover:border-[var(--destructive)] transition-colors focus-amber disabled:opacity-50"
                  >
                    删除 / Del
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-6 border-t border-[var(--border)]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber"
          >
            ←
          </button>
          {pageNums.map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`font-mono text-[12px] px-3 py-1.5 border transition-colors focus-amber ${
                page === n
                  ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)]'
              }`}
            >
              {String(n).padStart(2, '0')}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
