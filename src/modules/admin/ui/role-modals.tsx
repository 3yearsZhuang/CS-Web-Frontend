/**
 * @file 角色管理模态框集合（创建/编辑/删除）— 从 admin-roles-panel 拆出（GENERAL 2.4）
 */
'use client';

import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { ConfirmDialog } from '@/components/primitives/confirm-dialog';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { CreateRoleForm } from './create-role-form';
import type { PermissionModule, RoleModal } from './roles-types';

interface RoleModalsProps {
  modal: RoleModal;
  modules: PermissionModule[];
  createForm: { key: string; displayName: string; description: string };
  setCreateForm: React.Dispatch<React.SetStateAction<{ key: string; displayName: string; description: string }>>;
  createPermissions: Set<string>;
  setCreatePermissions: React.Dispatch<React.SetStateAction<Set<string>>>;
  createSaving: boolean;
  createError: string | null;
  editForm: { displayName: string; description: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ displayName: string; description: string }>>;
  editSaving: boolean;
  editError: string | null;
  onCreate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/** 角色创建/编辑/删除模态框 */
export function RoleModals({
  modal,
  modules,
  createForm,
  setCreateForm,
  createPermissions,
  setCreatePermissions,
  createSaving,
  createError,
  editForm,
  setEditForm,
  editSaving,
  editError,
  onCreate,
  onEdit,
  onDelete,
  onClose,
}: RoleModalsProps) {
  return (
    <>
      {modal.type === 'create' && (
        <ModalShell title="创建自定义角色" onClose={onClose}>
          <CreateRoleForm
            form={createForm}
            setForm={setCreateForm}
            modules={modules}
            selected={createPermissions}
            setSelected={setCreatePermissions}
            saving={createSaving}
            error={createError}
            onSubmit={onCreate}
            onCancel={onClose}
          />
        </ModalShell>
      )}

      {modal.type === 'edit' && (
        <ModalShell title={`编辑角色 / ${modal.role.key}`} onClose={onClose}>
          <div className="space-y-4">
            <Field label="角色名称" count={`${editForm.displayName.length}/32`}>
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                maxLength={32}
                className={`${INPUT_CLASS} px-3 py-2 text-[14px]`}
              />
            </Field>
            <Field label="角色描述" count={`${editForm.description.length}/200`}>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                maxLength={200}
                rows={3}
                className={`${INPUT_CLASS} px-3 py-2 text-[13px] resize-y`}
              />
            </Field>
            {editError && <p className="text-[12px] text-[var(--destructive)] meta-mono">{editError}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="meta-mono text-[12px] px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={onEdit}
                disabled={editSaving}
                className="meta-mono text-[12px] px-4 py-2 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--background)] transition-colors disabled:opacity-50"
              >
                {editSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {modal.type === 'delete' && (
        <ConfirmDialog
          open={true}
          title="删除角色"
          message={`即将删除角色 ${modal.role.displayName} (${modal.role.key})。此操作不可恢复。`}
          variant="danger"
          confirmLabel={editSaving ? '删除中...' : '确认删除'}
          loading={editSaving}
          onConfirm={onDelete}
          onCancel={onClose}
        >
          {modal.role.userCount !== undefined && modal.role.userCount > 0 && (
            <p className="text-[12px] text-[var(--destructive)] meta-mono">
              警告：该角色仍被 {modal.role.userCount} 个用户使用，无法删除。
            </p>
          )}
          {editError && <p className="text-[12px] text-[var(--destructive)] meta-mono">{editError}</p>}
        </ConfirmDialog>
      )}
    </>
  );
}
