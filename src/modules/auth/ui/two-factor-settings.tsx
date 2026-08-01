/**
 * @file 双因素认证 (2FA) 设置组件
 *
 * 用途：在个人设置页（/profile → 安全 Tab）管理 2FA。
 *
 * 功能流：
 *   1. 加载时 GET /api/auth/2fa 查询状态 { enabled, required }
 *   2. 未启用：
 *      - 点击「启用双因素认证」→ POST /api/auth/2fa/setup
 *        返回 { secret, otpauthURI, qrCode, backupCodes }
 *      - 展示 QR / secret / 8 个备用码
 *      - 输入 6 位验证码 → POST /api/auth/2fa/verify { code, mode: 'setup' }
 *   3. 已启用：
 *      - 重新生成备用码 → POST /api/auth/2fa/backup-codes { code }
 *      - 禁用 2FA → POST /api/auth/2fa/disable { code }
 *   4. 管理员强制提示：required && !enabled → 显示警告
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Button } from '@/components';

/** 2FA 状态 */
interface TwoFAStatus {
  enabled: boolean;
  required: boolean;
}

/** setup 接口返回 */
interface SetupData {
  secret: string;
  otpauthURI: string;
  qrCode: string;
  backupCodes: string[];
}

/** 当前操作模式 */
type ActionMode = 'idle' | 'setup' | 'disable' | 'regenerate';

/** 验证码输入框样式（题目指定） */
const CODE_INPUT_CLASS =
  'w-full bg-transparent border border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] font-mono transition-colors';

/** 次要按钮样式（题目指定） */
const OUTLINE_BTN_CLASS =
  'px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors focus-amber';

/** 双因素认证 (2FA) 设置组件 — 支持启用/禁用/重新生成备用码 */
export function TwoFactorSettings() {
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
      const res = await fetch('/api/auth/2fa');
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || '加载 2FA 状态失败');
      }
      const data = (await res.json()) as TwoFAStatus;
      setStatus(data);
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
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = (await res.json().catch(() => null)) as SetupData | { error?: string } | null;
      if (!res.ok) {
        throw new Error((data as { error?: string })?.error || '初始化 2FA 失败');
      }
      setSetupData(data as SetupData);
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
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, mode: 'setup' }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || '验证失败');
      }
      // 成功 — 刷新状态
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
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || '禁用失败');
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
      const res = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as
        | { codes?: string[]; error?: string }
        | null;
      if (!res.ok || !data?.codes) {
        throw new Error(data?.error || '重新生成失败');
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
        <p className="text-[13px] text-[var(--muted-foreground)]">{error || '加载失败'}</p>
        <button onClick={fetchStatus} className={`${OUTLINE_BTN_CLASS} mt-4`}>
          重试
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
        双因素认证
        <span className="display-serif italic text-[var(--muted-foreground)] ml-2 text-[clamp(14px,1.6vw,18px)]">
          / Two-Factor Authentication
        </span>
      </h3>

      {/* ---- 管理员强制提示 ---- */}
      {status.required && !status.enabled && (
        <div className="flex items-start gap-3 p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.06]">
          <AlertTriangle
            size={16}
            className="text-[var(--destructive)] shrink-0 mt-0.5"
          />
          <div className="flex-1">
            <p className="text-[13px] text-[var(--destructive)] leading-relaxed font-medium">
              管理员账号需要启用 2FA
            </p>
            <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-1">
              你的账号角色要求启用双因素认证后才能继续使用全部功能。
            </p>
          </div>
        </div>
      )}

      {/* ---- 全局错误 / 成功提示 ---- */}
      {error && (
        <div className="flex items-start gap-2 p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto underline shrink-0"
          >
            关闭
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
            <Shield
              size={28}
              className="text-[var(--muted-foreground)] shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="meta-mono text-[var(--muted-foreground)] mb-1">
                [ Status ] · Disabled
              </div>
              <p className="text-[14px] text-[var(--foreground)] leading-relaxed">
                双因素认证未启用
              </p>
              <p className="text-[12px] text-[var(--muted-foreground)] mt-2 leading-relaxed">
                启用后，登录时除密码外还需输入由认证 App（如 Google Authenticator、1Password）生成的 6 位验证码，显著提升账号安全性。
              </p>
              <Button
                onClick={handleStartSetup}
                disabled={setupLoading}
                loading={setupLoading}
                className="mt-4"
              >
                {setupLoading ? 'Initializing...' : '启用双因素认证 →'}
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
            <div className="meta-mono text-[var(--muted-foreground)]">
              [ Setup ] · Scan & Verify
            </div>
            <button
              onClick={handleCancelSetup}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus-amber"
              aria-label="取消"
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
              使用认证 App 扫描二维码，或手动输入下方密钥。
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
                title="复制密钥"
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
                ⚠ 请立即保存以下备用码。丢失认证设备时可用其完成登录，每个仅可使用一次。
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
            <label
              htmlFor="2fa-verify-code"
              className="meta-mono text-[var(--muted-foreground)] mb-2 block"
            >
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
              {verifying ? 'Verifying...' : '确认启用 →'}
            </Button>
            <button
              onClick={handleCancelSetup}
              disabled={verifying}
              className={OUTLINE_BTN_CLASS}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* ====== 已启用状态 ====== */}
      {status.enabled && (
        <div className="space-y-6">
          {/* 已启用标识 */}
          <div className="flex items-start gap-4 p-5 border border-[var(--border)]">
            <ShieldCheck
              size={28}
              className="text-green-600 dark:text-green-400 shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="meta-mono text-[var(--muted-foreground)] mb-1">
                [ Status ] · Enabled
              </div>
              <p className="text-[14px] text-[var(--foreground)] leading-relaxed flex items-center gap-2">
                2FA 已启用
                <Check
                  size={16}
                  className="text-green-600 dark:text-green-400"
                />
              </p>
              <p className="text-[12px] text-[var(--muted-foreground)] mt-2 leading-relaxed">
                登录时需要输入由认证 App 生成的 6 位验证码。
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
                  aria-label="关闭"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] font-mono text-[var(--destructive)] mb-3 leading-relaxed">
                ⚠ 旧备用码已失效。请立即保存以下新备用码。
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
                重新生成备用码
              </button>
              <button
                onClick={() => {
                  setActionMode('disable');
                  setActionCode('');
                  setError(null);
                }}
                className="px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--destructive)]/40 text-[var(--destructive)] hover:bg-[var(--destructive)]/10 hover:border-[var(--destructive)] transition-colors focus-amber"
              >
                <Shield size={14} />
                禁用 2FA
              </button>
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
                  aria-label="取消"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-[12px] text-[var(--muted-foreground)] leading-relaxed">
                {actionMode === 'disable'
                  ? '禁用后账号将仅由密码保护。请输入当前认证 App 生成的 6 位验证码以确认。'
                  : '请输入当前认证 App 生成的 6 位验证码，验证后将生成一组新的备用码（旧码立即失效）。'}
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
                      ? '确认禁用'
                      : '确认重新生成 →'}
                </Button>
                <button
                  onClick={handleCancelAction}
                  disabled={actionLoading}
                  className={OUTLINE_BTN_CLASS}
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
