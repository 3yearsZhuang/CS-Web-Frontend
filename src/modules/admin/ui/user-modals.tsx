/**
 * @file 管理员用户管理 — 模态框集合（编辑/重置/删除/禁用/批准/拒绝）
 * 从 admin-users-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { ConfirmDialog } from '@/components/primitives/confirm-dialog';
import { Button } from '@/components';
import { useTranslations } from 'next-intl';
import { LIMITS, type UserRole } from '@/modules/admin/ui/types';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { roleLabel, type EditForm, type UserModal } from './users-panel-utils';

interface UserModalsProps {
  modal: UserModal;
  editForm: EditForm | null;
  setEditForm: React.Dispatch<React.SetStateAction<EditForm | null>>;
  editSaving: boolean;
  editError: string | null;
  resetPassword: string;
  setResetPassword: React.Dispatch<React.SetStateAction<string>>;
  resetSaving: boolean;
  resetError: string | null;
  deleteSaving: boolean;
  deleteError: string | null;
  resetActionLoading: boolean;
  resetActionError: string | null;
  approveNote: string;
  setApproveNote: React.Dispatch<React.SetStateAction<string>>;
  rejectNote: string;
  setRejectNote: React.Dispatch<React.SetStateAction<string>>;
  onEditSubmit: (e: React.FormEvent) => void;
  onResetSubmit: (e: React.FormEvent) => void;
  onResetDefault: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}

/** 用户编辑/重置/删除/禁用/批准/拒绝模态框集合 */
export function UserModals({
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
  onEditSubmit,
  onResetSubmit,
  onResetDefault,
  onDelete,
  onToggleActive,
  onApprove,
  onReject,
  onClose,
}: UserModalsProps) {
  const t = useTranslations('adminUsers');
  return (
    <>
      {/* ============ 模态框：编辑 ============ */}
      {modal.type === 'edit' && editForm && (
        <ModalShell title={t('editUser')} onClose={onClose}>
          <form onSubmit={onEditSubmit} className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">{modal.user.email}</div>

            <Field label={t('displayName')} count={`${editForm.displayName.length}/${LIMITS.DISPLAY_NAME_MAX}`}>
              <input
                type="text"
                value={editForm.displayName}
                maxLength={LIMITS.DISPLAY_NAME_MAX}
                onChange={(e) => setEditForm((f) => ({ ...f!, displayName: e.target.value }))}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                placeholder={t('howToAddress')}
              />
            </Field>

            <Field label={t('bio')} count={`${editForm.bio.length}/${LIMITS.BIO_MAX}`}>
              <textarea
                value={editForm.bio}
                maxLength={LIMITS.BIO_MAX}
                rows={3}
                onChange={(e) => setEditForm((f) => ({ ...f!, bio: e.target.value }))}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
                placeholder={t('introOneLine')}
              />
            </Field>

            <Field label={t('github')}>
              <input
                type="url"
                value={editForm.githubUrl}
                maxLength={LIMITS.URL_MAX}
                onChange={(e) => setEditForm((f) => ({ ...f!, githubUrl: e.target.value }))}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                placeholder="https://github.com/your-name"
              />
            </Field>

            <Field label={t('website')}>
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
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">{t('role')}</div>
              <div className="flex gap-1.5">
                {(['user', 'admin'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f!, role: r }))}
                    className={`tab-chip focus-ring ${editForm.role === r ? 'tab-chip-active' : ''}`}
                  >
                    {roleLabel(r)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">{t('status')}</div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f!, isActive: true }))}
                  className={`tab-chip focus-ring ${editForm.isActive ? 'tab-chip-active' : ''}`}
                >
                  {t('enable')}
                </button>
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f!, isActive: false }))}
                  className={`tab-chip focus-ring ${!editForm.isActive ? 'tab-chip-danger-active' : ''}`}
                >
                  {t('disable')}
                </button>
              </div>
            </div>

            {editError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {editError}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button type="submit" loading={editSaving}>
                {editSaving ? t('saving') : t('saveChanges')}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ============ 模态框：重置密码 ============ */}
      {modal.type === 'reset' && (
        <ModalShell title={t('resetPassword')} onClose={onClose}>
          <form onSubmit={onResetSubmit} className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">{t('targetUser', { email: modal.user.email })}</div>

            <Field label={t('newPassword')} count={`≥ ${LIMITS.PASSWORD_MIN}`}>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                autoFocus
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                placeholder={t('passwordMin', { min: LIMITS.PASSWORD_MIN })}
              />
            </Field>

            <div className="p-3 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[11px] font-mono leading-relaxed text-[var(--muted-foreground)]">
              {t('resetSessionNote')}
            </div>

            {resetError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {resetError}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button type="submit" loading={resetSaving}>
                {resetSaving ? t('resetting') : t('resetPasswordBtn')}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ============ 模态框：默认密码重置确认 ============ */}
      {modal.type === 'resetDefault' && (
        <ModalShell title={t('resetToDefault')} onClose={onClose}>
          <div className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">{t('targetUser', { email: modal.user.email })}</div>
            <p className="text-[14px] text-[var(--foreground)] leading-relaxed">{t('resetDefaultConfirm')}</p>
            <div className="p-3 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[11px] font-mono leading-relaxed text-[var(--muted-foreground)]">
              {t('resetDefaultDesc', { password: t('defaultPassword') })}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Button type="button" onClick={onResetDefault}>
                {t('confirmReset')}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ============ 模态框：删除确认 ============ */}
      {modal.type === 'delete' && (
        <ConfirmDialog
          open={true}
          title={t('deleteTitle')}
          message={t('deleteMessage')}
          variant="danger"
          confirmLabel={deleteSaving ? t('deleting') : t('confirmDelete')}
          loading={deleteSaving}
          onConfirm={onDelete}
          onCancel={onClose}
        >
          <div className="p-3 border border-[var(--border)] bg-[var(--muted)]/[0.3]">
            <div className="text-[13px] font-mono text-[var(--foreground)] break-all">{modal.user.displayName || t('unnamed')}</div>
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
          title={modal.user.isActive ? t('disableUser') : t('enableUser')}
          message={modal.user.isActive ? t('confirmDisable') : t('confirmEnable')}
          variant={modal.user.isActive ? 'danger' : 'info'}
          confirmLabel={modal.user.isActive ? t('confirmDisable') : t('confirmEnable')}
          onConfirm={onToggleActive}
          onCancel={onClose}
        >
          <div className="p-3 border border-[var(--border)] bg-[var(--muted)]/[0.3]">
            <div className="text-[13px] font-mono text-[var(--foreground)] break-all">{modal.user.displayName || t('unnamed')}</div>
            <div className="meta-mono mt-1 break-all">{modal.user.email}</div>
          </div>
          {modal.user.isActive && (
            <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--destructive)]">
              <div className="mb-2 font-semibold">{t('disableConsequences')}</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>{t('disableC1')}</li>
                <li>{t('disableC2')}</li>
                <li>{t('disableC3')}</li>
                <li>{t('disableC4')}</li>
              </ul>
            </div>
          )}
          {!modal.user.isActive && (
            <div className="p-4 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--primary)]">
              <div className="mb-2 font-semibold">{t('enableNotes')}</div>
              <ul className="list-disc pl-4 space-y-1">
                <li>{t('enableN1')}</li>
                <li>{t('enableN2')}</li>
                <li>{t('enableN3')}</li>
              </ul>
            </div>
          )}
        </ConfirmDialog>
      )}

      {/* ============ 模态框：批准确认 ============ */}
      {modal.type === 'approve' && (
        <ModalShell title={t('approveReset')} onClose={onClose}>
          <div className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">{t('targetRequest', { email: modal.request.email })}</div>

            <div className="p-4 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--primary)]">
              {t('resetDefaultDesc', { password: t('defaultPassword') })}
            </div>

            <Field label={t('approveNoteLabel')}>
              <textarea
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                rows={3}
                maxLength={200}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
                placeholder={t('approveNotePlaceholder')}
              />
            </Field>

            {resetActionError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {resetActionError}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button type="button" loading={resetActionLoading} onClick={onApprove}>
                {resetActionLoading ? t('processing') : t('confirmApprove')}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ============ 模态框：拒绝备注 ============ */}
      {modal.type === 'reject' && (
        <ModalShell title={t('rejectRequest')} onClose={onClose}>
          <div className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">{t('targetRequest', { email: modal.request.email })}</div>

            <Field label={t('rejectNoteLabel')}>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                maxLength={200}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
                placeholder={t('rejectNotePlaceholder')}
                autoFocus
              />
            </Field>

            {resetActionError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {resetActionError}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button type="button" loading={resetActionLoading} variant="danger" onClick={onReject}>
                {resetActionLoading ? t('processing') : t('confirmReject')}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
