/**
 * @file 页首背景图层组件 — 图片 + 渐变遮罩，未配置时回退栅格装饰
 */
'use client';

import { getHeaderImage } from '@/shared/config/header-images';

/** PageHeaderBackground 组件 Props */
interface PageHeaderBackgroundProps {
  /** 页面标识 — 对应 header-images.ts 中的 key */
  pageKey: string;
  /** 是否使用默认栅格装饰背景（默认 true） */
  showGridFallback?: boolean;
}

/**
 * 渲染页首背景图层 — 始终 absolute 铺满父级（父级需 relative + overflow-hidden）
 */
export function PageHeaderBackground({
  pageKey,
  showGridFallback = true,
}: PageHeaderBackgroundProps) {
  const config = getHeaderImage(pageKey);

  if (config) {
    const opacity = config.opacity ?? 0.25;
    const position = config.position ?? 'center';
    return (
      <>
        {/* 背景图片层 */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage: `url("${config.src}")`,
            backgroundSize: 'cover',
            backgroundPosition: position,
            backgroundRepeat: 'no-repeat',
            opacity,
          }}
        />
        {/* 渐变遮罩 — 底部淡出到背景色，避免图片边缘硬切 */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to bottom, transparent 0%, transparent 50%, var(--background) 100%)',
          }}
        />
        {/* 无障碍 — 隐藏的图片描述 */}
        {config.alt && (
          <span className="sr-only">{config.alt}</span>
        )}
      </>
    );
  }

  // 未配置图片 — 渲染默认栅格装饰背景
  if (showGridFallback) {
    return (
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: 'calc(100% / 12) 100%',
        }}
      />
    );
  }

  return null;
}
