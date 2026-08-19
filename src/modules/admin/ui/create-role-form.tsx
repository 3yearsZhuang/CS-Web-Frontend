/**
 * @file 创建角色表单子组件 — 从 admin-roles-panel 拆出（GENERAL 2.4 按 UI 层级拆分）
 */
'use client';

import { useTranslations } from 'next-intl';
import { Field } from '@/modules/admin/ui/shared';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { Button } from '@/components';
import type { PermissionModule } from './roles-types';

interface CreateRoleFormProps {
  form: { key: string; displayName: string; description: string };
  setForm: React.Dispatch<React.SetStateAction<{ key: string; displayName: string; description: string }>>;
  modules: PermissionModule[];
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  saving: boolean;
  error: string | null;
  onSubmit: () => void;
  onCancel: () => void;
}

/** 创建角色表单 — 基本信息 + 初始权限选择 */
export function CreateRoleForm({
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
  const t = useTranslations('adminRoles');
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
      <Field label={t('fieldKey')} count={`${form.key.length}/32`}>
        <input
          type="text"
          value={form.key}
          onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase() }))}
          maxLength={32}
          placeholder={t('keyPlaceholder')}
          className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
        />
        <p className="meta-mono text-[10px] text-[var(--muted-foreground)] mt-1">
          {t('keyHint')}
        </p>
      </Field>
      <Field label={t('fieldDisplayName')} count={`${form.displayName.length}/32`}>
        <input
          type="text"
          value={form.displayName}
          onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
          maxLength={32}
          placeholder={t('displayNamePlaceholder')}
          className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
        />
      </Field>
      <Field label={t('fieldDescription')} count={`${form.description.length}/200`}>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          maxLength={200}
          rows={2}
          className={`${INPUT_CLASS} px-3 py-2 text-[12px] resize-y`}
        />
      </Field>

      <div>
        <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-2">
          {t('initialPermissions', { count: selected.size })}
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
                        <div className="text-[12px] text-[var(--foreground)]">{perm.label}</div>
                        <div className="meta-mono text-[10px] text-[var(--muted-foreground)]">{perm.key}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-[12px] text-[var(--destructive)] meta-mono">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="meta-mono text-[12px] px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          {t('cancel')}
        </button>
        <Button
          variant="primary-outline"
          type="button"
          onClick={onSubmit}
          disabled={saving}
        >
          {saving ? t('creating') : t('createRole')}
        </Button>
      </div>
    </div>
  );
}
