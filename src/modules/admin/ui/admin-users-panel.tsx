/**
 * @file 管理员用户管理面板 — 用户列表 + 密码重置申请（自包含，仅依赖父级 currentUser 与 onForbidden）
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RevealItem } from '@/components/effects/motion-primitives';
import { Avatar } from '@/components/avatar';
import { useToast } from '@/components/feedback/toast';
import { Button, SectionLoading } from '@/components';
import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { ConfirmDialog } from '@/components/primitives/confirm-dialog';
import {
  LIMITS,
  PAGE_SIZE,
  type SafeUser,
  type UserListResult,
  type PasswordResetRequest,
  type UserRole,
} from '@/modules/admin/ui/types';
import { isValidHttpUrl as isValidUrl } from '@/modules/user/types';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { formatDate } from '@/shared/utils/utils';

/* ============= 类型定义 ============= */

type RoleFilter = 'all' | UserRole;
type ActiveFilter = 'all' | 'active' | 'inactive';
type UserSubView = 'list' | 'resets';
type ResetStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface EditForm {
  displayName: string;
  bio: string;
  githubUrl: string;
  websiteUrl: string;
  role: UserRole;
  isActive: boolean;
}

type UserModal =
  | { type: 'none' }
  | { type: 'edit'; user: SafeUser }
  | { type: 'reset'; user: SafeUser }
  | { type: 'resetDefault'; user: SafeUser }
  | { type: 'delete'; user: SafeUser }
  | { type: 'disable'; user: SafeUser }
  | { type: 'approve'; request: PasswordResetRequest }
  | { type: 'reject'; request: PasswordResetRequest };

/* ============= 工具函数 ============= */

function roleLabel(role: UserRole): string {
  return role === 'root' ? '超级管理员' : role === 'admin' ? '管理员' : '普通用户';
}

function resetStatusLabel(status: PasswordResetRequest['status']): string {
  return status === 'pending' ? '待处理' : status === 'approved' ? '已批准' : '已拒绝';
}

/* ============= 面板组件 ============= */

interface AdminUsersPanelProps {
  currentUser: SafeUser;
  onForbidden: () => void;
}

