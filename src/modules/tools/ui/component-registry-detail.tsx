/**
 * @file 组件注册表 — 右侧详情面板（迁移状态 + 简化 3×3 变体预览 + 使用规范 + 迁移操作）
 */

'use client';

import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import { useComponentRegistryStore } from './component-registry-store';
import { VariantCell } from './component-registry-variant-renderer';
import type { ComponentItem, MigrationStatus } from '../types';
import {
  ALL_VARIANT_SIZES,
  ALL_VARIANT_COLORS,
  getStatusConfig,
  SIZE_LABEL,
  COLOR_LABEL,
  VARIANT_PRESETS,
} from '../types';

const NEXT_STATUS: Partial<Record<MigrationStatus, MigrationStatus>> = {
  legacy: 'migrating',
  migrating: 'done',
};

const PREV_STATUS: Partial<Record<MigrationStatus, MigrationStatus>> = {
  migrating: 'legacy',
  done: 'migrating',
};

/** 详情面板 Props */
export interface ComponentDetailPanelProps {
  /** 选中的组件，null 时不渲染（显示空状态） */
  item: ComponentItem | null;
  /** 打开编辑抽屉回调 */
  onOpenDrawer: (itemId: string) => void;
}

/** 右侧详情面板 */
export function ComponentDetailPanel({ item, onOpenDrawer }: ComponentDetailPanelProps) {
  const t = useTranslations('toolsAdmin');
  const { setMigrationStatus, applyVariantPreset } = useComponentRegistryStore();

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] border border-[var(--border)]">
        <div className="w-12 h-12 border border-[var(--border)] flex items-center justify-center mb-4">
          <span className="meta-mono text-[18px] text-[var(--muted-foreground)]/30">?</span>
        </div>
        <p className="meta-mono text-[11px] text-[var(--muted-foreground)] uppercase">
          {t('selectComponent')}
        </p>
        <p className="text-[12px] text-[var(--muted-foreground)]/60 mt-1 text-center max-w-[200px]">
          {t('selectComponentDesc')}
        </p>
      </div>
    );
  }

  const status = getStatusConfig(item.migrationStatus);
  const canAdvance = item.migrationStatus !== 'done';
  const canRetreat = item.migrationStatus !== 'legacy';

  // 简化变体预览：3 size × 3 color, default 态
  const state = 'default' as const;

  return (
    <div className="border border-[var(--border)]">
      {/* ============ [1] 组件头 ============ */}
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="display-serif text-[20px] text-[var(--foreground)]">
            {item.name}
          </h2>
          <span className={`meta-mono text-[10px] px-2 py-0.5 ${status.bg} ${status.color}`}>
            {status.label}
          </span>
          <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
            {item.category}
          </span>
        </div>
        {item.description && (
          <p className="text-[13px] text-[var(--muted-foreground)] mt-2 leading-relaxed">
            {item.description}
          </p>
        )}
      </div>

      {/* ============ [2] 迁移操作 + 可见性联动 ============ */}
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status.bg} ring-1 ring-current ${status.color}`} />
            <span className={`meta-mono text-[11px] uppercase ${status.color}`}>
              {status.label}
            </span>
            {/* #7 可见性闭环：展示 slug 对应可见性模块当前状态 */}
            {typeof item.visibilityOpen === 'boolean' && (
              <span
                className={`meta-mono text-[10px] px-2 py-0.5 border ${
                  item.visibilityOpen
                    ? 'border-[var(--primary)]/30 text-[var(--primary)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)]'
                }`}
                title={t('visibilityLabel')}
              >
                {t('visibilityLabel')}:{' '}
                {item.visibilityOpen ? t('visibilityOpen') : t('visibilityClosed')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canRetreat && (
              <button
                onClick={() => {
                  const target = PREV_STATUS[item.migrationStatus];
                  if (target) setMigrationStatus(item.id, target);
                }}
                className="px-3 py-1 border border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)] transition-colors uppercase"
              >
                {t('retreat')}
              </button>
            )}
            {canAdvance && (
              <button
                onClick={() => {
                  const target = NEXT_STATUS[item.migrationStatus];
                  if (target) setMigrationStatus(item.id, target);
                }}
                className="px-3 py-1 border border-[var(--primary)]/30 meta-mono text-[10px] text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors uppercase"
              >
                {t('advance')}
              </button>
            )}
          </div>
        </div>
        {/* 迁移完成 → 自动开放可见性的联动提示 */}
        {item.migrationStatus === 'done' && item.visibilityOpen && (
          <p className="meta-mono text-[10px] text-[var(--primary)]/80 mt-3">
            ✓ {t('statusDoneAutoOpen')}
          </p>
        )}
      </div>

      {/* ============ [3] 简化变体预览（3×3） ============ */}
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <span className="meta-mono text-[10px] text-[var(--primary)] uppercase">
          {t('variantPreview')}
        </span>
        {/* 变体矩阵预设：一键批量翻转 is_enabled */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {VARIANT_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyVariantPreset(item.id, p.key)}
              title={p.hint}
              className="px-2.5 py-1 border border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors uppercase"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-2 py-1 min-w-[70px]">
                  <span className="meta-mono text-[9px] text-[var(--muted-foreground)] uppercase">
                    color \ size
                  </span>
                </th>
                {ALL_VARIANT_SIZES.map((size) => (
                  <th key={size} className="px-2 py-1 text-center min-w-[120px]">
                    <span className="meta-mono text-[10px] text-[var(--primary)] uppercase">
                      {SIZE_LABEL[size]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_VARIANT_COLORS.map((color) => {
                const variantIdBase = `${item.id}:${color}:${state}`;
                return (
                  <tr key={color}>
                    <td className="px-2 py-3 border-t border-[var(--border)]">
                      <span className="meta-mono text-[10px] text-[var(--foreground)] uppercase">
                        {COLOR_LABEL[color]}
                      </span>
                    </td>
                    {ALL_VARIANT_SIZES.map((size) => {
                      const variantId = `${variantIdBase}:${size}`;
                      // 查找变体：实际 store 中的 id 格式是 itemId:size:color:state
                      const fullVariantId = `${item.id}:${size}:${color}:${state}`;
                      const variant = item.variants.find((v) => v.id === fullVariantId);
                      const isEnabled = variant?.isEnabled ?? true;

                      return (
                        <td
                          key={size}
                          className="px-2 py-4 border-t border-[var(--border)] text-center align-middle"
                        >
                          <div className={`flex items-center justify-center ${!isEnabled ? 'opacity-20 grayscale' : ''}`}>
                            <VariantCell
                              slug={item.slug}
                              size={size}
                              color={color}
                              state={state}
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => onOpenDrawer(item.id)}
          className="mt-4 px-4 py-1.5 border border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors uppercase"
        >
          {t('editAllVariants')}
        </button>
      </div>

      {/* ============ [4] 使用规范 ============ */}
      <div className="px-6 py-4">
        <span className="meta-mono text-[10px] text-[var(--primary)] uppercase">
          {t('usageGuide')}
        </span>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 适用场景 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-4 h-4 border border-emerald-500/30 bg-emerald-500/5">
                <Check className="w-2.5 h-2.5 text-emerald-500" />
              </span>
              <span className="meta-mono text-[10px] text-emerald-500 uppercase">
                {t('useCases')}
              </span>
            </div>
            {item.guide.useCases.length === 0 ? (
              <p className="meta-mono text-[10px] text-[var(--muted-foreground)]/50 italic">
                {t('noRecord')}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {item.guide.useCases.map((uc, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[12px] text-[var(--foreground)] leading-relaxed">
                    <span className="meta-mono text-[9px] text-emerald-500/60 mt-0.5 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span>{uc}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 反模式 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-4 h-4 border border-red-500/30 bg-red-500/5">
                <X className="w-2.5 h-2.5 text-red-500" />
              </span>
              <span className="meta-mono text-[10px] text-red-500 uppercase">
                {t('antiPatterns')}
              </span>
            </div>
            {item.guide.antiPatterns.length === 0 ? (
              <p className="meta-mono text-[10px] text-[var(--muted-foreground)]/50 italic">
                {t('noRecord')}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {item.guide.antiPatterns.map((ap, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-[12px] text-[var(--foreground)] leading-relaxed">
                    <span className="meta-mono text-[9px] text-red-500/60 mt-0.5 shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span>{ap}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
