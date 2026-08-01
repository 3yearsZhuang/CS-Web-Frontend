/**
 * @file 管理员审计日志面板 — 仅 root 可访问，支持筛选/删除单条/批量删除
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, SectionLoading } from '@/components';
import { RevealItem } from '@/components/effects/motion-primitives';
import { useToast } from '@/components/feedback/toast';
import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { ConfirmDialog } from '@/components/primitives/confirm-dialog';
import { type AdminAction } from '@/modules/admin/ui/types';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { formatDate } from '@/shared/utils/utils';

/* ============= 类型定义 ============= */

type LogModal = { type: 'none' } | { type: 'logDelete'; action: AdminAction } | { type: 'logDeleteBatch' };

interface ActionFilterOption {
  v: string;
  label: string;
}

/* ============= 常量 ============= */

const LOGS_LIMIT = 100;

const ACTION_FILTERS: ActionFilterOption[] = [
  { v: '', label: '全部' },
  { v: 'update_user', label: '编辑用户' },
  { v: 'delete_user', label: '删除用户' },
  { v: 'disable_user', label: '禁用' },
  { v: 'enable_user', label: '启用' },
  { v: 'reset_password_default', label: '重置默认密码' },
  { v: 'reset_password_custom', label: '重置自定义密码' },
  { v: 'delete_log', label: '删除日志' },
  { v: 'broadcast_notification', label: '群发通知' },
];

/* ============= 工具函数 ============= */

/** 将审计日志翻译为自然语言 */
function describeAction(log: AdminAction): string {
  const op = log.adminEmail || log.adminDisplayName || (log.adminId ? log.adminId.slice(0, 8) : '未知');
  const target = log.targetEmail || log.targetDisplayName || log.targetUserId?.slice(0, 8) || '未知用户';
  let details = '';
  try {
    if (log.details) {
      const d = JSON.parse(log.details);
      if (log.action === 'update_user') {
        const changes: string[] = [];
        if (d.role) changes.push(`角色 → ${d.role.to}`);
        if (d.displayName) changes.push(`显示名 → ${d.displayName.to}`);
        if (d.bio) changes.push(`简介已更新`);
        if (d.isActive !== undefined) changes.push(d.isActive.to ? '已启用' : '已禁用');
        details = changes.length > 0 ? `（${changes.join('、')}）` : '';
      }
      if (log.action === 'enable_user') details = `（启用账号）`;
      if (log.action === 'disable_user') details = `（禁用账号）`;
      if (log.action === 'reset_password_default') details = `（重置为默认密码 FZTBU_CS）`;
      if (log.action === 'reset_password_custom') details = `（自定义重置密码）`;
      if (log.action === 'delete_user') {
        const email = d.email || target;
        details = `（硬删除用户 ${email}，含所有 sessions / 活动报名数据）`;
      }
      if (log.action === 'delete_log') {
        details = `（删除 ${d.before} 之前的审计日志，共 ${d.count} 条）`;
      }
      if (log.action === 'approve_password_reset') {
        details = `（批准了 ${d.email} 的忘记密码申请）`;
      }
    }
  } catch {
    /* ignore parse error */
  }
  switch (log.action) {
    case 'update_user':
      return `${op} 编辑了用户 ${target} 的资料${details}`;
    case 'enable_user':
      return `${op} 启用了用户 ${target} 的账号`;
    case 'disable_user':
      return `${op} 禁用了用户 ${target} 的账号`;
    case 'reset_password_default':
      return `${op} 将用户 ${target} 的密码重置为默认密码 FZTBU_CS`;
    case 'reset_password_custom':
      return `${op} 将用户 ${target} 的密码重置为自定义密码`;
    case 'delete_user':
      return `${op} 硬删除了用户 ${target}`;
    case 'delete_log':
      return `${op} 清除了审计日志`;
    case 'approve_password_reset':
      return `${op} 批准了用户 ${target} 的忘记密码申请`;
    default:
      return `${op} 执行了 ${log.action}，目标：${target}`;
  }
}

/** 格式化操作者名称：优先显示邮箱，被删除时显示 ID 片段 */
function formatAdminName(log: AdminAction): string {
  if (log.adminEmail) return log.adminEmail;
  if (log.adminDisplayName) return log.adminDisplayName;
  if (log.adminId) return `${log.adminId.slice(0, 8)}…（已删除）`;
  return '未知（已删除）';
}

/* ============= 面板组件 ============= */

interface AdminLogsPanelProps {
  onForbidden: () => void;
}

