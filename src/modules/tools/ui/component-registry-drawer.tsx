/**
 * @file 组件注册表 — 编辑变体抽屉（右侧滑出，27 变体 checkbox，移动端占满宽度）
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components';
import { X } from 'lucide-react';
import { useComponentRegistryStore } from './component-registry-store';
import {
  ALL_VARIANT_SIZES,
  ALL_VARIANT_COLORS,
  ALL_VARIANT_STATES,
  type VariantSize,
  type VariantColor,
  type VariantState,
} from '../types';

const SIZE_LABEL: Record<VariantSize, string> = { sm: 'SM', md: 'MD', lg: 'LG' };
const COLOR_LABEL: Record<VariantColor, string> = { primary: 'Primary', muted: 'Muted', danger: 'Danger' };
const STATE_LABEL: Record<VariantState, string> = { default: 'Default', hover: 'Hover', disabled: 'Disabled' };

const COLOR_BORDER: Record<VariantColor, string> = {
  primary: 'border-[var(--primary)]/20',
  muted: 'border-[var(--border)]',
  danger: 'border-red-500/20',
};

/** 编辑抽屉 props */
export interface ComponentRegistryDrawerProps {
  /** 正在编辑的组件 ID，null 时抽屉关闭 */
  itemId: string | null;
  /** 关闭抽屉回调 */
  onClose: () => void;
}

/** 编辑变体抽屉 */
export function ComponentRegistryDrawer({ itemId, onClose }: ComponentRegistryDrawerProps) {
  const t = useTranslations('toolsAdmin');
  const { state, toggleVariant } = useComponentRegistryStore();

  // ESC 键关闭
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (itemId) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [itemId, handleKeyDown]);

  if (!itemId) return null;

  const item = state.components.find((c) => c.id === itemId);
  if (!item) return null;

  const enabledCount = item.variants.filter((v) => v.isEnabled).length;
  const totalCount = item.variants.length;

  return (
    <>
      {/* 遮罩层 — z-50 对齐 ModalShell 规范（原 z-40 低于 navbar 导致盖不住顶部导航） */}
      <div
        className="fixed inset-0 z-[var(--z-header)] bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* 抽屉主体 — 右侧滑出 */}
      <aside
        className="fixed top-0 right-0 z-[var(--z-header)] h-full w-full max-w-[480px] bg-[var(--background)] border-l border-[var(--border)] shadow-[var(--shadow-modal)] flex flex-col"
        style={{
          animation: 'drawer-slide-in 300ms var(--ease-ark)',
        }}
      >
        {/* ============= 抽屉头部 ============= */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="min-w-0">
            <span className="meta-mono text-[11px] text-[var(--primary)] uppercase">
              {t('editVariants')}
            </span>
            <h3 className="display-serif text-[16px] text-[var(--foreground)] truncate mt-0.5">
              {item.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ============= 变体 checkbox 网格 ============= */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {ALL_VARIANT_COLORS.map((color) => (
            <div key={color} className={`border ${COLOR_BORDER[color]}`}>
              {/* color 分组标题 */}
              <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--muted)]/[0.03]">
                <span className="meta-mono text-[11px] text-[var(--foreground)] uppercase">
                  {COLOR_LABEL[color]}
                </span>
              </div>

              {/* 表头：size 列 */}
              <div className="grid grid-cols-[80px_1fr_1fr_1fr] border-b border-[var(--border)]">
                <div className="px-2 py-1.5">
                  <span className="meta-mono text-[9px] text-[var(--muted-foreground)] uppercase">
                    state \ size
                  </span>
                </div>
                {ALL_VARIANT_SIZES.map((size) => (
                  <div key={size} className="px-2 py-1.5 text-center">
                    <span className="meta-mono text-[10px] text-[var(--primary)] uppercase">
                      {SIZE_LABEL[size]}
                    </span>
                  </div>
                ))}
              </div>

              {/* state 行 */}
              {ALL_VARIANT_STATES.map((state) => (
                <div
                  key={state}
                  className="grid grid-cols-[80px_1fr_1fr_1fr] border-b border-[var(--border)] last:border-b-0"
                >
                  <div className="px-2 py-2.5 flex items-center">
                    <span className="meta-mono text-[10px] text-[var(--muted-foreground)] uppercase">
                      {STATE_LABEL[state]}
                    </span>
                  </div>
                  {ALL_VARIANT_SIZES.map((size) => {
                    const variantId = `${item.id}:${size}:${color}:${state}`;
                    const variant = item.variants.find((v) => v.id === variantId);
                    const isChecked = variant?.isEnabled ?? true;

                    return (
                      <div key={size} className="px-2 py-2.5 flex items-center justify-center">
                        <label className="cursor-pointer inline-flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              toggleVariant(item.id, variantId, e.target.checked);
                            }}
                            className="w-4 h-4 border border-[var(--border)] accent-[var(--primary)] cursor-pointer"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ============= 抽屉底部 ============= */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="meta-mono text-[12px] text-[var(--foreground)]">
              {enabledCount}
            </span>
            <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
              / {totalCount} {t('enabledSuffix')}
            </span>
            {/* mini 进度条 */}
            <div className="w-16 h-1 bg-[var(--muted)]/20 overflow-hidden ml-2">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${totalCount > 0 ? (enabledCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={onClose}>{t('closeBtn')}</Button>
        </div>
      </aside>

      {/* 抽屉滑入动画 keyframes */}
      <style>{`
        @keyframes drawer-slide-in {
          from { transform: translateX(100%); opacity: 0.5; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
