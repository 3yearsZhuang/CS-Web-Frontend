/**
 * @file 角色权限矩阵子组件 — 从 admin-roles-panel 拆出（GENERAL 2.4 按 UI 层级拆分）
 */
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  roleBadgeClass,
  roleBadgeLabel,
  type PermissionModule,
  type RoleRecord,
} from './roles-types';

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

/** 权限矩阵 — 展示选中角色的权限点，可勾选/保存/撤销 */
export function RolePermissionMatrix({
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
  const t = useTranslations('adminRoles');
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
              <h3 className="text-[18px] text-[var(--foreground)]">{role.displayName}</h3>
              <span className={`meta-mono text-[10px] px-1.5 py-0.5 ${roleBadgeClass(role)}`}>
                {roleBadgeLabel(role)}
              </span>
            </div>
            <p className="text-[12px] text-[var(--muted-foreground)] mb-2">
              {role.description || t('noDescription')}
            </p>
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)] flex flex-wrap items-center gap-3">
              <span>key: {role.key}</span>
              <span>·</span>
              <span>{t('permissionsCount', { count: role.permissions.length })}</span>
              {role.userCount !== undefined && (
                <>
                  <span>·</span>
                  <span>{t('usersUsing', { count: role.userCount })}</span>
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
                {t('edit')}
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="meta-mono text-[11px] px-3 py-1.5 border border-[var(--border)] text-[var(--destructive)] hover:border-[var(--destructive)] transition-colors focus-amber"
              >
                {t('delete')}
              </button>
            </div>
          )}
        </div>

        {/* 操作栏 */}
        {!isReadOnly && (
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)]">
              {dirty ? <span className="text-[var(--primary)]">{t('unsavedChanges')}</span> : <span>{t('permissionsSynced')}</span>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onReset}
                disabled={!dirty || saving}
                className="meta-mono text-[11px] px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-40"
              >
                {t('reset')}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!dirty || saving}
                className="meta-mono text-[11px] px-3 py-1.5 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--background)] transition-colors disabled:opacity-40"
              >
                {saving ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </div>
        )}
        {isReadOnly && (
          <div className="meta-mono text-[11px] text-[var(--muted-foreground)] pt-3 border-t border-[var(--border)]">
            {isRootRole ? t('rootReadOnly') : t('userReadOnly')}
          </div>
        )}
      </div>

      {/* 权限矩阵 */}
      {isUserRole ? (
        <div className="border border-dashed border-[var(--border)] py-12 text-center">
          <p className="meta-mono text-[12px] text-[var(--muted-foreground)]">{t('userNoPermissions')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((module) => {
            // 只展示有权限点的模块
            if (module.permissions.length === 0) return null;
            return (
              <div key={module.key} className="border border-[var(--border)]">
                <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--muted)]/20">
                  <div className="meta-mono text-[12px] text-[var(--foreground)]">[ {module.label} ]</div>
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
                          isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-[var(--muted)]/20'
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
                            <span className="text-[13px] text-[var(--foreground)]">{perm.label}</span>
                            <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">{perm.key}</span>
                            {perm.rootOnly === true && (
                              <span className="meta-mono text-[10px] px-1.5 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)]">
                                ROOT ONLY
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{perm.description}</p>
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
