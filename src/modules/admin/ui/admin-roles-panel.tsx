/**
 * @file 管理员角色权限管理面板 — 角色列表 + 权限矩阵（仅 root 可访问）
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RevealItem } from '@/components/effects/motion-primitives';
import { useToast } from '@/components/feedback/toast';
import { RolePermissionMatrix } from './role-permission-matrix';
import { Button } from '@/components';
import { RoleModals } from './role-modals';
import { roleBadgeClass, roleBadgeLabel } from './roles-types';
import type { PermissionModule, RoleModal, RoleRecord } from './roles-types';

/* ============= 面板组件 ============= */

interface AdminRolesPanelProps {
  onForbidden: () => void;
}

/** 管理员角色权限管理面板（仅 root）— 左侧角色列表 / 右侧权限矩阵 */
export function AdminRolesPanel({ onForbidden }: AdminRolesPanelProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const t = useTranslations('adminRoles');

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
        throw new Error(data.error || t('loadFailed'));
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
      setError(e instanceof Error ? e.message : t('loadFailed'));
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
        throw new Error(data.error || t('saveFailed'));
      }
      const data = (await res.json()) as { role: RoleRecord };
      setRoles((prev) =>
        prev.map((r) => (r.key === data.role.key ? data.role : r)),
      );
      setDirty(false);
      pushToast('success', t('permissionsUpdated'));
    } catch (e) {
      pushToast('error', e instanceof Error ? e.message : t('saveFailed'));
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
      setCreateError(t('keyAndNameRequired'));
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
        throw new Error(data.error || t('createFailed'));
      }
      const data = (await res.json()) as { role: RoleRecord };
      setRoles((prev) => [...prev, data.role]);
      setSelectedRoleKey(data.role.key);
      setModal({ type: 'none' });
      pushToast('success', t('roleCreated', { name: data.role.displayName }));
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t('createFailed'));
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
        throw new Error(data.error || t('updateFailed'));
      }
      const data = (await res.json()) as { role: RoleRecord };
      setRoles((prev) =>
        prev.map((r) => (r.key === data.role.key ? data.role : r)),
      );
      setModal({ type: 'none' });
      pushToast('success', t('roleUpdated'));
    } catch (e) {
      setEditError(e instanceof Error ? e.message : t('updateFailed'));
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
        throw new Error(data.error || t('deleteFailed'));
      }
      setRoles((prev) => prev.filter((r) => r.key !== modal.role.key));
      if (selectedRoleKey === modal.role.key) {
        setSelectedRoleKey(null);
      }
      setModal({ type: 'none' });
      pushToast('success', t('roleDeleted'));
    } catch (e) {
      setEditError(e instanceof Error ? e.message : t('deleteFailed'));
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
            {t('loadingRoles')}
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
            {t('loadErrorTitle')}
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
            {t('retry')}
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
              {t('sectionLabel')}
            </div>
            <p className="text-[13px] text-[var(--muted-foreground)] max-w-2xl">
              {t('panelDesc')}
            </p>
          </div>
          <Button
            variant="primary-outline"
            type="button"
            onClick={openCreateModal}
          >
            {t('createRoleBtn')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* 左侧：角色列表 */}
          <aside className="space-y-2">
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-3">
              {t('rolesList', { count: roles.length })}
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
                    <span>{t('permissionsCount', { count: role.permissions.length })}</span>
                    {role.userCount !== undefined && role.userCount > 0 && (
                      <>
                        <span>·</span>
                        <span>{t('usersCount', { count: role.userCount })}</span>
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
                  {t('selectRoleHint')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 模态框 */}
        <RoleModals
          modal={modal}
          modules={modules}
          createForm={createForm}
          setCreateForm={setCreateForm}
          createPermissions={createPermissions}
          setCreatePermissions={setCreatePermissions}
          createSaving={createSaving}
          createError={createError}
          editForm={editForm}
          setEditForm={setEditForm}
          editSaving={editSaving}
          editError={editError}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClose={() => setModal({ type: 'none' })}
        />
      </div>
    </RevealItem>
  );
}
