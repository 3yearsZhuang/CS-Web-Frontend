/**
 * @file 组件注册表 — 变体渲染器（size/color/state 映射到组件真实 props）
 */

'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import type { VariantSize, VariantColor, VariantState } from '../types';

/** size → Tailwind 字号/间距映射 */
const SIZE_CLASS: Record<VariantSize, string> = {
  sm: 'text-[11px] scale-90',
  md: 'text-[13px]',
  lg: 'text-[15px] scale-110',
};

/** color → Button variant 映射 */
const COLOR_TO_BUTTON_VARIANT: Record<VariantColor, 'primary' | 'outline' | 'danger'> = {
  primary: 'primary',
  muted: 'outline',
  danger: 'danger',
};

/** color → 文字颜色映射 */
const COLOR_TEXT: Record<VariantColor, string> = {
  primary: 'text-[var(--primary)]',
  muted: 'text-[var(--muted-foreground)]',
  danger: 'text-[var(--destructive)]',
};

/** state → 透明度/滤镜映射 */
const STATE_CLASS: Record<VariantState, string> = {
  default: '',
  hover: 'brightness-110 ring-1 ring-[var(--primary)]/30',
  disabled: 'opacity-40 cursor-not-allowed pointer-events-none',
};

/* ============= 变体渲染单元 ============= */

interface VariantCellProps {
  slug: string;
  size: VariantSize;
  color: VariantColor;
  state: VariantState;
}

/**
 * 渲染单个变体单元 — 根据 slug 分发到对应组件渲染器
 */
export function VariantCell({ slug, size, color, state }: VariantCellProps) {
  const t = useTranslations('toolsAdmin');
  const wrapperClass = `inline-flex items-center justify-center gap-2 transition-all ${SIZE_CLASS[size]} ${STATE_CLASS[state]}`;

  switch (slug) {
    case 'button':
      return (
        <div className={wrapperClass}>
          <Button
            variant={COLOR_TO_BUTTON_VARIANT[color]}
            size={size === 'lg' ? 'md' : size}
            disabled={state === 'disabled'}
          >
            Button
          </Button>
        </div>
      );

    case 'input':
      return (
        <div className={wrapperClass}>
          <Input
            placeholder="Input"
            disabled={state === 'disabled'}
            className={`w-24 ${COLOR_TEXT[color]}`}
          />
        </div>
      );

    case 'confirm-dialog':
      return <ConfirmDialogPreview size={size} color={color} state={state} />;

    case 'modal-shell':
      return <ModalShellPreview size={size} color={color} state={state} />;

    case 'collapsing-hero':
      return <CollapsingHeroPreview size={size} color={color} state={state} />;

    case 'floating-capsule-sidebar':
      return <CapsuleSidebarPreview size={size} color={color} state={state} />;

    default:
      return (
        <div className={wrapperClass}>
          <span className={`meta-mono text-[11px] ${COLOR_TEXT[color]}`}>
            {slug}
          </span>
        </div>
      );
  }
}

/* ============= Overlay / Layout 微缩预览 ============= */

/** ConfirmDialog 微缩预览 — 渲染一个小型对话框 */
function ConfirmDialogPreview({ size, color, state }: { size: VariantSize; color: VariantColor; state: VariantState }) {
  const t = useTranslations('toolsAdmin');
  const w = size === 'sm' ? 'w-28' : size === 'md' ? 'w-36' : 'w-44';
  return (
    <div className={`${w} ${SIZE_CLASS[size]} ${STATE_CLASS[state]} border border-[var(--border)] bg-[var(--background)]`}>
      <div className={`px-2 py-1 border-b border-[var(--border)] meta-mono text-[9px] ${COLOR_TEXT[color]}`}>
        {t('confirmAction')}
      </div>
      <div className="px-2 py-2">
        <p className="font-mono text-[9px] text-[var(--muted-foreground)] leading-tight">
          {t('confirmPrompt')}
        </p>
        <div className="flex gap-1 mt-1.5">
          <span className={`px-1.5 py-0.5 text-[8px] border ${COLOR_TEXT[color]} border-current`}>
            {t('confirm')}
          </span>
          <span className="px-1.5 py-0.5 text-[8px] border border-[var(--border)] text-[var(--muted-foreground)]">
            {t('cancel')}
          </span>
        </div>
      </div>
    </div>
  );
}

/** ModalShell 微缩预览 — 渲染一个带遮罩的模态框 */
function ModalShellPreview({ size, color, state }: { size: VariantSize; color: VariantColor; state: VariantState }) {
  const w = size === 'sm' ? 'w-28' : size === 'md' ? 'w-36' : 'w-44';
  return (
    <div className={`relative ${w} ${SIZE_CLASS[size]} ${STATE_CLASS[state]}`}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative border border-[var(--border)] bg-[var(--background)]">
        <div className={`flex items-center justify-between px-2 py-1 border-b border-[var(--border)]`}>
          <span className={`meta-mono text-[9px] ${COLOR_TEXT[color]}`}>Modal</span>
          <span className="text-[9px] text-[var(--muted-foreground)]">✕</span>
        </div>
        <div className="px-2 py-2">
          <div className="h-1.5 bg-[var(--muted)]/30 mb-1" />
          <div className="h-1.5 bg-[var(--muted)]/20 w-2/3" />
        </div>
      </div>
    </div>
  );
}

/** CollapsingHero 微缩预览 — 渲染一个折叠 Hero 区 */
function CollapsingHeroPreview({ size, color, state }: { size: VariantSize; color: VariantColor; state: VariantState }) {
  const h = size === 'sm' ? 'h-16' : size === 'md' ? 'h-20' : 'h-24';
  return (
    <div className={`${h} w-full ${SIZE_CLASS[size]} ${STATE_CLASS[state]} border border-[var(--border)] relative overflow-hidden`}>
      <div className={`absolute top-1 left-2 meta-mono text-[9px] ${COLOR_TEXT[color]}`}>
        [ 00 ] Hero
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`display-serif text-[14px] ${COLOR_TEXT[color]}`}>
          Title
        </span>
      </div>
      <div className="absolute bottom-1 right-2 flex gap-0.5">
        <span className="px-1 py-0.5 text-[7px] border border-[var(--border)] meta-mono">tab</span>
        <span className="px-1 py-0.5 text-[7px] border border-[var(--border)] meta-mono">tab</span>
      </div>
    </div>
  );
}

/** FloatingCapsuleSidebar 微缩预览 — 渲染一个浮动侧边栏 */
function CapsuleSidebarPreview({ size, color, state }: { size: VariantSize; color: VariantColor; state: VariantState }) {
  const w = size === 'sm' ? 'w-20' : size === 'md' ? 'w-24' : 'w-28';
  return (
    <div className={`${w} ${SIZE_CLASS[size]} ${STATE_CLASS[state]} border border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm`}>
      <div className="py-1 px-1.5 space-y-0.5">
        {['01', '02', '03'].map((num) => (
          <div
            key={num}
            className={`flex items-center gap-1 px-1 py-0.5 ${num === '01' ? `bg-[var(--primary)]/10 ${COLOR_TEXT[color]}` : 'text-[var(--muted-foreground)]'}`}
          >
            <span className="meta-mono text-[8px]">{num}</span>
            <span className="text-[8px]">tab</span>
          </div>
        ))}
      </div>
    </div>
  );
}
