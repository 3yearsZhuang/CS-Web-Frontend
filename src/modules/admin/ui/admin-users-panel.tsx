/**
 * @file 管理员用户管理面板 — 用户列表 + 密码重置申请（自包含，仅依赖父级 currentUser 与 onForbidden）
 *
 * 逻辑已抽离至 `useAdminUsers` Hook，列表/申请子视图与模态框已抽为独立组件
 * （GENERAL 2.2 展示/容器分离、2.4 按关注点拆分），本文件仅负责渲染编排。
 */
'use client';

import type { SafeUser } from '@/modules/admin/ui/types';
import { UserModals } from './user-modals';
import { UserListView } from './user-list-view';
import { UserResetsView } from './user-resets-view';
import { useAdminUsers } from './hooks/use-admin-users';

/* ============= 面板组件 ============= */

interface AdminUsersPanelProps {
  currentUser: SafeUser;
  onForbidden: () => void;
}

/** 管理员用户管理面板 — 用户列表（搜索/分页/筛选）+ 密码重置申请审核 */
export function AdminUsersPanel({ currentUser, onForbidden }: AdminUsersPanelProps) {
  const {
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
  } = useAdminUsers(currentUser, onForbidden);

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
        <UserListView
          users={users}
          total={total}
          page={page}
          totalPages={totalPages}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          listLoading={listLoading}
          listError={listError}
          isSelf={isSelf}
          isRootTarget={isRootTarget}
          isRootAdmin={isRootAdmin}
          isForbiddenForAdmin={isForbiddenForAdmin}
          onFetch={fetchUsers}
          onEdit={openEdit}
          onReset={openReset}
          onResetDefault={openResetDefault}
          onDelete={openDelete}
          onDisable={openDisable}
        />
      )}

      {/* 子视图 B：密码重置申请 */}
      {userSubView === 'resets' && (
        <UserResetsView
          requests={resetRequests}
          filter={resetStatusFilter}
          setFilter={setResetStatusFilter}
          loading={resetListLoading}
          error={resetListError}
          onFetch={fetchPasswordResets}
          onApprove={openApprove}
          onReject={openReject}
        />
      )}

      {/* ============ 模态框 ============ */}
      <UserModals
        modal={modal}
        editForm={editForm}
        setEditForm={setEditForm}
        editSaving={editSaving}
        editError={editError}
        resetPassword={resetPassword}
        setResetPassword={setResetPassword}
        resetSaving={resetSaving}
        resetError={resetError}
        deleteSaving={deleteSaving}
        deleteError={deleteError}
        resetActionLoading={resetActionLoading}
        resetActionError={resetActionError}
        approveNote={approveNote}
        setApproveNote={setApproveNote}
        rejectNote={rejectNote}
        setRejectNote={setRejectNote}
        onEditSubmit={handleEditSubmit}
        onResetSubmit={handleResetSubmit}
        onResetDefault={handleResetDefaultSubmit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
        onApprove={handleApprove}
        onReject={handleReject}
        onClose={closeModal}
      />
    </>
  );
}
