/**
 * @file Avatar 头像组件 — 直角方形，支持上传/预设图片与首字母回退
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/** 头像组件 Props */
export interface AvatarProps {
  /** 用户邮箱（用于生成首字母回退） */
  email: string;
  /** 显示名（优先用于首字母） */
  displayName?: string | null;
  /** 头像 URL（null 时使用首字母回退） */
  avatarUrl?: string | null;
  /** 头像类型 */
  avatarType?: string;
  /** 尺寸（px），默认 32 */
  size?: number;
  /** 是否可点击（添加 cursor-pointer + hover 效果） */
  clickable?: boolean;
  /** 点击回调 */
  onClick?: () => void;
  /** 额外 className */
  className?: string;
}

/**
 * 从邮箱或显示名提取首字母（大写）
 */
function getInitial(name: string, email: string): string {
  const source = (name?.trim() || email?.trim() || '?').trim();
  return source.charAt(0).toUpperCase();
}

/** 通用头像组件 — 支持预设/上传/首字母回退 */
export function Avatar({
  email,
  displayName,
  avatarUrl,
  avatarType,
  size = 32,
  clickable = false,
  onClick,
  className = '',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const t = useTranslations('common');
  const tu = useTranslations('userMenu');
  const showImage = avatarUrl && avatarType !== 'initial' && !imgError;
  const initial = getInitial(displayName || '', email);

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
  };

  const interactiveCls = clickable
    ? 'cursor-pointer hover:border-[var(--primary)] transition-colors'
    : '';

  if (showImage) {
    return (
      <div
        className={`relative overflow-hidden border border-[var(--border)] bg-[var(--muted)] ${interactiveCls} ${className}`}
        style={baseStyle}
        onClick={onClick}
        role={clickable ? 'button' : undefined}
        aria-label={clickable ? tu('menuAria') : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 头像 URL 为用户上传，next/image 需配置 remotePatterns */}
        <img
          src={avatarUrl}
          alt={t('avatarAlt')}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // 首字母回退 — 琥珀色背景 + 深色文字
  return (
    <div
      className={`flex items-center justify-center border border-[var(--border)] bg-[var(--primary)] text-[var(--primary-foreground)] font-mono font-bold ${interactiveCls} ${className}`}
      style={{
        ...baseStyle,
        fontSize: Math.max(12, size * 0.4),
      }}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      aria-label={clickable ? tu('menuAria') : undefined}
    >
      {initial}
    </div>
  );
}
