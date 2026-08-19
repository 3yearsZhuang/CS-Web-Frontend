'use client';

/**
 * @file SecurityTab — 账号安全（Tab 02）：修改密码 + 双因素认证 + 活跃会话
 *
 * 从 `app/profile/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；密码逻辑由 `usePassword` 提供（GENERAL 2.2 展示/容器分离）。
 */

import { Button, ArkDivider } from '@/components';
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
    <div className="grid grid-cols-12 gap-0">
      {/* 左栏：密码修改（窄栏，对标资料页头像区；宽屏下粘性定位） */}
      <div className="col-span-12 md:col-span-5 border-t border-[var(--border)] md:border-r md:pr-6">
        {/* 安全子区块分隔标题 */}
        <div className="flex items-center gap-3 pt-10 mt-10">
          <span className="meta-mono text-[12px] text-[var(--muted-foreground)]">
            <ArkDivider>{t('securityTitle')}</ArkDivider>
          </span>
        </div>

        <form onSubmit={handlePasswordSubmit} className="p-5 sm:p-6 md:py-8 space-y-6 md:sticky md:top-24">

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
        </form>
      </div>

      {/* 右栏：双因素认证 + 活跃会话（对标资料页表单区） */}
      <div className="col-span-12 md:col-span-7 md:pl-6 flex flex-col">
        {/* 双因素认证 */}
        <TwoFactorSettings />

        {/* 活跃会话管理 */}
        <SessionManager />
      </div>
    </div>
  );
}
