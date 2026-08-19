'use client';

/**
 * @file usePassword — 修改密码逻辑 Hook
 *
 * 从 `app/profile/page.tsx` 的 ProfileContent 拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook」。组件只保留渲染，状态与 API 调用集中于此。
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PASSWORD_MIN_LENGTH } from '@/shared/config';
import { apiRequest } from '@/shared/hooks/use-api-request';

/** 修改密码表单状态 */
export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** 表单提交结果消息 */
export interface PasswordMessage {
  type: 'success' | 'error';
  text: string;
}

export function usePassword() {
  const t = useTranslations('profile');

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<PasswordMessage | null>(null);

  /** 提交修改密码 */
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    // 客户端校验
    if (!passwordForm.currentPassword) {
      setPasswordMessage({ type: 'error', text: t('enterCurrentPassword') });
      return;
    }
    if (passwordForm.newPassword.length < PASSWORD_MIN_LENGTH) {
      setPasswordMessage({
        type: 'error',
        text: t('newPasswordTooShort', { min: PASSWORD_MIN_LENGTH }),
      });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: t('newPasswordMismatch') });
      return;
    }

    setSavingPassword(true);
    try {
      const r = await apiRequest<{ error?: string }>('/api/profile/password', {
        method: 'POST',
        body: {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
      });

      if (!r.ok) {
        // 400 — 密码不符合要求；401 — 当前密码错误
        if (r.status === 401) {
          setPasswordMessage({
            type: 'error',
            text: r.error || t('currentPasswordWrong'),
          });
        } else if (r.status === 400) {
          setPasswordMessage({
            type: 'error',
            text: r.error || t('passwordInvalid'),
          });
        } else {
          setPasswordMessage({
            type: 'error',
            text: r.error || t('passwordChangeFailed'),
          });
        }
        return;
      }

      // 成功 — 清空表单 + 提示
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordMessage({ type: 'success', text: t('passwordChanged') });
    } catch {
      setPasswordMessage({ type: 'error', text: t('networkError') });
    } finally {
      setSavingPassword(false);
    }
  };

  return {
    passwordForm,
    setPasswordForm,
    savingPassword,
    passwordMessage,
    setPasswordMessage,
    handlePasswordSubmit,
  };
}
