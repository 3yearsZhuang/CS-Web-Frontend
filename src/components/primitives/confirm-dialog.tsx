/**
 * @file ConfirmDialog — 统一二次确认模块，声明式组件 + 命令式 confirm() hook
 */

'use client';

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/shared/hooks/use-focus-trap';
import { Button } from '@/components/primitives/button';
import { t } from '@/i18n';

/* ============= 类型定义 ============= */

/** 确认对话框变体 */
export type ConfirmVariant = 'danger' | 'warning' | 'info';

/** ConfirmDialog Props */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

/** useConfirm 选项 */
export interface ConfirmOptions {
  title: string;
  message: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
}

/* ============= 变体样式映射 ============= */

const variantStyles: Record<
  ConfirmVariant,
  { border: string; text: string; bg: string; btn: 'danger' | 'primary' | 'primary' }
> = {
  danger: {
    border: 'border-l-[var(--destructive)]',
    text: 'text-[var(--destructive)]',
    bg: 'bg-[var(--destructive)]/5',
    btn: 'danger',
  },
  warning: {
    border: 'border-l-amber-500',
    text: 'text-amber-400',
    bg: 'bg-amber-500/5',
    btn: 'primary',
  },
  info: {
    border: 'border-l-[var(--primary)]',
    text: 'text-[var(--primary)]',
    bg: 'bg-[var(--primary)]/5',
    btn: 'primary',
  },
};

/* ============= 声明式组件 ============= */

/** 确认对话框组件 */
export function ConfirmDialog({
  open,
  title,
  message,
  variant = 'danger',
  confirmLabel = t('common.confirm'),
  cancelLabel = t('common.cancel'),
  loading = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const styles = variantStyles[variant];
  const containerRef = useFocusTrap<HTMLDivElement>({
    active: open,
    onClose: onCancel,
    lockScroll: true,
  });

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onCancel}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-md my-8 bg-[var(--background)] border border-[var(--border)] shadow-[var(--shadow-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border)]">
          <div className="meta-mono text-[var(--primary)] text-[12px] tracking-wider">
            [ {title} ]
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-[14px] leading-none"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        {/* 内容区 */}
        <div className="px-5 sm:px-6 py-6 space-y-5">
          {/* 主消息 */}
          <p className="text-[14px] text-[var(--foreground)] leading-relaxed font-mono">
            {message}
          </p>

          {/* 警告条 */}
          <div className={`p-3 border-l-2 ${styles.border} ${styles.bg}`}>
            <p className={`meta-mono text-[11px] ${styles.text}`}>
              {variant === 'danger'
                ? t('common.irreversible')
                : variant === 'warning'
                  ? '此操作可能影响系统状态，请确认后再继续。'
                  : '请确认以上信息后再继续操作。'}
            </p>
          </div>

          {/* 自定义内容 */}
          {children && <div>{children}</div>}

          {/* 按钮区 */}
          <div className="flex items-center gap-4 pt-2">
            <Button
              variant={styles.btn}
              type="button"
              loading={loading}
              onClick={onConfirm}
            >
              {loading ? t('common.processing') : confirmLabel}
            </Button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="meta-mono text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus-amber disabled:opacity-50"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ============= 命令式 confirm() ============= */

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const ConfirmContext = createContext<{
  show: (options: ConfirmOptions) => Promise<boolean>;
} | null>(null);

/** 确认对话框上下文提供者 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const pendingRef = useRef<ConfirmState | null>(null);

  const show = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const item: ConfirmState = { options, resolve };
      pendingRef.current = item;
      setState(item);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (pendingRef.current) {
      pendingRef.current.resolve(true);
      pendingRef.current = null;
    }
    setState(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (pendingRef.current) {
      pendingRef.current.resolve(false);
      pendingRef.current = null;
    }
    setState(null);
  }, []);

  return (
    <ConfirmContext.Provider value={{ show }}>
      {children}
      {state && (
        <ConfirmDialog
          open={true}
          title={state.options.title}
          message={state.options.message}
          variant={state.options.variant ?? 'danger'}
          confirmLabel={state.options.confirmLabel ?? t('common.confirm')}
          cancelLabel={state.options.cancelLabel ?? t('common.cancel')}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/** useConfirm hook — 以编程方式触发确认对话框 */
export function useConfirm(): { confirm: (options: ConfirmOptions) => Promise<boolean> } {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return { confirm: ctx.show };
}