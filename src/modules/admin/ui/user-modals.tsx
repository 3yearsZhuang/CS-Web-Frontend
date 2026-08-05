/**
 * @file 管理员用户管理 — 模态框集合（编辑/重置/删除/禁用/批准/拒绝）
 * 从 admin-users-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { ConfirmDialog } from '@/components/primitives/confirm-dialog';
import { Button } from '@/components';
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
  return (
    <>
      {/* ============ 模态框：编辑 ============ */}
      {modal.type === 'edit' && editForm && (
        <ModalShell title="[ 编辑用户 / Edit User ]" onClose={onClose}>
          <form onSubmit={onEditSubmit} className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">{modal.user.email}</div>

            <Field label="Display Name" count={`${editForm.displayName.length}/${LIMITS.DISPLAY_NAME_MAX}`}>
              <input
                type="text"
                value={editForm.displayName}
                maxLength={LIMITS.DISPLAY_NAME_MAX}
                onChange={(e) => setEditForm((f) => ({ ...f!, displayName: e.target.value }))}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                placeholder="如何称呼？"
              />
            </Field>

            <Field label="Bio" count={`${editForm.bio.length}/${LIMITS.BIO_MAX}`}>
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
              <Button type="submit" loading={editSaving}>
                {editSaving ? '保存中 / Saving...' : '保存更改 / Save Changes →'}
              </Button>
              <button
                type="button"
                onClick={onClose}
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
        <ModalShell title="[ 重置密码 / Reset Password ]" onClose={onClose}>
          <form onSubmit={onResetSubmit} className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">目标用户：{modal.user.email}</div>

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
              <Button type="submit" loading={resetSaving}>
                {resetSaving ? 'Resetting...' : 'Reset Password →'}
              </Button>
              <button
                type="button"
                onClick={onClose}
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
        <ModalShell title="[ 重置为默认密码 / Reset to Default ]" onClose={onClose}>
          <div className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">目标用户：{modal.user.email}</div>
            <p className="text-[14px] text-[var(--foreground)] leading-relaxed">确认将该用户密码重置为默认密码？</p>
            <div className="p-3 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[11px] font-mono leading-relaxed text-[var(--muted-foreground)]">
              重置后密码将变为 <span className="font-bold text-[var(--primary)]">FZTBU_CS</span>，该用户的所有登录会话将立即失效，需使用默认密码重新登录。
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Button type="button" onClick={onResetDefault}>
                确认重置 / Confirm →
              </Button>
              <button
                type="button"
                onClick={onClose}
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
          onConfirm={onDelete}
          onCancel={onClose}
        >
          <div className="p-3 border border-[var(--border)] bg-[var(--muted)]/[0.3]">
            <div className="text-[13px] font-mono text-[var(--foreground)] break-all">{modal.user.displayName || '未命名'}</div>
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
          onConfirm={onToggleActive}
          onCancel={onClose}
        >
          <div className="p-3 border border-[var(--border)] bg-[var(--muted)]/[0.3]">
            <div className="text-[13px] font-mono text-[var(--foreground)] break-all">{modal.user.displayName || '未命名'}</div>
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
        <ModalShell title="[ 批准并重置 / Approve & Reset ]" onClose={onClose}>
          <div className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">目标申请：{modal.request.email}</div>

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
              <Button type="button" loading={resetActionLoading} onClick={onApprove}>
                {resetActionLoading ? 'Processing...' : 'Confirm Approve →'}
              </Button>
              <button
                type="button"
                onClick={onClose}
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
        <ModalShell title="[ 拒绝申请 / Reject Request ]" onClose={onClose}>
          <div className="space-y-6">
            <div className="meta-mono text-[var(--muted-foreground)] break-all">目标申请：{modal.request.email}</div>

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
              <Button type="button" loading={resetActionLoading} variant="danger" onClick={onReject}>
                {resetActionLoading ? 'Processing...' : 'Confirm Reject →'}
              </Button>
              <button
                type="button"
                onClick={onClose}
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
