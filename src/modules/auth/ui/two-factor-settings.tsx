/**
 * @file 双因素认证 (2FA) 设置组件 — 渲染层
 *
 * 逻辑已抽离至 `useTwoFA` Hook（GENERAL 2.2 展示/容器分离），本文件仅负责渲染。
 * 功能流见 Hook 文件头注释。
 */
'use client';

import {
  Shield,
  ShieldCheck,
  QrCode,
  Key,
  AlertTriangle,
  Loader2,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useTwoFA } from './use-two-fa';

/** 验证码输入框样式（INPUT_CLASS 基础 + 覆盖 padding/字号） */
const CODE_INPUT_CLASS = `${INPUT_CLASS} px-4 py-2.5 text-[13px]`;

/** 次要按钮样式（题目指定） */
const OUTLINE_BTN_CLASS =
  'px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors focus-amber';

/** 双因素认证 (2FA) 设置组件 — 支持启用/禁用/重新生成备用码 */
export function TwoFactorSettings() {
  const t = useTranslations('authSettings');
  const {
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
    fetchStatus,
    setError,
    handleStartSetup,
    handleCancelSetup,
    handleVerifySetup,
    handleDisable,
    handleRegenerate,
    handleCopySecret,
    handleCancelAction,
  } = useTwoFA();

  // ===== 渲染 =====

  // 加载中
  if (loading) {
    return (
      <div className="flex items-center gap-3 py-6">
        <Loader2 size={14} className="animate-spin text-[var(--muted-foreground)]" />
        <span className="meta-mono text-[var(--muted-foreground)]">Loading 2FA status...</span>
      </div>
    );
  }

  // 状态加载失败
  if (!status) {
    return (
      <div className="py-6">
        <div className="meta-mono text-[var(--destructive)] mb-2">[ Error ]</div>
        <p className="text-[13px] text-[var(--muted-foreground)]">{error || t('loadFailed')}</p>
        <button onClick={fetchStatus} className={`${OUTLINE_BTN_CLASS} mt-4`}>
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- 标题 ---- */}
      <div className="meta-mono flex items-center justify-between text-[var(--muted-foreground)]">
        <span>[ 2FA ]</span>
        <span className="ark-divider">Two-Factor</span>
      </div>

      <h3 className="display-serif text-[clamp(20px,3vw,28px)] text-[var(--foreground)] leading-[1.1]">
        {t('title')}
        <span className="display-serif italic text-[var(--muted-foreground)] ml-2 text-[clamp(14px,1.6vw,18px)]">
          / Two-Factor Authentication
        </span>
      </h3>

      {/* ---- 管理员强制提示 ---- */}
      {status.required && !status.enabled && (
        <div className="flex items-start gap-3 p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.06]">
          <AlertTriangle size={16} className="text-[var(--destructive)] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] text-[var(--destructive)] leading-relaxed font-medium">
              {t('adminRequired')}
            </p>
            <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-1">
              {t('adminRequiredDesc')}
            </p>
          </div>
        </div>
      )}

      {/* ---- 全局错误 / 成功提示 ---- */}
      {error && (
        <div className="flex items-start gap-2 p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto underline shrink-0">
            {t('close')}
          </button>
        </div>
      )}
      {success && (
        <div className="p-3 border-l-2 border-green-500 bg-green-500/[0.04] text-[12px] font-mono text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      {/* ====== 未启用状态 ====== */}
      {!status.enabled && !setupData && (
        <div className="space-y-5">
          <div className="flex items-start gap-4 p-5 border border-[var(--border)]">
            <Shield size={28} className="text-[var(--muted-foreground)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="meta-mono text-[var(--muted-foreground)] mb-1">[ Status ] · Disabled</div>
              <p className="text-[14px] text-[var(--foreground)] leading-relaxed">{t('disabledTitle')}</p>
              <p className="text-[12px] text-[var(--muted-foreground)] mt-2 leading-relaxed">
                {t('disabledDesc')}
              </p>
              <Button
                onClick={handleStartSetup}
                disabled={setupLoading}
                loading={setupLoading}
                className="mt-4"
              >
                {setupLoading ? 'Initializing...' : t('enableBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Setup 流程（QR + secret + 备用码 + 验证码） ====== */}
      {!status.enabled && setupData && (
        <div className="space-y-6 p-5 border border-[var(--border)]">
          {/* 顶部标题 + 取消 */}
          <div className="flex items-center justify-between">
            <div className="meta-mono text-[var(--muted-foreground)]">[ Setup ] · Scan & Verify</div>
            <button
              onClick={handleCancelSetup}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus-amber"
              aria-label={t('cancel')}
            >
              <X size={16} />
            </button>
          </div>

          {/* QR 码居中展示 */}
          <div className="flex flex-col items-center gap-3">
            <div className="meta-mono text-[var(--muted-foreground)] flex items-center gap-2">
              <QrCode size={14} />
              <span>[ 01 ] Scan QR Code</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- QR 是 data URL，无需 next/image */}
            <img
              src={setupData.qrCode}
              alt="2FA QR Code"
              className="w-[240px] h-[240px] border border-[var(--border)] p-2 bg-white"
            />
              <p className="text-[11px] font-mono text-[var(--muted-foreground)] text-center max-w-[320px]">
                {t('scanQrDesc')}
              </p>
          </div>

          {/* Secret 密钥（手动输入） */}
          <div>
            <div className="meta-mono text-[var(--muted-foreground)] mb-2 flex items-center gap-2">
              <Key size={14} />
              <span>[ 02 ] Secret Key (Manual Entry)</span>
            </div>
            <div className="flex items-stretch gap-2">
              <code className="flex-1 px-4 py-2.5 text-[13px] font-mono bg-[var(--foreground)]/[0.03] border border-[var(--border)] text-[var(--foreground)] break-all">
                {setupData.secret}
              </code>
              <button
                onClick={handleCopySecret}
                className={`${OUTLINE_BTN_CLASS} shrink-0`}
                title={t('copySecretTitle')}
              >
                {copiedSecret ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* 备用码 */}
          <div>
            <div className="meta-mono text-[var(--muted-foreground)] mb-2 flex items-center justify-between">
              <span>[ 03 ] Backup Codes</span>
              <span className="text-[10px] text-[var(--muted-foreground)]/70">
                {setupData.backupCodes.length} codes · 一次性使用
              </span>
            </div>
            <div className="p-3 border border-[var(--border)] bg-[var(--destructive)]/[0.03]">
              <p className="text-[11px] font-mono text-[var(--destructive)] mb-3 leading-relaxed">
                ⚠ {t('backupCodesHint')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {setupData.backupCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 border border-[var(--border)] bg-[var(--background)] font-mono text-[12px] text-[var(--foreground)] text-center tracking-wider"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 验证码输入 */}
          <div>
            <label htmlFor="2fa-verify-code" className="meta-mono text-[var(--muted-foreground)] mb-2 block">
              [ 04 ] Verification Code (6 digits)
            </label>
            <input
              id="2fa-verify-code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={CODE_INPUT_CLASS}
              placeholder="000000"
              autoComplete="one-time-code"
              disabled={verifying}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleVerifySetup}
              disabled={verifying || verifyCode.length !== 6}
              loading={verifying}
            >
              {verifying ? 'Verifying...' : t('confirmEnable')}
            </Button>
            <button onClick={handleCancelSetup} disabled={verifying} className={OUTLINE_BTN_CLASS}>
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ====== 已启用状态 ====== */}
      {status.enabled && (
        <div className="space-y-6">
          {/* 已启用标识 */}
          <div className="flex items-start gap-4 p-5 border border-[var(--border)]">
            <ShieldCheck size={28} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="meta-mono text-[var(--muted-foreground)] mb-1">[ Status ] · Enabled</div>
              <p className="text-[14px] text-[var(--foreground)] leading-relaxed flex items-center gap-2">
                {t('enabledTitle')}
                <Check size={16} className="text-green-600 dark:text-green-400" />
              </p>
              <p className="text-[12px] text-[var(--muted-foreground)] mt-2 leading-relaxed">
                {t('enabledDesc')}
              </p>
            </div>
          </div>

          {/* 重新生成的备用码展示 */}
          {regeneratedCodes && (
            <div className="p-4 border border-[var(--border)] bg-[var(--primary)]/[0.04]">
              <div className="meta-mono text-[var(--primary)] mb-3 flex items-center justify-between">
                <span>[ New Backup Codes ]</span>
                <button
                  onClick={() => setRegeneratedCodes(null)}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  aria-label={t('close')}
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] font-mono text-[var(--destructive)] mb-3 leading-relaxed">
                ⚠ {t('regeneratedWarn')}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {regeneratedCodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 border border-[var(--border)] bg-[var(--background)] font-mono text-[12px] text-[var(--foreground)] text-center tracking-wider"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作区：重新生成备用码 / 禁用 2FA */}
          {actionMode === 'idle' ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  setActionMode('regenerate');
                  setActionCode('');
                  setError(null);
                }}
                className={OUTLINE_BTN_CLASS}
              >
                <Key size={14} />
                {t('regenerateBackupCodes')}
              </button>
              <Button variant="outline-danger" size="sm" type="button" onClick={() => {
                  setActionMode('disable');
                  setActionCode('');
                  setError(null);
                }} className="flex items-center gap-1.5"><Shield size={14} />{t('disable2fa')}</Button>
            </div>
          ) : (
            <div className="p-5 border border-[var(--border)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="meta-mono text-[var(--muted-foreground)] flex items-center gap-2">
                  {actionMode === 'disable' ? (
                    <>
                      <Shield size={14} />
                      <span>[ Disable ] · Verify to Continue</span>
                    </>
                  ) : (
                    <>
                      <Key size={14} />
                      <span>[ Regenerate ] · Verify to Continue</span>
                    </>
                  )}
                </div>
                <button
                  onClick={handleCancelAction}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus-amber"
                  aria-label={t('cancel')}
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-[12px] text-[var(--muted-foreground)] leading-relaxed">
                {actionMode === 'disable'
                  ? t('disableDesc')
                  : t('regenerateDesc')}
              </p>

              <div>
                <label
                  htmlFor="2fa-action-code"
                  className="meta-mono text-[var(--muted-foreground)] mb-2 block"
                >
                  Current Verification Code (6 digits)
                </label>
                <input
                  id="2fa-action-code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={actionCode}
                  onChange={(e) => setActionCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={CODE_INPUT_CLASS}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  disabled={actionLoading}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant={actionMode === 'disable' ? 'danger' : 'primary'}
                  onClick={actionMode === 'disable' ? handleDisable : handleRegenerate}
                  disabled={actionLoading || actionCode.length !== 6}
                  loading={actionLoading}
                >
                  {actionLoading
                    ? 'Processing...'
                    : actionMode === 'disable'
                      ? t('confirmDisable')
                      : t('confirmRegenerate')}
                </Button>
                <button
                  onClick={handleCancelAction}
                  disabled={actionLoading}
                  className={OUTLINE_BTN_CLASS}
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
