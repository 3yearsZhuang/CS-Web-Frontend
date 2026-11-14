/**
 * @file 用户角色授权视图 — 读取/整组替换用户角色绑定（含 own/peak/all 作用范围）
 *
 * 后端契约：GET/PUT /api/admin/users/{id}/role-bindings（If-Match 授权版本）。
 * 角色列表来自 /api/admin/roles，峰列表来自 /api/organization/peaks。
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Spinner } from '@/components';
import { useToast } from '@/components/feedback/toast';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import type { SafeUser } from './types';

interface RoleOption {
  id: number;
  key: string;
  displayName: string;
  fantasyDisplayName?: string;
}

interface PeakOption {
  id: number;
  name: string;
}

interface BindingRow {
  roleId: number | '';
  scopeType: 'own' | 'peak' | 'all';
  scopePeakId: number | '';
}

interface BindingsPayload {
  userId?: number;
  authorizationVersion: number;
  bindings: Array<{
    roleId: number;
    scopeType: string;
    scopePeakId?: number | null;
  }>;
}

function roleLabel(role: RoleOption): string {
  return role.fantasyDisplayName || role.displayName || role.key;
}

export function UserBindingsView({ users }: { users: SafeUser[] }) {
  const { pushToast } = useToast();

  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [peaks, setPeaks] = useState<PeakOption[]>([]);
  const [userId, setUserId] = useState('');
  const [version, setVersion] = useState(1);
  const [rows, setRows] = useState<BindingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const selectableUsers = useMemo(
    () => users.filter((item) => /^\d+$/.test(item.id)),
    [users],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [rolesRes, peaksRes] = await Promise.all([
        apiRequest<{ roles?: RoleOption[] }>('/api/admin/roles', { cache: 'no-store' }),
        apiRequest<{ items?: Array<{ id: number; name: string; fantasyName?: string | null }> }>(
          '/api/organization/peaks?limit=100',
          { cache: 'no-store' },
        ),
      ]);
      if (cancelled) return;
      if (rolesRes.ok) setRoles(rolesRes.data?.roles ?? []);
      if (peaksRes.ok) {
        setPeaks(
          (peaksRes.data?.items ?? []).map((peak) => ({
            id: peak.id,
            name: peak.fantasyName || peak.name,
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadBindings = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    const result = await apiRequest<BindingsPayload>(
      `/api/admin/users/${id}/role-bindings`,
      { cache: 'no-store' },
    );
    setLoading(false);
    if (!result.ok) {
      setLoaded(false);
      setRows([]);
      setError(
        result.status === 403
          ? '需要 user:manage_roles 权限'
          : result.error || '读取角色绑定失败',
      );
      return;
    }
    setLoaded(true);
    setVersion(result.data?.authorizationVersion ?? 1);
    setRows(
      (result.data?.bindings ?? []).map((binding) => ({
        roleId: binding.roleId,
        scopeType:
          binding.scopeType === 'peak' || binding.scopeType === 'all'
            ? binding.scopeType
            : 'own',
        scopePeakId: binding.scopePeakId ?? '',
      })),
    );
  }, []);

  const handleSelectUser = useCallback(
    (value: string) => {
      setUserId(value);
      if (!value) {
        setLoaded(false);
        setRows([]);
        return;
      }
      void loadBindings(value);
    },
    [loadBindings],
  );

  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      { roleId: roles[0]?.id ?? '', scopeType: 'own', scopePeakId: '' },
    ]);
  }, [roles]);

  const updateRow = useCallback((index: number, patch: Partial<BindingRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    const result = await apiRequest<BindingsPayload>(
      `/api/admin/users/${userId}/role-bindings`,
      {
        method: 'PUT',
        body: {
          version,
          bindings: rows
            .filter((row) => row.roleId !== '')
            .map((row) => ({
              roleId: row.roleId,
              scopeType: row.scopeType,
              scopePeakId: row.scopeType === 'peak' ? row.scopePeakId || null : null,
            })),
        },
      },
    );
    setSaving(false);
    if (!result.ok) {
      setError(
        result.status === 412
          ? '授权版本冲突，请重新加载后再保存'
          : result.status === 403
            ? '需要 user:manage_roles 权限'
            : result.error || '保存失败',
      );
      return;
    }
    setVersion(result.data?.authorizationVersion ?? version);
    setRows(
      (result.data?.bindings ?? []).map((binding) => ({
        roleId: binding.roleId,
        scopeType:
          binding.scopeType === 'peak' || binding.scopeType === 'all'
            ? binding.scopeType
            : 'own',
        scopePeakId: binding.scopePeakId ?? '',
      })),
    );
    pushToast('success', '角色授权已保存');
  }, [userId, version, rows, pushToast]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-5 p-4 border border-[var(--border)]">
        <div className="min-w-[220px]">
          <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
            [ 用户 / User ]
          </div>
          <select
            value={userId}
            onChange={(e) => handleSelectUser(e.target.value)}
            className={`${INPUT_CLASS} w-full px-3 py-2 text-[13px]`}
          >
            <option value="">—</option>
            {selectableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.displayName || user.email} (#{user.id})
              </option>
            ))}
          </select>
        </div>
        <div className="meta-mono text-[11px] text-[var(--muted-foreground)] pb-2">
          [ 作用范围 / Scope：own=本人 · peak=指定峰 · all=全范围 ]
        </div>
        {loaded && (
          <div className="ml-auto flex items-center gap-2">
            <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
              版本 {version}
            </span>
            <button
              type="button"
              onClick={() => void loadBindings(userId)}
              className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
            >
              重新加载
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] font-mono text-[12px] text-[var(--destructive)]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-[var(--muted-foreground)]">
          <Spinner />
          <span className="meta-mono text-[11px]">加载中…</span>
        </div>
      ) : !loaded ? (
        <div className="py-8 meta-mono text-[11px] text-[var(--muted-foreground)]">
          请选择用户后编辑角色绑定
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {rows.length === 0 && (
              <div className="py-6 meta-mono text-[11px] text-[var(--muted-foreground)]">
                该用户暂无角色绑定
              </div>
            )}
            {rows.map((row, index) => (
              <div
                key={`${index}-${row.roleId}`}
                className="flex flex-wrap items-center gap-2 border border-[var(--border)] p-3"
              >
                <select
                  value={row.roleId}
                  onChange={(e) =>
                    updateRow(index, {
                      roleId: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  className={`${INPUT_CLASS} min-w-[180px] px-3 py-2 text-[13px]`}
                >
                  <option value="">—</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {roleLabel(role)} ({role.key})
                    </option>
                  ))}
                </select>
                <select
                  value={row.scopeType}
                  onChange={(e) =>
                    updateRow(index, {
                      scopeType: e.target.value as BindingRow['scopeType'],
                      scopePeakId: e.target.value === 'peak' ? row.scopePeakId : '',
                    })
                  }
                  className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
                >
                  <option value="own">own / 本人</option>
                  <option value="peak">peak / 指定峰</option>
                  <option value="all">all / 全范围</option>
                </select>
                {row.scopeType === 'peak' && (
                  <select
                    value={row.scopePeakId}
                    onChange={(e) =>
                      updateRow(index, {
                        scopePeakId: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                    className={`${INPUT_CLASS} min-w-[150px] px-3 py-2 text-[13px]`}
                  >
                    <option value="">选择峰</option>
                    {peaks.map((peak) => (
                      <option key={peak.id} value={peak.id}>
                        {peak.name}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="ml-auto focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
                >
                  移除
                </button>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button type="button" onClick={addRow}>
              添加绑定
            </Button>
            <Button type="button" onClick={() => void handleSave()} loading={saving}>
              保存授权
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