/** 管理员审计日志面板（仅 root）— 按操作类型筛选日志，支持单条删除和批量删除 */
export function AdminLogsPanel({ onForbidden }: AdminLogsPanelProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  // 列表
  const [logs, setLogs] = useState<AdminAction[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logsActionFilter, setLogsActionFilter] = useState<string>('');

  // 模态框
  const [modal, setModal] = useState<LogModal>({ type: 'none' });
  const [logDeleteSaving, setLogDeleteSaving] = useState(false);
  const [logDeleteError, setLogDeleteError] = useState<string | null>(null);
  // 批量删除：天数（删除早于 N 天前的日志）
  const [batchDeleteDays, setBatchDeleteDays] = useState<string>('30');

  /* ============= 数据获取 ============= */

  /** 拉取审计日志（GET /api/admin/actions）— 仅 root 可访问 */
  const fetchLogs = useCallback(
    async (action?: string) => {
      setLogsLoading(true);
      setLogsError(null);
      try {
        const params = new URLSearchParams({ limit: String(LOGS_LIMIT) });
        if (action) params.set('action', action);
        const res = await fetch(`/api/admin/actions?${params.toString()}`, {
          cache: 'no-store',
        });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (res.status === 403) {
          // 非 root — 静默返回
          onForbidden();
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || '加载失败');
        }
        const data = (await res.json()) as { actions?: AdminAction[] };
        setLogs(data.actions ?? []);
      } catch (err) {
        setLogsError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLogsLoading(false);
      }
    },
    [router, onForbidden],
  );

  /* ============= 副作用 ============= */

  // 挂载时拉取一次日志
  useEffect(() => {
    fetchLogs(logsActionFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchLogs 已 useCallback 稳定化
  }, []);

  /* ============= 删除操作 ============= */

  /** 关闭模态框并清空错误 */
  const closeModal = () => {
    setModal({ type: 'none' });
    setLogDeleteError(null);
  };

  /** 单条日志删除 */
  const handleLogDelete = async () => {
    if (modal.type !== 'logDelete') return;
    const target = modal.action;

    setLogDeleteSaving(true);
    setLogDeleteError(null);
    try {
      const res = await fetch(`/api/admin/actions/${target.id}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setLogDeleteError(data?.error || '删除失败，请稍后再试');
        return;
      }
      pushToast('success', '已删除日志');
      setLogs((prev) => prev.filter((x) => x.id !== target.id));
      closeModal();
    } catch {
      setLogDeleteError('网络错误，请稍后再试');
    } finally {
      setLogDeleteSaving(false);
    }
  };

  /** 批量删除早于 N 天的日志 */
  const handleLogBatchDelete = async () => {
    setLogDeleteSaving(true);
    setLogDeleteError(null);
    try {
      const days = parseInt(batchDeleteDays, 10);
      if (!Number.isFinite(days) || days <= 0) {
        setLogDeleteError('请输入有效的天数');
        return;
      }
      const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch('/api/admin/actions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ before }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; count?: number; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setLogDeleteError(data?.error || '批量删除失败，请稍后再试');
        return;
      }
      pushToast('success', `已批量删除 ${data.count ?? 0} 条日志`);
      closeModal();
      fetchLogs(logsActionFilter);
    } catch {
      setLogDeleteError('网络错误，请稍后再试');
    } finally {
      setLogDeleteSaving(false);
    }
  };

  /* ============= 渲染 ============= */

  return (
    <>
      {/* 工具栏：action 筛选 + 批量删除 */}
      <RevealItem>
        <div className="border-t border-b border-[var(--border)] py-5 sm:py-6 mb-0">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="col-span-12 md:col-span-7">
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">
                [ 操作类型筛选 / Action Filter ]
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ACTION_FILTERS.map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => {
                      setLogsActionFilter(s.v);
                      fetchLogs(s.v);
                    }}
                    className={`focus-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                      logsActionFilter === s.v
                        ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-5 flex md:justify-end items-end gap-3">
              <button
                type="button"
                onClick={() => fetchLogs(logsActionFilter)}
                disabled={logsLoading}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
              >
                {logsLoading ? 'Loading' : 'Refresh'}
              </button>
              <button
                type="button"
                onClick={() => setModal({ type: 'logDeleteBatch' })}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
              >
                批量删除
              </button>
            </div>
          </div>
          {logsError && (
            <div className="mt-4 p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
              [ Error ] {logsError}
            </div>
          )}
        </div>
      </RevealItem>

      {/* 列表区 */}
      <RevealItem>
        {/* 加载中 */}
        {logsLoading && logs.length === 0 && (
          <div className="py-20 flex items-center justify-center">
            <SectionLoading label="加载日志中 / Loading..." />
          </div>
        )}

        {/* 空状态 */}
        {!logsLoading && !logsError && logs.length === 0 && (
          <div className="py-20 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 暂无日志 / No Logs ]</div>
            <p className="text-[14px] text-[var(--muted-foreground)]">没有符合条件的审计日志记录。</p>
          </div>
        )}

        {/* 桌面表格（md+） */}
        {!logsError && logs.length > 0 && (
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left meta-mono py-3 pr-4 w-[18%]">时间 / Time</th>
                  <th className="text-left meta-mono py-3 pr-4 w-[44%]">操作描述 / Description</th>
                  <th className="text-left meta-mono py-3 pr-4 w-[20%]">操作者 / Admin</th>
                  <th className="text-right meta-mono py-3 pl-4 w-[8%]">操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border)] hover:bg-[var(--foreground)]/[0.02]">
                    <td className="py-4 pr-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                      {formatDate(log.createdAt)}
                      <div className="text-[10px] opacity-60 mt-0.5">
                        {new Date(log.createdAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-[12px] text-[var(--foreground)] leading-relaxed">
                        {describeAction(log)}
                      </div>
                      <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mt-1">
                        [{log.action}]{' '}
                        {log.details
                          ? ` — ${log.details.slice(0, 120)}${log.details.length > 120 ? '…' : ''}`
                          : ''}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="meta-mono text-[11px] text-[var(--foreground)]" title={log.adminId ?? undefined}>
                        {formatAdminName(log)}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => setModal({ type: 'logDelete', action: log })}
                        className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 移动端卡片列表（< md） */}
        {!logsError && logs.length > 0 && (
          <div className="md:hidden divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {logs.map((log) => (
              <div key={log.id} className="p-4 card-minimal">
                <div className="text-[12px] text-[var(--foreground)] leading-relaxed mb-2">
                  {describeAction(log)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                    {formatDate(log.createdAt)}
                  </span>
                  <span className="meta-mono text-[10px] text-[var(--foreground)]">
                    {formatAdminName(log)}
                  </span>
                </div>
                <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mt-1">
                  [{log.action}]{' '}
                  {log.details
                    ? ` — ${log.details.slice(0, 80)}${log.details.length > 80 ? '…' : ''}`
                    : ''}
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'logDelete', action: log })}
                    className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </RevealItem>

      {/* ============ 模态框：删除单条日志 ============ */}
      <ConfirmDialog
        open={modal.type === 'logDelete'}
        title="删除日志"
        message="确认删除该条审计日志？此操作不可撤销。"
        variant="danger"
        confirmLabel={logDeleteSaving ? '删除中...' : '确认删除'}
        loading={logDeleteSaving}
        onConfirm={handleLogDelete}
        onCancel={closeModal}
      >
        {modal.type === 'logDelete' && (
          <>
            <div className="p-3 border border-[var(--border)] bg-[var(--muted)]/[0.3]">
              <div className="flex items-center gap-2 mb-1">
                <span className="meta-mono text-[var(--primary)]">{modal.action.action}</span>
                <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                  {formatDate(modal.action.createdAt)}
                </span>
              </div>
              {modal.action.details && (
                <div className="meta-mono text-[11px] text-[var(--muted-foreground)] break-all">
                  {modal.action.details}
                </div>
              )}
            </div>
            {logDeleteError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {logDeleteError}
              </div>
            )}
          </>
        )}
      </ConfirmDialog>

      {/* ============ 模态框：批量删除日志 ============ */}
      {modal.type === 'logDeleteBatch' && (
        <ModalShell title="[ 批量删除日志 / Batch Delete ]" onClose={closeModal}>
          <div className="space-y-6">
            <p className="text-[14px] text-[var(--foreground)] leading-relaxed">
              删除早于指定天数的审计日志。
            </p>
            <Field label="保留最近 N 天的日志 / Keep logs within N days">
              <input
                type="number"
                min={1}
                value={batchDeleteDays}
                onChange={(e) => setBatchDeleteDays(e.target.value)}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                placeholder="30"
              />
            </Field>
            <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[11px] font-mono leading-relaxed text-[var(--destructive)]">
              此操作将删除 {batchDeleteDays || '30'} 天前的所有审计日志，且不可撤销。
              批量删除本身也会记录一条审计日志。
            </div>

            {logDeleteError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {logDeleteError}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button
                variant="danger"
                type="button"
                disabled={logDeleteSaving}
                loading={logDeleteSaving}
                onClick={handleLogBatchDelete}
              >
                {logDeleteSaving ? '删除中 / Deleting...' : '确认批量删除 / Confirm →'}
              </Button>
              <button
                type="button"
                onClick={closeModal}
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
