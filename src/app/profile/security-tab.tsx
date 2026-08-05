'use client';

/**
 * @file SecurityTab — 账号安全（Tab 02）：修改密码 + 双因素认证 + 活跃会话
 *
 * 从 `app/profile/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；密码逻辑由 `usePassword` 提供（GENERAL 2.2 展示/容器分离）。
 */

import { Button } from '@/components';
import { useTranslations } from 'next-intl';
import { PASSWORD_MIN_LENGTH } from '@/shared/config';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { usePassword } from '@/modules/auth/ui/hooks/use-password';
import { TwoFactorSettings } from '@/modules/auth/ui/two-factor-settings';
import { SessionManager } from './session-manager';

export function SecurityTab() {
  const t = useTranslations('profile');
  const {
    passwordForm,
    setPasswordForm,
    savingPassword,
    passwordMessage,
    setPasswordMessage,
    handlePasswordSubmit,
  } = usePassword();

  return (
    <>
      <form
        onSubmit={handlePasswordSubmit}
        className="grid grid-cols-12 gap-0 border-t border-[var(--border)]"
      >
        <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8 md:py-10 space-y-8">
          {/* 当前密码 */}
          <div>
            <label
              htmlFor="currentPassword"
              className="meta-mono mb-2 block text-[var(--muted-foreground)]"
            >
              [ 01 ] {t('currentPassword')}
            </label>
            <input
              id="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
              }
              className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
              placeholder={t('currentPasswordPlaceholder')}
              autoComplete="current-password"
            />
          </div>

          {/* 新密码 */}
          <div>
            <label
              htmlFor="newPassword"
              className="meta-mono mb-2 flex items-center justify-between text-[var(--muted-foreground)]"
            >
              <span>[ 02 ] {t('newPassword')}</span>
              <span>≥ {PASSWORD_MIN_LENGTH}</span>
            </label>
            <input
              id="newPassword"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
              }
              className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
              placeholder={t('newPasswordPlaceholder')}
              autoComplete="new-password"
            />
          </div>

          {/* 确认新密码 */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="meta-mono mb-2 block text-[var(--muted-foreground)]"
            >
              [ 03 ] {t('confirmNewPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
              }
              className={`${INPUT_CLASS} px-4 py-3 text-[14px]`}
              placeholder={t('confirmNewPasswordPlaceholder')}
              autoComplete="new-password"
            />
          </div>

          {/* 消息 */}
          {passwordMessage && (
            <div
              className={`p-3 border-l-2 text-[12px] font-mono leading-relaxed ${
                passwordMessage.type === 'success'
                  ? 'border-[var(--primary)] bg-[var(--primary)]/[0.04] text-[var(--primary)]'
                  : 'border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[var(--destructive)]'
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex items-center gap-4">
            <Button
              type="submit"
              disabled={savingPassword}
              loading={savingPassword}
            >
              {savingPassword ? t('updating') : t('updatePassword')}
            </Button>
            <button
              type="button"
              onClick={() => {
                setPasswordForm({
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: '',
                });
                setPasswordMessage(null);
              }}
              className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
            >
              {t('reset')}
            </button>
          </div>
        </div>
      </form>

      {/* 双因素认证 */}
      <TwoFactorSettings />

      {/* 活跃会话管理 */}
      <SessionManager />
    </>
  );
}
