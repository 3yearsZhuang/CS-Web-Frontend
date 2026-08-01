/**
 * @file 管理员角色权限管理面板 — 角色列表 + 权限矩阵（仅 root 可访问）
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RevealItem } from '@/components/effects/motion-primitives';
import { useToast } from '@/components/feedback/toast';
import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { ConfirmDialog } from '@/components/primitives/confirm-dialog';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';

/* ============= 类型定义 ============= */

interface RoleRecord {
  key: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  isProtected: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  userCount?: number;
}

interface PermissionPoint {
  key: string;
  label: string;
  description: string;
  rootOnly?: boolean;
}

interface PermissionModule {
  key: string;
  label: string;
  permissions: PermissionPoint[];
}

type RoleModal =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; role: RoleRecord }
  | { type: 'delete'; role: RoleRecord };

/* ============= 工具函数 ============= */

function roleBadgeClass(role: RoleRecord): string {
  if (role.key === 'root') return 'bg-[var(--primary)]/15 text-[var(--primary)]';
  if (role.isProtected) return 'bg-[var(--muted)]/30 text-[var(--muted-foreground)]';
  if (role.isSystem) return 'bg-[var(--accent)]/15 text-[var(--accent-foreground)]';
  return 'bg-transparent text-[var(--foreground)] border border-[var(--border)]';
}

function roleBadgeLabel(role: RoleRecord): string {
  if (role.key === 'root') return 'ROOT';
  if (role.isProtected) return 'PROTECTED';
  if (role.isSystem) return 'SYSTEM';
  return 'CUSTOM';
}

/* ============= 面板组件 ============= */

interface AdminRolesPanelProps {
  onForbidden: () => void;
}