/** 管理员用户管理面板 — 用户列表（搜索/分页/筛选）+ 密码重置申请审核 */
export function AdminUsersPanel({ currentUser, onForbidden }: AdminUsersPanelProps) {
  const router = useRouter();

  // 列表数据
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // 筛选 / 搜索
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  // 模态框
  const [modal, setModal] = useState<UserModal>({ type: 'none' });
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [resetPassword, setResetPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { pushToast } = useToast();

  // 用户管理子视图
  const [userSubView, setUserSubView] = useState<UserSubView>('list');

  // 密码重置申请
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [resetStatusFilter, setResetStatusFilter] = useState<ResetStatusFilter>('pending');
  const [resetListLoading, setResetListLoading] = useState(false);
  const [resetListError, setResetListError] = useState<string | null>(null);
  const [resetActionLoading, setResetActionLoading] = useState(false);
  const [resetActionError, setResetActionError] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  /* ============= 数据获取 ============= */

  const fetchUsers = useCallback(
    async (opts?: { page?: number; search?: string; role?: RoleFilter; active?: ActiveFilter }) => {
      const p = opts?.page ?? page;
      const s = opts?.search ?? search;
      const r = opts?.role ?? roleFilter;
      const a = opts?.active ?? activeFilter;

      setListLoading(true);
      setListError(null);
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(PAGE_SIZE),
          role: r,
          active: a,
        });
        if (s) params.set('search', s);

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          cache: 'no-store',
        });

        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (res.status === 403) {
          onForbidden();
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || '加载失败');
        }

        const data = (await res.json()) as UserListResult;
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(data.page);
      } catch (err) {
        setListError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setListLoading(false);
      }
    },
    [page, search, roleFilter, activeFilter, router, onForbidden],
  );

  const fetchPasswordResets = useCallback(
    async (status?: ResetStatusFilter) => {
      const s = status ?? resetStatusFilter;
      setResetListLoading(true);
      setResetListError(null);
      try {
        const params = new URLSearchParams();
        if (s !== 'all') params.set('status', s);
        const res = await fetch(`/api/admin/password-resets?${params.toString()}`, {
          cache: 'no-store',
        });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (res.status === 403) {
          onForbidden();
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || '加载失败');
        }
        const data = (await res.json()) as { requests: PasswordResetRequest[] };
        setResetRequests(data.requests ?? []);
      } catch (err) {
        setResetListError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setResetListLoading(false);
      }
    },
    [resetStatusFilter, router, onForbidden],
  );

  /* ============= 副作用 ============= */

  // 搜索输入防抖（300ms）
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // 筛选 / 搜索变化时重新拉取（含首次挂载）
  useEffect(() => {
    fetchUsers({ page: 1, search, role: roleFilter, active: activeFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchUsers 已 useCallback 稳定化，仅依赖筛选条件
  }, [search, roleFilter, activeFilter]);

  // 密码重置申请状态筛选变化时重新拉取（仅当在重置申请子视图）
  useEffect(() => {
    if (userSubView !== 'resets') return;
    fetchPasswordResets();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPasswordResets 已 useCallback 稳定化，仅依赖筛选条件
  }, [resetStatusFilter]);

  /* ============= 权限判断 ============= */

  const isSelf = useCallback(
    (u: SafeUser) => u.id === currentUser.id,
    [currentUser],
  );

  const isRootTarget = useCallback((u: SafeUser) => u.role === 'root', []);
  const isRootAdmin = currentUser.role === 'root';
  const isAdminTarget = useCallback((u: SafeUser) => u.role === 'admin', []);
  const isForbiddenForAdmin = useCallback(
    (u: SafeUser) => isRootTarget(u) || isAdminTarget(u),
    [isRootTarget, isAdminTarget],
  );

  /* ============= 行内操作 ============= */

  const openEdit = (u: SafeUser) => {
    setEditForm({
      displayName: u.displayName ?? '',
      bio: u.bio ?? '',
      githubUrl: u.githubUrl ?? '',
      websiteUrl: u.websiteUrl ?? '',
      role: u.role,
      isActive: u.isActive,
    });
    setEditError(null);
    setModal({ type: 'edit', user: u });
  };

  const openReset = (u: SafeUser) => {
    setResetPassword('');
    setResetError(null);
    setModal({ type: 'reset', user: u });
  };

  const openResetDefault = (u: SafeUser) => {
    setModal({ type: 'resetDefault', user: u });
  };

  const openDelete = (u: SafeUser) => {
    setDeleteError(null);
    setModal({ type: 'delete', user: u });
  };

  const openDisable = (u: SafeUser) => {
    setModal({ type: 'disable', user: u });
  };

  const handleToggleActive = async () => {
    if (modal.type !== 'disable') return;
    const u = modal.user;
    const endpoint = u.isActive ? 'disable' : 'enable';
    try {
      const res = await fetch(`/api/admin/users/${u.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (await res.json().catch(() => null)) as
        | { user?: SafeUser; error?: string }
        | null;
      if (!res.ok || !data?.user) {
        pushToast('error', data?.error || '操作失败，请稍后再试');
        return;
      }
      setUsers((prev) => prev.map((x) => (x.id === data.user!.id ? data.user! : x)));
      pushToast('success', `已${u.isActive ? '禁用' : '启用'} ${u.email}`);
      closeModal();
    } catch {
      pushToast('error', '网络错误，请稍后再试');
    }
  };

  const closeModal = () => {
    setModal({ type: 'none' });
    setEditForm(null);
    setEditError(null);
    setResetPassword('');
    setResetError(null);
    setDeleteError(null);
    setApproveNote('');
    setRejectNote('');
    setResetActionError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.type !== 'edit' || !editForm) return;
    const target = modal.user;

    if (editForm.displayName.length > LIMITS.DISPLAY_NAME_MAX) {
      setEditError(`显示名不能超过 ${LIMITS.DISPLAY_NAME_MAX} 个字符`);
      return;
    }
    if (editForm.bio.length > LIMITS.BIO_MAX) {
      setEditError(`个人简介不能超过 ${LIMITS.BIO_MAX} 个字符`);
      return;
    }
    if (editForm.githubUrl && !isValidUrl(editForm.githubUrl)) {
      setEditError('GitHub 链接格式不正确');
      return;
    }
    if (editForm.websiteUrl && !isValidUrl(editForm.websiteUrl)) {
      setEditError('个人网站链接格式不正确');
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: editForm.displayName || null,
          bio: editForm.bio || null,
          githubUrl: editForm.githubUrl || null,
          websiteUrl: editForm.websiteUrl || null,
          role: editForm.role,
          isActive: editForm.isActive,
        }),
      });
      const data = (await res.json().catch(() => null)) as { user?: SafeUser; error?: string } | null;
      if (!res.ok || !data?.user) {
        setEditError(data?.error || '保存失败，请稍后再试');
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === data.user!.id ? data.user! : u)));
      pushToast('success', `已更新 ${data.user.email}`);
      closeModal();
    } catch {
      setEditError('网络错误，请稍后再试');
    } finally {
      setEditSaving(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal.type !== 'reset') return;
    const target = modal.user;

    if (resetPassword.length < LIMITS.PASSWORD_MIN) {
      setResetError(`密码至少 ${LIMITS.PASSWORD_MIN} 位`);
      return;
    }

    setResetSaving(true);
    setResetError(null);
    try {
      const res = await fetch(`/api/admin/users/${target.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setResetError(data?.error || '重置失败，请稍后再试');
        return;
      }
      pushToast('success', `已重置 ${target.email} 的密码`);
      closeModal();
    } catch {
      setResetError('网络错误，请稍后再试');
    } finally {
      setResetSaving(false);
    }
  };

  const handleResetDefaultSubmit = async () => {
    if (modal.type !== 'resetDefault') return;
    const target = modal.user;

    try {
      const res = await fetch(`/api/admin/users/${target.id}/reset-password-default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        pushToast('error', data?.error || '重置失败，请稍后再试');
        return;
      }
      pushToast('success', `已重置 ${target.email} 的密码为默认密码`);
      closeModal();
    } catch {
      pushToast('error', '网络错误，请稍后再试');
    }
  };

  const handleDelete = async () => {
    if (modal.type !== 'delete') return;
    const target = modal.user;

    setDeleteSaving(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'DELETE',
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setDeleteError(data?.error || '删除失败，请稍后再试');
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      setTotal((t) => Math.max(0, t - 1));
      pushToast('success', `已删除 ${target.email}`);
      closeModal();
    } catch {
      setDeleteError('网络错误，请稍后再试');
    } finally {
      setDeleteSaving(false);
    }
  };

  /* ============= 密码重置申请：行内操作 ============= */

  const openApprove = (request: PasswordResetRequest) => {
    setApproveNote('');
    setResetActionError(null);
    setModal({ type: 'approve', request });
  };

  const openReject = (request: PasswordResetRequest) => {
    setRejectNote('');
    setResetActionError(null);
    setModal({ type: 'reject', request });
  };

  const handleApprove = async () => {
    if (modal.type !== 'approve') return;
    const target = modal.request;
    setResetActionLoading(true);
    setResetActionError(null);
    try {
      const res = await fetch(`/api/admin/password-resets/${target.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: approveNote || undefined }),
      });
      const data = (await res.json().catch(() => null)) as {
        user?: unknown;
        message?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        setResetActionError(data?.error || '批准失败，请稍后再试');
        return;
      }
      pushToast('success', `已批准 ${target.email} 的重置申请，密码已重置为 FZTBU_CS`);
      closeModal();
      fetchPasswordResets();
    } catch {
      setResetActionError('网络错误，请稍后再试');
    } finally {
      setResetActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (modal.type !== 'reject') return;
    const target = modal.request;
    setResetActionLoading(true);
    setResetActionError(null);
    try {
      const res = await fetch(`/api/admin/password-resets/${target.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: rejectNote || undefined }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setResetActionError(data?.error || '拒绝失败，请稍后再试');
        return;
      }
      pushToast('success', `已拒绝 ${target.email} 的重置申请`);
      closeModal();
      fetchPasswordResets();
    } catch {
      setResetActionError('网络错误，请稍后再试');
    } finally {
      setResetActionLoading(false);
    }
  };

  const switchUserSubView = (view: UserSubView) => {
    setUserSubView(view);
    if (view === 'resets') {
      fetchPasswordResets();
    }
  };

  /* ============= 渲染 ============= */

  return (
    <>
      {/* 子视图切换：用户列表 / 重置申请 */}
      <div className="flex items-center gap-6 mb-6 border-b border-[var(--border)] pb-4">
        <button
          type="button"
          onClick={() => switchUserSubView('list')}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            userSubView === 'list' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          [ 用户列表 / List ]
        </button>
        <button
          type="button"
          onClick={() => switchUserSubView('resets')}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            userSubView === 'resets' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          [ 重置申请 / Resets ]
        </button>
      </div>

      {/* 子视图 A：用户列表 */}
      {userSubView === 'list' && (
        <>
          {/* 工具栏 */}
          <RevealItem>
            <div className="border-t border-[var(--border)] border-b border-[var(--border)] py-5 sm:py-6 mb-0">
              <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
                <div className="col-span-12 md:col-span-5">
                  <label htmlFor="admin-search" className="meta-mono mb-2 block text-[var(--muted-foreground)]">
                    [ 搜索 / Search ]
                  </label>
                  <input
                    id="admin-search"
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[13px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors"
                    placeholder="搜索 email 或显示名..."
                  />
                </div>

                <div className="col-span-6 md:col-span-3">
                  <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 角色 / Role ]</div>
                  <div className="flex gap-1.5">
                    {(['all', 'admin', 'user'] as RoleFilter[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRoleFilter(r)}
                        className={`focus-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                          roleFilter === r
                            ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                        }`}
                      >
                        {r === 'all' ? '全部' : r === 'admin' ? '管理员' : '用户'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-6 md:col-span-3">
                  <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 状态 / Status ]</div>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { v: 'all', label: '全部' },
                        { v: 'active', label: '启用' },
                        { v: 'inactive', label: '禁用' },
                      ] as { v: ActiveFilter; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.v}
                        type="button"
                        onClick={() => setActiveFilter(s.v)}
                        className={`focus-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                          activeFilter === s.v
                            ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-12 md:col-span-1 flex md:justify-end">
                  <button
                    type="button"
                    onClick={() => fetchUsers()}
                    disabled={listLoading}
                    className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
                  >
                    {listLoading ? 'Loading' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>
          </RevealItem>

          {/* 列表区 */}
          <RevealItem>
            {listError && (
              <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--destructive)]">
                [ Error ] {listError}
                <button
                  type="button"
                  onClick={() => fetchUsers()}
                  className="focus-amber ml-3 underline hover:opacity-80"
                >
                  重试
                </button>
              </div>
            )}

            {listLoading && users.length === 0 && (
              <div className="py-20 flex items-center justify-center">
                <SectionLoading label="加载用户中 / Loading..." />
              </div>
            )}

            {!listLoading && !listError && users.length === 0 && (
              <div className="py-20 text-center">
                <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 暂无记录 / No Record ]</div>
                <p className="text-[14px] text-[var(--muted-foreground)]">没有符合条件的用户。</p>
              </div>
            )}

            {/* 桌面表格（md+） */}
            {!listError && users.length > 0 && (
              <div className="hidden md:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left meta-mono py-3 pr-4 w-[34%]">用户 / User</th>
                      <th className="text-left meta-mono py-3 pr-4">角色 / Role</th>
                      <th className="text-left meta-mono py-3 pr-4">状态 / Status</th>
                      <th className="text-left meta-mono py-3 pr-4">创建 / Created</th>
                      <th className="text-right meta-mono py-3 pl-4">操作 / Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const self = isSelf(u);
                      return (
                        <tr
                          key={u.id}
                          className="border-b border-[var(--border)] card-minimal align-middle"
                        >
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <Avatar
                                email={u.email}
                                displayName={u.displayName}
                                avatarUrl={u.avatarUrl}
                                avatarType={u.avatarType}
                                size={36}
                              />
                              <div className="min-w-0">
                                <div className="text-[14px] text-[var(--foreground)] truncate font-mono">
                                  {u.displayName || (
                                    <span className="text-[var(--muted-foreground)]">未命名</span>
                                  )}
                                </div>
                                <div className="meta-mono mt-0.5 truncate">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <span
                              className={`meta-mono ${
                                u.role === 'admin'
                                  ? 'text-[var(--primary)]'
                                  : 'text-[var(--muted-foreground)]'
                              }`}
                            >
                              {u.role === 'admin' ? '● Admin' : '○ User'}
                            </span>
                          </td>
                          <td className="py-4 pr-4">
                            <span
                              className={`meta-mono ${
                                u.isActive
                                  ? 'text-[var(--foreground)]'
                                  : 'text-[var(--destructive)]'
                              }`}
                            >
                              {u.isActive ? '● Active' : '● Disabled'}
                            </span>
                          </td>
                          <td className="py-4 pr-4 meta-mono">{formatDate(u.createdAt)}</td>
                          <td className="py-4 pl-4">
                            <div className="flex items-center justify-end gap-3">
                              {isRootTarget(u) ? (
                                <span className="meta-mono text-[var(--muted-foreground)]">
                                  — 不可操作 —
                                </span>
                              ) : isRootAdmin ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={self}
                                    onClick={() => openEdit(u)}
                                    className="focus-amber meta-mono text-[var(--foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
                                    title={self ? '不能编辑自己' : '编辑（仅超级管理员）'}
                                  >
                                    编辑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openReset(u)}
                                    className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow"
                                    title="自定义重置密码（仅超级管理员）"
                                  >
                                    重置密码
                                  </button>
                                  <button
                                    type="button"
                                    disabled={self}
                                    onClick={() => openDelete(u)}
                                    className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
                                    title={self ? '不能删除自己' : '硬删除（仅超级管理员）'}
                                  >
                                    删除
                                  </button>
                                  <button
                                    type="button"
                                    disabled={self}
                                    onClick={() => openDisable(u)}
                                    className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ${
                                      u.isActive
                                        ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]'
                                        : 'text-[var(--foreground)] hover:text-[var(--primary)]'
                                    }`}
                                    title={self ? '不能禁用自己' : u.isActive ? '禁用' : '启用'}
                                  >
                                    {u.isActive ? '禁用' : '启用'}
                                  </button>
                                </>
                              ) : isForbiddenForAdmin(u) ? (
                                <span className="meta-mono text-[var(--muted-foreground)]">
                                  — 不可操作 —
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openResetDefault(u)}
                                    className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow"
                                    title="重置为默认密码 FZTBU_CS"
                                  >
                                    重置密码
                                  </button>
                                  <button
                                    type="button"
                                    disabled={self}
                                    onClick={() => openDisable(u)}
                                    className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ${
                                      u.isActive
                                        ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]'
                                        : 'text-[var(--foreground)] hover:text-[var(--primary)]'
                                    }`}
                                    title={self ? '不能禁用自己' : u.isActive ? '禁用' : '启用'}
                                  >
                                    {u.isActive ? '禁用' : '启用'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 移动端卡片列表（< md） */}
            {!listError && users.length > 0 && (
              <div className="md:hidden divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {users.map((u) => {
                  const self = isSelf(u);
                  return (
                    <div key={u.id} className="p-4 card-minimal">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar
                          email={u.email}
                          displayName={u.displayName}
                          avatarUrl={u.avatarUrl}
                          avatarType={u.avatarType}
                          size={40}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] text-[var(--foreground)] truncate font-mono">
                            {u.displayName || (
                              <span className="text-[var(--muted-foreground)]">未命名</span>
                            )}
                          </div>
                          <div className="meta-mono mt-0.5 truncate">{u.email}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div>
                          <div className="meta-mono text-[var(--muted-foreground)]">角色 / Role</div>
                          <div
                            className={`meta-mono mt-1 ${
                              u.role === 'admin'
                                ? 'text-[var(--primary)]'
                                : 'text-[var(--foreground)]'
                            }`}
                          >
                            {roleLabel(u.role)}
                          </div>
                        </div>
                        <div>
                          <div className="meta-mono text-[var(--muted-foreground)]">状态 / Status</div>
                          <div
                            className={`meta-mono mt-1 ${
                              u.isActive ? 'text-[var(--foreground)]' : 'text-[var(--destructive)]'
                            }`}
                          >
                            {u.isActive ? '启用' : '禁用'}
                          </div>
                        </div>
                        <div>
                          <div className="meta-mono text-[var(--muted-foreground)]">创建 / Created</div>
                          <div className="meta-mono mt-1 text-[var(--foreground)]">
                            {formatDate(u.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        {isRootTarget(u) ? (
                          <span className="meta-mono text-[var(--muted-foreground)] ml-auto">
                            — 不可操作 —
                          </span>
                        ) : isRootAdmin ? (
                          <>
                            <button
                              type="button"
                              disabled={self}
                              onClick={() => openEdit(u)}
                              className="focus-amber meta-mono text-[var(--foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => openReset(u)}
                              className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow"
                            >
                              重置密码
                            </button>
                            <button
                              type="button"
                              disabled={self}
                              onClick={() => openDelete(u)}
                              className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline"
                            >
                              删除
                            </button>
                            <button
                              type="button"
                              disabled={self}
                              onClick={() => openDisable(u)}
                              className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ml-auto ${
                                u.isActive
                                  ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]'
                                  : 'text-[var(--foreground)] hover:text-[var(--primary)]'
                              }`}
                            >
                              {u.isActive ? '禁用' : '启用'}
                            </button>
                          </>
                        ) : isForbiddenForAdmin(u) ? (
                          <span className="meta-mono text-[var(--muted-foreground)] ml-auto">
                            — 不可操作 —
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openResetDefault(u)}
                              className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow"
                            >
                              重置密码
                            </button>
                            <button
                              type="button"
                              disabled={self}
                              onClick={() => openDisable(u)}
                              className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ml-auto ${
                                u.isActive
                                  ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]'
                                  : 'text-[var(--foreground)] hover:text-[var(--primary)]'
                              }`}
                            >
                              {u.isActive ? '禁用' : '启用'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 分页 */}
            {!listError && users.length > 0 && (
              <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-5">
                <div className="meta-mono text-[var(--muted-foreground)]">
                  共 {total} 条 · 第 {page} / {Math.max(1, totalPages)} 页
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={page <= 1 || listLoading}
                    onClick={() => fetchUsers({ page: page - 1 })}
                    className="focus-amber meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← 上一页
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages || listLoading}
                    onClick={() => fetchUsers({ page: page + 1 })}
                    className="focus-amber meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    下一页 →
                  </button>
                </div>
              </div>
            )}
          </RevealItem>
        </>
      )}

      {/* 子视图 B：密码重置申请 */}
      {userSubView === 'resets' && (
        <>
          {/* 工具栏：状态筛选 */}
          <RevealItem>
            <div className="border-t border-[var(--border)] border-b border-[var(--border)] py-5 sm:py-6 mb-0">
              <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
                <div className="col-span-12 md:col-span-8">
                  <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 状态筛选 / Status Filter ]</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { v: 'pending', label: '待处理' },
                        { v: 'approved', label: '已批准' },
                        { v: 'rejected', label: '已拒绝' },
                        { v: 'all', label: '全部' },
                      ] as { v: ResetStatusFilter; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.v}
                        type="button"
                        onClick={() => setResetStatusFilter(s.v)}
                        className={`focus-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                          resetStatusFilter === s.v
                            ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-12 md:col-span-4 flex md:justify-end">
                  <button
                    type="button"
                    onClick={() => fetchPasswordResets()}
                    disabled={resetListLoading}
                    className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
                  >
                    {resetListLoading ? 'Loading' : 'Refresh'}
                  </button>
                </div>
              </div>
            </div>
          </RevealItem>

          {/* 列表区 */}
          <RevealItem>
            {resetListError && (
              <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--destructive)]">
                [ Error ] {resetListError}
                <button
                  type="button"
                  onClick={() => fetchPasswordResets()}
                  className="focus-amber ml-3 underline hover:opacity-80"
                >
                  重试
                </button>
              </div>
            )}

            {resetListLoading && resetRequests.length === 0 && (
              <div className="py-20 flex items-center justify-center">
                <SectionLoading label="加载申请中 / Loading..." />
              </div>
            )}

            {!resetListLoading && !resetListError && resetRequests.length === 0 && (
              <div className="py-20 text-center">
                <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 暂无申请 / No Request ]</div>
                <p className="text-[14px] text-[var(--muted-foreground)]">没有符合条件的密码重置申请。</p>
              </div>
            )}

            {/* 桌面表格（md+） */}
            {!resetListError && resetRequests.length > 0 && (
              <div className="hidden md:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left meta-mono py-3 pr-4 w-[28%]">Email</th>
                      <th className="text-left meta-mono py-3 pr-4">Status</th>
                      <th className="text-left meta-mono py-3 pr-4">Created</th>
                      <th className="text-left meta-mono py-3 pr-4">Resolved</th>
                      <th className="text-left meta-mono py-3 pr-4">Note</th>
                      <th className="text-right meta-mono py-3 pl-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resetRequests.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-[var(--border)] card-minimal align-middle"
                      >
                        <td className="py-4 pr-4">
                          <div className="text-[14px] text-[var(--foreground)] truncate font-mono break-all">
                            {r.email}
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={`meta-mono ${
                              r.status === 'pending'
                                ? 'text-[var(--primary)]'
                                : r.status === 'approved'
                                  ? 'text-[var(--foreground)]'
                                  : 'text-[var(--destructive)]'
                            }`}
                          >
                            {r.status === 'pending'
                              ? '● Pending'
                              : r.status === 'approved'
                                ? '● Approved'
                                : '● Rejected'}
                          </span>
                        </td>
                        <td className="py-4 pr-4 meta-mono">{formatDate(r.created_at)}</td>
                        <td className="py-4 pr-4 meta-mono">
                          {r.resolved_at ? formatDate(r.resolved_at) : '—'}
                        </td>
                        <td className="py-4 pr-4">
                          <span className="meta-mono text-[var(--muted-foreground)] break-all">
                            {r.admin_note || '—'}
                          </span>
                        </td>
                        <td className="py-4 pl-4">
                          <div className="flex items-center justify-end gap-2">
                            {r.status === 'pending' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => openApprove(r)}
                                >
                                  批准并重置
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openReject(r)}
                                  className="hover:text-[var(--destructive)] hover:border-[var(--destructive)]/60"
                                >
                                  拒绝
                                </Button>
                              </>
                            ) : (
                              <span className="meta-mono text-[var(--muted-foreground)]">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 移动端卡片列表（< md） */}
            {!resetListError && resetRequests.length > 0 && (
              <div className="md:hidden divide-y divide-[var(--border)] border-t border-[var(--border)]">
                {resetRequests.map((r) => (
                  <div key={r.id} className="p-4 card-minimal">
                    <div className="text-[14px] text-[var(--foreground)] truncate font-mono break-all mb-3">
                      {r.email}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <div className="meta-mono text-[var(--muted-foreground)]">状态 / Status</div>
                        <div
                          className={`meta-mono mt-1 ${
                            r.status === 'pending'
                              ? 'text-[var(--primary)]'
                              : r.status === 'approved'
                                ? 'text-[var(--foreground)]'
                                : 'text-[var(--destructive)]'
                          }`}
                        >
                          {resetStatusLabel(r.status)}
                        </div>
                      </div>
                      <div>
                        <div className="meta-mono text-[var(--muted-foreground)]">创建 / Created</div>
                        <div className="meta-mono mt-1 text-[var(--foreground)]">
                          {formatDate(r.created_at)}
                        </div>
                      </div>
                      <div>
                        <div className="meta-mono text-[var(--muted-foreground)]">处理 / Resolved</div>
                        <div className="meta-mono mt-1 text-[var(--foreground)]">
                          {r.resolved_at ? formatDate(r.resolved_at) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="meta-mono text-[var(--muted-foreground)]">备注 / Note</div>
                        <div className="meta-mono mt-1 text-[var(--foreground)] break-all">
                          {r.admin_note || '—'}
                        </div>
                      </div>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => openApprove(r)}
                          className="flex-1"
                        >
                          批准并重置
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openReject(r)}
                          className="flex-1 hover:text-[var(--destructive)] hover:border-[var(--destructive)]/60"
                        >
                          拒绝
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </RevealItem>
        </>
      )}

      {/* ============ 模态框：编辑 ============ */}
      {modal.type === 'edit' && editForm && (
        <ModalShell title="[ 编辑用户 / Edit User ]" onClose={closeModal}>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">
              {modal.user.email}
            </div>

            <Field
              label="Display Name"
              count={`${editForm.displayName.length}/${LIMITS.DISPLAY_NAME_MAX}`}
            >
              <input
                type="text"
                value={editForm.displayName}
                maxLength={LIMITS.DISPLAY_NAME_MAX}
                onChange={(e) => setEditForm((f) => ({ ...f!, displayName: e.target.value }))}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                placeholder="如何称呼？"
              />
            </Field>

            <Field
              label="Bio"
              count={`${editForm.bio.length}/${LIMITS.BIO_MAX}`}
            >
              <textarea
                value={editForm.bio}
                maxLength={LIMITS.BIO_MAX}
                rows={3}
                onChange={(e) => setEditForm((f) => ({ ...f!, bio: e.target.value }))}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
                placeholder="一句话介绍"
              />
            </Field>

            <Field label="GitHub">
              <input
                type="url"
                value={editForm.githubUrl}
                maxLength={LIMITS.URL_MAX}
                onChange={(e) => setEditForm((f) => ({ ...f!, githubUrl: e.target.value }))}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                placeholder="https://github.com/your-name"
              />
            </Field>

            <Field label="网站 / Website">
              <input
                type="url"
                value={editForm.websiteUrl}
                maxLength={LIMITS.URL_MAX}
                onChange={(e) => setEditForm((f) => ({ ...f!, websiteUrl: e.target.value }))}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                placeholder="https://your-site.com"
              />
            </Field>

            <div>
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 角色 / Role ]</div>
              <div className="flex gap-1.5">
                {(['user', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f!, role: r }))}
                    className={`focus-amber px-4 py-2 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                      editForm.role === r
                        ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                    }`}
                  >
                    {roleLabel(r)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">[ 状态 / Status ]</div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f!, isActive: true }))}
                  className={`focus-amber px-4 py-2 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                    editForm.isActive
                      ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                  }`}
                >
                  启用
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f!, isActive: false }))}
                  className={`focus-amber px-4 py-2 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                    !editForm.isActive
                      ? 'border-[var(--destructive)] bg-[var(--destructive)]/[0.06] text-[var(--destructive)]'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--destructive)]/60 hover:text-[var(--foreground)]'
                  }`}
                >
                  禁用
                </button>
              </div>
            </div>

            {editError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {editError}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button
                type="submit"
                loading={editSaving}
              >
                {editSaving ? '保存中 / Saving...' : '保存更改 / Save Changes →'}
              </Button>
              <button
                type="button"
                onClick={closeModal}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                取消
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ============ 模态框：重置密码 ============ */}
      {modal.type === 'reset' && (
        <ModalShell title="[ 重置密码 / Reset Password ]" onClose={closeModal}>
          <form onSubmit={handleResetSubmit} className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">
              目标用户：{modal.user.email}
            </div>

            <Field label="新密码 / New Password" count={`≥ ${LIMITS.PASSWORD_MIN}`}>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                autoFocus
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                placeholder={`至少 ${LIMITS.PASSWORD_MIN} 位`}
              />
            </Field>

            <div className="p-3 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[11px] font-mono leading-relaxed text-[var(--muted-foreground)]">
              重置后该用户的所有登录会话将立即失效，需使用新密码重新登录。
            </div>

            {resetError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {resetError}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button
                type="submit"
                loading={resetSaving}
              >
                {resetSaving ? 'Resetting...' : 'Reset Password →'}
              </Button>
              <button
                type="button"
                onClick={closeModal}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                取消
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ============ 模态框：默认密码重置确认 ============ */}
      {modal.type === 'resetDefault' && (
        <ModalShell title="[ 重置为默认密码 / Reset to Default ]" onClose={closeModal}>
          <div className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">
              目标用户：{modal.user.email}
            </div>
            <p className="text-[14px] text-[var(--foreground)] leading-relaxed">
              确认将该用户密码重置为默认密码？
            </p>
            <div className="p-3 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[11px] font-mono leading-relaxed text-[var(--muted-foreground)]">
              重置后密码将变为 <span className="font-bold text-[var(--primary)]">FZTBU_CS</span>，
              该用户的所有登录会话将立即失效，需使用默认密码重新登录。
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Button
                type="button"
                onClick={handleResetDefaultSubmit}
              >
                确认重置 / Confirm →
              </Button>
              <button
                type="button"
                onClick={closeModal}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                取消
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ============ 模态框：删除确认 ============ */}
      {modal.type === 'delete' && (
        <ConfirmDialog
          open={true}
          title="删除用户"
          message="确认删除该用户？此操作不可撤销。"
          variant="danger"
          confirmLabel={deleteSaving ? '删除中...' : '确认删除'}
          loading={deleteSaving}
          onConfirm={handleDelete}
          onCancel={closeModal}
        >
          <div className="p-3 border border-[var(--border)] bg-[var(--muted)]/[0.3]">
            <div className="text-[13px] font-mono text-[var(--foreground)] break-all">
              {modal.user.displayName || '未命名'}
            </div>
            <div className="meta-mono mt-1 break-all">{modal.user.email}</div>
          </div>
          {deleteError && (
            <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
              {deleteError}
            </div>
          )}
        </ConfirmDialog>
      )}

      {/* ============ 模态框：禁用确认 ============ */}
      {modal.type === 'disable' && (
        <ConfirmDialog
          open={true}
          title={modal.user.isActive ? '禁用用户' : '启用用户'}
          message={modal.user.isActive ? '确认禁用该用户？' : '确认启用该用户？'}
          variant={modal.user.isActive ? 'danger' : 'info'}
          confirmLabel={modal.user.isActive ? '确认禁用' : '确认启用'}
          onConfirm={handleToggleActive}
          onCancel={closeModal}
        >
          <div className="p-3 border border-[var(--border)] bg-[var(--muted)]/[0.3]">
            <div className="text-[13px] font-mono text-[var(--foreground)] break-all">
              {modal.user.displayName || '未命名'}
            </div>
            <div className="meta-mono mt-1 break-all">{modal.user.email}</div>
          </div>
          {modal.user.isActive && (
            <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--destructive)]">
              <div className="mb-2 font-semibold">禁用后果 / Consequences：</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>该用户将无法登录系统</li>
                <li>该用户将无法创建新帖或发表回复</li>
                <li>该用户已发布的内容仍保留，不会删除</li>
                <li>该用户的活动报名将保持有效</li>
              </ul>
            </div>
          )}
          {!modal.user.isActive && (
            <div className="p-4 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--primary)]">
              <div className="mb-2 font-semibold">启用说明 / Notes：</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>该用户将恢复登录权限</li>
                <li>该用户将恢复发帖和回复权限</li>
                <li>已发布的内容不会受影响</li>
              </ul>
            </div>
          )}
        </ConfirmDialog>
      )}

      {/* ============ 模态框：批准确认 ============ */}
      {modal.type === 'approve' && (
        <ModalShell title="[ 批准并重置 / Approve & Reset ]" onClose={closeModal}>
          <div className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">
              目标申请：{modal.request.email}
            </div>

            <div className="p-4 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--primary)]">
              批准后该用户密码将重置为 <span className="font-bold">FZTBU_CS</span>，用户可使用新密码登录。
            </div>

            <Field label="管理员备注（可选）/ Admin Note">
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                rows={3}
                maxLength={200}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
                placeholder="管理员备注（可选）"
              />
            </Field>

            {resetActionError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {resetActionError}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button
                type="button"
                loading={resetActionLoading}
                onClick={handleApprove}
              >
                {resetActionLoading ? 'Processing...' : 'Confirm Approve →'}
              </Button>
              <button
                type="button"
                onClick={closeModal}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                取消
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ============ 模态框：拒绝备注 ============ */}
      {modal.type === 'reject' && (
        <ModalShell title="[ 拒绝申请 / Reject Request ]" onClose={closeModal}>
          <div className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">
              目标申请：{modal.request.email}
            </div>

            <Field label="拒绝备注（可选）/ Reject Note">
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                maxLength={200}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
                placeholder="拒绝备注（可选）"
                autoFocus
              />
            </Field>

            {resetActionError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {resetActionError}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button
                type="button"
                loading={resetActionLoading}
                variant="danger"
                onClick={handleReject}
              >
                {resetActionLoading ? 'Processing...' : 'Confirm Reject →'}
              </Button>
              <button
                type="button"
                onClick={closeModal}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                取消
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
