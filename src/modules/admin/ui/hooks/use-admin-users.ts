'use client';

/**
 * @file useAdminUsers — 管理员用户管理逻辑 Hook（组合层）
 *
 * 已按关注点拆分为三个 Hook（GENERAL 2.4）：
 * - useUserList：用户列表 / 搜索 / 筛选 / 分页
 * - useUserResets：密码重置申请列表
 * - 本文件保留：模态框状态与操作 handlers、权限判断、子视图切换
 * 组件只保留渲染（GENERAL 2.2 展示/容器分离）。
 */

import { useState, useCallback, useEffect } from 'react';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { useToast } from '@/components/feedback/toast';
import {
  LIMITS,
  type SafeUser,
  type PasswordResetRequest,
} from '@/modules/admin/ui/types';
import { isValidHttpUrl as isValidUrl } from '@/modules/users/types';
import { passwordSchema } from '@/shared/security/schemas/auth-schemas';
import { useUserList } from './use-user-list';
import { useUserResets } from './use-user-resets';
import type {
  EditForm,
  UserModal,
  UserSubView,
} from '../users-panel-utils';

export function useAdminUsers(currentUser: SafeUser, onForbidden: () => void) {
  // 列表数据（用户列表 / 搜索 / 筛选 / 分页）
  const {
    users,
    total,
    page,
    totalPages,
    setUsers,
    setTotal,
    searchInput,
    setSearchInput,
    roleFilter,
    setRoleFilter,
    activeFilter,
    setActiveFilter,
    listLoading,
    listError,
    fetchUsers,
  } = useUserList(currentUser, onForbidden);

  // 密码重置申请
  const {
    resetRequests,
    resetStatusFilter,
    setResetStatusFilter,
    resetListLoading,
    resetListError,
    fetchPasswordResets,
  } = useUserResets(onForbidden);

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

  // 重置申请行内状态
  const [resetActionLoading, setResetActionLoading] = useState(false);
  const [resetActionError, setResetActionError] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  /* ============= 副作用 ============= */

  useEffect(() => {
    if (userSubView !== 'resets') return;
    fetchPasswordResets();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPasswordResets 已 useCallback 稳定化
  }, [resetStatusFilter]);

  /* ============= 权限判断 ============= */

  const isSelf = useCallback((u: SafeUser) => u.id === currentUser.id, [currentUser]);
  const isRootTarget = useCallback((u: SafeUser) => u.role === 'root', []);
  const isRootAdmin = currentUser.role === 'root';
  const isAdminTarget = useCallback((u: SafeUser) => u.role === 'admin', []);
  const isForbiddenForAdmin = useCallback(
    (u: SafeUser) => isRootTarget(u) || isAdminTarget(u),
    [isRootTarget, isAdminTarget],
  );

  /* ============= 行内操作（打开模态框） ============= */

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

  /* ============= 模态框操作 ============= */

  const handleToggleActive = async () => {
    if (modal.type !== 'disable') return;
    const u = modal.user;
    const endpoint = u.isActive ? 'disable' : 'enable';
    try {
      const r = await apiRequest<{ user?: SafeUser }>(`/api/admin/users/${u.id}/${endpoint}`, {
        method: 'POST',
      });
      if (!r.ok || !r.data?.user) {
        pushToast('error', r.error ?? '操作失败，请稍后再试');
        return;
      }
      const updated = r.data.user;
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      pushToast('success', `已${u.isActive ? '禁用' : '启用'} ${u.email}`);
      closeModal();
    } catch {
      pushToast('error', '网络错误，请稍后再试');
    }
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
      const r = await apiRequest<{ user?: SafeUser }>(`/api/admin/users/${target.id}`, {
        method: 'PUT',
        body: {
          displayName: editForm.displayName || null,
          bio: editForm.bio || null,
          githubUrl: editForm.githubUrl || null,
          websiteUrl: editForm.websiteUrl || null,
          role: editForm.role,
          isActive: editForm.isActive,
        },
      });
      if (!r.ok || !r.data?.user) {
        setEditError(r.error ?? '保存失败，请稍后再试');
        return;
      }
      const updated = r.data.user;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      pushToast('success', `已更新 ${updated.email}`);
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

    const passwordValidation = passwordSchema.safeParse(resetPassword);
    if (!passwordValidation.success) {
      setResetError(passwordValidation.error.issues[0]?.message || '密码不符合安全要求');
      return;
    }

    setResetSaving(true);
    setResetError(null);
    try {
      const r = await apiRequest<{ ok?: boolean }>(`/api/admin/users/${target.id}/reset-password`, {
        method: 'POST',
        body: { password: resetPassword },
      });
      if (!r.ok || !r.data?.ok) {
        setResetError(r.error ?? '重置失败，请稍后再试');
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
      const r = await apiRequest<{ ok?: boolean }>(`/api/admin/users/${target.id}/reset-password-default`, {
        method: 'POST',
      });
      if (!r.ok || !r.data?.ok) {
        pushToast('error', r.error ?? '重置失败，请稍后再试');
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
      const r = await apiRequest<{ ok?: boolean }>(`/api/admin/users/${target.id}`, {
        method: 'DELETE',
      });
      if (!r.ok || !r.data?.ok) {
        setDeleteError(r.error ?? '删除失败，请稍后再试');
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
      const r = await apiRequest(`/api/admin/password-resets/${target.id}/approve`, {
        method: 'POST',
        body: { note: approveNote || undefined },
      });
      if (!r.ok) {
        setResetActionError(r.error ?? '批准失败，请稍后再试');
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
      const r = await apiRequest<{ ok?: boolean }>(`/api/admin/password-resets/${target.id}/reject`, {
        method: 'POST',
        body: { note: rejectNote || undefined },
      });
      if (!r.ok || !r.data?.ok) {
        setResetActionError(r.error ?? '拒绝失败，请稍后再试');
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

  return {
    // 列表
    users,
    total,
    page,
    totalPages,
    searchInput,
    setSearchInput,
    roleFilter,
    setRoleFilter,
    activeFilter,
    setActiveFilter,
    listLoading,
    listError,
    fetchUsers,
    // 权限
    isSelf,
    isRootTarget,
    isRootAdmin,
    isForbiddenForAdmin,
    // 子视图
    userSubView,
    switchUserSubView,
    // 重置申请
    resetRequests,
    resetStatusFilter,
    setResetStatusFilter,
    resetListLoading,
    resetListError,
    fetchPasswordResets,
    // 模态框
    modal,
    editForm,
    setEditForm,
    editSaving,
    editError,
    resetPassword,
    setResetPassword,
    resetSaving,
    resetError,
    deleteSaving,
    deleteError,
    resetActionLoading,
    resetActionError,
    approveNote,
    setApproveNote,
    rejectNote,
    setRejectNote,
    // 操作
    openEdit,
    openReset,
    openResetDefault,
    openDelete,
    openDisable,
    handleToggleActive,
    closeModal,
    handleEditSubmit,
    handleResetSubmit,
    handleResetDefaultSubmit,
    handleDelete,
    openApprove,
    openReject,
    handleApprove,
    handleReject,
  };
}