/** 管理员角色权限管理面板（仅 root）— 左侧角色列表 / 右侧权限矩阵 */
export function AdminRolesPanel({ onForbidden }: AdminRolesPanelProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  // 数据
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [modules, setModules] = useState<PermissionModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 当前选中的角色 key（权限矩阵展示哪个角色的权限）
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  // 本地编辑中的权限集合（未保存）
  const [draftPermissions, setDraftPermissions] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // 模态框
  const [modal, setModal] = useState<RoleModal>({ type: 'none' });
  const [createForm, setCreateForm] = useState({
    key: '',
    displayName: '',
    description: '',
  });
  const [createPermissions, setCreatePermissions] = useState<Set<string>>(new Set());
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({ displayName: '', description: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  /* ============= 数据加载 ============= */

  const loadRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/roles', { cache: 'no-store' });
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (res.status === 403) {
        onForbidden();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '加载失败');
      }
      const data = (await res.json()) as { roles: RoleRecord[] };
      setRoles(data.roles);
      // 默认选中第一个非 root/user 的角色
      if (!selectedRoleKey && data.roles.length > 0) {
        const first = data.roles.find((r) => !r.isProtected) ?? data.roles[0];
        setSelectedRoleKey(first.key);
        setDraftPermissions(new Set(first.permissions));
        setDirty(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [onForbidden, router, selectedRoleKey]);

  const loadPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/permissions', { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as { modules: PermissionModule[] };
        setModules(data.modules);
      }
    } catch {
      /* 权限点定义加载失败不阻塞主流程 */
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, [loadRoles, loadPermissions]);

  /* ============= 权限矩阵操作 ============= */

  // 选中角色变化时，重置 draft
  useEffect(() => {
    if (!selectedRoleKey) return;
    const role = roles.find((r) => r.key === selectedRoleKey);
    if (role) {
      setDraftPermissions(new Set(role.permissions));
      setDirty(false);
    }
  }, [selectedRoleKey, roles]);

  const selectedRole = useMemo(
    () => roles.find((r) => r.key === selectedRoleKey) ?? null,
    [roles, selectedRoleKey],
  );

  const togglePermission = (permKey: string) => {
    if (!selectedRole || selectedRole.isProtected) return;
    setDraftPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permKey)) next.delete(permKey);
      else next.add(permKey);
      return next;
    });
    setDirty(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || !dirty) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/roles/${encodeURIComponent(selectedRole.key)}/permissions`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permissions: Array.from(draftPermissions) }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '保存失败');
      }
      const data = (await res.json()) as { role: RoleRecord };
      setRoles((prev) =>
        prev.map((r) => (r.key === data.role.key ? data.role : r)),
      );
      setDirty(false);
      pushToast('success', '权限已更新');
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDraft = () => {
    if (!selectedRole) return;
    setDraftPermissions(new Set(selectedRole.permissions));
    setDirty(false);
  };

  /* ============= 角色创建 ============= */

  const openCreateModal = () => {
    setCreateForm({ key: '', displayName: '', description: '' });
    setCreatePermissions(new Set());
    setCreateError(null);
    setModal({ type: 'create' });
  };

  const handleCreate = async () => {
    setCreateError(null);
    if (!createForm.key.trim() || !createForm.displayName.trim()) {
      setCreateError('角色 key 与名称必填');
      return;
    }
    setCreateSaving(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: createForm.key.trim().toLowerCase(),
          displayName: createForm.displayName.trim(),
          description: createForm.description.trim(),
          permissions: Array.from(createPermissions),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '创建失败');
      }
      const data = (await res.json()) as { role: RoleRecord };
      setRoles((prev) => [...prev, data.role]);
      setSelectedRoleKey(data.role.key);
      setModal({ type: 'none' });
      pushToast('success', `角色 ${data.role.displayName} 已创建`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '创建失败');
    } finally {
      setCreateSaving(false);
    }
  };

  /* ============= 角色编辑 ============= */

  const openEditModal = (role: RoleRecord) => {
    setEditForm({ displayName: role.displayName, description: role.description });
    setEditError(null);
    setModal({ type: 'edit', role });
  };

  const handleEdit = async () => {
    if (modal.type !== 'edit') return;
    setEditError(null);
    setEditSaving(true);
    try {
      const res = await fetch(
        `/api/admin/roles/${encodeURIComponent(modal.role.key)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            displayName: editForm.displayName.trim(),
            description: editForm.description.trim(),
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '更新失败');
      }
      const data = (await res.json()) as { role: RoleRecord };
      setRoles((prev) =>
        prev.map((r) => (r.key === data.role.key ? data.role : r)),
      );
      setModal({ type: 'none' });
      pushToast('success', '角色已更新');
    } catch (e) {
      setEditError(e instanceof Error ? e.message : '更新失败');
    } finally {
      setEditSaving(false);
    }
  };

  /* ============= 角色删除 ============= */

  const handleDelete = async () => {
    if (modal.type !== 'delete') return;
    setEditSaving(true);
    try {
      const res = await fetch(
        `/api/admin/roles/${encodeURIComponent(modal.role.key)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || '删除失败');
      }
      setRoles((prev) => prev.filter((r) => r.key !== modal.role.key));
      if (selectedRoleKey === modal.role.key) {
        setSelectedRoleKey(null);
      }
      setModal({ type: 'none' });
      pushToast('success', '角色已删除');
    } catch (e) {
      setEditError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setEditSaving(false);
    }
  };

  /* ============= 渲染：加载态 ============= */

  if (loading) {
    return (
      <RevealItem>
        <div className="flex items-center gap-3 py-12">
          <span className="w-3 h-3 border border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="meta-mono text-[12px] text-[var(--muted-foreground)]">
            加载角色数据 / Loading roles...
          </span>
        </div>
      </RevealItem>
    );
  }

  if (error) {
    return (
      <RevealItem>
        <div className="py-12 text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">
            [ 加载失败 / Load Error ]
          </div>
          <p className="text-[13px] text-[var(--muted-foreground)] mb-6">{error}</p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setLoading(true);
              loadRoles();
            }}
            className="meta-mono text-[12px] text-[var(--primary)] underline-grow"
          >
            重试 / Retry
          </button>
        </div>
      </RevealItem>
    );
  }

  /* ============= 渲染：主面板 ============= */

  return (
    <RevealItem>
      <div className="space-y-8">
        {/* 顶部说明与操作 */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="meta-mono text-[12px] text-[var(--muted-foreground)] mb-2">
              [ 00 / Roles & Permissions ]
            </div>
            <p className="text-[13px] text-[var(--muted-foreground)] max-w-2xl">
              管理系统所有角色的权限组合。内置角色（root/admin/user 等）的权限规则不可修改，
              但可创建自定义角色并精确分配权限点，为后续扩展提供基础。
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="meta-mono text-[12px] px-4 py-2 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--background)] transition-colors focus-amber"
          >
            + 创建角色 / New Role
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* 左侧：角色列表 */}
          <aside className="space-y-2">
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-3">
              角色列表 ({roles.length})
            </div>
            {roles.map((role) => {
              const isActive = role.key === selectedRoleKey;
              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => setSelectedRoleKey(role.key)}
                  className={`w-full text-left px-4 py-3 border transition-colors focus-amber ${
                    isActive
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-[var(--border)] hover:border-[var(--primary)]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[14px] text-[var(--foreground)] truncate">
                      {role.displayName}
                    </span>
                    <span
                      className={`meta-mono text-[10px] px-1.5 py-0.5 ${roleBadgeClass(role)}`}
                    >
                      {roleBadgeLabel(role)}
                    </span>
                  </div>
                  <div className="meta-mono text-[11px] text-[var(--muted-foreground)] flex items-center gap-3">
                    <span>{role.key}</span>
                    <span>·</span>
                    <span>{role.permissions.length} 项权限</span>
                    {role.userCount !== undefined && role.userCount > 0 && (
                      <>
                        <span>·</span>
                        <span>{role.userCount} 用户</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </aside>

          {/* 右侧：权限矩阵 */}
          <div>
            {selectedRole ? (
              <RolePermissionMatrix
                role={selectedRole}
                modules={modules}
                draftPermissions={draftPermissions}
                dirty={dirty}
                saving={saving}
                onToggle={togglePermission}
                onSave={handleSavePermissions}
                onReset={handleResetDraft}
                onEdit={() => openEditModal(selectedRole)}
                onDelete={() => setModal({ type: 'delete', role: selectedRole })}
              />
            ) : (
              <div className="border border-dashed border-[var(--border)] py-16 text-center">
                <p className="meta-mono text-[12px] text-[var(--muted-foreground)]">
                  选择左侧角色查看权限配置 / Select a role
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 模态框 */}
        {modal.type === 'create' && (
          <ModalShell title="创建自定义角色" onClose={() => setModal({ type: 'none' })}>
            <CreateRoleForm
              form={createForm}
              setForm={setCreateForm}
              modules={modules}
              selected={createPermissions}
              setSelected={setCreatePermissions}
              saving={createSaving}
              error={createError}
              onSubmit={handleCreate}
              onCancel={() => setModal({ type: 'none' })}
            />
          </ModalShell>
        )}

        {modal.type === 'edit' && (
          <ModalShell
            title={`编辑角色 / ${modal.role.key}`}
            onClose={() => setModal({ type: 'none' })}
          >
            <div className="space-y-4">
              <Field label="角色名称" count={`${editForm.displayName.length}/32`}>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, displayName: e.target.value }))
                  }
                  maxLength={32}
                  className={`${INPUT_CLASS} px-3 py-2 text-[14px]`}
                />
              </Field>
              <Field
                label="角色描述"
                count={`${editForm.description.length}/200`}
              >
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, description: e.target.value }))
                  }
                  maxLength={200}
                  rows={3}
                  className={`${INPUT_CLASS} px-3 py-2 text-[13px] resize-y`}
                />
              </Field>
              {editError && (
                <p className="text-[12px] text-[var(--destructive)] meta-mono">
                  {editError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal({ type: 'none' })}
                  className="meta-mono text-[12px] px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleEdit}
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
            onConfirm={handleDelete}
            onCancel={() => setModal({ type: 'none' })}
          >
            {modal.role.userCount !== undefined && modal.role.userCount > 0 && (
              <p className="text-[12px] text-[var(--destructive)] meta-mono">
                警告：该角色仍被 {modal.role.userCount} 个用户使用，无法删除。
              </p>
            )}
            {editError && (
              <p className="text-[12px] text-[var(--destructive)] meta-mono">
                {editError}
              </p>
            )}
          </ConfirmDialog>
        )}
      </div>
    </RevealItem>
  );
}

