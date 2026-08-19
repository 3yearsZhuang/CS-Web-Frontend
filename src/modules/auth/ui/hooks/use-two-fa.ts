'use client';

/**
 * @file useTwoFA — 双因素认证(2FA)设置逻辑 Hook
 *
 * 从 `TwoFactorSettings` 组件拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook」。组件只保留渲染，状态与 API 调用集中于此。
 */

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/shared/hooks/use-api-request';

/** 2FA 状态 */
export interface TwoFAStatus {
  enabled: boolean;
  required: boolean;
}

/** setup 接口返回 */
export interface SetupData {
  secret: string;
  otpauthURI: string;
  qrCode: string;
  backupCodes: string[];
}

/** 当前操作模式 */
export type ActionMode = 'idle' | 'setup' | 'disable' | 'regenerate';

export function useTwoFA() {
  // ===== 状态 =====
  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // setup 流程
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // 已启用态的操作模式（disable / regenerate）
  const [actionMode, setActionMode] = useState<ActionMode>('idle');
  const [actionCode, setActionCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[] | null>(null);

  // 复制反馈
  const [copiedSecret, setCopiedSecret] = useState(false);

  /** 拉取 2FA 状态 */
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await apiRequest<TwoFAStatus>('/api/auth/2fa');
      if (!r.ok) {
        throw new Error(r.error ?? '加载 2FA 状态失败');
      }
      setStatus(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 2FA 状态失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /** 清空成功提示（3s 自动消失） */
  const showSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }, []);

  /** 启动 setup 流程 */
  const handleStartSetup = async () => {
    setSetupLoading(true);
    setError(null);
    try {
      const r = await apiRequest<SetupData>('/api/auth/2fa/setup', { method: 'POST' });
      if (!r.ok) {
        throw new Error(r.error ?? '初始化 2FA 失败');
      }
      setSetupData(r.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化 2FA 失败');
    } finally {
      setSetupLoading(false);
    }
  };

  /** 取消 setup 流程 */
  const handleCancelSetup = () => {
    setSetupData(null);
    setVerifyCode('');
    setError(null);
  };

  /** 确认启用 — 提交验证码 */
  const handleVerifySetup = async () => {
    const code = verifyCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('请输入 6 位数字验证码');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const r = await apiRequest<{ ok?: boolean }>('/api/auth/2fa/verify', {
        method: 'POST',
        body: { code, mode: 'setup' },
      });
      if (!r.ok || !r.data?.ok) {
        throw new Error(r.error ?? '验证失败');
      }
      setSetupData(null);
      setVerifyCode('');
      showSuccess('双因素认证已启用');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败');
    } finally {
      setVerifying(false);
    }
  };

  /** 禁用 2FA */
  const handleDisable = async () => {
    const code = actionCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('请输入 6 位数字验证码');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const r = await apiRequest<{ ok?: boolean }>('/api/auth/2fa/disable', {
        method: 'POST',
        body: { code },
      });
      if (!r.ok || !r.data?.ok) {
        throw new Error(r.error ?? '禁用失败');
      }
      setActionMode('idle');
      setActionCode('');
      showSuccess('2FA 已禁用');
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '禁用失败');
    } finally {
      setActionLoading(false);
    }
  };

  /** 重新生成备用码 */
  const handleRegenerate = async () => {
    const code = actionCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError('请输入 6 位数字验证码');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const r = await apiRequest<{ codes?: string[]; error?: string }>('/api/auth/2fa/backup-codes', {
        method: 'POST',
        body: { code },
      });
      const data = r.data;
      if (!r.ok || !data?.codes) {
        throw new Error(r.error ?? '重新生成失败');
      }
      setRegeneratedCodes(data.codes);
      setActionCode('');
      setActionMode('idle');
      showSuccess('备用码已重新生成');
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新生成失败');
    } finally {
      setActionLoading(false);
    }
  };

  /** 复制 secret 到剪贴板 */
  const handleCopySecret = async () => {
    if (!setupData?.secret) return;
    try {
      await navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      setError('复制失败，请手动选择文本复制');
    }
  };

  /** 取消 disable / regenerate 操作 */
  const handleCancelAction = () => {
    setActionMode('idle');
    setActionCode('');
    setError(null);
  };

  return {
    // 状态
    status,
    loading,
    error,
    success,
    setupData,
    setupLoading,
    verifyCode,
    setVerifyCode,
    verifying,
    actionMode,
    setActionMode,
    actionCode,
    setActionCode,
    actionLoading,
    regeneratedCodes,
    setRegeneratedCodes,
    copiedSecret,
    // 操作
    fetchStatus,
    setError,
    handleStartSetup,
    handleCancelSetup,
    handleVerifySetup,
    handleDisable,
    handleRegenerate,
    handleCopySecret,
    handleCancelAction,
  };
}