/* ============= 权限矩阵子组件 ============= */

interface RolePermissionMatrixProps {
  role: RoleRecord;
  modules: PermissionModule[];
  draftPermissions: Set<string>;
  dirty: boolean;
  saving: boolean;
  onToggle: (permKey: string) => void;
  onSave: () => void;
  onReset: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function RolePermissionMatrix({
  role,
  modules,
  draftPermissions,
  dirty,
  saving,
  onToggle,
  onSave,
  onReset,
  onEdit,
  onDelete,
}: RolePermissionMatrixProps) {
  const isReadOnly = role.isProtected;
  // root 角色展示全部权限（含 root_only），但不可编辑
  const isRootRole = role.key === 'root';
  // user 角色无任何权限
  const isUserRole = role.key === 'user';

  // 对于 root 角色：展示所有权限为"已授予"状态
  // 对于 user 角色：展示所有权限为"未授予"状态
  const effectiveDraft = useMemo(() => {
    if (isRootRole) {
      const all = new Set<string>();
      modules.forEach((m) => m.permissions.forEach((p) => all.add(p.key)));
      return all;
    }
    if (isUserRole) return new Set<string>();
    return draftPermissions;
  }, [isRootRole, isUserRole, modules, draftPermissions]);

  return (
    <div className="space-y-4">
      {/* 角色头部信息 */}
      <div className="border border-[var(--border)] p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-[18px] text-[var(--foreground)]">
                {role.displayName}
              </h3>
              <span
                className={`meta-mono text-[10px] px-1.5 py-0.5 ${roleBadgeClass(role)}`}
              >
                {roleBadgeLabel(role)}
              </span>
            </div>
            <p className="text-[12px] text-[var(--muted-foreground)] mb-2">
              {role.description || '（无描述）'}
            </p>
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)] flex flex-wrap items-center gap-3">
              <span>key: {role.key}</span>
              <span>·</span>
              <span>{role.permissions.length} 项权限</span>
              {role.userCount !== undefined && (
                <>
                  <span>·</span>
                  <span>{role.userCount} 个用户使用</span>
                </>
              )}
            </div>
          </div>
          {!role.isSystem && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="meta-mono text-[11px] px-3 py-1.5 border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] transition-colors focus-amber"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="meta-mono text-[11px] px-3 py-1.5 border border-[var(--border)] text-[var(--destructive)] hover:border-[var(--destructive)] transition-colors focus-amber"
              >
                删除
              </button>
            </div>
          )}
        </div>

        {/* 操作栏 */}
        {!isReadOnly && (
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)]">
              {dirty ? (
                <span className="text-[var(--primary)]">
                  ● 有未保存的修改
                </span>
              ) : (
                <span>权限已同步</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onReset}
                disabled={!dirty || saving}
                className="meta-mono text-[11px] px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-40"
              >
                撤销
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!dirty || saving}
                className="meta-mono text-[11px] px-3 py-1.5 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--background)] transition-colors disabled:opacity-40"
              >
                {saving ? '保存中...' : '保存修改'}
              </button>
            </div>
          </div>
        )}
        {isReadOnly && (
          <div className="meta-mono text-[11px] text-[var(--muted-foreground)] pt-3 border-t border-[var(--border)]">
            {isRootRole
              ? '● 超级管理员拥有所有权限（含 root 专属），不可修改'
              : '● 普通用户无管理权限，不可修改'}
          </div>
        )}
      </div>

      {/* 权限矩阵 */}
      {isUserRole ? (
        <div className="border border-dashed border-[var(--border)] py-12 text-center">
          <p className="meta-mono text-[12px] text-[var(--muted-foreground)]">
            普通用户角色无任何管理权限
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((module) => {
            // 只展示有权限点的模块
            if (module.permissions.length === 0) return null;
            return (
              <div
                key={module.key}
                className="border border-[var(--border)]"
              >
                <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--muted)]/20">
                  <div className="meta-mono text-[12px] text-[var(--foreground)]">
                    [ {module.label} ]
                  </div>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {module.permissions.map((perm) => {
                    const granted = effectiveDraft.has(perm.key);
                    const isLocked = isReadOnly || perm.rootOnly === true;
                    // root_only 权限仅 root 角色可拥有，其他角色强制关闭
                    const enforcedOff = !isRootRole && perm.rootOnly === true;
                    const checked = enforcedOff ? false : granted;
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                          isLocked
                            ? 'cursor-not-allowed opacity-70'
                            : 'cursor-pointer hover:bg-[var(--muted)]/20'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isLocked}
                          onChange={() => !isLocked && onToggle(perm.key)}
                          className="mt-0.5 accent-[var(--primary)]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] text-[var(--foreground)]">
                              {perm.label}
                            </span>
                            <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                              {perm.key}
                            </span>
                            {perm.rootOnly === true && (
                              <span className="meta-mono text-[10px] px-1.5 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)]">
                                ROOT ONLY
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                            {perm.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============= 创建角色表单 ============= */

interface CreateRoleFormProps {
  form: { key: string; displayName: string; description: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ key: string; displayName: string; description: string }>
  >;
  modules: PermissionModule[];
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  saving: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

function CreateRoleForm({
  form,
  setForm,
  modules,
  selected,
  setSelected,
  saving,
  error,
  onSubmit,
  onCancel,
}: CreateRoleFormProps) {
  const toggle = (permKey: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permKey)) next.delete(permKey);
      else next.add(permKey);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Field label="角色 key" count={`${form.key.length}/32`}>
        <input
          type="text"
          value={form.key}
          onChange={(e) =>
            setForm((f) => ({ ...f, key: e.target.value.toLowerCase() }))
          }
          maxLength={32}
          placeholder="如 content_editor / exam_reviewer"
          className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
        />
        <p className="meta-mono text-[10px] text-[var(--muted-foreground)] mt-1">
          小写字母开头，仅含 a-z / 0-9 / _，长度 2-32。创建后不可修改。
        </p>
      </Field>
      <Field label="角色名称" count={`${form.displayName.length}/32`}>
        <input
          type="text"
          value={form.displayName}
          onChange={(e) =>
            setForm((f) => ({ ...f, displayName: e.target.value }))
          }
          maxLength={32}
          placeholder="如 内容编辑 / 考试审核员"
          className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
        />
      </Field>
      <Field label="角色描述" count={`${form.description.length}/200`}>
        <textarea
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          maxLength={200}
          rows={2}
          className={`${INPUT_CLASS} px-3 py-2 text-[12px] resize-y`}
        />
      </Field>

      <div>
        <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-2">
          [ 初始权限 / Initial Permissions ]（{selected.size} 项已选）
        </div>
        <div className="max-h-64 overflow-y-auto border border-[var(--border)] divide-y divide-[var(--border)]">
          {modules.map((module) => (
            <div key={module.key}>
              <div className="px-3 py-2 bg-[var(--muted)]/20 meta-mono text-[11px] text-[var(--foreground)]">
                {module.label}
              </div>
              <div className="divide-y divide-[var(--border)]">
                {module.permissions.map((perm) => {
                  if (perm.rootOnly === true) return null;
                  const checked = selected.has(perm.key);
                  return (
                    <label
                      key={perm.key}
                      className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--muted)]/20"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(perm.key)}
                        className="mt-0.5 accent-[var(--primary)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-[var(--foreground)]">
                          {perm.label}
                        </div>
                        <div className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                          {perm.key}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-[12px] text-[var(--destructive)] meta-mono">{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="meta-mono text-[12px] px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          取消
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="meta-mono text-[12px] px-4 py-2 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--background)] transition-colors disabled:opacity-50"
        >
          {saving ? '创建中...' : '创建角色'}
        </button>
      </div>
    </div>
  );
}
